import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protege una ruta: exige sesión, una organización y (opcionalmente) un rol.
 */
const RutaPrivada = ({ children, admin = false, editar = false }) => {
    const { usuario, organizacion, esAdmin, puedeEditar } = useAuth();

    if (!usuario) return <Navigate to="/login" replace />;
    if (!organizacion) return <Navigate to="/bienvenida" replace />;
    if ((admin && !esAdmin) || (editar && !puedeEditar)) return <Navigate to="/panel" replace />;

    return children;
};

export default RutaPrivada;
