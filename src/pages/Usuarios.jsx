import { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faPen, faTrash, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useCatalogos } from '../hooks/useCatalogos';
import { db, q } from '../lib/db';
import { ROLES } from '../config';
import { fecha } from '../utils/formato';
import { confirmar, error, exito } from '../utils/alertas';

const DESCRIPCION_ROLES = {
    admin: 'Todo, incluida la configuración y los usuarios',
    operador: 'Registrar activos, procesos, traslados y bajas',
    lector: 'Solo consultar y descargar reportes',
};

/** Miembros de la organización e invitaciones pendientes */
const Usuarios = () => {
    const { organizacion, usuario } = useAuth();
    const { ubicaciones } = useCatalogos();
    const [miembros, setMiembros] = useState([]);
    const [invitaciones, setInvitaciones] = useState([]);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const [m, i] = await Promise.all([
                q(db.from('miembros').select('*').eq('organizacion_id', organizacion.id).order('nombre_completo')),
                q(db.from('invitaciones').select('*').eq('organizacion_id', organizacion.id).is('aceptada_en', null).order('creado_en')),
            ]);
            setMiembros(m);
            setInvitaciones(i);
        } catch (e) {
            error(e);
        }
    }, [organizacion.id]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const enlaceInvitacion = (i) => `${window.location.origin}/bienvenida?codigo=${i.codigo}`;

    const copiarEnlace = async (i, recienCreada = false) => {
        const enlace = enlaceInvitacion(i);
        let copiado = false;
        try {
            await navigator.clipboard.writeText(enlace);
            copiado = true;
        } catch {
            // sin permiso de portapapeles: se muestra el enlace para copiarlo a mano
        }
        exito(
            recienCreada ? 'Invitación creada' : 'Enlace de invitación',
            `${copiado ? 'Enlace copiado. ' : ''}Envíalo a ${i.correo}: ${enlace} — debe crear su cuenta (o ingresar) con ese mismo correo.`
        );
    };

    const nombreUbicacion = (id) => ubicaciones.find((u) => u.id === id)?.nombre || '—';

    const guardar = async () => {
        setGuardando(true);
        try {
            const datos = {
                nombre_completo: editando.nombre_completo.trim(),
                rol: editando.rol,
                ubicacion_id: editando.ubicacion_id || null,
            };
            if (editando.tipo === 'miembro') {
                await q(
                    db.from('miembros').update(datos).eq('organizacion_id', organizacion.id).eq('usuario_id', editando.usuario_id)
                );
            } else if (editando.id) {
                await q(db.from('invitaciones').update(datos).eq('id', editando.id));
            } else {
                const nueva = await q(
                    db
                        .from('invitaciones')
                        .insert({ ...datos, organizacion_id: organizacion.id, correo: editando.correo.trim().toLowerCase() })
                        .select()
                        .single()
                );
                await copiarEnlace(nueva, true);
            }
            setEditando(null);
            cargar();
        } catch (e) {
            error(e);
        } finally {
            setGuardando(false);
        }
    };

    const quitarMiembro = async (m) => {
        if (!(await confirmar(`¿Quitar a ${m.nombre_completo || m.correo}?`, 'Perderá el acceso a esta organización.', 'Quitar'))) return;
        try {
            await q(db.from('miembros').delete().eq('organizacion_id', organizacion.id).eq('usuario_id', m.usuario_id));
            cargar();
        } catch (e) {
            error(e);
        }
    };

    const anularInvitacion = async (i) => {
        if (!(await confirmar(`¿Anular la invitación a ${i.correo}?`, '', 'Anular'))) return;
        try {
            await q(db.from('invitaciones').delete().eq('id', i.id));
            cargar();
        } catch (e) {
            error(e);
        }
    };

    return (
        <Layout
            titulo="Usuarios"
            acciones={
                <button
                    className="btn btn-primario"
                    onClick={() => setEditando({ tipo: 'invitacion', correo: '', nombre_completo: '', rol: 'operador', ubicacion_id: '' })}
                >
                    <FontAwesomeIcon icon={faUserPlus} /> Invitar usuario
                </button>
            }
        >
            <div className="card mb-4">
                <div className="card-header">Miembros ({miembros.length})</div>
                <div className="table-responsive">
                    <table className="table align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Correo</th>
                                <th>Rol</th>
                                <th>Ubicación</th>
                                <th>Desde</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {miembros.map((m) => (
                                <tr key={m.usuario_id}>
                                    <td>
                                        {m.nombre_completo || '—'}
                                        {m.usuario_id === usuario.id && <span className="badge text-bg-light ms-2">Tú</span>}
                                    </td>
                                    <td>{m.correo}</td>
                                    <td>{ROLES[m.rol]}</td>
                                    <td>{nombreUbicacion(m.ubicacion_id)}</td>
                                    <td>{fecha(m.creado_en)}</td>
                                    <td className="text-end text-nowrap">
                                        <button className="btn btn-sm btn-light" onClick={() => setEditando({ ...m, tipo: 'miembro', ubicacion_id: m.ubicacion_id || '' })}>
                                            <FontAwesomeIcon icon={faPen} />
                                        </button>
                                        {m.usuario_id !== usuario.id && (
                                            <button className="btn btn-sm btn-light text-danger ms-1" onClick={() => quitarMiembro(m)}>
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {invitaciones.length > 0 && (
                <div className="card">
                    <div className="card-header">Invitaciones pendientes ({invitaciones.length})</div>
                    <div className="table-responsive">
                        <table className="table align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Correo</th>
                                    <th>Nombre</th>
                                    <th>Rol</th>
                                    <th>Creada</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {invitaciones.map((i) => (
                                    <tr key={i.id}>
                                        <td>{i.correo}</td>
                                        <td>{i.nombre_completo || '—'}</td>
                                        <td>{ROLES[i.rol]}</td>
                                        <td>{fecha(i.creado_en)}</td>
                                        <td className="text-end text-nowrap">
                                            <button className="btn btn-sm btn-light me-1" onClick={() => copiarEnlace(i)} title="Copiar enlace">
                                                <FontAwesomeIcon icon={faLink} />
                                            </button>
                                            <button className="btn btn-sm btn-light" onClick={() => setEditando({ ...i, tipo: 'invitacion', ubicacion_id: i.ubicacion_id || '' })}>
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                            <button className="btn btn-sm btn-light text-danger ms-1" onClick={() => anularInvitacion(i)}>
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {editando && (
                <Modal
                    titulo={editando.tipo === 'miembro' ? 'Editar miembro' : editando.id ? 'Editar invitación' : 'Invitar usuario'}
                    textoEnviar={editando.tipo === 'invitacion' && !editando.id ? 'Invitar' : 'Guardar'}
                    onCerrar={() => setEditando(null)}
                    onEnviar={guardar}
                    enviando={guardando}
                >
                    <div className="mb-3">
                        <label className="form-label">Correo</label>
                        <input
                            className="form-control"
                            type="email"
                            value={editando.correo}
                            onChange={(e) => setEditando({ ...editando, correo: e.target.value })}
                            disabled={editando.tipo === 'miembro' || Boolean(editando.id)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Nombre completo</label>
                        <input
                            className="form-control"
                            value={editando.nombre_completo}
                            onChange={(e) => setEditando({ ...editando, nombre_completo: e.target.value })}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Rol</label>
                        {Object.entries(ROLES).map(([k, v]) => (
                            <div className="form-check" key={k}>
                                <input
                                    id={`rol-${k}`}
                                    className="form-check-input"
                                    type="radio"
                                    checked={editando.rol === k}
                                    onChange={() => setEditando({ ...editando, rol: k })}
                                />
                                <label htmlFor={`rol-${k}`} className="form-check-label">
                                    {v} <span className="text-muted small">— {DESCRIPCION_ROLES[k]}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Ubicación asignada (opcional)</label>
                        <select className="form-select" value={editando.ubicacion_id} onChange={(e) => setEditando({ ...editando, ubicacion_id: e.target.value })}>
                            <option value="">Ninguna</option>
                            {ubicaciones.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                </Modal>
            )}
        </Layout>
    );
};

export default Usuarios;
