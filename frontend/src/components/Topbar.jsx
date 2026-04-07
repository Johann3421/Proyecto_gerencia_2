import { useAuth } from '../hooks/useAuth';
import { useState, createContext, useContext } from 'react';

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
  const { user } = useAuth();
  const { search, setSearch } = useSearch();

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

      <div className="topbar-notifications" id="notifications-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="badge">3</span>
      </div>

      {user && (
        <div className="topbar-user" id="user-menu">
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
        </div>
      )}
    </header>
  );
}
