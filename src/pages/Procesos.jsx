import { useState } from 'react';
import Layout from '../components/Layout';
import LectorCodigos from '../components/LectorCodigos';
import TablaEscaneados from '../components/TablaEscaneados';
import { useAuth } from '../context/AuthContext';
import { useCatalogos } from '../hooks/useCatalogos';
import { useActivosEscaneados } from '../hooks/useActivosEscaneados';
import { db, q } from '../lib/db';
import { aviso, error, exito } from '../utils/alertas';

/** Registra un proceso (lavado, mantención, inspección…) sobre un lote de activos */
const Procesos = () => {
    const { organizacion } = useAuth();
    const { tiposEvento } = useCatalogos();
    const { lista, agregar, quitar, actualizar, limpiar } = useActivosEscaneados();
    const [tipoId, setTipoId] = useState('');
    const [guardando, setGuardando] = useState(false);

    const tipo = tiposEvento.find((t) => t.id === (tipoId || tiposEvento[0]?.id));

    const registrar = async () => {
        if (!tipo) return aviso('Sin tipos de proceso', 'Crea un tipo de proceso en Configuración.');
        if (lista.length === 0) return aviso('Lista vacía', 'Escanea al menos un activo.');
        setGuardando(true);
        try {
            const total = await q(
                db.rpc('registrar_proceso', {
                    p_org: organizacion.id,
                    p_tipo_evento: tipo.id,
                    p_items: lista.map((a) => ({ activo_id: a.id, observaciones: a.nuevaObservacion })),
                })
            );
            await exito('Proceso registrado', `Se registró "${tipo.nombre}" en ${total} activos.`);
            limpiar();
        } catch (e) {
            error(e);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Layout titulo="Registrar proceso">
            <div className="card">
                <div className="card-body row g-3 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label">Proceso</label>
                        <select className="form-select" value={tipo?.id || ''} onChange={(e) => setTipoId(e.target.value)}>
                            {tiposEvento.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-8">
                        <LectorCodigos onCodigo={agregar} />
                    </div>
                </div>
                <TablaEscaneados lista={lista} onQuitar={quitar} onObservacion={(id, v) => actualizar(id, { nuevaObservacion: v })} />
                <div className="card-footer d-flex justify-content-between align-items-center">
                    <span className="text-muted small">{lista.length} activos en la lista</span>
                    <button className="btn btn-primario" onClick={registrar} disabled={guardando || lista.length === 0}>
                        {guardando ? 'Registrando…' : `Registrar ${tipo?.nombre?.toLowerCase() || 'proceso'}`}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default Procesos;
