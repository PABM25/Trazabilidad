import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowRightArrowLeft,
    faBars,
    faBoxesStacked,
    faChartLine,
    faGear,
    faMagnifyingGlass,
    faMapLocationDot,
    faPlus,
    faRightFromBracket,
    faRotate,
    faTrashCan,
    faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { APP_NOMBRE, DEMO, ROLES } from '../config';

const MENU = [
    { ruta: '/panel', etiqueta: 'Panel', icono: faChartLine },
    { ruta: '/activos', etiqueta: 'Activos', icono: faBoxesStacked },
    { ruta: '/consultar', etiqueta: 'Consultar activo', icono: faMagnifyingGlass },
    { ruta: '/registrar', etiqueta: 'Registrar activos', icono: faPlus, editar: true },
    { ruta: '/procesos', etiqueta: 'Registrar proceso', icono: faRotate, editar: true },
    { ruta: '/traslados', etiqueta: 'Traslados', icono: faArrowRightArrowLeft, editar: true },
    { ruta: '/bajas', etiqueta: 'Dar de baja', icono: faTrashCan, editar: true },
    { ruta: '/ubicaciones', etiqueta: 'Ubicaciones', icono: faMapLocationDot },
    { ruta: '/usuarios', etiqueta: 'Usuarios', icono: faUsers, admin: true },
    { ruta: '/configuracion', etiqueta: 'Configuración', icono: faGear, admin: true },
];

const Layout = ({ titulo, acciones, children }) => {
    const { organizacion, membresia, membresias, elegirOrganizacion, cerrarSesion, esAdmin, puedeEditar } = useAuth();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const navigate = useNavigate();

    const salir = async () => {
        await cerrarSesion();
        navigate('/login');
    };

    const items = MENU.filter((i) => (!i.admin || esAdmin) && (!i.editar || puedeEditar));

    return (
        <div className="app">
            <aside className={`menu-lateral ${menuAbierto ? 'abierto' : ''}`}>
                <div className="marca" onClick={() => navigate('/panel')}>
                    {organizacion?.logo_url ? (
                        <img src={organizacion.logo_url} alt="" />
                    ) : (
                        <span className="marca-inicial">{(organizacion?.nombre || APP_NOMBRE)[0]}</span>
                    )}
                    <span className="marca-nombre">{organizacion?.nombre || APP_NOMBRE}</span>
                </div>
                <nav>
                    {items.map((i) => (
                        <NavLink key={i.ruta} to={i.ruta} onClick={() => setMenuAbierto(false)}>
                            <FontAwesomeIcon icon={i.icono} fixedWidth /> {i.etiqueta}
                        </NavLink>
                    ))}
                </nav>
                <div className="pie-menu">
                    {APP_NOMBRE}
                    <div className="firma">
                        Desarrollado por <strong>BeMaker</strong>
                    </div>
                </div>
            </aside>
            {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} />}

            <div className="contenido">
                {DEMO && (
                    <div className="aviso-demo">
                        Estás en la <strong>demo</strong> de {APP_NOMBRE}: puedes cambiar lo que quieras, los datos se reinician cada noche.
                    </div>
                )}
                <header className="barra-superior">
                    <button className="btn btn-link d-lg-none" onClick={() => setMenuAbierto(true)} aria-label="Menú">
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                    <h1 className="h5 mb-0 flex-grow-1">{titulo}</h1>

                    {membresias.length > 1 && (
                        <select
                            className="form-select form-select-sm w-auto me-2"
                            value={organizacion?.id}
                            onChange={(e) => elegirOrganizacion(e.target.value)}
                        >
                            {membresias.map((m) => (
                                <option key={m.organizacion.id} value={m.organizacion.id}>
                                    {m.organizacion.nombre}
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="dropdown">
                        <button className="btn btn-light btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                            {membresia?.nombre_completo || membresia?.correo}
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li className="dropdown-item-text small text-muted">
                                {membresia?.correo}
                                <br />
                                {ROLES[membresia?.rol]}
                            </li>
                            <li>
                                <hr className="dropdown-divider" />
                            </li>
                            <li>
                                <button className="dropdown-item text-danger" onClick={salir}>
                                    <FontAwesomeIcon icon={faRightFromBracket} /> Cerrar sesión
                                </button>
                            </li>
                        </ul>
                    </div>
                </header>

                <main className="p-3 p-md-4">
                    {acciones && <div className="d-flex flex-wrap gap-2 mb-3 justify-content-end">{acciones}</div>}
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
