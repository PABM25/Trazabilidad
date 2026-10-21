import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowDown, faPlus } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import Indicadores from '../components/Indicadores';
import ReporteEventos from '../components/ReporteEventos';
import EstadoBadge from '../components/EstadoBadge';
import { useAuth } from '../context/AuthContext';
import { db, q } from '../lib/db';
import { fecha } from '../utils/formato';

const Panel = () => {
    const { organizacion, puedeEditar } = useAuth();
    const navigate = useNavigate();
    const [recientes, setRecientes] = useState([]);
    const [verReporte, setVerReporte] = useState(false);

    useEffect(() => {
        q(
            db
                .from('activos_detalle')
                .select('*')
                .eq('organizacion_id', organizacion.id)
                .order('registrado_en', { ascending: false })
                .limit(10)
        )
            .then(setRecientes)
            .catch((e) => console.error(e));
    }, [organizacion.id]);

    return (
        <Layout
            titulo="Panel principal"
            acciones={
                <>
                    <button className="btn btn-outline-secondary" onClick={() => setVerReporte(true)}>
                        <FontAwesomeIcon icon={faFileArrowDown} /> Descargar reporte
                    </button>
                    {puedeEditar && (
                        <button className="btn btn-primario" onClick={() => navigate('/registrar')}>
                            <FontAwesomeIcon icon={faPlus} /> Registrar activos
                        </button>
                    )}
                </>
            }
        >
            <Indicadores />

            <div className="card">
                <div className="card-header">Últimos activos registrados</div>
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Tipo</th>
                                <th>Ubicación</th>
                                <th>Estado</th>
                                <th className="text-end">Procesos</th>
                                <th>Registrado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recientes.map((a) => (
                                <tr key={a.id}>
                                    <td>
                                        <Link to={`/activos/${a.id}`}>{a.codigo}</Link>
                                    </td>
                                    <td>{a.tipo_nombre}</td>
                                    <td>{a.ubicacion_nombre || '—'}</td>
                                    <td>
                                        <EstadoBadge estado={a.estado} />
                                    </td>
                                    <td className="text-end">{a.cantidad_procesos}</td>
                                    <td>{fecha(a.registrado_en)}</td>
                                </tr>
                            ))}
                            {recientes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-4">
                                        Aún no hay activos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {verReporte && <ReporteEventos onCerrar={() => setVerReporte(false)} />}
        </Layout>
    );
};

export default Panel;
