-- Tema base BeMaker: el color por defecto de las organizaciones pasa a ser el azul de la marca.
-- Cada organización lo puede cambiar en Configuración.
alter table public.organizaciones alter column color_primario set default '#010066';

-- Las organizaciones que conservaban el color por defecto anterior adoptan el nuevo
update public.organizaciones set color_primario = '#010066' where color_primario = '#2563eb';
