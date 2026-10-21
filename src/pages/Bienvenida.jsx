import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, q } from '../lib/db';
import { APP_NOMBRE } from '../config';
import { mensajeError } from '../utils/formato';

/**
 * Primer ingreso: unirse a una organización con el código de invitación
 * (enlace /bienvenida?codigo=...) o crear una nueva.
 */
const Bienvenida = () => {
    const { usuario, organizacion, membresias, recargar, elegirOrganizacion, aceptarInvitacion, cerrarSesion } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [codigo, setCodigo] = useState(params.get('codigo') || '');
    const [nombre, setNombre] = useState('');
    const [demo, setDemo] = useState(false);
    const [errorTexto, setErrorTexto] = useState('');
    const [enviando, setEnviando] = useState(false);

    if (!usuario) {
        const volver = `/bienvenida${params.get('codigo') ? `?codigo=${params.get('codigo')}` : ''}`;
        return <Navigate to={`/login?siguiente=${encodeURIComponent(volver)}`} replace />;
    }
    // Quien ya pertenece a una organización solo llega aquí para usar una invitación
    if (organizacion && !params.get('codigo')) return <Navigate to="/panel" replace />;

    const ejecutar = async (accion) => {
        setEnviando(true);
        setErrorTexto('');
        try {
            await accion();
            navigate('/panel');
        } catch (err) {
            setErrorTexto(mensajeError(err));
        } finally {
            setEnviando(false);
        }
    };

    const unirse = (e) => {
        e.preventDefault();
        ejecutar(() => aceptarInvitacion(codigo.trim()));
    };

    const crear = (e) => {
        e.preventDefault();
        ejecutar(async () => {
            const id = await q(db.rpc('crear_organizacion', { p_nombre: nombre, p_datos_demo: demo }));
            elegirOrganizacion(id);
            await recargar();
        });
    };

    return (
        <div className="pantalla-login">
            <div className="card shadow-sm tarjeta-login">
                <div className="card-body p-4">
                    <h1 className="h4">Bienvenido a {APP_NOMBRE}</h1>
                    <p className="text-muted small">Sesión iniciada como {usuario.email}.</p>

                    {errorTexto && <div className="alert alert-danger small">{errorTexto}</div>}

                    <form onSubmit={unirse} className="mb-4">
                        <h2 className="h6">Tengo una invitación</h2>
                        <div className="input-group">
                            <input
                                className="form-control"
                                placeholder="Código de invitación"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                                required
                            />
                            <button className="btn btn-primario" disabled={enviando}>
                                Unirme
                            </button>
                        </div>
                        <div className="form-text">Viene en el enlace que te envió el administrador de tu empresa.</div>
                    </form>

                    {membresias.length === 0 && (
                        <form onSubmit={crear} className="border-top pt-3">
                            <h2 className="h6">O crea una organización nueva</h2>
                            <div className="mb-3">
                                <label className="form-label">Nombre de la organización</label>
                                <input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                            </div>
                            <div className="form-check mb-3">
                                <input id="demo" className="form-check-input" type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
                                <label htmlFor="demo" className="form-check-label">
                                    Cargar datos de ejemplo (para demostraciones)
                                </label>
                            </div>
                            <button className="btn btn-primario w-100" disabled={enviando}>
                                {enviando ? 'Creando…' : 'Crear organización'}
                            </button>
                        </form>
                    )}

                    <div className="text-end mt-3">
                        <button className="btn btn-link btn-sm px-0 text-danger" onClick={cerrarSesion}>
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Bienvenida;
