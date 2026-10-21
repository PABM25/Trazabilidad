import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faFilePdf, faPen, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import Paginacion from '../components/Paginacion';
import EstadoBadge from '../components/EstadoBadge';
import { useAuth } from '../context/AuthContext';
import { useCatalogos } from '../hooks/useCatalogos';
import { db, todas } from '../lib/db';
import { ESTADOS } from '../config';
import { fecha, valorAtributo } from '../utils/formato';
import { exportarExcel, exportarPDF } from '../utils/exportar';
import { error } from '../utils/alertas';

const POR_PAGINA = 20;
const FILTROS = ['buscar', 'tipo', 'ubicacion', 'estado'];

const Activos = () => {
    const { organizacion, puedeEditar } = useAuth();
    const { ubicaciones, tiposActivo } = useCatalogos();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [filas, setFilas] = useState([]);
    const [total, setTotal] = useState(0);
    const [cargando, setCargando] = useState(true);

    const filtros = Object.fromEntries(FILTROS.map((f) => [f, params.get(f) || '']));
    const pagina = Number(params.get('pagina') || 1);
    const tipoSeleccionado = tiposActivo.find((t) => t.id === filtros.tipo);

    const cambiarFiltro = (nombre, valor) => {
        const nuevos = new URLSearchParams(params);
        if (valor) nuevos.set(nombre, valor);
        else nuevos.delete(nombre);
        if (nombre !== 'pagina') nuevos.delete('pagina');
        setParams(nuevos, { replace: true });
    };

    const consulta = useCallback(
        (opciones) => {
            let c = db
                .from('activos_detalle')
                .select('*', opciones)
                .eq('organizacion_id', organizacion.id)
                .order('registrado_en', { ascending: false })
                .order('id');
            if (filtros.buscar) c = c.ilike('codigo', `%${filtros.buscar}%`);
            if (filtros.tipo) c = c.eq('tipo_activo_id', filtros.tipo);
            if (filtros.ubicacion === 'ninguna') c = c.is('ubicacion_id', null);
            else if (filtros.ubicacion) c = c.eq('ubicacion_id', filtros.ubicacion);
            if (filtros.estado) c = c.eq('estado', filtros.estado);
            else c = c.neq('estado', 'baja');
            return c;
        },
        [organizacion.id, filtros.buscar, filtros.tipo, filtros.ubicacion, filtros.estado]
    );

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        const desde = (pagina - 1) * POR_PAGINA;
        consulta({ count: 'exact' })
            .range(desde, desde + POR_PAGINA - 1)
            .then(({ data, count, error: err }) => {
                if (!vigente) return;
                if (err) throw err;
                setFilas(data);
                setTotal(count);
            })
            .catch((e) => vigente && error(e))
            .finally(() => vigente && setCargando(false));
        return () => {
            vigente = false;
        };
    }, [consulta, pagina]);

    const columnasExportar = () => [
        { titulo: 'Código', valor: (a) => a.codigo },
        { titulo: 'Tipo', valor: (a) => a.tipo_nombre },
        { titulo: 'Ubicación', valor: (a) => a.ubicacion_nombre },
        { titulo: 'Estado', valor: (a) => ESTADOS[a.estado]?.etiqueta },
        { titulo: 'Procesos', valor: (a) => a.cantidad_procesos },
        { titulo: 'Último proceso', valor: (a) => fecha(a.ultimo_proceso_en) },
        { titulo: 'Registrado', valor: (a) => fecha(a.registrado_en) },
        ...(tipoSeleccionado?.campos || []).map((c) => ({ titulo: c.etiqueta, valor: (a) => valorAtributo(c, a.atributos?.[c.clave]) })),
        { titulo: 'Observaciones', valor: (a) => a.observaciones },
    ];

    const exportar = async (formato) => {
        try {
            const datos = await todas(() => consulta());
            if (formato === 'excel') await exportarExcel('activos', 'Activos', datos, columnasExportar());
            else await exportarPDF('activos', 'Listado de activos', datos, columnasExportar(), organizacion.nombre);
        } catch (e) {
            error(e);
        }
    };

    const hayFiltros = FILTROS.some((f) => filtros[f]);

    return (
        <Layout
            titulo="Activos"
            acciones={
                <>
                    <button className="btn btn-outline-success" onClick={() => exportar('excel')} disabled={!total}>
                        <FontAwesomeIcon icon={faFileExcel} /> Excel
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => exportar('pdf')} disabled={!total}>
                        <FontAwesomeIcon icon={faFilePdf} /> PDF
                    </button>
                    {puedeEditar && (
                        <button className="btn btn-primario" onClick={() => navigate('/registrar')}>
                            <FontAwesomeIcon icon={faPlus} /> Registrar
                        </button>
                    )}
                </>
            }
        >
            <div className="card mb-3">
                <div className="card-body row g-2 align-items-end">
                    <div className="col-md-3">
                        <label className="form-label small">Código</label>
                        <input
                            className="form-control"
                            placeholder="Buscar…"
                            value={filtros.buscar}
                            onChange={(e) => cambiarFiltro('buscar', e.target.value)}
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small">Tipo</label>
                        <select className="form-select" value={filtros.tipo} onChange={(e) => cambiarFiltro('tipo', e.target.value)}>
                            <option value="">Todos</option>
                            {tiposActivo.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small">Ubicación</label>
                        <select className="form-select" value={filtros.ubicacion} onChange={(e) => cambiarFiltro('ubicacion', e.target.value)}>
                            <option value="">Todas</option>
                            <option value="ninguna">Sin ubicación</option>
                            {ubicaciones.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label small">Estado</label>
                        <select className="form-select" value={filtros.estado} onChange={(e) => cambiarFiltro('estado', e.target.value)}>
                            <option value="">Vigentes</option>
                            {Object.entries(ESTADOS).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v.etiqueta}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-1">
                        {hayFiltros && (
                            <button className="btn btn-light w-100" onClick={() => setParams({}, { replace: true })} title="Limpiar filtros">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Tipo</th>
                                {tipoSeleccionado?.campos.map((c) => (
                                    <th key={c.clave}>{c.etiqueta}</th>
                                ))}
                                <th>Ubicación</th>
                                <th>Estado</th>
                                <th className="text-end">Procesos</th>
                                <th>Último proceso</th>
                                <th>Observaciones</th>
                                {puedeEditar && <th />}
                            </tr>
                        </thead>
                        <tbody className={cargando ? 'opacity-50' : ''}>
                            {filas.map((a) => (
                                <tr key={a.id}>
                                    <td>
                                        <Link to={`/activos/${a.id}`}>{a.codigo}</Link>
                                    </td>
                                    <td>{a.tipo_nombre}</td>
                                    {tipoSeleccionado?.campos.map((c) => (
                                        <td key={c.clave}>{valorAtributo(c, a.atributos?.[c.clave])}</td>
                                    ))}
                                    <td>{a.ubicacion_nombre || '—'}</td>
                                    <td>
                                        <EstadoBadge estado={a.estado} />
                                    </td>
                                    <td className="text-end">
                                        {a.cantidad_procesos}
                                        {a.vida_util && <span className="text-muted small"> / {a.vida_util}</span>}
                                    </td>
                                    <td>{fecha(a.ultimo_proceso_en)}</td>
                                    <td className="text-truncate" style={{ maxWidth: 200 }}>
                                        {a.observaciones}
                                    </td>
                                    {puedeEditar && (
                                        <td className="text-end">
                                            <button className="btn btn-sm btn-light" onClick={() => navigate(`/activos/${a.id}/editar`)} title="Editar">
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {!cargando && filas.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="text-center text-muted py-4">
                                        No hay activos {hayFiltros ? 'con estos filtros' : 'registrados'}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={(p) => cambiarFiltro('pagina', p > 1 ? p : '')} />
        </Layout>
    );
};

export default Activos;
