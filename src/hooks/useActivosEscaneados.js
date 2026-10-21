import { useCallback, useRef, useState } from 'react';
import { db, q } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { aviso, error } from '../utils/alertas';

/**
 * Lista de activos existentes que se van agregando por código (lector o teclado).
 * Ignora duplicados y avisa si el código no existe o el activo está de baja.
 */
export const useActivosEscaneados = () => {
    const { organizacion } = useAuth();
    const [lista, setLista] = useState([]);
    const codigos = useRef(new Set());

    const agregar = useCallback(
        async (codigo) => {
            if (codigos.current.has(codigo)) return;
            codigos.current.add(codigo);
            try {
                const activo = await q(
                    db
                        .from('activos_detalle')
                        .select('*')
                        .eq('organizacion_id', organizacion.id)
                        .eq('codigo', codigo)
                        .maybeSingle()
                );
                if (!activo) {
                    codigos.current.delete(codigo);
                    aviso('Código no registrado', `El código ${codigo} no corresponde a ningún activo.`);
                    return;
                }
                if (activo.estado === 'baja') {
                    codigos.current.delete(codigo);
                    aviso('Activo dado de baja', `El activo ${codigo} ya fue dado de baja.`);
                    return;
                }
                setLista((l) => [...l, { ...activo, nuevaObservacion: '' }]);
            } catch (e) {
                codigos.current.delete(codigo);
                error(e);
            }
        },
        [organizacion]
    );

    const quitar = (id) =>
        setLista((l) => {
            const activo = l.find((a) => a.id === id);
            if (activo) codigos.current.delete(activo.codigo);
            return l.filter((a) => a.id !== id);
        });

    const actualizar = (id, cambios) => setLista((l) => l.map((a) => (a.id === id ? { ...a, ...cambios } : a)));

    const limpiar = () => {
        codigos.current.clear();
        setLista([]);
    };

    return { lista, agregar, quitar, actualizar, limpiar };
};
