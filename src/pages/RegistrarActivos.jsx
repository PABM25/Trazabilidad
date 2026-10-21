import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import LectorCodigos from '../components/LectorCodigos';
import CamposAtributos from '../components/CamposAtributos';
import { useAuth } from '../context/AuthContext';
import { useCatalogos } from '../hooks/useCatalogos';
import { db, q } from '../lib/db';
import { aviso, confirmar, error, exito } from '../utils/alertas';

const RegistrarActivos = () => {
    const { organizacion } = useAuth();
    const { ubicaciones, tiposActivo } = useCatalogos();
    const navigate = useNavigate();
    const [codigos, setCodigos] = useState([]);
    const [tipoId, setTipoId] = useState('');
    const [ubicacionId, setUbicacionId] = useState('');
    const [atributos, setAtributos] = useState({});
    const [guardando, setGuardando] = useState(false);

    const tipo = tiposActivo.find((t) => t.id === (tipoId || tiposActivo[0]?.id));

    const agregar = async (codigo) => {
        if (codigos.includes(codigo)) return;
        const existente = await q(
            db.from('activos').select('id').eq('organizacion_id', organizacion.id).eq('codigo', codigo).maybeSingle()
        ).catch(() => null);
        if (existente) return aviso('Código ya registrado', `El código ${codigo} ya existe en el sistema.`);
        setCodigos((c) => (c.includes(codigo) ? c : [...c, codigo]));
    };

    const limpiar = async () => {
        if (await confirmar('¿Limpiar la lista?', 'Se quitarán todos los códigos leídos.', 'Limpiar')) setCodigos([]);
    };

    const guardar = async (e) => {
        e.preventDefault();
        if (codigos.length === 0) return aviso('Sin códigos', 'Escanea o escribe al menos un código.');
        if (!tipo) return aviso('Sin tipo de activo', 'Crea un tipo de activo en Configuración.');
        setGuardando(true);
        try {
            const total = await q(
                db.rpc('registrar_activos', {
                    p_org: organizacion.id,
                    p_codigos: codigos,
                    p_tipo_activo: tipo.id,
                    p_ubicacion: ubicacionId || null,
                    p_atributos: atributos,
                })
            );
            await exito('Registro exitoso', `Se registraron ${total} activos.`);
            navigate('/activos');
        } catch (err) {
            error(err);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Layout titulo="Registrar activos">
            <div className="row g-4">
                <div className="col-lg-5">
                    <form className="card" onSubmit={guardar}>
                        <div className="card-body">
                            <p className="text-muted small">Los datos se aplican a todos los códigos de la lista.</p>
                            <div className="mb-3">
                                <label className="form-label">Tipo de activo</label>
                                <select
                                    className="form-select"
                                    value={tipo?.id || ''}
                                    onChange={(e) => {
                                        setTipoId(e.target.value);
                                        setAtributos({});
                                    }}
                                    required
                                >
                                    {tiposActivo.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <CamposAtributos campos={tipo?.campos} valores={atributos} onChange={setAtributos} />
                            <div className="mb-3">
                                <label className="form-label">Ubicación inicial (opcional)</label>
                                <select className="form-select" value={ubicacionId} onChange={(e) => setUbicacionId(e.target.value)}>
                                    <option value="">Sin ubicación</option>
                                    {ubicaciones
                                        .filter((u) => u.activa)
                                        .map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.nombre}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <button className="btn btn-primario w-100" disabled={guardando || codigos.length === 0}>
                                {guardando ? 'Guardando…' : `Registrar ${codigos.length} activo${codigos.length === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="col-lg-7">
                    <div className="card">
                        <div className="card-body">
                            <LectorCodigos onCodigo={agregar} />
                        </div>
                        <div className="card-header d-flex justify-content-between align-items-center border-top">
                            <span>Códigos leídos ({codigos.length})</span>
                            {codigos.length > 0 && (
                                <button className="btn btn-sm btn-outline-danger" onClick={limpiar}>
                                    <FontAwesomeIcon icon={faTrash} /> Limpiar
                                </button>
                            )}
                        </div>
                        <ul className="list-group list-group-flush lista-codigos">
                            {codigos.map((c, i) => (
                                <li key={c} className="list-group-item d-flex justify-content-between">
                                    <span>
                                        <span className="text-muted me-2">{i + 1}.</span>
                                        {c}
                                    </span>
                                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => setCodigos(codigos.filter((x) => x !== c))}>
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </li>
                            ))}
                            {codigos.length === 0 && <li className="list-group-item text-muted">Aún no hay códigos.</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RegistrarActivos;
