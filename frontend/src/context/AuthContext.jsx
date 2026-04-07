import { createContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await authAPI.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    setUser(null);
  };

  const canWrite = user && user.rol !== 'AUDITOR';
  const canDelete = user && ['SUPER_ADMIN', 'ADMIN_AREA'].includes(user.rol);
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';
  const isAuditor = user?.rol === 'AUDITOR';

  const hasAreaAccess = (area) => {
    if (!user) return false;
    if (user.rol === 'SUPER_ADMIN' || user.rol === 'AUDITOR') return true;
    return user.area === area;
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, checkAuth,
      canWrite, canDelete, isSuperAdmin, isAuditor, hasAreaAccess,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
