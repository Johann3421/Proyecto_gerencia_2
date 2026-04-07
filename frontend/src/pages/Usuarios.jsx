import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usuariosAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { getAvatarColor, getInitials, getRoleBadgeClass, formatRol, useSearch } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const formatDate = (d) => d ? new Date(d).toLocaleString('es-PE') : 'Nunca';

export default function Usuarios() {
  const { user, isSuperAdmin, canDelete } = useAuth();
  const { search } = useSearch();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || (isSuperAdmin || canDelete ? 'directorio' : 'perfil'));
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'OPERARIO', area: 'ADMINISTRACION' });

  // Profile Form state
  const [profileForm, setProfileForm] = useState({ nombre: user?.nombre || '', password: '', avatar_url: user?.avatar_url || '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchUsers = async (p = 1) => {
    const { data } = await usuariosAPI.getAll({ page: p });
    setUsers(data.data);
    setPage(data.page);
    setTotal(data.totalPages);
  };

  useEffect(() => {
    if (tab === 'directorio') fetchUsers(page);
  }, [page, tab]);

  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab);
    }
  }, [location.state?.tab]);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processAvatarFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processAvatarFile(file);
  };

  const processAvatarFile = (file) => {
    if (!file.type.startsWith('image/')) return alert('Solo se permiten imágenes');
    if (file.size > 2 * 1024 * 1024) return alert('La imagen debe pesar máximo 2MB');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileForm((prev) => ({ ...prev, avatar_url: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await usuariosAPI.updateMe(profileForm);
      alert('Perfil actualizado correctamente. Los cambios se reflejarán completamente en tu próxima sesión.');
      // Update local state if needed via window location reload or context update
      window.location.reload();
    } catch (err) {
      alert('Error actualizando perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleStatus = async (e, id) => {
    e.stopPropagation();
    if (!canDelete) return;
    await usuariosAPI.toggle(id);
    fetchUsers(page);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usuariosAPI.create({
        ...form,
        area: (form.rol === 'SUPER_ADMIN' || form.rol === 'AUDITOR') ? null : form.area
      });
      setShowModal(false);
      setForm({ nombre: '', email: '', password: '', rol: 'OPERARIO', area: 'ADMINISTRACION' });
      fetchUsers(page);
    } catch (err) {
      alert(err.response?.data?.error || 'Error creando usuario. Valide que el correo no esté en uso.');
    } finally {
      setLoading(false);
    }
  };

  const cols = [
    { key: 'avatar', label: '', width: '40px', render: (_, r) => (
      r.avatar_url ? (
        <div className="avatar sm" style={{ backgroundImage: `url(${r.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'inline-flex' }}></div>
      ) : (
        <div className="avatar sm" style={{ background: getAvatarColor(r.nombre), display: 'inline-flex' }}>
          {getInitials(r.nombre)}
        </div>
      )
    )},
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Email', mono: true },
    { key: 'area', label: 'Área', render: v => v || '-' },
    { key: 'rol', label: 'Rol', render: v => (
      <span className={`role-badge ${getRoleBadgeClass(v)}`}>{formatRol(v)}</span>
    )},
    { key: 'ultimo_acceso', label: 'Último Acceso', render: formatDate },
    { key: 'activo', label: 'Estado', render: (v, r) => (
      <label className="toggle" onClick={(e) => toggleStatus(e, r.id)} style={{ cursor: canDelete ? 'pointer' : 'default' }}>
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

      <div className="tabs">
        <div className={`tab ${tab === 'perfil' ? 'active' : ''}`} onClick={() => setTab('perfil')}>Mi Perfil</div>
        {(isSuperAdmin || canDelete) && (
          <div className={`tab ${tab === 'directorio' ? 'active' : ''}`} onClick={() => setTab('directorio')}>Directorio de Cuentas</div>
        )}
      </div>

      {tab === 'perfil' && (
        <div className="dashboard-grid">
          <Panel title="Configuración de Cuenta" className="flex-1">
            <form onSubmit={handleProfileSubmit} style={{ maxWidth: '500px' }}>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div 
                  style={{
                    position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', 
                    cursor: 'pointer', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  onDrop={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; handleDrop(e); }}
                  title="Haz clic o arrastra una imagen"
                >
                  {profileForm.avatar_url ? (
                    <div style={{ width: '100%', height: '100%', backgroundImage: `url(${profileForm.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: getAvatarColor(user?.nombre || ''), color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                      {getInitials(profileForm.nombre || user?.nombre || '')}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', textAlign: 'center', padding: '2px 0' }}>Cambiar</div>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Foto de Perfil</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>Sube una imagen (max 2MB). Puedes arrastrarla o hacer clic en el círculo.</p>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email (No Editable)</label>
                <input type="email" className="form-input" value={user?.email || ''} readOnly disabled style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre de Usuario</label>
                <input type="text" className="form-input" value={profileForm.nombre} required onChange={e => setProfileForm({...profileForm, nombre: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Nueva Contraseña (Opcional)</label>
                <input type="password" className="form-input" placeholder="Dejar en blanco para mantener actual..." value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} />
              </div>
              <div style={{ marginTop: '24px' }}>
                <Button type="submit" variant="primary" disabled={profileLoading}>{profileLoading ? 'Guardando...' : 'Actualizar Cuenta'}</Button>
              </div>
            </form>
          </Panel>
          <Panel title="Mi Rol y Accesos">
            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-tertiary)' }}>Área Asignada</h4>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{user?.area || 'Global'}</div>
            </div>
            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-tertiary)' }}>Nivel de Acceso</h4>
              <span className={`role-badge ${getRoleBadgeClass(user?.rol)}`}>{formatRol(user?.rol)}</span>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'directorio' && (
        <div className="dashboard-grid">
          <Panel title="Directorio de Cuentas" className="flex-1" actions={canDelete && <Button variant="primary" onClick={() => setShowModal(true)}>Nueva Cuenta</Button>}>
            <DataTable columns={cols} data={users.filter(u => !search || u.nombre?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.rol?.toLowerCase().includes(search.toLowerCase()))} page={page} totalPages={total} total={total*10} onPageChange={setPage} />
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
                  <div className="role-desc">Maneja transacciones en su área asignada</div>
                </div>
              </div>
              <div className="role-card" style={{ background: 'var(--bg-secondary)' }}>
                <div className="role-icon" style={{ background: '#F3E8FF', color: '#5B21B6' }}>V</div>
                <div>
                  <div className="role-name">Supervisor</div>
                  <div className="role-desc">Aprueba flujos de mayor impacto</div>
                </div>
              </div>
              <div className="role-card" style={{ background: 'var(--bg-secondary)' }}>
                <div className="role-icon" style={{ background: '#FAEEDA', color: '#633806' }}>O</div>
                <div>
                  <div className="role-name">Operario</div>
                  <div className="role-desc">Ingresa y edita datos básicos</div>
                </div>
              </div>
              <div className="role-card" style={{ background: 'var(--bg-secondary)' }}>
                <div className="role-icon" style={{ background: '#F4F4F2', color: '#555555' }}>D</div>
                <div>
                  <div className="role-name">Auditor</div>
                  <div className="role-desc">Solo lectura en toda la plataforma</div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {showModal && (
        <Modal title="Alta de Nueva Cuenta" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input type="text" className="form-input" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico (Login)</label>
              <input type="email" className="form-input" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="ejemplo@nexo.pe" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña Temporal</label>
              <input type="text" className="form-input" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Escribir clave segura..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Área Restringida</label>
                <select className="form-input" value={form.area} onChange={e => setForm({...form, area: e.target.value})} disabled={form.rol === 'SUPER_ADMIN' || form.rol === 'AUDITOR'}>
                  <option value="ADMINISTRACION">Administración</option>
                  <option value="TECNOLOGIA">Tecnología (TI)</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="LOGISTICA">Logística / Bodega</option>
                  <option value="PRODUCCION">Producción</option>
                </select>
                {(form.rol === 'SUPER_ADMIN' || form.rol === 'AUDITOR') && <div style={{fontSize:'12px', color:'var(--text-tertiary)', marginTop:'4px'}}>Acceso global habilitado</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Rol de Acceso (RBAC)</label>
                <select className="form-input" value={form.rol} onChange={e => {
                  const rol = e.target.value;
                  setForm({...form, rol, area: (rol === 'SUPER_ADMIN' || rol === 'AUDITOR') ? '' : (form.area || 'ADMINISTRACION')});
                }}>
                  <option value="OPERARIO">Operario</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN_AREA">Admin de Área</option>
                  <option value="AUDITOR">Auditor Global</option>
                  <option value="SUPER_ADMIN">Súper Administrador</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear Cuenta'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
