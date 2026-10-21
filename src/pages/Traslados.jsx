import { useState } from 'react';
import Layout from '../components/Layout';
import LectorCodigos from '../components/LectorCodigos';
import TablaEscaneados from '../components/TablaEscaneados';
import { useAuth } from '../context/AuthContext';
import { useCatalogos } from '../hooks/useCatalogos';
import { useActivosEscaneados } from '../hooks/useActivosEscaneados';
import { db, q } from '../lib/db';
import { aviso, error, exito } from '../utils/alertas';

/** Mueve un lote de activos a otra ubicación (distribución a clientes, retorno a bodega…) */
const Traslados = () => {
    const { organizacion } = useAuth();
    const { ubicaciones } = useCatalogos();
    const { lista, agregar, quitar, limpiar } = useActivosEscaneados();
    const [destino, setDestino] = useState('');
    const [guardando, setGuardando] = useState(false);

    const trasladar = async () => {
        if (lista.length === 0) return aviso('Lista vacía', 'Escanea al menos un activo.');
        setGuardando(true);
        try {
            const r = await q(
                db.rpc('trasladar_activos', {
                    p_org: organizacion.id,
                    p_codigos: lista.map((a) => a.codigo),
                    p_ubicacion: destino === 'ninguna' ? null : destino,
                })
            );
            const nombre = ubicaciones.find((u) => u.id === destino)?.nombre || 'sin ubicación';
            await exito('Traslado registrado', `${r.actualizados} activos quedaron en ${nombre}.`);
            limpiar();
        } catch (e) {
            error(e);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Layout titulo="Traslados">
            <div className="card">
                <div className="card-body row g-3 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label">Ubicación de destino</label>
                        <select className="form-select" value={destino} onChange={(e) => setDestino(e.target.value)}>
                            <option value="">Selecciona…</option>
                            {ubicaciones
                                .filter((u) => u.activa)
                                .map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.nombre}
                                        {u.es_almacen ? ' (bodega)' : ''}
                                    </option>
                                ))}
                            <option value="ninguna">Sin ubicación</option>
                        </select>
                    </div>
                    <div className="col-md-8">
                        <LectorCodigos onCodigo={agregar} />
                    </div>
                </div>
                <TablaEscaneados lista={lista} onQuitar={quitar} />
                <div className="card-footer d-flex justify-content-between align-items-center">
                    <span className="text-muted small">{lista.length} activos en la lista</span>
                    <button className="btn btn-primario" onClick={trasladar} disabled={guardando || !destino || lista.length === 0}>
                        {guardando ? 'Trasladando…' : 'Confirmar traslado'}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default Traslados;
