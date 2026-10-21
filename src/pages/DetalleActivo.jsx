import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import LectorCodigos from '../components/LectorCodigos';
import EstadoBadge from '../components/EstadoBadge';
import { useAuth } from '../context/AuthContext';
import { db, q } from '../lib/db';
import { CLASES_EVENTO } from '../config';
import { fecha, fechaHora, valorAtributo } from '../utils/formato';
import { aviso, error } from '../utils/alertas';

/**
 * Ficha de un activo con su historial. En /consultar permite buscarlo por código (lector).
 */
const DetalleActivo = () => {
    const { id } = useParams();
    const { organizacion, puedeEditar } = useAuth();
    const navigate = useNavigate();
    const [activo, setActivo] = useState(null);
    const [tipo, setTipo] = useState(null);
    const [eventos, setEventos] = useState([]);

    useEffect(() => {
        if (!id) {
            setActivo(null);
            return;
        }
        (async () => {
            const a = await q(db.from('activos_detalle').select('*').eq('id', id).single());
            const [t, ev] = await Promise.all([
                q(db.from('tipos_activo').select('*').eq('id', a.tipo_activo_id).single()),
                q(
                    db
                        .from('eventos')
                        .select('id, clase, ocurrido_en, observaciones, tipo_evento:tipos_evento(nombre, color), ubicacion:ubicaciones(nombre)')
                        .eq('activo_id', id)
                        .order('ocurrido_en', { ascending: false })
                        .limit(500)
                ),
            ]);
            setActivo(a);
            setTipo(t);
            setEventos(ev);
        })().catch(error);
    }, [id]);

    const buscar = async (codigo) => {
        try {
            const a = await q(
                db.from('activos').select('id').eq('organizacion_id', organizacion.id).eq('codigo', codigo).maybeSingle()
            );
            if (!a) return aviso('Código no registrado', `No existe un activo con el código ${codigo}.`);
            navigate(`/activos/${a.id}`);
        } catch (e) {
            error(e);
        }
    };

    return (
        <Layout
            titulo={activo ? `Activo ${activo.codigo}` : 'Consultar activo'}
            acciones={
                activo &&
                puedeEditar && (
                    <button className="btn btn-primario" onClick={() => navigate(`/activos/${activo.id}/editar`)}>
                        <FontAwesomeIcon icon={faPen} /> Editar
                    </button>
                )
            }
        >
            <div className="card mb-4">
                <div className="card-body">
                    <LectorCodigos onCodigo={buscar} placeholder="Escanea o escribe el código del activo a consultar" />
                </div>
            </div>

            {activo && (
                <div className="row g-4">
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-body">
                                <dl className="ficha mb-0">
                                    <dt>Código</dt>
                                    <dd>{activo.codigo}</dd>
                                    <dt>Tipo</dt>
                                    <dd>{activo.tipo_nombre}</dd>
                                    {tipo?.campos.map((c) => (
                                        <Fragment key={c.clave}>
                                            <dt>{c.etiqueta}</dt>
                                            <dd>{valorAtributo(c, activo.atributos?.[c.clave])}</dd>
                                        </Fragment>
                                    ))}
                                    <dt>Estado</dt>
                                    <dd>
                                        <EstadoBadge estado={activo.estado} />
                                    </dd>
                                    <dt>Ubicación</dt>
                                    <dd>{activo.ubicacion_nombre || '—'}</dd>
                                    <dt>Procesos</dt>
                                    <dd>
                                        {activo.cantidad_procesos}
                                        {activo.vida_util && ` de ${activo.vida_util} permitidos`}
                                    </dd>
                                    <dt>Último proceso</dt>
                                    <dd>{fecha(activo.ultimo_proceso_en)}</dd>
                                    <dt>Registrado</dt>
                                    <dd>{fecha(activo.registrado_en)}</dd>
                                    {activo.baja_en && (
                                        <>
                                            <dt>Dado de baja</dt>
                                            <dd>{fecha(activo.baja_en)}</dd>
                                        </>
                                    )}
                                    <dt>Observaciones</dt>
                                    <dd>{activo.observaciones || '—'}</dd>
                                </dl>
                                {activo.vida_util && (
                                    <div className="progress mt-3" role="progressbar" title="Vida útil consumida">
                                        <div
                                            className={`progress-bar ${activo.cantidad_procesos >= activo.vida_util * 0.9 ? 'bg-warning' : ''}`}
                                            style={{ width: `${Math.min(100, (activo.cantidad_procesos / activo.vida_util) * 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-8">
                        <div className="card">
                            <div className="card-header">Historial ({eventos.length})</div>
                            <ul className="list-group list-group-flush historial">
                                {eventos.map((e) => (
                                    <li key={e.id} className="list-group-item">
                                        <div className="d-flex justify-content-between">
                                            <strong>
                                                {e.clase === 'proceso' && e.tipo_evento ? (
                                                    <>
                                                        <span className="punto" style={{ background: e.tipo_evento.color }} />
                                                        {e.tipo_evento.nombre}
                                                    </>
                                                ) : (
                                                    CLASES_EVENTO[e.clase]
                                                )}
                                            </strong>
                                            <span className="text-muted small">{fechaHora(e.ocurrido_en)}</span>
                                        </div>
                                        {(e.ubicacion || e.observaciones) && (
                                            <div className="small text-muted">
                                                {e.ubicacion && <span>{e.clase === 'traslado' ? 'Hacia ' : 'En '}{e.ubicacion.nombre}</span>}
                                                {e.ubicacion && e.observaciones && ' · '}
                                                {e.observaciones}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default DetalleActivo;
