-- =====================================================================
-- Trazabilidad de activos — esquema inicial (multi-organización) para Supabase
--
-- Ejecutar completo en Supabase → SQL Editor, o con `supabase db push`.
--
-- Modelo:
--   organizaciones ─┬─ miembros (usuarios de Supabase Auth + rol)
--                   ├─ invitaciones (enlace con código → se convierte en miembro)
--                   ├─ ubicaciones (plantas, clientes, bodegas…)
--                   ├─ tipos_activo (con campos personalizados en JSON)
--                   ├─ tipos_evento (lavado, mantención, inspección…)
--                   ├─ activos (cada unidad trazable, identificada por su código/UID)
--                   └─ eventos (historial: registro, proceso, traslado, edición, baja)
--
-- Cada fila lleva organizacion_id y Row Level Security garantiza que un
-- usuario solo vea los datos de las organizaciones a las que pertenece.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.rol_miembro as enum ('admin', 'operador', 'lector');
create type public.estado_activo as enum ('disponible', 'en_uso', 'mantenimiento', 'baja');
create type public.clase_evento as enum ('registro', 'proceso', 'traslado', 'edicion', 'baja');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.organizaciones (
    id              uuid primary key default gen_random_uuid(),
    nombre          text not null check (length(trim(nombre)) > 0),
    -- imagen en formato data URL (la app la reduce a 256 px antes de guardarla)
    logo_url        text check (length(logo_url) <= 400000),
    color_primario  text not null default '#2563eb' check (color_primario ~ '^#[0-9a-fA-F]{6}$'),
    creado_en       timestamptz not null default now()
);

create table public.ubicaciones (
    id               uuid primary key default gen_random_uuid(),
    organizacion_id  uuid not null references public.organizaciones (id) on delete cascade,
    nombre           text not null check (length(trim(nombre)) > 0),
    -- true = bodega propia: los activos aquí cuentan como "disponibles" (en stock)
    es_almacen       boolean not null default false,
    capacidad        integer check (capacidad >= 0),
    activa           boolean not null default true,
    notas            text,
    creado_en        timestamptz not null default now(),
    unique (organizacion_id, nombre),
    unique (id, organizacion_id)
);

create table public.miembros (
    organizacion_id  uuid not null references public.organizaciones (id) on delete cascade,
    usuario_id       uuid not null references auth.users (id) on delete cascade,
    nombre_completo  text not null default '',
    correo           text not null,
    rol              public.rol_miembro not null default 'operador',
    ubicacion_id     uuid,
    creado_en        timestamptz not null default now(),
    primary key (organizacion_id, usuario_id),
    foreign key (ubicacion_id, organizacion_id)
        references public.ubicaciones (id, organizacion_id) on delete set null (ubicacion_id)
);

-- El administrador comparte un enlace con el código; quien lo abre (con el mismo correo) se une.
create table public.invitaciones (
    id               uuid primary key default gen_random_uuid(),
    codigo           uuid not null unique default gen_random_uuid(),
    organizacion_id  uuid not null references public.organizaciones (id) on delete cascade,
    correo           text not null check (correo = lower(trim(correo)) and correo like '%@%'),
    nombre_completo  text not null default '',
    rol              public.rol_miembro not null default 'operador',
    ubicacion_id     uuid,
    creado_en        timestamptz not null default now(),
    aceptada_en      timestamptz,
    unique (organizacion_id, correo),
    foreign key (ubicacion_id, organizacion_id)
        references public.ubicaciones (id, organizacion_id) on delete set null (ubicacion_id)
);

