import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { mensajeError } from './formato';

const colorPrimario = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primario').trim() || '#010066';

export const exito = (titulo, texto) =>
    Swal.fire({ title: titulo, text: texto, icon: 'success', confirmButtonColor: colorPrimario() });

export const aviso = (titulo, texto) =>
    Swal.fire({ title: titulo, text: texto, icon: 'warning', confirmButtonColor: colorPrimario() });

export const error = (err, titulo = 'Error') =>
    Swal.fire({ title: titulo, text: mensajeError(err), icon: 'error', confirmButtonColor: colorPrimario() });

export const confirmar = async (titulo, texto, boton = 'Confirmar') => {
    const r = await Swal.fire({
        title: titulo,
        text: texto,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: boton,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545',
    });
    return r.isConfirmed;
};
