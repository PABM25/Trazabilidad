import { useCallback, useEffect, useState } from 'react';
import { db, q } from '../lib/db';
import { useAuth } from '../context/AuthContext';

/** Ubicaciones, tipos de activo y tipos de evento de la organización actual */
export const useCatalogos = () => {
    const { organizacion } = useAuth();
    const [catalogos, setCatalogos] = useState({ ubicaciones: [], tiposActivo: [], tiposEvento: [], cargando: true });

    const recargar = useCallback(async () => {
        if (!organizacion) return;
        const [ubicaciones, tiposActivo, tiposEvento] = await Promise.all([
            q(db.from('ubicaciones').select('*').eq('organizacion_id', organizacion.id).order('nombre')),
            q(db.from('tipos_activo').select('*').eq('organizacion_id', organizacion.id).order('nombre')),
            q(db.from('tipos_evento').select('*').eq('organizacion_id', organizacion.id).order('nombre')),
        ]);
        setCatalogos({ ubicaciones, tiposActivo, tiposEvento, cargando: false });
    }, [organizacion]);

    useEffect(() => {
        recargar().catch((e) => console.error('Error al cargar catálogos', e));
    }, [recargar]);

    return { ...catalogos, recargar };
};
