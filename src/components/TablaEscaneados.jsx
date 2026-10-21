import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import EstadoBadge from './EstadoBadge';

/** Tabla de activos agregados por escaneo, con observación opcional por fila */
const TablaEscaneados = ({ lista, onQuitar, onObservacion }) => (
    <div className="table-responsive">
        <table className="table align-middle mb-0">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th className="text-end">Procesos</th>
                    {onObservacion && <th>Observación</th>}
                    <th />
                </tr>
            </thead>
            <tbody>
                {lista.map((a) => (
                    <tr key={a.id}>
                        <td>{a.codigo}</td>
                        <td>{a.tipo_nombre}</td>
                        <td>{a.ubicacion_nombre || '—'}</td>
                        <td>
                            <EstadoBadge estado={a.estado} />
                        </td>
                        <td className="text-end">
                            {a.cantidad_procesos}
                            {a.vida_util && <span className="text-muted small"> / {a.vida_util}</span>}
                        </td>
                        {onObservacion && (
                            <td>
                                <input
                                    className="form-control form-control-sm"
                                    value={a.nuevaObservacion}
                                    placeholder={a.observaciones || ''}
                                    onChange={(e) => onObservacion(a.id, e.target.value)}
                                />
                            </td>
                        )}
                        <td className="text-end">
                            <button className="btn btn-sm btn-link text-danger" onClick={() => onQuitar(a.id)} title="Quitar de la lista">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </td>
                    </tr>
                ))}
                {lista.length === 0 && (
                    <tr>
                        <td colSpan={7} className="text-center text-muted py-4">
                            Escanea los activos para agregarlos a la lista.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

export default TablaEscaneados;