-- campos: definición de atributos propios del tipo, por ejemplo
--   [{"clave":"talla","etiqueta":"Talla","tipo":"opciones","opciones":["S","M","L"]},
--    {"clave":"marca","etiqueta":"Marca","tipo":"texto"}]
-- tipos admitidos: texto | numero | opciones | si_no
create table public.tipos_activo (
    id               uuid primary key default gen_random_uuid(),
    organizacion_id  uuid not null references public.organizaciones (id) on delete cascade,
    nombre           text not null check (length(trim(nombre)) > 0),
    descripcion      text,
    -- cantidad máxima de procesos antes de dar de baja (null = sin límite)
    vida_util        integer check (vida_util > 0),
    campos           jsonb not null default '[]' check (jsonb_typeof(campos) = 'array'),
    creado_en        timestamptz not null default now(),
    unique (organizacion_id, nombre),
    unique (id, organizacion_id)
);

create table public.tipos_evento (
    id               uuid primary key default gen_random_uuid(),
    organizacion_id  uuid not null references public.organizaciones (id) on delete cascade,
    nombre           text not null check (length(trim(nombre)) > 0),
    descripcion      text,
    color            text not null default '#0ea5e9' check (color ~ '^#[0-9a-fA-F]{6}$'),
    creado_en        timestamptz not null default now(),
    unique (organizacion_id, nombre),
    unique (id, organizacion_id)
);

create table public.activos (
    id                 uuid primary key default gen_random_uuid(),
    organizacion_id    uuid not null references public.organizaciones (id) on delete cascade,
    codigo             text not null check (length(trim(codigo)) > 0),   -- UID RFID, código de barras, QR…
    tipo_activo_id     uuid not null,
    ubicacion_id       uuid,
    estado             public.estado_activo not null default 'disponible',
    atributos          jsonb not null default '{}' check (jsonb_typeof(atributos) = 'object'),
    observaciones      text,
    cantidad_procesos  integer not null default 0,
    ultimo_proceso_en  timestamptz,
    registrado_en      timestamptz not null default now(),
    baja_en            timestamptz,
    unique (organizacion_id, codigo),
    unique (id, organizacion_id),
    foreign key (tipo_activo_id, organizacion_id)
        references public.tipos_activo (id, organizacion_id) on delete restrict,
    foreign key (ubicacion_id, organizacion_id)
        references public.ubicaciones (id, organizacion_id) on delete set null (ubicacion_id)
);

create table public.eventos (
    id               bigint generated always as identity primary key,
    organizacion_id  uuid not null references public.organizaciones (id) on delete cascade,
    activo_id        uuid not null,
    clase            public.clase_evento not null,
    tipo_evento_id   uuid,            -- solo para clase = 'proceso'
    ubicacion_id     uuid,            -- ubicación del activo (destino, en un traslado)
    observaciones    text,
    usuario_id       uuid default auth.uid() references auth.users (id) on delete set null,
    ocurrido_en      timestamptz not null default now(),
    foreign key (activo_id, organizacion_id)
        references public.activos (id, organizacion_id) on delete cascade,
    foreign key (tipo_evento_id, organizacion_id)
        references public.tipos_evento (id, organizacion_id) on delete set null (tipo_evento_id),
    foreign key (ubicacion_id, organizacion_id)
        references public.ubicaciones (id, organizacion_id) on delete set null (ubicacion_id)
);

create index on public.miembros (usuario_id);
create index on public.activos (organizacion_id, estado);
create index on public.activos (organizacion_id, ubicacion_id);
create index on public.activos (organizacion_id, registrado_en);
create index on public.eventos (organizacion_id, ocurrido_en);
create index on public.eventos (activo_id, ocurrido_en);

-- ---------------------------------------------------------------------
-- Funciones auxiliares para RLS
-- (security definer para no entrar en recursión con las políticas de miembros)
-- ---------------------------------------------------------------------
create function public.mi_rol(org uuid)
returns public.rol_miembro
language sql stable security definer set search_path = ''
as $$
    select rol from public.miembros
    where organizacion_id = org and usuario_id = (select auth.uid());
$$;

