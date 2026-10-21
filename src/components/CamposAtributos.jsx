/**
 * Formulario para los campos personalizados de un tipo de activo
 * (definidos en tipos_activo.campos).
 */
const CamposAtributos = ({ campos = [], valores, onChange }) => {
    const cambiar = (clave, valor) => onChange({ ...valores, [clave]: valor });

    return campos.map((campo) => (
        <div className="mb-3" key={campo.clave}>
            {campo.tipo === 'si_no' ? (
                <div className="form-check">
                    <input
                        id={`campo-${campo.clave}`}
                        className="form-check-input"
                        type="checkbox"
                        checked={Boolean(valores[campo.clave])}
                        onChange={(e) => cambiar(campo.clave, e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={`campo-${campo.clave}`}>
                        {campo.etiqueta}
                    </label>
                </div>
            ) : (
                <>
                    <label className="form-label" htmlFor={`campo-${campo.clave}`}>
                        {campo.etiqueta}
                    </label>
                    {campo.tipo === 'opciones' ? (
                        <select
                            id={`campo-${campo.clave}`}
                            className="form-select"
                            value={valores[campo.clave] ?? ''}
                            onChange={(e) => cambiar(campo.clave, e.target.value)}
                        >
                            <option value="">—</option>
                            {(campo.opciones || []).map((o) => (
                                <option key={o}>{o}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id={`campo-${campo.clave}`}
                            className="form-control"
                            type={campo.tipo === 'numero' ? 'number' : 'text'}
                            value={valores[campo.clave] ?? ''}
                            onChange={(e) =>
                                cambiar(
                                    campo.clave,
                                    campo.tipo === 'numero' && e.target.value !== '' ? Number(e.target.value) : e.target.value
                                )
                            }
                        />
                    )}
                </>
            )}
        </div>
    ));
};

export default CamposAtributos;
