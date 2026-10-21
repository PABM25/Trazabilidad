export const fecha = (valor) =>
    valor ? new Date(valor).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export const fechaHora = (valor) =>
    valor
        ? new Date(valor).toLocaleString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—';

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Muestra el valor de un atributo personalizado según su tipo */
export const valorAtributo = (campo, valor) => {
    if (valor === undefined || valor === null || valor === '') return '—';
    if (campo.tipo === 'si_no') return valor ? 'Sí' : 'No';
    return String(valor);
};

/** Convierte "Fecha de compra" → "fecha_de_compra" */
export const aClave = (texto) =>
    texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // quita tildes y diacríticos
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

// Códigos de error de Supabase Auth
const ERRORES_AUTH = {
    invalid_credentials: 'Correo o contraseña incorrectos.',
    user_already_exists: 'Ya existe una cuenta con ese correo. Usa "Ingresar".',
    email_exists: 'Ya existe una cuenta con ese correo. Usa "Ingresar".',
    email_not_confirmed: 'Debes confirmar tu correo antes de ingresar.',
    weak_password: 'La contraseña debe tener al menos 8 caracteres.',
    email_address_invalid: 'El correo no es válido.',
    user_not_found: 'No existe una cuenta con ese correo.',
    session_expired: 'Tu sesión expiró. Vuelve a ingresar.',
    session_not_found: 'Tu sesión expiró. Vuelve a ingresar.',
    over_email_send_rate_limit: 'Se enviaron demasiados correos en poco tiempo. Espera unos minutos e intenta de nuevo.',
    over_request_rate_limit: 'Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo.',
};

/** Mensaje legible a partir de un error de la base de datos o de autenticación */
export const mensajeError = (error) => {
    if (!error) return 'Error desconocido';
    if (ERRORES_AUTH[error.code]) return ERRORES_AUTH[error.code];
    if (error.code === 'PGRST202' || error.code === 'PGRST205')
        return 'La base de datos no reconoce esta operación. Revisa que el esquema SQL esté actualizado en Supabase.';
    if (error.code === '42501') return 'No tienes permisos para realizar esta acción.';
    if (error.code === '23505') return error.message.startsWith('Ya están') ? error.message : 'Ese registro ya existe.';
    if (error.code === '23503') return 'No se puede eliminar porque hay registros que dependen de este.';
    return error.message || String(error);
};
