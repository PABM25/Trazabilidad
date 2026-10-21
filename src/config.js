// Nombre del producto: se muestra en el login y cuando la organización no tiene logo.
export const APP_NOMBRE = import.meta.env.VITE_APP_NOMBRE || 'Trazabilidad';

// Modo demo (ver docs/DEMO.md): muestra la cuenta demo en el login y un aviso en la app.
export const DEMO = import.meta.env.VITE_DEMO === 'true';
export const DEMO_CORREO = import.meta.env.VITE_DEMO_EMAIL || '';
export const DEMO_CONTRASENA = import.meta.env.VITE_DEMO_PASSWORD || '';

// URL del puente del lector RFID (carpeta server/). Vacío = solo ingreso manual / lector tipo teclado.
export const LECTOR_URL = import.meta.env.VITE_LECTOR_URL || '';

export const ESTADOS = {
    disponible: { etiqueta: 'Disponible', color: 'success' },
    en_uso: { etiqueta: 'En uso', color: 'primary' },
    mantenimiento: { etiqueta: 'Mantenimiento', color: 'warning' },
    baja: { etiqueta: 'De baja', color: 'secondary' },
};

export const ROLES = {
    admin: 'Administrador',
    operador: 'Operador',
    lector: 'Solo lectura',
};

export const CLASES_EVENTO = {
    registro: 'Registro',
    proceso: 'Proceso',
    traslado: 'Traslado',
    edicion: 'Edición',
    baja: 'Baja',
};
