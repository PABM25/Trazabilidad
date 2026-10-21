import { useState } from 'react';
import Layout from '../components/Layout';
import LectorCodigos from '../components/LectorCodigos';
import TablaEscaneados from '../components/TablaEscaneados';
import { useAuth } from '../context/AuthContext';
import { useActivosEscaneados } from '../hooks/useActivosEscaneados';
import { db, q } from '../lib/db';
import { aviso, confirmar, error, exito } from '../utils/alertas';

/** Da de baja activos dañados o al final de su vida útil. Quedan en el historial. */
const Bajas = () => {
    const { organizacion } = useAuth();
    const { lista, agregar, quitar, limpiar } = useActivosEscaneados();
    const [motivo, setMotivo] = useState('');
    const [guardando, setGuardando] = useState(false);

    const darDeBaja = async () => {
        if (lista.length === 0) return aviso('Lista vacía', 'Escanea al menos un activo.');
        if (!(await confirmar('¿Dar de baja?', `Se darán de baja ${lista.length} activos. Esta acción no se puede deshacer.`, 'Dar de baja')))
            return;
        setGuardando(true);
        try {
            const total = await q(
                db.rpc('dar_de_baja', { p_org: organizacion.id, p_ids: lista.map((a) => a.id), p_motivo: motivo })
            );
            await exito('Bajas registradas', `Se dieron de baja ${total} activos.`);
            limpiar();
            setMotivo('');
        } catch (e) {
            error(e);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Layout titulo="Dar de baja">
            <div className="card">
                <div className="card-body row g-3 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label">Motivo</label>
                        <input className="form-control" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Daño, fin de vida útil…" />
                    </div>
                    <div className="col-md-8">
                        <LectorCodigos onCodigo={agregar} />
                    </div>
                </div>
                <TablaEscaneados lista={lista} onQuitar={quitar} />
                <div className="card-footer d-flex justify-content-between align-items-center">
                    <span className="text-muted small">{lista.length} activos en la lista</span>
                    <button className="btn btn-danger" onClick={darDeBaja} disabled={guardando || lista.length === 0}>
                        {guardando ? 'Procesando…' : 'Dar de baja'}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default Bajas;
