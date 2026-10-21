/**
 * Pruebas del esquema de la base de datos: seguridad entre organizaciones (RLS),
 * roles, invitaciones, funciones de negocio y modo demo.
 *
 * Corre Postgres en memoria (PGlite) con una imitación mínima de lo que Supabase trae
 * de fábrica (auth.users, auth.uid(), roles anon/authenticated). No toca ningún proyecto real.
 *
 *   npm run test:db
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const migraciones = readdirSync(join(raiz, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(raiz, 'migrations', f), 'utf8'));

const ANA = '11111111-1111-1111-1111-111111111111';
const BETO = '22222222-2222-2222-2222-222222222222';
const CARLA = '33333333-3333-3333-3333-333333333333';
const DANI = '44444444-4444-4444-4444-444444444444';
const DEMO = '55555555-5555-5555-5555-555555555555';

const db = new PGlite();
await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable
        as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on all functions in schema auth to authenticated, anon;
    insert into auth.users (id, email, raw_user_meta_data) values
        ('${ANA}', 'ana@a.com', '{"nombre_completo":"Ana"}'),
        ('${BETO}', 'beto@b.com', '{"nombre_completo":"Beto"}'),
        ('${CARLA}', 'Carla@a.com', '{"nombre_completo":"Carla"}'),
        ('${DANI}', 'dani@a.com', '{}'),
        ('${DEMO}', 'demo@demo.cl', '{}');
`);
for (const sql of migraciones) await db.exec(sql);

let fallas = 0;
const ok = (condicion, descripcion) => {
    console.log(condicion ? '✔' : '✘', descripcion);
    if (!condicion) fallas++;
};
const debeFallar = async (descripcion, fn) => {
    try {
        await fn();
        ok(false, `debía fallar: ${descripcion}`);
    } catch (e) {
        ok(true, `${descripcion} → rechazado (${e.message.split('\n')[0]})`);
    }
};
// Ejecuta como un usuario con sesión (igual que la API de Supabase)
const como = (usuario, sql, params = []) =>
    db.transaction(async (tx) => {
        await tx.exec(`set local role authenticated; select set_config('request.jwt.claim.sub', '${usuario}', true);`);
        return (await tx.query(sql, params)).rows;
    });
const anonimo = (sql) =>
    db.transaction(async (tx) => {
        await tx.exec('set local role anon');
        return (await tx.query(sql)).rows;
    });
const uno = async (usuario, sql, params) => (await como(usuario, sql, params))[0];

console.log(`(${migraciones.length} migraciones cargadas)\n`);

// --- Organizaciones y datos de ejemplo ---
const { crear_organizacion: orgA } = await uno(ANA, `select crear_organizacion('Empresa A', true)`);
const { crear_organizacion: orgB } = await uno(BETO, `select crear_organizacion('Empresa B', false)`);
ok(orgA && orgB, 'cada usuario crea su organización');
const anaM = await uno(ANA, `select nombre_completo, correo, rol from miembros where usuario_id = $1`, [ANA]);
ok(anaM.nombre_completo === 'Ana' && anaM.correo === 'ana@a.com' && anaM.rol === 'admin', 'el creador queda como administrador con su nombre y correo');
const { color_primario } = await uno(ANA, `select color_primario from organizaciones where id = $1`, [orgA]);
ok(color_primario === '#010066', 'color por defecto: azul BeMaker');

const estA = (await uno(ANA, `select estadisticas($1) e`, [orgA])).e;
ok(estA.total === 40 && estA.procesos > 0, 'datos de ejemplo: 40 activos con procesos');
const { s: suma } = await uno(ANA, `select sum(cantidad_procesos)::int s from activos where organizacion_id = $1`, [orgA]);
ok(suma === estA.procesos, 'el contador de procesos coincide con el historial');

// --- Aislamiento entre organizaciones ---
ok((await uno(BETO, `select count(*)::int n from activos`)).n === 0, 'B no ve activos de A');
ok((await uno(BETO, `select count(*)::int n from organizaciones`)).n === 1, 'B solo ve su organización');
ok((await uno(BETO, `select count(*)::int n from ubicaciones_resumen`)).n === 0, 'B no ve ubicaciones de A (vista)');
ok((await uno(BETO, `select estadisticas($1) e`, [orgA])).e.total === 0, 'B no obtiene estadísticas de A');
await debeFallar('B inserta un activo en A', () =>
    como(BETO, `insert into activos (organizacion_id, codigo, tipo_activo_id) select $1, 'X', id from tipos_activo limit 1`, [orgA]));
ok((await como(BETO, `update activos set observaciones = 'x' where organizacion_id = $1 returning id`, [orgA])).length === 0, 'B no modifica activos de A');
const { id: tipoB } = await uno(BETO, `select id from tipos_activo limit 1`);
await debeFallar('A registra activos con un tipo de B', () => como(ANA, `select registrar_activos($1, array['Z1'], $2)`, [orgA, tipoB]));

// --- Operaciones ---
const { id: tipoA } = await uno(ANA, `select id from tipos_activo where organizacion_id = $1 and nombre = 'Uniforme'`, [orgA]);
const { id: bodegaA } = await uno(ANA, `select id from ubicaciones where organizacion_id = $1 and es_almacen`, [orgA]);
const { id: clienteA } = await uno(ANA, `select id from ubicaciones where organizacion_id = $1 and not es_almacen limit 1`, [orgA]);
const { n: registrados } = await uno(ANA, `select registrar_activos($1, array['N1','N2','N2',' '], $2, $3, '{"talla":"M"}') n`, [orgA, tipoA, bodegaA]);
ok(registrados === 2, 'registrar_activos ignora duplicados y vacíos');
await debeFallar('registrar un código existente', () => como(ANA, `select registrar_activos($1, array['N1'], $2)`, [orgA, tipoA]));
const ids = (await como(ANA, `select id from activos where codigo in ('N1','N2') and organizacion_id = $1 order by codigo`, [orgA])).map((r) => r.id);
const { id: lavado } = await uno(ANA, `select id from tipos_evento where organizacion_id = $1 and nombre = 'Lavado'`, [orgA]);
await como(ANA, `select registrar_proceso($1, $2, $3::jsonb)`, [orgA, lavado, JSON.stringify([{ activo_id: ids[0], observaciones: 'manchado' }, { activo_id: ids[1] }])]);
const n1 = await uno(ANA, `select cantidad_procesos, observaciones from activos where id = $1`, [ids[0]]);
ok(n1.cantidad_procesos === 1 && n1.observaciones === 'manchado', 'registrar_proceso suma al contador y guarda la observación');
const { r: traslado } = await uno(ANA, `select trasladar_activos($1, array['N1','NOEXISTE'], $2) r`, [orgA, clienteA]);
ok(traslado.actualizados === 1 && traslado.no_encontrados[0] === 'NOEXISTE', 'trasladar_activos informa los códigos no encontrados');
ok((await uno(ANA, `select estado from activos where id = $1`, [ids[0]])).estado === 'en_uso', 'trasladar a un cliente deja el activo "en uso"');
ok((await uno(ANA, `select cantidad_activos from ubicaciones_resumen where id = $1`, [bodegaA])).cantidad_activos === 11, 'la vista de ubicaciones cuenta sus activos');
ok((await uno(ANA, `select dar_de_baja($1, $2::uuid[], 'roto') n`, [orgA, `{${ids[1]}}`])).n === 1, 'dar_de_baja');
ok((await uno(ANA, `select registrar_proceso($1, $2, $3::jsonb) n`, [orgA, lavado, JSON.stringify([{ activo_id: ids[1] }])])).n === 0, 'no se procesan activos dados de baja');
ok((await como(ANA, `select * from serie_mensual($1, extract(year from now())::int)`, [orgA])).length === 12, 'serie mensual de 12 meses');
ok((await uno(ANA, `select count(*)::int n from activos_detalle where organizacion_id = $1`, [orgA])).n === 42, 'vista activos_detalle');

// --- Invitaciones por enlace con código ---
const invC = await uno(ANA, `insert into invitaciones (organizacion_id, correo, rol) values ($1, 'carla@a.com', 'lector') returning codigo`, [orgA]);
ok(Boolean(invC.codigo), 'la invitación genera un código secreto');
ok((await uno(BETO, `select count(*)::int n from invitaciones`)).n === 0, 'B no ve invitaciones (ni sus códigos) de A');
await debeFallar('usar el código de otra persona', () => como(DANI, `select aceptar_invitacion($1)`, [invC.codigo]));
await debeFallar('usar un código inexistente', () => como(DANI, `select aceptar_invitacion(gen_random_uuid())`));
ok((await uno(CARLA, `select aceptar_invitacion($1) o`, [invC.codigo])).o === orgA, 'la invitada se une (correo sin distinguir mayúsculas)');
await debeFallar('reutilizar un código ya usado', () => como(CARLA, `select aceptar_invitacion($1)`, [invC.codigo]));

// --- Roles ---
ok((await uno(CARLA, `select count(*)::int n from activos`)).n === 42, 'el rol lector ve los activos');
await debeFallar('el rol lector registra activos', () => como(CARLA, `select registrar_activos($1, array['C1'], $2)`, [orgA, tipoA]));
await debeFallar('el rol lector da de baja', () => como(CARLA, `select dar_de_baja($1, $2::uuid[])`, [orgA, `{${ids[0]}}`]));
ok((await como(CARLA, `update activos set observaciones = 'x' where organizacion_id = $1 returning id`, [orgA])).length === 0, 'el rol lector no modifica activos');
ok((await como(CARLA, `update miembros set rol = 'admin' where usuario_id = $1 returning rol`, [CARLA])).length === 0, 'nadie se asciende a sí mismo');
await debeFallar('modificar el contador de procesos a mano', () => como(ANA, `update activos set cantidad_procesos = 0 where organizacion_id = $1`, [orgA]));
await debeFallar('quitar al último administrador', () => como(ANA, `delete from miembros where usuario_id = $1`, [ANA]));

// --- Endurecimiento ---
await debeFallar('dar de baja editando el estado directamente', () => como(ANA, `update activos set estado = 'baja' where id = $1`, [ids[0]]));
await debeFallar('reactivar un activo dado de baja editándolo', () => como(ANA, `update activos set estado = 'disponible' where id = $1`, [ids[1]]));
ok((await como(ANA, `update activos set observaciones = 'nota' where id = $1 returning id`, [ids[1]])).length === 1, 'un activo de baja sí admite observaciones');
await debeFallar('logo con URL externa', () => como(ANA, `update organizaciones set logo_url = 'https://rastreo.example/pixel.png' where id = $1`, [orgA]));
ok((await como(ANA, `update organizaciones set logo_url = 'data:image/png;base64,iVBORw0KGgo=' where id = $1 returning id`, [orgA])).length === 1, 'logo como imagen incrustada');
await debeFallar('nombre de organización gigante', () => como(ANA, `update organizaciones set nombre = repeat('x', 500) where id = $1`, [orgA]));

// --- Sin sesión ---
await debeFallar('sin sesión: crear_organizacion', () => anonimo(`select crear_organizacion('x')`));
await debeFallar('sin sesión: leer activos', () => anonimo(`select * from activos`));
await debeFallar('la app no puede llamar a usuario_actual', () => como(ANA, `select * from usuario_actual()`));

// --- Modo demo ---
await db.query(`select reiniciar_demo('demo@demo.cl', 'Empresa Demo')`);
const conteo = async () =>
    (await db.query(`select (select count(*)::int from organizaciones) o, (select count(*)::int from activos) a, (select count(*)::int from miembros) m`)).rows[0];
const antes = await conteo();
await db.query(`select reiniciar_demo('demo@demo.cl')`);
ok(JSON.stringify(await conteo()) === JSON.stringify(antes), 'reiniciar_demo no duplica datos');
const { organizacion_id: orgDemo } = (await db.query(`select organizacion_id from miembros where usuario_id = $1`, [DEMO])).rows[0];
await como(DEMO, `select dar_de_baja($1, array(select id from activos where organizacion_id = $1))`, [orgDemo]);
await db.query(`select reiniciar_demo('demo@demo.cl')`);
const { n: vigentesDemo } = (await db.query(`select count(*)::int n from activos a join miembros m on m.organizacion_id = a.organizacion_id where m.usuario_id = $1 and a.estado <> 'baja'`, [DEMO])).rows[0];
ok(vigentesDemo === 40, 'reiniciar_demo restaura los 40 activos');
ok((await uno(ANA, `select count(*)::int n from activos where organizacion_id = $1`, [orgA])).n === 42, 'reiniciar_demo no toca otras organizaciones');
await debeFallar('la app no puede llamar a reiniciar_demo', () => como(DEMO, `select reiniciar_demo('demo@demo.cl')`));

console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exitCode = fallas ? 1 : 0;
