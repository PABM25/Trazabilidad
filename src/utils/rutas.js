/**
 * Devuelve la ruta solo si es interna de la app ("/algo"), para no redirigir a otro sitio.
 * Rechaza "//sitio", "/\sitio" (los navegadores tratan \ como /) y caracteres de control.
 */
export const rutaInterna = (ruta) => {
    if (!ruta || !/^\/(?![/\\])/.test(ruta) || ruta.includes('\\')) return '';
    return [...ruta].some((c) => c.charCodeAt(0) < 32) ? '' : ruta;
};
