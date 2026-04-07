import { useAuth } from '../hooks/useAuth';
import { useState, createContext, useContext, useRef, useEffect } from 'react';

export const SearchContext = createContext({ search: '', setSearch: () => {} });
export const useSearch = () => useContext(SearchContext);

const AVATAR_COLORS = [
  '#1D9E75', '#0C447C', '#5B21B6', '#633806', '#4A1B0C',
  '#0F6E56', '#2563EB', '#7C3AED', '#D97706', '#DC2626',
];

export function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase();
}

export function getRoleBadgeClass(rol) {
  const map = {
    SUPER_ADMIN: 'super-admin',
    ADMIN_AREA: 'admin-area',
    SUPERVISOR: 'supervisor',
    OPERARIO: 'operario',
    AUDITOR: 'auditor',
  };
  return map[rol] || '';
}

export function formatRol(rol) {
  const map = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN_AREA: 'Admin Área',
    SUPERVISOR: 'Supervisor',
    OPERARIO: 'Operario',
    AUDITOR: 'Auditor',
  };
  return map[rol] || rol;
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const { search, setSearch } = useSearch();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  
  const menuRef = useRef(null);

  // Close menus if clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-logo">
        NEXO<span className="dot"></span>ERP
      </div>

      <div className="topbar-search">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar en esta página..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="global-search"
        />
      </div>

      <div className="topbar-spacer" />

      <div ref={menuRef} style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
        
        {/* Notificaciones */}
        <div style={{ position: 'relative' }}>
          <div className="topbar-notifications" id="notifications-btn" onClick={() => { setShowNotif(!showNotif); setShowMenu(false); }} style={{ cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="badge">1</span>
          </div>

          {showNotif && (
            <div style={{
              position: 'absolute', top: '45px', right: '-10px', width: '280px',
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, padding: '16px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Notificaciones (1)</h4>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                ¡Bienvenido a <strong>Nexo ERP v2.0</strong>! Tu sistema está configurado y listo para operar.
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        {user && (
          <div style={{ position: 'relative' }}>
            <div className="topbar-user" id="user-menu" onClick={() => { setShowMenu(!showMenu); setShowNotif(false); }} style={{ cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div
                className="avatar"
                style={{ background: getAvatarColor(user.nombre) }}
              >
                {getInitials(user.nombre)}
              </div>
              <div>
                <div className="user-name">{user.nombre}</div>
                <span className={`role-badge ${getRoleBadgeClass(user.rol)}`}>
                  {formatRol(user.rol)}
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', opacity: 0.5 }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {showMenu && (
              <div style={{
                position: 'absolute', top: '55px', right: 0, minWidth: '200px',
                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100,
                overflow: 'hidden'
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{user.nombre}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{user.email}</div>
                </div>
                <div style={{ padding: '8px' }}>
                  <button onClick={logout} style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', 
                    border: 'none', color: '#DC2626', fontSize: '13px', borderRadius: '4px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#FEF2F2'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
