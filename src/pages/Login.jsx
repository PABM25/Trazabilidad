import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_NOMBRE, DEMO, DEMO_CONTRASENA, DEMO_CORREO } from '../config';
import { dbConfigurado } from '../lib/db';
import { mensajeError } from '../utils/formato';
import { rutaInterna } from '../utils/rutas';

const Login = () => {
    const { usuario, iniciarSesion, registrarse } = useAuth();
    const navigate = useNavigate();
    const [modo, setModo] = useState('ingresar');
    const [form, setForm] = useState({ nombre: '', correo: '', contrasena: '' });
    const [verContrasena, setVerContrasena] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [params] = useSearchParams();
    const siguiente = rutaInterna(params.get('siguiente'));

    if (usuario) return <Navigate to={siguiente || '/panel'} replace />;

    const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const enviar = async (e) => {
        e.preventDefault();
        setMensaje(null);
        setEnviando(true);
        try {
            if (modo === 'ingresar') {
                await iniciarSesion(form.correo, form.contrasena);
                navigate(siguiente || '/panel');
            } else {
                const conSesion = await registrarse(form.nombre, form.correo, form.contrasena, siguiente || '/bienvenida');
                if (conSesion) {
                    navigate(siguiente || '/bienvenida');
                } else {
                    setMensaje({ tipo: 'success', texto: 'Te enviamos un correo para confirmar tu cuenta. Luego podrás ingresar.' });
                    setModo('ingresar');
                }
            }
        } catch (err) {
            setMensaje({ tipo: 'danger', texto: mensajeError(err) });
        } finally {
            setEnviando(false);
        }
    };

    const entrarDemo = async () => {
        setMensaje(null);
        setEnviando(true);
        try {
            await iniciarSesion(DEMO_CORREO, DEMO_CONTRASENA);
            navigate('/panel');
        } catch (err) {
            setMensaje({ tipo: 'danger', texto: mensajeError(err) });
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="pantalla-login con-panel">
            <aside className="panel-marca">
                <div>
                    <span className="marca-inicial">{APP_NOMBRE[0]}</span>
                    <span className="ms-2 fw-semibold">{APP_NOMBRE}</span>
                </div>
                <div>
                    <h2>Cada activo, en su lugar y con su historia.</h2>
                    <div className="linea-acento" />
                    <ul>
                        <li>Registro por lote con lector RFID, código de barras o QR</li>
                        <li>Procesos, traslados y bajas con historial completo</li>
                        <li>Indicadores y reportes en Excel y PDF</li>
                    </ul>
                </div>
                <p className="firma mb-0">
                    Desarrollado por <strong>BeMaker</strong>
                </p>
            </aside>

            <div className="zona-formulario">
                <div className="card tarjeta-login">
                    <div className="card-body p-4 p-md-5">
                        <div className="text-center mb-4">
                            <span className="marca-inicial grande">{APP_NOMBRE[0]}</span>
                            <h1 className="h4 mt-3 mb-1">{APP_NOMBRE}</h1>
                            <p className="text-muted small mb-0">Trazabilidad de activos</p>
                        </div>

                        {!dbConfigurado && (
                            <div className="alert alert-warning small">
                                Falta configurar Supabase: copia <code>.env.example</code> a <code>.env</code> y completa{' '}
                                <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
                            </div>
                        )}

                        {DEMO && DEMO_CORREO && (
                            <div className="recuadro-demo mb-4">
                                <p className="fw-semibold mb-1">Prueba la demo</p>
                                <p className="small text-muted mb-0">
                                    Entra como administrador. Puedes cambiar lo que quieras: los datos se reinician cada noche.
                                </p>
                                <dl className="credenciales">
                                    <dt>Correo</dt>
                                    <dd>{DEMO_CORREO}</dd>
                                    <dt>Contraseña</dt>
                                    <dd>{DEMO_CONTRASENA}</dd>
                                </dl>
                                <button className="btn btn-primario w-100" onClick={entrarDemo} disabled={enviando}>
                                    {enviando ? 'Entrando…' : 'Entrar a la demo'}
                                </button>
                            </div>
                        )}

                        {/* En la demo el registro está cerrado: solo se ingresa */}
                        {!DEMO && (
                            <ul className="nav nav-pills nav-fill mb-3">
                                <li className="nav-item">
                                    <button className={`nav-link ${modo === 'ingresar' ? 'active' : ''}`} onClick={() => setModo('ingresar')}>
                                        Ingresar
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button className={`nav-link ${modo === 'registro' ? 'active' : ''}`} onClick={() => setModo('registro')}>
                                        Crear cuenta
                                    </button>
                                </li>
                            </ul>
                        )}

                        <form onSubmit={enviar}>
                            {modo === 'registro' && (
                                <div className="mb-3">
                                    <label className="form-label">Nombre completo</label>
                                    <input className="form-control" name="nombre" value={form.nombre} onChange={cambiar} required />
                                </div>
                            )}
                            <div className="mb-3">
                                <label className="form-label">Correo</label>
                                <input
                                    className="form-control"
                                    type="email"
                                    name="correo"
                                    autoComplete="email"
                                    value={form.correo}
                                    onChange={cambiar}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Contraseña</label>
                                <div className="input-group">
                                    <input
                                        className="form-control"
                                        type={verContrasena ? 'text' : 'password'}
                                        name="contrasena"
                                        autoComplete={modo === 'ingresar' ? 'current-password' : 'new-password'}
                                        minLength={modo === 'registro' ? 8 : undefined}
                                        value={form.contrasena}
                                        onChange={cambiar}
                                        required
                                    />
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setVerContrasena(!verContrasena)}>
                                        {verContrasena ? 'Ocultar' : 'Ver'}
                                    </button>
                                </div>
                            </div>

                            {mensaje && <div className={`alert alert-${mensaje.tipo} small`}>{mensaje.texto}</div>}

                            <button className="btn btn-primario w-100" disabled={enviando}>
                                {enviando ? 'Procesando…' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
                            </button>
                        </form>
                        {modo === 'registro' && (
                            <p className="small text-muted mt-3 mb-0">
                                Si te invitaron a una organización, crea tu cuenta con el mismo correo de la invitación.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
