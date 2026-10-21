import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaPrivada from './components/RutaPrivada';
import Login from './pages/Login';

// Cada pantalla se descarga al abrirla: la carga inicial solo trae el login
const Bienvenida = lazy(() => import('./pages/Bienvenida'));
const Panel = lazy(() => import('./pages/Panel'));
const Activos = lazy(() => import('./pages/Activos'));
const DetalleActivo = lazy(() => import('./pages/DetalleActivo'));
const EditarActivo = lazy(() => import('./pages/EditarActivo'));
const RegistrarActivos = lazy(() => import('./pages/RegistrarActivos'));
const Procesos = lazy(() => import('./pages/Procesos'));
const Traslados = lazy(() => import('./pages/Traslados'));
const Bajas = lazy(() => import('./pages/Bajas'));
const Ubicaciones = lazy(() => import('./pages/Ubicaciones'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Configuracion = lazy(() => import('./pages/Configuracion'));

const App = () => (
    <AuthProvider>
        <Suspense fallback={<div className="pantalla-carga">Cargando…</div>}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/bienvenida" element={<Bienvenida />} />

                <Route path="/panel" element={<RutaPrivada><Panel /></RutaPrivada>} />
                <Route path="/activos" element={<RutaPrivada><Activos /></RutaPrivada>} />
                <Route path="/activos/:id" element={<RutaPrivada><DetalleActivo /></RutaPrivada>} />
                <Route path="/consultar" element={<RutaPrivada><DetalleActivo /></RutaPrivada>} />
                <Route path="/ubicaciones" element={<RutaPrivada><Ubicaciones /></RutaPrivada>} />
                <Route path="/ubicaciones/:id" element={<RutaPrivada><Ubicaciones /></RutaPrivada>} />

                <Route path="/activos/:id/editar" element={<RutaPrivada editar><EditarActivo /></RutaPrivada>} />
                <Route path="/registrar" element={<RutaPrivada editar><RegistrarActivos /></RutaPrivada>} />
                <Route path="/procesos" element={<RutaPrivada editar><Procesos /></RutaPrivada>} />
                <Route path="/traslados" element={<RutaPrivada editar><Traslados /></RutaPrivada>} />
                <Route path="/bajas" element={<RutaPrivada editar><Bajas /></RutaPrivada>} />

                <Route path="/usuarios" element={<RutaPrivada admin><Usuarios /></RutaPrivada>} />
                <Route path="/configuracion" element={<RutaPrivada admin><Configuracion /></RutaPrivada>} />

                <Route path="*" element={<Navigate to="/panel" replace />} />
            </Routes>
        </Suspense>
    </AuthProvider>
);

export default App;
