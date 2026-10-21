import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Indicadores from '../components/Indicadores';
import { useAuth } from '../context/AuthContext';
import { db, q } from '../lib/db';
import { confirmar, error } from '../utils/alertas';

const VACIA = { nombre: '', es_almacen: false, capacidad: '', activa: true, notas: '' };

/** Lugares donde están los activos: plantas, clientes, bodegas, sucursales… */
const Ubicaciones = () => {
    const { id } = useParams();
    const { organizacion, esAdmin } = useAuth();
    const [ubicaciones, setUbicaciones] = useState([]);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(
        () =>
            q(db.from('ubicaciones_resumen').select('*').eq('organizacion_id', organizacion.id).order('nombre'))
                .then(setUbicaciones)
                .catch(error),
        [organizacion.id]
    );

    useEffect(() => {
        cargar();
    }, [cargar]);

    const guardar = async () => {
        setGuardando(true);
        try {
            const datos = {
                nombre: editando.nombre.trim(),
                es_almacen: editando.es_almacen,
                capacidad: editando.capacidad === '' ? null : Number(editando.capacidad),
                activa: editando.activa,
                notas: editando.notas || null,
            };
            if (editando.id) await q(db.from('ubicaciones').update(datos).eq('id', editando.id));
            else await q(db.from('ubicaciones').insert({ ...datos, organizacion_id: organizacion.id }));
            setEditando(null);
            cargar();
        } catch (e) {
            error(e);
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (u) => {
        if (!(await confirmar(`¿Eliminar "${u.nombre}"?`, 'Los activos que estén ahí quedarán sin ubicación.', 'Eliminar'))) return;
        try {
            await q(db.from('ubicaciones').delete().eq('id', u.id));
            cargar();
        } catch (e) {
            error(e);
        }
    };

    const seleccionada = ubicaciones.find((u) => u.id === id);

    if (id) {
        return (
            <Layout titulo={seleccionada ? `Panel de ${seleccionada.nombre}` : 'Ubicación'}>
                <Link to="/ubicaciones" className="d-inline-block mb-3">
                    ← Volver a ubicaciones
                </Link>
                <Indicadores ubicacionId={id} />
                <Link className="btn btn-outline-secondary" to={`/activos?ubicacion=${id}`}>
                    Ver activos de esta ubicación
                </Link>
            </Layout>
        );
    }

    return (
        <Layout
            titulo="Ubicaciones"
            acciones={
                esAdmin && (
                    <button className="btn btn-primario" onClick={() => setEditando(VACIA)}>
                        <FontAwesomeIcon icon={faPlus} /> Nueva ubicación
                    </button>
                )
            }
        >
            <div className="card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Tipo</th>
                                <th className="text-end">Activos</th>
                                <th className="text-end">Capacidad</th>
                                <th>Estado</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {ubicaciones.map((u) => {
                                const cantidad = u.cantidad_activos;
                                return (
                                    <tr key={u.id}>
                                        <td>
                                            {u.nombre}
                                            {u.notas && <div className="small text-muted">{u.notas}</div>}
                                        </td>
                                        <td>{u.es_almacen ? 'Bodega propia' : 'Externa / en uso'}</td>
                                        <td className="text-end">{cantidad}</td>
                                        <td className={`text-end ${u.capacidad && cantidad > u.capacidad ? 'text-danger fw-semibold' : ''}`}>
                                            {u.capacidad ?? '—'}
                                        </td>
                                        <td>
                                            <span className={`badge text-bg-${u.activa ? 'success' : 'secondary'}`}>{u.activa ? 'Activa' : 'Inactiva'}</span>
                                        </td>
                                        <td className="text-end text-nowrap">
                                            <Link className="btn btn-sm btn-light" to={`/ubicaciones/${u.id}`} title="Panel">
                                                <FontAwesomeIcon icon={faChartLine} />
                                            </Link>
                                            {esAdmin && (
                                                <>
                                                    <button className="btn btn-sm btn-light ms-1" onClick={() => setEditando({ ...u, capacidad: u.capacidad ?? '' })} title="Editar">
                                                        <FontAwesomeIcon icon={faPen} />
                                                    </button>
                                                    <button className="btn btn-sm btn-light text-danger ms-1" onClick={() => eliminar(u)} title="Eliminar">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {ubicaciones.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-4">
                                        Aún no hay ubicaciones.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editando && (
                <Modal
                    titulo={editando.id ? 'Editar ubicación' : 'Nueva ubicación'}
                    onCerrar={() => setEditando(null)}
                    onEnviar={guardar}
                    enviando={guardando}
                >
                    <div className="mb-3">
                        <label className="form-label">Nombre</label>
                        <input className="form-control" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Capacidad (opcional)</label>
                        <input
                            className="form-control"
                            type="number"
                            min={0}
                            value={editando.capacidad}
                            onChange={(e) => setEditando({ ...editando, capacidad: e.target.value })}
                        />
                        <div className="form-text">Cantidad de activos que debería tener. Se marca en rojo si se supera.</div>
                    </div>
                    <div className="form-check mb-2">
                        <input
                            id="es-almacen"
                            className="form-check-input"
                            type="checkbox"
                            checked={editando.es_almacen}
                            onChange={(e) => setEditando({ ...editando, es_almacen: e.target.checked })}
                        />
                        <label htmlFor="es-almacen" className="form-check-label">
                            Es bodega propia (los activos aquí cuentan como disponibles)
                        </label>
                    </div>
                    <div className="form-check mb-3">
                        <input
                            id="activa"
                            className="form-check-input"
                            type="checkbox"
                            checked={editando.activa}
                            onChange={(e) => setEditando({ ...editando, activa: e.target.checked })}
                        />
                        <label htmlFor="activa" className="form-check-label">
                            Activa
                        </label>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Notas</label>
                        <textarea className="form-control" rows={2} value={editando.notas || ''} onChange={(e) => setEditando({ ...editando, notas: e.target.value })} />
                    </div>
                </Modal>
            )}
        </Layout>
    );
};

export default Ubicaciones;
