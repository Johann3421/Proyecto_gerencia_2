import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Shell from './components/Shell';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Administracion from './pages/Administracion';
import Tecnologia from './pages/Tecnologia';
import Comercial from './pages/Comercial';
import Logistica from './pages/Logistica';
import Produccion from './pages/Produccion';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';

function RequireAuth({ children, area, roles }) {
  const { user, loading, hasAreaAccess } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.rol)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (area && !hasAreaAccess(area)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function Unauthorized() {
  return (
    <div className="unauthorized-page">
      <h2>403</h2>
      <p>No tienes permiso para acceder a esta área.</p>
      <button className="btn btn-primary" onClick={() => window.history.back()}>
        Volver Atrás
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/" element={<RequireAuth><Shell /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route path="administracion" element={
              <RequireAuth area="ADMINISTRACION"><Administracion /></RequireAuth>
            } />
            <Route path="tecnologia" element={
              <RequireAuth area="TECNOLOGIA"><Tecnologia /></RequireAuth>
            } />
            <Route path="comercial" element={
              <RequireAuth area="COMERCIAL"><Comercial /></RequireAuth>
            } />
            <Route path="logistica" element={
              <RequireAuth area="LOGISTICA"><Logistica /></RequireAuth>
            } />
            <Route path="produccion" element={
              <RequireAuth area="PRODUCCION"><Produccion /></RequireAuth>
            } />
            
            <Route path="usuarios" element={
              <RequireAuth roles={['SUPER_ADMIN', 'ADMIN_AREA']}><Usuarios /></RequireAuth>
            } />
            <Route path="reportes" element={<Reportes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
