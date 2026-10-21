import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useCatalogos } from '../hooks/useCatalogos';
import { db, q } from '../lib/db';
import { aClave } from '../utils/formato';
import { aviso, confirmar, error, exito } from '../utils/alertas';

const TIPOS_CAMPO = { texto: 'Texto', numero: 'Número', opciones: 'Lista de opciones', si_no: 'Sí / No' };

const LADO_LOGO = 256;

/** Reduce la imagen a 256 px como máximo y la devuelve como data URL (se guarda en la base de datos) */
const reducirImagen = (archivo) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(archivo);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const escala = Math.min(1, LADO_LOGO / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * escala));
            canvas.height = Math.max(1, Math.round(img.height * escala));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo leer la imagen.'));
        };
        img.src = url;
    });

const DatosOrganizacion = () => {
    const { organizacion, recargar } = useAuth();
    const [form, setForm] = useState({ nombre: organizacion.nombre, color_primario: organizacion.color_primario });
    const [guardando, setGuardando] = useState(false);

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await q(db.from('organizaciones').update(form).eq('id', organizacion.id));
            await recargar();
            exito('Guardado', 'Se actualizaron los datos de la organización.');
        } catch (err) {
            error(err);
        } finally {
            setGuardando(false);
        }
    };

    const subirLogo = async (e) => {
        const archivo = e.target.files[0];
        e.target.value = '';
        if (!archivo) return;
        if (archivo.size > 5 * 1024 * 1024) return aviso('Archivo muy grande', 'El logo debe pesar menos de 5 MB.');
        try {
            const logo = await reducirImagen(archivo);
            await q(db.from('organizaciones').update({ logo_url: logo }).eq('id', organizacion.id));
            await recargar();
        } catch (err) {
            error(err);
        }
    };

    const quitarLogo = async () => {
        try {
            await q(db.from('organizaciones').update({ logo_url: null }).eq('id', organizacion.id));
            await recargar();
        } catch (err) {
            error(err);
        }
    };

    return (
        <form className="card mb-4" onSubmit={guardar}>
            <div className="card-header">Organización</div>
            <div className="card-body row g-3 align-items-end">
                <div className="col-md-5">
                    <label className="form-label">Nombre</label>
                    <input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className="col-md-2">
                    <label className="form-label">Color</label>
                    <input
                        type="color"
                        className="form-control form-control-color w-100"
                        value={form.color_primario}
                        onChange={(e) => setForm({ ...form, color_primario: e.target.value })}
                    />
                </div>
                <div className="col-md-3">
                    <label className="form-label">Logo</label>
                    <div className="d-flex align-items-center gap-2">
                        {organizacion.logo_url && <img src={organizacion.logo_url} alt="" className="logo-previa" />}
                        <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="form-control" onChange={subirLogo} />
                        {organizacion.logo_url && (
                            <button type="button" className="btn btn-light" onClick={quitarLogo} title="Quitar logo">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="col-md-2">
                    <button className="btn btn-primario w-100" disabled={guardando}>
                        Guardar
                    </button>
                </div>
            </div>
        </form>
    );
};

const EditorCampos = ({ campos, onChange }) => {
    const cambiar = (i, cambios) => onChange(campos.map((c, j) => (j === i ? { ...c, ...cambios } : c)));

    return (
        <div>
            <label className="form-label">Campos personalizados</label>
            <p className="form-text mt-0">Datos propios de este tipo, por ejemplo Talla, Marca, N° de serie o Fecha de compra.</p>
            {campos.map((c, i) => (
                <div key={i} className="border rounded p-2 mb-2">
                    <div className="d-flex gap-2">
                        <input
                            className="form-control form-control-sm"
                            placeholder="Nombre del campo"
                            value={c.etiqueta}
                            onChange={(e) => cambiar(i, { etiqueta: e.target.value })}
                            required
                        />
                        <select className="form-select form-select-sm" value={c.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value })}>
                            {Object.entries(TIPOS_CAMPO).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        <button type="button" className="btn btn-sm btn-light text-danger" onClick={() => onChange(campos.filter((_, j) => j !== i))}>
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                    {c.tipo === 'opciones' && (
                        <input
                            className="form-control form-control-sm mt-2"
                            placeholder="Opciones separadas por coma: S, M, L, XL"
                            value={c.opcionesTexto ?? (c.opciones || []).join(', ')}
                            onChange={(e) => cambiar(i, { opcionesTexto: e.target.value })}
                        />
                    )}
                </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onChange([...campos, { etiqueta: '', tipo: 'texto' }])}>
                <FontAwesomeIcon icon={faPlus} /> Agregar campo
            </button>
        </div>
    );
};

/** Convierte el estado del editor al formato guardado en tipos_activo.campos */
const normalizarCampos = (campos) =>
    campos.map(({ etiqueta, tipo, clave, opciones, opcionesTexto }) => ({
        clave: clave || aClave(etiqueta),
        etiqueta: etiqueta.trim(),
        tipo,
        ...(tipo === 'opciones'
            ? {
                  opciones: (opcionesTexto ?? (opciones || []).join(','))
                      .split(',')
                      .map((o) => o.trim())
                      .filter(Boolean),
              }
            : {}),
    }));

const TiposActivo = ({ tipos, recargar }) => {
    const { organizacion } = useAuth();
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const guardar = async () => {
        const campos = normalizarCampos(editando.campos);
        const claves = campos.map((c) => c.clave);
        if (claves.some((c) => !c)) return aviso('Campo inválido', 'Cada campo debe tener un nombre.');
        if (new Set(claves).size !== claves.length) return aviso('Campos repetidos', 'Dos campos no pueden tener el mismo nombre.');

        setGuardando(true);
        try {
            const datos = {
                nombre: editando.nombre.trim(),
                descripcion: editando.descripcion || null,
                vida_util: editando.vida_util === '' || editando.vida_util === null ? null : Number(editando.vida_util),
                campos,
            };
            if (editando.id) await q(db.from('tipos_activo').update(datos).eq('id', editando.id));
            else await q(db.from('tipos_activo').insert({ ...datos, organizacion_id: organizacion.id }));
            setEditando(null);
            recargar();
        } catch (e) {
            error(e);
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (t) => {
        if (!(await confirmar(`¿Eliminar el tipo "${t.nombre}"?`, 'Solo es posible si ningún activo lo usa.', 'Eliminar'))) return;
        try {
            await q(db.from('tipos_activo').delete().eq('id', t.id));
            recargar();
        } catch (e) {
            error(e);
        }
    };

    return (
        <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
                <span>Tipos de activo</span>
                <button className="btn btn-sm btn-primario" onClick={() => setEditando({ nombre: '', descripcion: '', vida_util: '', campos: [] })}>
                    <FontAwesomeIcon icon={faPlus} /> Nuevo tipo
                </button>
            </div>
            <ul className="list-group list-group-flush">
                {tipos.map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>{t.nombre}</strong>
                            {t.vida_util && <span className="text-muted small"> · vida útil {t.vida_util} procesos</span>}
                            <div className="small text-muted">
                                {t.campos.length ? t.campos.map((c) => c.etiqueta).join(', ') : 'Sin campos personalizados'}
                            </div>
                        </div>
                        <div className="text-nowrap">
                            <button className="btn btn-sm btn-light" onClick={() => setEditando({ ...t, vida_util: t.vida_util ?? '' })}>
                                <FontAwesomeIcon icon={faPen} />
                            </button>
                            <button className="btn btn-sm btn-light text-danger ms-1" onClick={() => eliminar(t)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {editando && (
                <Modal titulo={editando.id ? 'Editar tipo de activo' : 'Nuevo tipo de activo'} onCerrar={() => setEditando(null)} onEnviar={guardar} enviando={guardando}>
                    <div className="mb-3">
                        <label className="form-label">Nombre</label>
                        <input
                            className="form-control"
                            placeholder="Uniforme, Herramienta, Contenedor…"
                            value={editando.nombre}
                            onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Descripción</label>
                        <input className="form-control" value={editando.descripcion || ''} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Vida útil (procesos)</label>
                        <input
                            className="form-control"
                            type="number"
                            min={1}
                            placeholder="Sin límite"
                            value={editando.vida_util}
                            onChange={(e) => setEditando({ ...editando, vida_util: e.target.value })}
                        />
                        <div className="form-text">Cantidad máxima de procesos (lavados, usos…) antes de reemplazarlo.</div>
                    </div>
                    <EditorCampos campos={editando.campos} onChange={(campos) => setEditando({ ...editando, campos })} />
                </Modal>
            )}
        </div>
    );
};

const TiposEvento = ({ tipos, recargar }) => {
    const { organizacion } = useAuth();
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const guardar = async () => {
        setGuardando(true);
        try {
            const datos = { nombre: editando.nombre.trim(), descripcion: editando.descripcion || null, color: editando.color };
            if (editando.id) await q(db.from('tipos_evento').update(datos).eq('id', editando.id));
            else await q(db.from('tipos_evento').insert({ ...datos, organizacion_id: organizacion.id }));
            setEditando(null);
            recargar();
        } catch (e) {
            error(e);
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (t) => {
        if (!(await confirmar(`¿Eliminar "${t.nombre}"?`, 'El historial existente se conserva, pero sin este nombre.', 'Eliminar'))) return;
        try {
            await q(db.from('tipos_evento').delete().eq('id', t.id));
            recargar();
        } catch (e) {
            error(e);
        }
    };

    return (
        <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
                <span>Tipos de proceso</span>
                <button className="btn btn-sm btn-primario" onClick={() => setEditando({ nombre: '', descripcion: '', color: '#0ea5e9' })}>
                    <FontAwesomeIcon icon={faPlus} /> Nuevo proceso
                </button>
            </div>
            <ul className="list-group list-group-flush">
                {tipos.map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <span className="punto" style={{ background: t.color }} />
                            <strong>{t.nombre}</strong>
                            {t.descripcion && <span className="text-muted small"> · {t.descripcion}</span>}
                        </div>
                        <div className="text-nowrap">
                            <button className="btn btn-sm btn-light" onClick={() => setEditando(t)}>
                                <FontAwesomeIcon icon={faPen} />
                            </button>
                            <button className="btn btn-sm btn-light text-danger ms-1" onClick={() => eliminar(t)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {editando && (
                <Modal titulo={editando.id ? 'Editar proceso' : 'Nuevo proceso'} onCerrar={() => setEditando(null)} onEnviar={guardar} enviando={guardando}>
                    <div className="mb-3">
                        <label className="form-label">Nombre</label>
                        <input
                            className="form-control"
                            placeholder="Lavado, Mantención, Inspección, Calibración…"
                            value={editando.nombre}
                            onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Descripción</label>
                        <input className="form-control" value={editando.descripcion || ''} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Color</label>
                        <input type="color" className="form-control form-control-color" value={editando.color} onChange={(e) => setEditando({ ...editando, color: e.target.value })} />
                    </div>
                </Modal>
            )}
        </div>
    );
};

const Configuracion = () => {
    const { organizacion } = useAuth();
    const { tiposActivo, tiposEvento, recargar } = useCatalogos();

    return (
        <Layout titulo="Configuración">
            {/* key: al cambiar de organización el formulario se reinicia con sus datos */}
            <DatosOrganizacion key={organizacion.id} />
            <div className="row">
                <div className="col-lg-6">
                    <TiposActivo tipos={tiposActivo} recargar={recargar} />
                </div>
                <div className="col-lg-6">
                    <TiposEvento tipos={tiposEvento} recargar={recargar} />
                </div>
            </div>
        </Layout>
    );
};

export default Configuracion;
