import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const dbConfigurado = Boolean(url && clave);

// Si faltan las variables se crea un cliente "vacío" para que la app pueda
// mostrar un aviso de configuración en vez de romperse al importar.
export const db = createClient(url || 'http://localhost', clave || 'sin-clave');

/**
 * Ejecuta una consulta y lanza el error si lo hay,
 * para poder usar try/catch en los componentes.
 */
export async function q(consulta) {
    const { data, error } = await consulta;
    if (error) throw error;
    return data;
}

/**
 * Trae todas las filas de una consulta paginando de a 1000
 * (Supabase limita cada respuesta a 1000 filas por defecto).
 * crearConsulta debe devolver una consulta nueva cada vez, con orden estable.
 */
export async function todas(crearConsulta, tamano = 1000) {
    const filas = [];
    for (let desde = 0; ; desde += tamano) {
        const pagina = await q(crearConsulta().range(desde, desde + tamano - 1));
        filas.push(...pagina);
        if (pagina.length < tamano) return filas;
    }
}
