import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBarcode, faWifi } from '@fortawesome/free-solid-svg-icons';
import { LECTOR_URL } from '../config';

/**
 * Entrada de códigos de activos. Admite:
 *  - escritura manual o lectores USB tipo teclado (escriben el código + Enter)
 *  - el puente RFID por puerto serial (carpeta server/), si VITE_LECTOR_URL está configurado
 */
const LectorCodigos = ({ onCodigo, placeholder = 'Escanea o escribe un código y presiona Enter' }) => {
    const [texto, setTexto] = useState('');
    const [usarPuente, setUsarPuente] = useState(Boolean(LECTOR_URL));
    const [estadoPuente, setEstadoPuente] = useState('');
    const ultimaLectura = useRef(null);
    const onCodigoRef = useRef(onCodigo);
    onCodigoRef.current = onCodigo;

    useEffect(() => {
        if (!usarPuente || !LECTOR_URL) return;
        let activo = true;

        const consultar = async () => {
            try {
                const r = await fetch(`${LECTOR_URL}/api/ultimo-uid`);
                const data = await r.json();
                if (!activo) return;
                setEstadoPuente(data.conectado ? 'conectado' : 'sin lector');
                if (data.uid && data.leido_en !== ultimaLectura.current) {
                    // la primera respuesta solo marca la referencia: no reingresa una lectura antigua
                    const esPrimera = ultimaLectura.current === null;
                    ultimaLectura.current = data.leido_en;
                    if (!esPrimera) onCodigoRef.current(data.uid);
                } else if (ultimaLectura.current === null) {
                    ultimaLectura.current = data.leido_en ?? 0;
                }
            } catch {
                if (activo) setEstadoPuente('sin conexión');
            }
        };

        consultar();
        const intervalo = setInterval(consultar, 1000);
        return () => {
            activo = false;
            clearInterval(intervalo);
        };
    }, [usarPuente]);

    const enviar = (e) => {
        e.preventDefault();
        const codigo = texto.trim();
        if (codigo) onCodigo(codigo);
        setTexto('');
    };

    return (
        <form onSubmit={enviar} className="lector">
            <div className="input-group">
                <span className="input-group-text">
                    <FontAwesomeIcon icon={faBarcode} />
                </span>
                <input
                    className="form-control"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                />
                <button className="btn btn-primario" type="submit">
                    Agregar
                </button>
            </div>
            {LECTOR_URL && (
                <div className="form-check form-switch mt-2 small">
                    <input
                        id="usar-puente"
                        className="form-check-input"
                        type="checkbox"
                        checked={usarPuente}
                        onChange={(e) => setUsarPuente(e.target.checked)}
                    />
                    <label htmlFor="usar-puente" className="form-check-label">
                        <FontAwesomeIcon icon={faWifi} /> Lector RFID {usarPuente && estadoPuente && `(${estadoPuente})`}
                    </label>
                </div>
            )}
        </form>
    );
};

export default LectorCodigos;
