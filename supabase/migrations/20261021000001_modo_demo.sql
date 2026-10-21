-- =====================================================================
-- Modo demo: datos de ejemplo reutilizables y reinicio de la cuenta demo
--
-- Ejecutar después de 20261021000000_esquema_inicial.sql.
-- La configuración de la cuenta demo está en supabase/demo/configurar_demo.sql.
-- =====================================================================

-- Al borrar una organización completa, sus administradores se borran en cascada:
-- la regla "al menos un administrador" solo aplica si la organización sigue existiendo.
create or replace function public.proteger_ultimo_admin()
returns trigger
language plpgsql set search_path = ''
as $$
begin
    if old.rol = 'admin'
       and (tg_op = 'DELETE' or new.rol <> 'admin')
       and exists (select 1 from public.organizaciones where id = old.organizacion_id)
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

-- Carga ubicaciones, tipos y 40 activos con historial en una organización vacía.
-- No se expone a la API: la usan crear_organizacion() y reiniciar_demo().
create function public.cargar_datos_demo(p_org uuid, p_usuario uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_bodega   uuid;
    v_ubic     uuid[];
    v_tipo     uuid;
    v_evento   uuid[];
    v_activo   uuid;
    i          integer;
    j          integer;
begin
    insert into public.ubicaciones (organizacion_id, nombre, es_almacen, capacidad)
    values (p_org, 'Bodega central', true, 500) returning id into v_bodega;

    with nuevas as (
        insert into public.ubicaciones (organizacion_id, nombre, capacidad)
        values (p_org, 'Cliente Norte', 120), (p_org, 'Cliente Sur', 80), (p_org, 'Planta Oriente', 60)
        returning id
    )
    select array_agg(id) into v_ubic from nuevas;

    insert into public.tipos_activo (organizacion_id, nombre, descripcion, vida_util, campos)
    values (p_org, 'Uniforme', 'Prenda reutilizable con chip RFID', 60,
            '[{"clave":"talla","etiqueta":"Talla","tipo":"opciones","opciones":["XS","S","M","L","XL"]}]')
    returning id into v_tipo;

    insert into public.tipos_activo (organizacion_id, nombre, descripcion, campos)
    values (p_org, 'Herramienta', 'Equipo de uso compartido',
            '[{"clave":"marca","etiqueta":"Marca","tipo":"texto"},{"clave":"calibrada","etiqueta":"Calibrada","tipo":"si_no"}]');

    with nuevos as (
        insert into public.tipos_evento (organizacion_id, nombre, color)
        values (p_org, 'Lavado', '#0ea5e9'), (p_org, 'Mantención', '#f59e0b'), (p_org, 'Inspección', '#10b981')
        returning id
    )
    select array_agg(id) into v_evento from nuevos;

    for i in 1..40 loop
        insert into public.activos (organizacion_id, codigo, tipo_activo_id, ubicacion_id, estado,
                                    atributos, registrado_en)
        values (p_org,
                'DEMO-' || lpad(i::text, 4, '0'),
                v_tipo,
                case when i <= 10 then v_bodega else v_ubic[1 + i % 3] end,
                case when i <= 10 then 'disponible'::public.estado_activo else 'en_uso' end,
                jsonb_build_object('talla', (array['XS','S','M','L','XL'])[1 + i % 5]),
                now() - make_interval(days => (i * 7) % 300))
        returning id into v_activo;

        insert into public.eventos (organizacion_id, activo_id, clase, ubicacion_id, usuario_id, ocurrido_en)
        select p_org, v_activo, 'registro', a.ubicacion_id, p_usuario, a.registrado_en
        from public.activos a where a.id = v_activo;

        for j in 1..(i % 12) loop
            insert into public.eventos (organizacion_id, activo_id, clase, tipo_evento_id, usuario_id, ocurrido_en)
            values (p_org, v_activo, 'proceso', v_evento[1 + j % 3], p_usuario,
                    now() - make_interval(days => j * 9 + i % 5));
        end loop;
    end loop;
end;
$$;

-- Misma firma que antes; ahora delega los datos de ejemplo en cargar_datos_demo().
create or replace function public.crear_organizacion(p_nombre text, p_datos_demo boolean default false)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_usuario  uuid := auth.uid();
    v_org      uuid;
    v_correo   text;
    v_nombre   text;
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

    if p_datos_demo then
        perform public.cargar_datos_demo(v_org, v_usuario);
    else
        insert into public.tipos_activo (organizacion_id, nombre) values (v_org, 'General');
        insert into public.tipos_evento (organizacion_id, nombre) values (v_org, 'Mantención');
    end if;

    return v_org;
end;
$$;

-- Borra las organizaciones de la cuenta demo y crea una nueva con datos de ejemplo.
-- Se ejecuta desde el SQL Editor o con pg_cron (cada noche). No se expone a la API.
create function public.reiniciar_demo(p_correo text, p_nombre_org text default 'Empresa Demo')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_usuario uuid;
    v_org     uuid;
begin
    select id into v_usuario from auth.users where lower(email) = lower(trim(p_correo));
    if v_usuario is null then
        raise exception 'No existe la cuenta %. Créala en Authentication → Users.', p_correo;
    end if;

    -- Primero los activos (su tipo no se puede borrar mientras existan), luego la organización
    delete from public.activos
    where organizacion_id in (select organizacion_id from public.miembros where usuario_id = v_usuario);
    delete from public.organizaciones
    where id in (select organizacion_id from public.miembros where usuario_id = v_usuario);

    insert into public.organizaciones (nombre) values (p_nombre_org) returning id into v_org;
    insert into public.miembros (organizacion_id, usuario_id, nombre_completo, correo, rol)
    select v_org, v_usuario, coalesce(raw_user_meta_data ->> 'nombre_completo', 'Usuario demo'), lower(email), 'admin'
    from auth.users where id = v_usuario;

    perform public.cargar_datos_demo(v_org, v_usuario);
    return v_org;
end;
$$;

revoke execute on function public.cargar_datos_demo(uuid, uuid), public.reiniciar_demo(text, text) from public, anon, authenticated;
