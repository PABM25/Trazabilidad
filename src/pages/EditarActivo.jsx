import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import CamposAtributos from '../components/CamposAtributos';
import { useAuth } from '../context/AuthContext';
import { useCatalogos } from '../hooks/useCatalogos';
import { db, q } from '../lib/db';
import { ESTADOS } from '../config';
import { fecha } from '../utils/formato';
import { error, exito } from '../utils/alertas';

const EditarActivo = () => {
    const { id } = useParams();
    const { organizacion } = useAuth();
    const { ubicaciones, tiposActivo } = useCatalogos();
    const navigate = useNavigate();
    const [activo, setActivo] = useState(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        q(db.from('activos').select('*').eq('id', id).single())
            .then(setActivo)
            .catch(error);
    }, [id]);

    if (!activo) return <Layout titulo="Editar activo">Cargando…</Layout>;

    const tipo = tiposActivo.find((t) => t.id === activo.tipo_activo_id);
    const cambiar = (campo, valor) => setActivo({ ...activo, [campo]: valor });

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const cambios = {
                tipo_activo_id: activo.tipo_activo_id,
                ubicacion_id: activo.ubicacion_id || null,
                estado: activo.estado,
                atributos: activo.atributos,
                observaciones: activo.observaciones,
            };
            await q(db.from('activos').update(cambios).eq('id', id));
            await q(
                db.from('eventos').insert({
                    organizacion_id: organizacion.id,
                    activo_id: id,
                    clase: 'edicion',
                    ubicacion_id: cambios.ubicacion_id,
                })
            );
            await exito('Activo actualizado', `Se guardaron los cambios de ${activo.codigo}.`);
            navigate(`/activos/${id}`);
        } catch (err) {
            error(err);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Layout titulo={`Editar activo ${activo.codigo}`}>
            <form className="card" style={{ maxWidth: 640 }} onSubmit={guardar}>
                <div className="card-body">
                    <div className="row mb-3 small text-muted">
                        <div className="col">Código: {activo.codigo}</div>
                        <div className="col">Registrado: {fecha(activo.registrado_en)}</div>
                        <div className="col">Procesos: {activo.cantidad_procesos}</div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Tipo de activo</label>
                        <select className="form-select" value={activo.tipo_activo_id} onChange={(e) => cambiar('tipo_activo_id', e.target.value)}>
                            {tiposActivo.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <CamposAtributos campos={tipo?.campos} valores={activo.atributos} onChange={(v) => cambiar('atributos', v)} />
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Ubicación</label>
                            <select className="form-select" value={activo.ubicacion_id || ''} onChange={(e) => cambiar('ubicacion_id', e.target.value)}>
                                <option value="">Sin ubicación</option>
                                {ubicaciones.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Estado</label>
                            <select
                                className="form-select"
                                value={activo.estado}
                                onChange={(e) => cambiar('estado', e.target.value)}
                                disabled={activo.estado === 'baja'}
                            >
                                {Object.entries(ESTADOS)
                                    .filter(([k]) => k !== 'baja' || activo.estado === 'baja')
                                    .map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v.etiqueta}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Observaciones</label>
                        <textarea
                            className="form-control"
                            rows={3}
                            value={activo.observaciones || ''}
                            onChange={(e) => cambiar('observaciones', e.target.value)}
                        />
                    </div>
                    <div className="d-flex gap-2 justify-content-end">
                        <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>
                            Cancelar
                        </button>
                        <button className="btn btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </form>
        </Layout>
    );
};

export default EditarActivo;
