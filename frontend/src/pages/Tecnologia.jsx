import { useState, useEffect, useCallback } from 'react';
import { techAPI, usuariosAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSearch } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TABS = [
  { id: 'SOPORTE', label: 'Soporte Técnico' },
  { id: 'POSTVENTA', label: 'PostVenta' },
  { id: 'DESARROLLO', label: 'Desarrollo' },
  { id: 'INFRAESTRUCTURA', label: 'Infraestructura' },
];

const ESTADOS_FLOW = {
  ABIERTO: [{ label: 'Tomar — En Proceso', value: 'EN_PROCESO' }],
  EN_PROCESO: [{ label: 'Marcar Resuelto', value: 'RESUELTO' }],
  RESUELTO: [{ label: 'Cerrar Ticket', value: 'CERRADO' }],
  CERRADO: [],
};

const MODAL_TITLES = {
  SOPORTE: 'Nuevo Ticket de Soporte',
  POSTVENTA: 'Reporte de PostVenta',
  DESARROLLO: 'Requerimiento de Desarrollo',
  INFRAESTRUCTURA: 'Nuevo Activo / Infraestructura',
};

export default function Tecnologia() {
  const { canWrite } = useAuth();
  const { search } = useSearch();

  const [tab, setTab] = useState('SOPORTE');
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [prioridadFilter, setPrioridadFilter] = useState('');
  const [metrics, setMetrics] = useState({ total: 0, abiertos: 0, en_proceso: 0, resueltos: 0, criticos: 0 });
  const [usuarios, setUsuarios] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'MEDIA', asignado_a: '' });

  const fetchTickets = useCallback(async (p = 1) => {
    const params = { page: p, tipo: tab };
    if (prioridadFilter) params.prioridad = prioridadFilter;
    const { data } = await techAPI.getTickets(params);
    setTickets(data.data);
    setPage(data.page);
    setTotalPages(data.totalPages);
  }, [tab, prioridadFilter]);

  const fetchMetrics = useCallback(async () => {
    try {
      const { data } = await techAPI.getMetrics({ tipo: tab });
      setMetrics(data);
    } catch { /* non-critical */ }
  }, [tab]);

  useEffect(() => {
    setPage(1);
    fetchTickets(1);
    fetchMetrics();
  }, [tab, prioridadFilter]);

  useEffect(() => {
    usuariosAPI.getAll({ page: 1 }).then(({ data }) => {
      setUsuarios(data.data || []);
    }).catch(() => {});
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await techAPI.createTicket({
        titulo: form.titulo,
        descripcion: form.descripcion,
        prioridad: form.prioridad,
        tipo: tab,
        asignado_a: form.asignado_a || null,
      });
      setShowCreateModal(false);
      setForm({ titulo: '', descripcion: '', prioridad: 'MEDIA', asignado_a: '' });
      fetchTickets(1);
      fetchMetrics();
    } catch {
      alert('Error creando registro');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRowClick = (row) => {
    setSelectedTicket(row);
    setShowDetailModal(true);
  };

  const handleEstadoChange = async (newEstado) => {
    if (!selectedTicket) return;
    setDetailLoading(true);
    try {
      await techAPI.updateTicket(selectedTicket.id, { estado: newEstado });
      setSelectedTicket(prev => ({ ...prev, estado: newEstado }));
      fetchTickets(page);
      fetchMetrics();
    } catch {
      alert('Error actualizando estado');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAsignar = async (asignado_a) => {
    if (!selectedTicket) return;
    setDetailLoading(true);
    try {
      await techAPI.updateTicket(selectedTicket.id, { asignado_a: asignado_a || null });
      const nombre = usuarios.find(u => String(u.id) === String(asignado_a))?.nombre || null;
      setSelectedTicket(prev => ({ ...prev, asignado_a, asignado_nombre: nombre }));
      fetchTickets(page);
    } catch {
      alert('Error asignando ticket');
    } finally {
      setDetailLoading(false);
    }
  };

  const cols = [
    { key: 'folio', label: 'Folio', mono: true, width: 100 },
    { key: 'titulo', label: 'Asunto' },
    { key: 'prioridad', label: 'Prioridad', render: v => <StatusPill status={v} />, width: 100 },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} />, width: 110 },
    {
      key: 'asignado_nombre', label: 'Asignado a', width: 150,
      render: v => v || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sin asignar</span>,
    },
    { key: 'created_at', label: 'Fecha', render: formatDate, width: 120 },
  ];

  const filteredTickets = tickets.filter(t =>
    !search ||
    t.folio?.toLowerCase().includes(search.toLowerCase()) ||
    t.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    t.asignado_nombre?.toLowerCase().includes(search.toLowerCase())
  );

  const chipStyle = (active) => ({
    padding: '5px 14px', borderRadius: 20, fontSize: '12px', fontWeight: 600,
    cursor: 'pointer', border: '1.5px solid var(--border-color)',
    background: active ? 'var(--color-brand)' : 'var(--bg-primary)',
    color: active ? '#fff' : 'var(--text-secondary)',
  });

  const createBtnLabel = tab === 'SOPORTE' ? '+ Nuevo Ticket'
    : tab === 'INFRAESTRUCTURA' ? '+ Nuevo Activo'
    : '+ Nuevo Registro';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tecnología (TI)</h1>
          <div className="subtitle">Gestión de soporte, desarrollo e infraestructura corporativa</div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <div
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => { setTab(t.id); setPrioridadFilter(''); }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* KPI cards */}
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        <MetricCard label="Total Registros" value={metrics.total} />
        <MetricCard label="Abiertos" value={metrics.abiertos} positive={false} />
        <MetricCard label="En Proceso" value={metrics.en_proceso} />
        <MetricCard label="Resueltos / Cerrados" value={metrics.resueltos} positive />
        {parseInt(metrics.criticos) > 0 && (
          <MetricCard label="Críticos Activos" value={metrics.criticos} positive={false} />
        )}
      </div>

      {/* Prioridad filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button style={chipStyle(!prioridadFilter)} onClick={() => setPrioridadFilter('')}>
          Todas las prioridades
        </button>
        {['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].map(p => (
          <button
            key={p}
            style={chipStyle(prioridadFilter === p)}
            onClick={() => setPrioridadFilter(p === prioridadFilter ? '' : p)}
          >
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <Panel
        title={`Registros — ${TABS.find(t => t.id === tab)?.label}`}
        actions={canWrite && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            {createBtnLabel}
          </Button>
        )}
      >
        <DataTable
          columns={cols}
          data={filteredTickets}
          page={page}
          totalPages={totalPages}
          total={totalPages * 10}
          onPageChange={p => { setPage(p); fetchTickets(p); }}
          onRowClick={handleRowClick}
          emptyMessage="No hay registros para este filtro"
        />
      </Panel>

      {/* ── Modal: Detalle del Ticket ── */}
      {showDetailModal && selectedTicket && (
        <Modal
          title={`${selectedTicket.folio} — ${selectedTicket.titulo}`}
          onClose={() => setShowDetailModal(false)}
          width="600px"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Estado</div>
              <StatusPill status={selectedTicket.estado} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Prioridad</div>
              <StatusPill status={selectedTicket.prioridad} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Tipo</div>
              <div style={{ fontWeight: 500 }}>{selectedTicket.tipo?.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Fecha Creación</div>
              <div>{formatDate(selectedTicket.created_at)}</div>
            </div>
            <div style={{ gridColumn: '1 / 3' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>Descripción</div>
              <div style={{
                padding: '12px', background: 'var(--bg-secondary)', borderRadius: 6,
                color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px',
                border: '1px solid var(--border-color)', minHeight: 60,
              }}>
                {selectedTicket.descripcion || <i style={{ color: 'var(--text-tertiary)' }}>Sin descripción</i>}
              </div>
            </div>
            <div style={{ gridColumn: '1 / 3' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>Asignado a</div>
              {canWrite ? (
                <select
                  className="form-input"
                  value={selectedTicket.asignado_a || ''}
                  onChange={e => handleAsignar(e.target.value)}
                  disabled={detailLoading}
                >
                  <option value="">— Sin asignar —</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.area || 'General'})</option>
                  ))}
                </select>
              ) : (
                <div>{selectedTicket.asignado_nombre || <i style={{ color: 'var(--text-tertiary)' }}>Sin asignar</i>}</div>
              )}
            </div>
          </div>

          <div style={{
            borderTop: '1px solid var(--border-color)', paddingTop: 16,
            display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {canWrite && (ESTADOS_FLOW[selectedTicket.estado] || []).map(({ label, value }) => (
                <Button
                  key={value}
                  variant="primary"
                  disabled={detailLoading}
                  onClick={() => handleEstadoChange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button onClick={() => setShowDetailModal(false)}>Cerrar</Button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Crear Registro ── */}
      {showCreateModal && (
        <Modal title={MODAL_TITLES[tab]} onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label className="form-label">Asunto / Título</label>
              <input
                type="text" className="form-input" required value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder={
                  tab === 'INFRAESTRUCTURA' ? 'Ej: Servidor Rack #3 — Dell PowerEdge R750'
                  : tab === 'DESARROLLO' ? 'Ej: Implementar módulo de facturación electrónica'
                  : 'Ej: Error al guardar pedidos en módulo comercial'
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción Detallada</label>
              <textarea
                className="form-input" required rows={4} value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe con detalle el problema, requerimiento o activo..."
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Prioridad / Criticidad</label>
                <select className="form-input" value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
                  <option value="BAJA">Baja — Trivial</option>
                  <option value="MEDIA">Media — Estándar</option>
                  <option value="ALTA">Alta — Urgente</option>
                  <option value="CRITICA">Crítica — Bloqueante</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Asignar a</label>
                <select className="form-input" value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}>
                  <option value="">— Sin asignar —</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={createLoading}>
                {createLoading ? 'Guardando...' : 'Crear Registro'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
            <div className="form-group">
              <label className="form-label">Nivel de Prioridad / Criticidad</label>
              <select className="form-input" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                <option value="BAJA">Baja / Trivial</option>
                <option value="MEDIA">Media / Estándar</option>
                <option value="ALTA">Alta / Urgente</option>
                <option value="CRITICA">Crítica / Bloqueante</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear Registro'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
