-- =====================================================================
-- Configura la cuenta demo (ver docs/DEMO.md)
--
-- Antes: crea la cuenta en Authentication → Users → Add user → Create new user,
-- marcando "Auto Confirm User". Luego cambia el correo de abajo y ejecuta todo.
-- =====================================================================

-- 1. Organización de ejemplo para la cuenta demo (borra la anterior si existía)
select public.reiniciar_demo('demo@bemaker.cl', 'Empresa Demo');   -- ← CAMBIA EL CORREO

-- 2. Reinicio automático cada noche a las 08:00 UTC (04:00–05:00 en Chile).
--    Requiere la extensión pg_cron (Database → Extensions). Si no está activa, se omite.
do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        perform cron.unschedule(jobid) from cron.job where jobname = 'reiniciar-demo';
        perform cron.schedule('reiniciar-demo', '0 8 * * *',
            $cron$ select public.reiniciar_demo('demo@bemaker.cl', 'Empresa Demo') $cron$);   -- ← MISMO CORREO
        raise notice 'Reinicio nocturno programado';
    else
        raise notice 'pg_cron no está activo: la demo no se reiniciará sola';
    end if;
end;
$$;

-- 3. Comprobación: debe mostrar 1 organización y 40 activos
select o.nombre as organizacion, m.correo, m.rol,
       (select count(*) from public.activos a where a.organizacion_id = o.id) as activos
from public.miembros m join public.organizaciones o on o.id = m.organizacion_id
where m.correo = lower('demo@bemaker.cl');   -- ← MISMO CORREO
