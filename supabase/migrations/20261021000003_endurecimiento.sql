-- =====================================================================
-- Endurecimiento: reglas que la base de datos hace cumplir aunque alguien
-- llame a la API directamente, sin pasar por la interfaz.
-- =====================================================================

-- El logo solo puede ser una imagen incrustada (la app la reduce y la guarda así);
-- evita que se use una URL externa, por ejemplo para rastrear a quien abre la app.
alter table public.organizaciones
    add constraint organizaciones_logo_imagen
    check (logo_url is null or logo_url ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$');

-- "De baja" y la fecha de baja van siempre juntas. Como baja_en no es editable desde la app,
-- la única forma de dar de baja (o de revertirla) es la función dar_de_baja(), que deja historial.
alter table public.activos
    add constraint activos_baja_coherente
    check ((estado = 'baja') = (baja_en is not null));

-- Largos máximos razonables, para que nadie guarde textos gigantes
alter table public.organizaciones add constraint organizaciones_nombre_largo check (length(nombre) <= 120);
alter table public.ubicaciones    add constraint ubicaciones_largos check (length(nombre) <= 120 and length(coalesce(notas, '')) <= 2000);
alter table public.tipos_activo   add constraint tipos_activo_largos check (length(nombre) <= 120 and length(coalesce(descripcion, '')) <= 500 and jsonb_array_length(campos) <= 30);
alter table public.tipos_evento   add constraint tipos_evento_largos check (length(nombre) <= 120 and length(coalesce(descripcion, '')) <= 500);
alter table public.activos        add constraint activos_largos check (length(codigo) <= 200 and length(coalesce(observaciones, '')) <= 2000 and length(atributos::text) <= 10000);
alter table public.eventos        add constraint eventos_largos check (length(coalesce(observaciones, '')) <= 2000);
alter table public.miembros       add constraint miembros_largos check (length(nombre_completo) <= 120);
alter table public.invitaciones   add constraint invitaciones_largos check (length(nombre_completo) <= 120 and length(correo) <= 254);