create function public.es_miembro(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.mi_rol(org) is not null; $$;

create function public.puede_editar(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.mi_rol(org) in ('admin', 'operador'), false); $$;

create function public.es_admin(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.mi_rol(org) = 'admin', false); $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.organizaciones enable row level security;
alter table public.ubicaciones    enable row level security;
alter table public.miembros       enable row level security;
alter table public.invitaciones   enable row level security;
alter table public.tipos_activo   enable row level security;
alter table public.tipos_evento   enable row level security;
alter table public.activos        enable row level security;
alter table public.eventos        enable row level security;

-- Organizaciones: se crean con la función crear_organizacion()
create policy "miembros ven su organización" on public.organizaciones
    for select to authenticated using (public.es_miembro(id));
create policy "admin edita su organización" on public.organizaciones
    for update to authenticated using (public.es_admin(id)) with check (public.es_admin(id));

-- Miembros: se crean con crear_organizacion() y aceptar_invitacion()
create policy "miembros ven a su equipo" on public.miembros
    for select to authenticated using (public.es_miembro(organizacion_id));
create policy "admin edita miembros" on public.miembros
    for update to authenticated
    using (public.es_admin(organizacion_id)) with check (public.es_admin(organizacion_id));
create policy "admin elimina miembros" on public.miembros
    for delete to authenticated using (public.es_admin(organizacion_id));

create policy "admin gestiona invitaciones" on public.invitaciones
    for all to authenticated
    using (public.es_admin(organizacion_id)) with check (public.es_admin(organizacion_id));

-- Catálogos: todos los miembros leen, solo admin modifica
create policy "miembros leen ubicaciones" on public.ubicaciones
    for select to authenticated using (public.es_miembro(organizacion_id));
create policy "admin gestiona ubicaciones" on public.ubicaciones
    for all to authenticated
    using (public.es_admin(organizacion_id)) with check (public.es_admin(organizacion_id));

create policy "miembros leen tipos de activo" on public.tipos_activo
    for select to authenticated using (public.es_miembro(organizacion_id));
create policy "admin gestiona tipos de activo" on public.tipos_activo
    for all to authenticated
    using (public.es_admin(organizacion_id)) with check (public.es_admin(organizacion_id));

create policy "miembros leen tipos de evento" on public.tipos_evento
    for select to authenticated using (public.es_miembro(organizacion_id));
create policy "admin gestiona tipos de evento" on public.tipos_evento
    for all to authenticated
    using (public.es_admin(organizacion_id)) with check (public.es_admin(organizacion_id));

-- Activos: leen todos, admin y operador registran/modifican
create policy "miembros leen activos" on public.activos
    for select to authenticated using (public.es_miembro(organizacion_id));
create policy "operadores registran activos" on public.activos
    for insert to authenticated with check (public.puede_editar(organizacion_id));
create policy "operadores modifican activos" on public.activos
    for update to authenticated
    using (public.puede_editar(organizacion_id)) with check (public.puede_editar(organizacion_id));
create policy "admin elimina activos" on public.activos
    for delete to authenticated using (public.es_admin(organizacion_id));

-- Eventos: historial de solo inserción
create policy "miembros leen eventos" on public.eventos
    for select to authenticated using (public.es_miembro(organizacion_id));
create policy "operadores registran eventos" on public.eventos
    for insert to authenticated
    with check (public.puede_editar(organizacion_id) and usuario_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

-- Cada evento de clase 'proceso' suma al contador del activo
create function public.contar_proceso()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    update public.activos
    set cantidad_procesos = cantidad_procesos + 1,
        ultimo_proceso_en = greatest(ultimo_proceso_en, new.ocurrido_en)
    where id = new.activo_id;
    return new;
end;
$$;

create trigger eventos_contar_proceso
    after insert on public.eventos
    for each row when (new.clase = 'proceso')
    execute function public.contar_proceso();

-- Una organización nunca puede quedarse sin administrador
create function public.proteger_ultimo_admin()
returns trigger
language plpgsql set search_path = ''
as $$
begin
    if old.rol = 'admin'
       and (tg_op = 'DELETE' or new.rol <> 'admin')
       and not exists (
           select 1 from public.miembros
           where organizacion_id = old.organizacion_id
             and rol = 'admin' and usuario_id <> old.usuario_id)
    then
        raise exception 'La organización debe tener al menos un administrador';
    end if;
    return coalesce(new, old);
end;
$$;

create trigger miembros_proteger_ultimo_admin
    before update or delete on public.miembros
    for each row execute function public.proteger_ultimo_admin();

-- ---------------------------------------------------------------------
-- Funciones de negocio (RPC)
-- Las de "invoker" se ejecutan con los permisos del usuario, así que RLS aplica.
-- ---------------------------------------------------------------------

-- Correo y nombre del usuario actual (el nombre se guarda al registrarse en raw_user_meta_data)
create function public.usuario_actual(out correo text, out nombre text)
language sql stable security definer set search_path = ''
as $$
    select lower(email), coalesce(raw_user_meta_data ->> 'nombre_completo', '')
    from auth.users where id = (select auth.uid());
$$;

-- Crea una organización y deja al usuario actual como administrador.
create function public.crear_organizacion(p_nombre text, p_datos_demo boolean default false)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_usuario  uuid := auth.uid();
    v_org      uuid;
    v_correo   text;
    v_nombre   text;
    v_bodega   uuid;
    v_ubic     uuid[];
    v_tipo     uuid;
    v_evento   uuid[];
    v_activo   uuid;
    i          integer;
    j          integer;
begin
    if v_usuario is null then
        raise exception 'Debes iniciar sesión';
    end if;

    select u.correo, u.nombre into v_correo, v_nombre from public.usuario_actual() u;
    if v_correo is null then
        raise exception 'No se pudo obtener el correo del usuario';
    end if;

    insert into public.organizaciones (nombre) values (trim(p_nombre)) returning id into v_org;

    insert into public.miembros (organizacion_id, usuario_id, nombre_completo, correo, rol)
    values (v_org, v_usuario, v_nombre, v_correo, 'admin');

    if not p_datos_demo then
        insert into public.tipos_activo (organizacion_id, nombre) values (v_org, 'General');
        insert into public.tipos_evento (organizacion_id, nombre) values (v_org, 'Mantención');
        return v_org;
    end if;

    -- Datos de ejemplo para presentar el sistema
    insert into public.ubicaciones (organizacion_id, nombre, es_almacen, capacidad)
    values (v_org, 'Bodega central', true, 500) returning id into v_bodega;

    with nuevas as (
        insert into public.ubicaciones (organizacion_id, nombre, capacidad)
        values (v_org, 'Cliente Norte', 120), (v_org, 'Cliente Sur', 80), (v_org, 'Planta Oriente', 60)
        returning id
    )
    select array_agg(id) into v_ubic from nuevas;

    insert into public.tipos_activo (organizacion_id, nombre, descripcion, vida_util, campos)
    values (v_org, 'Uniforme', 'Prenda reutilizable con chip RFID', 60,
            '[{"clave":"talla","etiqueta":"Talla","tipo":"opciones","opciones":["XS","S","M","L","XL"]}]')
    returning id into v_tipo;

    insert into public.tipos_activo (organizacion_id, nombre, descripcion, campos)
    values (v_org, 'Herramienta', 'Equipo de uso compartido',
            '[{"clave":"marca","etiqueta":"Marca","tipo":"texto"},{"clave":"calibrada","etiqueta":"Calibrada","tipo":"si_no"}]');

    with nuevos as (
        insert into public.tipos_evento (organizacion_id, nombre, color)
        values (v_org, 'Lavado', '#0ea5e9'), (v_org, 'Mantención', '#f59e0b'), (v_org, 'Inspección', '#10b981')
        returning id
    )
    select array_agg(id) into v_evento from nuevos;

    for i in 1..40 loop
        insert into public.activos (organizacion_id, codigo, tipo_activo_id, ubicacion_id, estado,
                                    atributos, registrado_en)
        values (v_org,
                'DEMO-' || lpad(i::text, 4, '0'),
                v_tipo,
                case when i <= 10 then v_bodega else v_ubic[1 + i % 3] end,
                case when i <= 10 then 'disponible'::public.estado_activo else 'en_uso' end,
                jsonb_build_object('talla', (array['XS','S','M','L','XL'])[1 + i % 5]),
                now() - make_interval(days => (i * 7) % 300))
        returning id into v_activo;

        insert into public.eventos (organizacion_id, activo_id, clase, ubicacion_id, usuario_id, ocurrido_en)
        select v_org, v_activo, 'registro', a.ubicacion_id, v_usuario, a.registrado_en
        from public.activos a where a.id = v_activo;

        for j in 1..(i % 12) loop
            insert into public.eventos (organizacion_id, activo_id, clase, tipo_evento_id, usuario_id, ocurrido_en)
            values (v_org, v_activo, 'proceso', v_evento[1 + j % 3], v_usuario,
                    now() - make_interval(days => j * 9 + i % 5));
        end loop;
    end loop;

    return v_org;
end;
$$;

-- Une al usuario actual a la organización de la invitación con ese código.
-- El código es el secreto; además el correo de la cuenta debe ser el invitado.
-- Devuelve el id de la organización.
create function public.aceptar_invitacion(p_codigo uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_usuario uuid := auth.uid();
    v_correo  text;
    v_nombre  text;
    v_inv     public.invitaciones;
begin
    if v_usuario is null then
        raise exception 'Debes iniciar sesión';
    end if;

    select * into v_inv from public.invitaciones where codigo = p_codigo and aceptada_en is null;
    if v_inv.id is null then
        raise exception 'La invitación no existe o ya fue usada';
    end if;

    select u.correo, u.nombre into v_correo, v_nombre from public.usuario_actual() u;
    if v_correo is distinct from v_inv.correo then
        raise exception 'Esta invitación es para %. Ingresa con ese correo.', v_inv.correo;
    end if;

    insert into public.miembros (organizacion_id, usuario_id, nombre_completo, correo, rol, ubicacion_id)
    values (v_inv.organizacion_id, v_usuario, coalesce(nullif(v_inv.nombre_completo, ''), v_nombre),
            v_correo, v_inv.rol, v_inv.ubicacion_id)
    on conflict (organizacion_id, usuario_id) do nothing;

    update public.invitaciones set aceptada_en = now() where id = v_inv.id;
    return v_inv.organizacion_id;
end;
$$;

-- Estado según la ubicación: bodega propia o sin ubicación = disponible; otra = en uso
create function public.estado_para_ubicacion(p_ubicacion uuid)
returns public.estado_activo
language sql stable set search_path = ''
as $$
    select case
        when p_ubicacion is null then 'disponible'::public.estado_activo
        when (select es_almacen from public.ubicaciones where id = p_ubicacion) then 'disponible'
        else 'en_uso'
    end;
$$;

-- Registra varios activos de una vez (ej. lote leído con el lector RFID)
create function public.registrar_activos(
    p_org uuid, p_codigos text[], p_tipo_activo uuid,
    p_ubicacion uuid default null, p_atributos jsonb default '{}')
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
    v_existentes text;
    v_total      integer;
begin
    select string_agg(codigo, ', ') into v_existentes
    from public.activos
    where organizacion_id = p_org and codigo = any (p_codigos);

    if v_existentes is not null then
        raise exception 'Ya están registrados: %', v_existentes using errcode = 'unique_violation';
    end if;

    with nuevos as (
        insert into public.activos (organizacion_id, codigo, tipo_activo_id, ubicacion_id, estado, atributos)
        select distinct on (trim(c)) p_org, trim(c), p_tipo_activo, p_ubicacion,
               public.estado_para_ubicacion(p_ubicacion), coalesce(p_atributos, '{}')
        from unnest(p_codigos) as c
        where length(trim(c)) > 0
        returning id, ubicacion_id
    )
    insert into public.eventos (organizacion_id, activo_id, clase, ubicacion_id)
    select p_org, id, 'registro', ubicacion_id from nuevos;

    get diagnostics v_total = row_count;
    return v_total;
end;
$$;

-- Registra un proceso (lavado, mantención…) sobre varios activos.
-- p_items: [{"activo_id": "...", "observaciones": "..."}]
create function public.registrar_proceso(p_org uuid, p_tipo_evento uuid, p_items jsonb)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
    v_total integer;
begin
    with items as (
        select (x ->> 'activo_id')::uuid as activo_id, nullif(trim(x ->> 'observaciones'), '') as obs
        from jsonb_array_elements(p_items) as x
    ), actualizados as (
        update public.activos a
        set observaciones = coalesce(items.obs, a.observaciones)
        from items
        where a.id = items.activo_id and a.organizacion_id = p_org and a.estado <> 'baja'
        returning a.id, a.ubicacion_id, items.obs
    )
    insert into public.eventos (organizacion_id, activo_id, clase, tipo_evento_id, ubicacion_id, observaciones)
    select p_org, id, 'proceso', p_tipo_evento, ubicacion_id, obs from actualizados;

    get diagnostics v_total = row_count;
    return v_total;
end;
$$;

-- Mueve activos a otra ubicación (null = sin ubicación). Devuelve los códigos no encontrados.
create function public.trasladar_activos(p_org uuid, p_codigos text[], p_ubicacion uuid)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
    v_total integer;
begin
    with movidos as (
        update public.activos
        set ubicacion_id = p_ubicacion, estado = public.estado_para_ubicacion(p_ubicacion)
        where organizacion_id = p_org and codigo = any (p_codigos) and estado <> 'baja'
        returning id
    )
    insert into public.eventos (organizacion_id, activo_id, clase, ubicacion_id)
    select p_org, id, 'traslado', p_ubicacion from movidos;

    get diagnostics v_total = row_count;

    return jsonb_build_object(
        'actualizados', v_total,
        'no_encontrados', coalesce((
            select jsonb_agg(c) from unnest(p_codigos) as c
            where not exists (
                select 1 from public.activos a
                where a.organizacion_id = p_org and a.codigo = c and a.estado <> 'baja')
        ), '[]'::jsonb));
end;
$$;

-- Da de baja activos (quedan en el historial, no se borran)
create function public.dar_de_baja(p_org uuid, p_ids uuid[], p_motivo text default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
    v_total integer;
begin
    -- definer porque baja_en no es editable por la app; por eso se valida el permiso aquí
    if not public.puede_editar(p_org) then
        raise exception 'No tienes permisos para dar de baja activos' using errcode = '42501';
    end if;

    with bajas as (
        update public.activos
        set estado = 'baja', baja_en = now(), ubicacion_id = null
        where organizacion_id = p_org and id = any (p_ids) and estado <> 'baja'
        returning id
    )
    insert into public.eventos (organizacion_id, activo_id, clase, observaciones)
    select p_org, id, 'baja', nullif(trim(p_motivo), '') from bajas;

    get diagnostics v_total = row_count;
    return v_total;
end;
$$;

-- Indicadores del panel (opcionalmente filtrados por ubicación)
create function public.estadisticas(p_org uuid, p_ubicacion uuid default null)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
    with a as (
        select a.*, t.vida_util
        from public.activos a
        join public.tipos_activo t on t.id = a.tipo_activo_id
        where a.organizacion_id = p_org
          and (p_ubicacion is null or a.ubicacion_id = p_ubicacion
               or (a.estado = 'baja' and exists (
                   select 1 from public.eventos e
                   where e.activo_id = a.id and e.ubicacion_id = p_ubicacion)))
    ), e as (
        select ev.* from public.eventos ev
        where ev.organizacion_id = p_org and ev.clase = 'proceso'
          and (p_ubicacion is null or ev.ubicacion_id = p_ubicacion)
    )
    select jsonb_build_object(
        'total',          (select count(*) from a where estado <> 'baja'),
        'registrados_mes',(select count(*) from a where registrado_en >= now() - interval '30 days'),
        'disponibles',    (select count(*) from a where estado = 'disponible'),
        'en_uso',         (select count(*) from a where estado = 'en_uso'),
        'mantenimiento',  (select count(*) from a where estado = 'mantenimiento'),
        'bajas',          (select count(*) from a where estado = 'baja'),
        'procesos',       (select count(*) from e),
        'procesos_mes',   (select count(*) from e where ocurrido_en >= now() - interval '30 days'),
        'fin_vida_util',  (select count(*) from a
                           where estado <> 'baja' and vida_util is not null
                             and cantidad_procesos >= vida_util * 0.9)
    );
$$;

-- Serie mensual de registros y procesos para el gráfico
create function public.serie_mensual(p_org uuid, p_anio integer, p_ubicacion uuid default null)
returns table (mes integer, registrados bigint, procesos bigint)
language sql stable security invoker set search_path = ''
as $$
    select m.mes,
        (select count(*) from public.activos a
         where a.organizacion_id = p_org
           and extract(year from a.registrado_en) = p_anio
           and extract(month from a.registrado_en) = m.mes
           and (p_ubicacion is null or a.ubicacion_id = p_ubicacion)),
        (select count(*) from public.eventos e
         where e.organizacion_id = p_org and e.clase = 'proceso'
           and extract(year from e.ocurrido_en) = p_anio
           and extract(month from e.ocurrido_en) = m.mes
           and (p_ubicacion is null or e.ubicacion_id = p_ubicacion))
    from generate_series(1, 12) as m(mes)
    order by m.mes;
$$;

-- ---------------------------------------------------------------------
-- Vistas con nombres y conteos resueltos para las tablas de la app
-- ---------------------------------------------------------------------
create view public.activos_detalle
with (security_invoker = true)
as
select a.*,
       t.nombre    as tipo_nombre,
       t.vida_util as vida_util,
       u.nombre    as ubicacion_nombre
from public.activos a
join public.tipos_activo t on t.id = a.tipo_activo_id
left join public.ubicaciones u on u.id = a.ubicacion_id;

create view public.ubicaciones_resumen
with (security_invoker = true)
as
select u.*,
       (select count(*) from public.activos a where a.ubicacion_id = u.id)::integer as cantidad_activos
from public.ubicaciones u;

-- ---------------------------------------------------------------------
-- Permisos
-- La API de Supabase usa el rol "authenticated" para usuarios con sesión
-- y "anon" para peticiones sin sesión (aquí no tiene acceso a nada).
-- Los permisos se dan explícitamente: los proyectos nuevos de Supabase ya no
-- los otorgan por defecto. Qué filas puede tocar cada usuario lo deciden las políticas RLS.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public;
grant execute on function
    public.mi_rol(uuid), public.es_miembro(uuid), public.puede_editar(uuid), public.es_admin(uuid),
    public.crear_organizacion(text, boolean), public.aceptar_invitacion(uuid),
    public.estado_para_ubicacion(uuid),
    public.registrar_activos(uuid, text[], uuid, uuid, jsonb),
    public.registrar_proceso(uuid, uuid, jsonb),
    public.trasladar_activos(uuid, text[], uuid),
    public.dar_de_baja(uuid, uuid[], text),
    public.estadisticas(uuid, uuid),
    public.serie_mensual(uuid, integer, uuid)
to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Columnas que la app puede modificar directamente (el resto lo mantienen las funciones)
revoke update on public.miembros, public.activos, public.eventos, public.invitaciones from authenticated;
grant update (nombre_completo, rol, ubicacion_id) on public.miembros to authenticated;
grant update (tipo_activo_id, ubicacion_id, estado, atributos, observaciones) on public.activos to authenticated;
grant update (nombre_completo, rol, ubicacion_id) on public.invitaciones to authenticated;

revoke all on all tables in schema public from anon;
