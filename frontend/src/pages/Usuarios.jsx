import { useState, useEffect } from 'react';
import { usuariosAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { getAvatarColor, getInitials, getRoleBadgeClass, formatRol } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';

const formatDate = (d) => d ? new Date(d).toLocaleString('es-PE') : 'Nunca';

export default function Usuarios() {
  const { isSuperAdmin, canDelete } = useAuth();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);

  const fetchUsers = async (p = 1) => {
    const { data } = await usuariosAPI.getAll({ page: p });
    setUsers(data.data);
    setPage(data.page);
    setTotal(data.totalPages);
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const toggleStatus = async (e, id) => {
    e.stopPropagation();
    if (!canDelete) return;
    await usuariosAPI.toggle(id);
    fetchUsers(page);
  };

  const cols = [
    { key: 'avatar', label: '', width: '40px', render: (_, r) => (
      <div className="avatar sm" style={{ background: getAvatarColor(r.nombre), display: 'inline-flex' }}>
        {getInitials(r.nombre)}
      </div>
    )},
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'area', label: 'Área', render: v => v || '-' },
    { key: 'rol', label: 'Rol', render: v => (
      <span className={`role-badge ${getRoleBadgeClass(v)}`}>{formatRol(v)}</span>
    )},
    { key: 'ultimo_acceso', label: 'Último Acceso', render: formatDate },
    { key: 'activo', label: 'Estado', render: (v, r) => (
      <label className="toggle" onClick={(e) => toggleStatus(e, r.id)}>
        <input type="checkbox" checked={v} readOnly />
        <span className="toggle-slider"></span>
      </label>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Usuarios y Roles</h1>
          <div className="subtitle">Gestión de accesos y permisos al sistema</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <Panel title="Directorio de Usuarios" className="flex-1" actions={canDelete && <Button variant="primary">Nuevo Usuario</Button>}>
          <DataTable columns={cols} data={users} page={page} totalPages={total} total={total*10} onPageChange={setPage} />
        </Panel>

        <Panel title="Jerarquía de Roles">
          <div className="role-hierarchy">
            <div className="role-card" style={{ background: 'var(--bg-secondary)' }}>
              <div className="role-icon" style={{ background: '#E6F1FB', color: '#0C447C' }}>S</div>
              <div>
                <div className="role-name">Super Admin</div>
                <div className="role-desc">Acceso total sin restricciones</div>
              </div>
            </div>
            <div className="role-card" style={{ background: 'var(--bg-secondary)' }}>
              <div className="role-icon" style={{ background: '#E1F5EE', color: '#085041' }}>A</div>
              <div>
                <div className="role-name">Admin Área</div>
                <div className="role-desc">Control total en su área asignada</div>
              </div>
            </div>
            <div className="role-card" style={{ background: 'var(--bg-secondary)' }}>
              <div className="role-icon" style={{ background: '#F3E8FF', color: '#5B21B6' }}>V</div>
              <div>
                <div className="role-name">Supervisor</div>
                <div className="role-desc">Aprobaciones y reportes en su área</div>
              </div>
            </div>
            <div className="role-card" style={{ background: 'var(--bg-secondary)' }}>
              <div className="role-icon" style={{ background: '#FAEEDA', color: '#633806' }}>O</div>
              <div>
                <div className="role-name">Operario</div>
                <div className="role-desc">Ingreso y edición de datos básicos</div>
              </div>
            </div>
            <div className="role-card" style={{ background: 'var(--bg-secondary)' }}>
              <div className="role-icon" style={{ background: '#F4F4F2', color: '#555555' }}>D</div>
              <div>
                <div className="role-name">Auditor</div>
                <div className="role-desc">Solo lectura en todo el sistema</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
