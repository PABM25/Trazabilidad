import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { db, dbConfigurado, q } from '../lib/db';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

const CLAVE_ORG = 'organizacion_actual';

const leerOrgGuardada = () => {
    try {
        return localStorage.getItem(CLAVE_ORG);
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [sesion, setSesion] = useState(null);
    const [membresias, setMembresias] = useState([]);
    const [orgId, setOrgId] = useState(leerOrgGuardada);
    const [cargando, setCargando] = useState(true);

    const cargarMembresias = useCallback(async (usuario) => {
        if (!usuario) {
            setMembresias([]);
            return;
        }
        const filas = await q(
            db
                .from('miembros')
                .select('rol, nombre_completo, correo, ubicacion_id, organizacion:organizaciones(*)')
                .eq('usuario_id', usuario.id)
                .order('creado_en')
        );
        setMembresias(filas);
    }, []);

    useEffect(() => {
        if (!dbConfigurado) {
            setCargando(false);
            return;
        }

        (async () => {
            try {
                const { data } = await db.auth.getSession();
                setSesion(data.session);
                await cargarMembresias(data.session?.user);
            } catch (e) {
                // sin conexión con la base de datos: se muestra el login en vez de quedar cargando
                console.error('Error al recuperar la sesión', e);
            } finally {
                setCargando(false);
            }
        })();

        const { data: sub } = db.auth.onAuthStateChange((evento, nuevaSesion) => {
            setSesion(nuevaSesion);
            if (evento === 'SIGNED_OUT') setMembresias([]);
        });
        return () => sub.subscription.unsubscribe();
    }, [cargarMembresias]);

    const membresia = membresias.find((m) => m.organizacion.id === orgId) || membresias[0] || null;
    const organizacion = membresia?.organizacion || null;

    // Aplica el color de la organización a toda la interfaz
    useEffect(() => {
        document.documentElement.style.setProperty('--color-primario', organizacion?.color_primario || '#010066');
    }, [organizacion?.color_primario]);

    const elegirOrganizacion = (id) => {
        setOrgId(id);
        try {
            localStorage.setItem(CLAVE_ORG, id);
        } catch {
            // sin almacenamiento local: la elección dura solo esta sesión
        }
    };

    const iniciarSesion = async (correo, contrasena) => {
        const data = await q(db.auth.signInWithPassword({ email: correo, password: contrasena }));
        await cargarMembresias(data.user);
    };

    // volverA: ruta a la que lleva el enlace del correo de confirmación (ej. una invitación)
    const registrarse = async (nombre, correo, contrasena, volverA = '/bienvenida') => {
        const data = await q(
            db.auth.signUp({
                email: correo,
                password: contrasena,
                options: { data: { nombre_completo: nombre }, emailRedirectTo: window.location.origin + volverA },
            })
        );
        // Con confirmación de correo activada no hay sesión hasta confirmar
        if (data.session) await cargarMembresias(data.user);
        return Boolean(data.session);
    };

    const aceptarInvitacion = async (codigo) => {
        const id = await q(db.rpc('aceptar_invitacion', { p_codigo: codigo }));
        elegirOrganizacion(id);
        await cargarMembresias(sesion?.user);
    };

    const cerrarSesion = async () => {
        await db.auth.signOut();
    };

    const recargar = () => cargarMembresias(sesion?.user);

    const rol = membresia?.rol;

    const valor = {
        sesion,
        usuario: sesion?.user || null,
        membresias,
        membresia,
        organizacion,
        rol,
        esAdmin: rol === 'admin',
        puedeEditar: rol === 'admin' || rol === 'operador',
        elegirOrganizacion,
        iniciarSesion,
        registrarse,
        cerrarSesion,
        recargar,
        aceptarInvitacion,
    };

    if (cargando) {
        return <div className="pantalla-carga">Cargando…</div>;
    }

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};
