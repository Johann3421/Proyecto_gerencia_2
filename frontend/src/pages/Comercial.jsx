import { useState, useEffect, useCallback } from 'react';
import { comercialAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSearch } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';

const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-PE') : '-';

const chipStyle = (active) => ({
  padding: '5px 14px', borderRadius: 20, fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', border: '1.5px solid var(--border-color)',
  background: active ? 'var(--color-brand)' : 'var(--bg-primary)',
  color: active ? '#fff' : 'var(--text-secondary)',
});

function TabMarketing({ canWrite, search }) {
  const [campanas, setCampanas] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, activas: 0, presupuesto: 0, gasto: 0 });
  const [estadoFilter, setEstadoFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '', tipo: 'DIGITAL', descripcion: '', presupuesto: '',
    fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '',
  });

  const fetchCampanas = useCallback(async (p = 1) => {
    const params = { page: p };
    if (estadoFilter) params.estado = estadoFilter;
    const { data } = await comercialAPI.getCampanas(params);
    setCampanas(data.data);
    setPage(data.page);
    setTotalPages(data.totalPages);
    setStats(data.stats || { total: 0, activas: 0, presupuesto: 0, gasto: 0 });
  }, [estadoFilter]);

  useEffect(() => { fetchCampanas(1); }, [fetchCampanas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await comercialAPI.createCampana({
        ...form,
        presupuesto: parseFloat(form.presupuesto) || 0,
        fecha_fin: form.fecha_fin || null,
      });
      setShowModal(false);
      setForm({ nombre: '', tipo: 'DIGITAL', descripcion: '', presupuesto: '',
        fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '' });
      fetchCampanas(1);
    } catch { alert('Error creando campaña'); }
    finally { setLoading(false); }
  };

  const handleEstado = async (id, estado) => {
    try {
      await comercialAPI.actualizarCampanaEstado(id, { estado });
      setSelected(prev => ({ ...prev, estado }));
      fetchCampanas(page);
    } catch { alert('Error actualizando estado'); }
  };

  const cols = [
    { key: 'folio', label: 'Folio', mono: true, width: 100 },
    { key: 'nombre', label: 'Campaña' },
    { key: 'tipo', label: 'Tipo', render: v => <StatusPill status={v} />, width: 120 },
    { key: 'presupuesto', label: 'Presupuesto', render: v => formatCurrency(v), width: 130 },
    { key: 'gasto_actual', label: 'Gastado', render: v => formatCurrency(v), width: 130 },
    { key: 'fecha_inicio', label: 'Inicio', render: formatDate, width: 100 },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} />, width: 100 },
  ];

  const filtered = campanas.filter(c =>
    !search ||
    c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.folio?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        <MetricCard label="Total Campañas" value={stats.total} />
        <MetricCard label="Campañas Activas" value={stats.activas} positive />
        <MetricCard label="Presupuesto Total" value={formatCurrency(stats.presupuesto)} />
        <MetricCard label="Gasto Acumulado" value={formatCurrency(stats.gasto)} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'BORRADOR', 'ACTIVA', 'PAUSADA', 'FINALIZADA'].map((e, i) => (
          <button key={i} style={chipStyle(estadoFilter === e)} onClick={() => setEstadoFilter(e)}>
            {e || 'Todas'}
          </button>
        ))}
      </div>

      <Panel
        title="Campañas de Marketing"
        actions={canWrite && <Button variant="primary" onClick={() => setShowModal(true)}>+ Nueva Campaña</Button>}
      >
        <DataTable
          columns={cols}
          data={filtered}
          page={page}
          totalPages={totalPages}
          total={totalPages * 10}
          onPageChange={p => { setPage(p); fetchCampanas(p); }}
          onRowClick={r => { setSelected(r); setShowDetail(true); }}
          emptyMessage="No hay campañas registradas"
        />
      </Panel>

      {showDetail && selected && (
        <Modal title={`${selected.folio} — ${selected.nombre}`} onClose={() => setShowDetail(false)} width="580px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Tipo</div>
              <StatusPill status={selected.tipo} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Estado</div>
              <StatusPill status={selected.estado} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Presupuesto</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '18px' }}>{formatCurrency(selected.presupuesto)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Gasto Actual</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '18px', color: selected.gasto_actual > selected.presupuesto ? 'var(--status-err-text)' : 'var(--status-ok-text)' }}>{formatCurrency(selected.gasto_actual)}</div>
            </div>
            <div style={{ gridColumn: '1/3' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>Ejecución Presupuestal</div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, height: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, selected.presupuesto > 0 ? (selected.gasto_actual / selected.presupuesto * 100) : 0)}%`,
                  background: selected.gasto_actual > selected.presupuesto ? 'var(--status-err-text)' : 'var(--color-brand)',
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {selected.presupuesto > 0
                  ? `${(selected.gasto_actual / selected.presupuesto * 100).toFixed(1)}% ejecutado`
                  : 'Sin presupuesto definido'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Fecha Inicio</div>
              <div>{formatDate(selected.fecha_inicio)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Fecha Fin</div>
              <div>{selected.fecha_fin ? formatDate(selected.fecha_fin) : '—'}</div>
            </div>
            <div style={{ gridColumn: '1/3' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Descripción</div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border-color)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selected.descripcion || <i style={{ color: 'var(--text-tertiary)' }}>Sin descripción</i>}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {canWrite && selected.estado === 'BORRADOR' && <Button variant="primary" onClick={() => handleEstado(selected.id, 'ACTIVA')}>Activar Campaña</Button>}
              {canWrite && selected.estado === 'ACTIVA' && <Button onClick={() => handleEstado(selected.id, 'PAUSADA')}>Pausar</Button>}
              {canWrite && selected.estado === 'PAUSADA' && <Button variant="primary" onClick={() => handleEstado(selected.id, 'ACTIVA')}>Reactivar</Button>}
              {canWrite && ['ACTIVA', 'PAUSADA'].includes(selected.estado) && <Button onClick={() => handleEstado(selected.id, 'FINALIZADA')}>Finalizar</Button>}
            </div>
            <Button onClick={() => setShowDetail(false)}>Cerrar</Button>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title="Nueva Campaña de Marketing" onClose={() => setShowModal(false)} width="560px">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre de la Campaña</label>
              <input type="text" className="form-input" required value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Campaña Día de la Madre 2026" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Tipo de Canal</label>
                <select className="form-input" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="DIGITAL">Digital (General)</option>
                  <option value="EMAIL">Email Marketing</option>
                  <option value="SOCIAL_MEDIA">Redes Sociales</option>
                  <option value="FLYER">Flyer / Impreso</option>
                  <option value="EVENTO">Evento / Feria</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Presupuesto (S/)</label>
                <input type="number" step="0.01" className="form-input" value={form.presupuesto}
                  onChange={e => setForm({ ...form, presupuesto: e.target.value })} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Inicio</label>
                <input type="date" className="form-input" required value={form.fecha_inicio}
                  onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Fin</label>
                <input type="date" className="form-input" value={form.fecha_fin}
                  onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción / Objetivo</label>
              <textarea className="form-input" rows={3} value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe el objetivo y estrategia de la campaña..." />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Creando...' : 'Crear Campaña'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function TabEcommerce({ canWrite, search }) {
  const [pedidos, setPedidos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, nuevos: 0, preparando: 0, despachados: 0 });
  const [canalFilter, setCanalFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ cliente_nombre: '', email: '', telefono: '', canal: 'WEB', total: '', descripcion: '' });

  const SIGUIENTE = { NUEVO: 'CONFIRMADO', CONFIRMADO: 'PREPARANDO', PREPARANDO: 'DESPACHADO', DESPACHADO: 'ENTREGADO' };

  const fetchPedidos = useCallback(async (p = 1) => {
    const params = { page: p };
    if (canalFilter) params.canal = canalFilter;
    const { data } = await comercialAPI.getPedidosOnline(params);
    setPedidos(data.data);
    setPage(data.page);
    setTotalPages(data.totalPages);
    setStats(data.stats || { total: 0, nuevos: 0, preparando: 0, despachados: 0 });
  }, [canalFilter]);

  useEffect(() => { fetchPedidos(1); }, [fetchPedidos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await comercialAPI.createPedidoOnline({ ...form, total: parseFloat(form.total) || 0 });
      setShowModal(false);
      setForm({ cliente_nombre: '', email: '', telefono: '', canal: 'WEB', total: '', descripcion: '' });
      fetchPedidos(1);
    } catch { alert('Error registrando pedido'); }
    finally { setLoading(false); }
  };

  const handleAvanzar = async (row, e) => {
    e.stopPropagation();
    const siguiente = SIGUIENTE[row.estado];
    if (!siguiente) return;
    try {
      await comercialAPI.actualizarPedidoEstado(row.id, { estado: siguiente });
      fetchPedidos(page);
    } catch { alert('Error actualizando pedido'); }
  };

  const cols = [
    { key: 'folio', label: 'Folio', mono: true, width: 100 },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'canal', label: 'Canal', render: v => <StatusPill status={v} />, width: 120 },
    { key: 'total', label: 'Total', render: v => formatCurrency(v), width: 120 },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} />, width: 120 },
    { key: 'estado', label: 'Acción', render: (v, row) => SIGUIENTE[v] && canWrite
      ? <Button size="sm" onClick={ev => handleAvanzar(row, ev)}>→ {SIGUIENTE[v].charAt(0) + SIGUIENTE[v].slice(1).toLowerCase()}</Button>
      : null, width: 130 },
    { key: 'created_at', label: 'Fecha', render: formatDate, width: 110 },
  ];

  const filtered = pedidos.filter(p =>
    !search ||
    p.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.folio?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        <MetricCard label="Total Pedidos" value={stats.total} />
        <MetricCard label="Nuevos" value={stats.nuevos} />
        <MetricCard label="En Preparación" value={stats.preparando} />
        <MetricCard label="Despachados" value={stats.despachados} positive />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'WEB', 'APP', 'WHATSAPP', 'MARKETPLACE'].map((c, i) => (
          <button key={i} style={chipStyle(canalFilter === c)} onClick={() => setCanalFilter(c)}>
            {c || 'Todos los canales'}
          </button>
        ))}
      </div>

      <Panel
        title="Pedidos en Línea"
        actions={canWrite && <Button variant="primary" onClick={() => setShowModal(true)}>+ Nuevo Pedido</Button>}
      >
        <DataTable
          columns={cols}
          data={filtered}
          page={page}
          totalPages={totalPages}
          total={totalPages * 10}
          onPageChange={p => { setPage(p); fetchPedidos(p); }}
          emptyMessage="No hay pedidos registrados"
        />
      </Panel>

      {showModal && (
        <Modal title="Registrar Pedido Online" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre del Cliente</label>
              <input type="text" className="form-input" required value={form.cliente_nombre}
                onChange={e => setForm({ ...form, cliente_nombre: e.target.value })}
                placeholder="Nombre completo o razón social" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="tel" className="form-input" value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Canal de Venta</label>
                <select className="form-input" value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })}>
                  <option value="WEB">Web / Tienda Online</option>
                  <option value="APP">App Móvil</option>
                  <option value="WHATSAPP">WhatsApp Business</option>
                  <option value="MARKETPLACE">Marketplace</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Total del Pedido (S/)</label>
                <input type="number" step="0.01" className="form-input" required value={form.total}
                  onChange={e => setForm({ ...form, total: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Detalle del Pedido</label>
              <textarea className="form-input" rows={3} value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Productos solicitados, instrucciones de entrega..." />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Registrando...' : 'Registrar Pedido'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function Comercial() {
  const { canWrite } = useAuth();
  const { search } = useSearch();
  const [tab, setTab] = useState('ventas');
  
  const [ventas, setVentas] = useState([]);
  const [vPage, setVPage] = useState(1);
  const [vTotal, setVTotal] = useState(1);

  const [clientes, setClientes] = useState([]);
  const [cPage, setCPage] = useState(1);
  const [cTotal, setCTotal] = useState(1);

  const [showVentaModal, setShowVentaModal] = useState(false);
  const [showCliModal, setShowCliModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Venta Form
  const [vForm, setVForm] = useState({ cliente_id: '', items: [{ producto: '', cantidad: 1, precio_unitario: 100 }] });
  
  // Client Form
  const [cForm, setCForm] = useState({ nombre: '', tipo: 'EMPRESA', ruc: '', telefono: '', email: '', direccion: '' });

  const [clientsList, setClientsList] = useState([]);

  const fetchVentas = async (p = 1) => {
    const { data } = await comercialAPI.getVentas({ page: p });
    setVentas(data.data);
    setVPage(data.page);
    setVTotal(data.totalPages);
  };

  const fetchClientes = async (p = 1) => {
    const { data } = await comercialAPI.getClientes({ page: p });
    setClientes(data.data);
    setCPage(data.page);
    setCTotal(data.totalPages);
    if (p === 1) setClientsList(data.data); // Save the first page for the dropdown
  };

  useEffect(() => {
    if (tab === 'ventas') {
      fetchVentas(vPage);
      if (clientsList.length === 0) fetchClientes(1); // Ensure dropdown is populated
    }
    if (tab === 'atencion') fetchClientes(cPage);
  }, [tab, vPage, cPage]);

  const handleCliSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await comercialAPI.createCliente(cForm);
      setShowCliModal(false);
      setCForm({ nombre: '', tipo: 'EMPRESA', ruc: '', telefono: '', email: '', direccion: '' });
      fetchClientes(cPage);
    } catch (err) {
      alert('Error creando cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleVentaSubmit = async (e) => {
    e.preventDefault();
    if (!vForm.cliente_id) return alert('Seleccione un cliente');
    setLoading(true);
    try {
      await comercialAPI.createVenta(vForm);
      setShowVentaModal(false);
      setVForm({ cliente_id: '', items: [{ producto: '', cantidad: 1, precio_unitario: 100 }] });
      fetchVentas(vPage);
    } catch (err) {
      alert('Error registrando la venta');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setVForm(prev => ({ ...prev, items: [...prev.items, { producto: '', cantidad: 1, precio_unitario: 0 }] }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...vForm.items];
    newItems[index][field] = value;
    setVForm(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    if (vForm.items.length === 1) return;
    const newItems = [...vForm.items];
    newItems.splice(index, 1);
    setVForm(prev => ({ ...prev, items: newItems }));
  };

  const vCols = [
    { key: 'folio', label: 'Folio', mono: true },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'vendedor_nombre', label: 'Vendedor' },
    { key: 'fecha_venta', label: 'Fecha', render: formatDate },
    { key: 'total', label: 'Total', render: formatCurrency },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} /> },
  ];

  const cCols = [
    { key: 'nombre', label: 'Razón Social / Nombre' },
    { key: 'ruc', label: 'RUC/DNI', mono: true, render: v => v || '-' },
    { key: 'telefono', label: 'Teléfono', render: v => v || '-' },
    { key: 'email', label: 'Email', render: v => v || '-' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Área Comercial</h1>
          <div className="subtitle">Gestión de ventas y cartera de clientes</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'ventas' ? 'active' : ''}`} onClick={() => setTab('ventas')}>Ventas</div>
        <div className={`tab ${tab === 'marketing' ? 'active' : ''}`} onClick={() => setTab('marketing')}>Marketing</div>
        <div className={`tab ${tab === 'atencion' ? 'active' : ''}`} onClick={() => setTab('atencion')}>Atención al Cliente</div>
        <div className={`tab ${tab === 'ecommerce' ? 'active' : ''}`} onClick={() => setTab('ecommerce')}>Comercio Electrónico</div>
      </div>

      {tab === 'ventas' && (
        <Panel title="Registro de Ventas" actions={canWrite && <Button variant="primary" onClick={() => setShowVentaModal(true)}>Nueva Venta</Button>}>
          <DataTable columns={vCols} data={ventas.filter(v => !search || v.folio?.toLowerCase().includes(search.toLowerCase()) || v.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) || v.vendedor_nombre?.toLowerCase().includes(search.toLowerCase()))} page={vPage} totalPages={vTotal} total={vTotal*10} onPageChange={setVPage} />
        </Panel>
      )}

      {tab === 'atencion' && (
        <Panel title="Directorio de Clientes" actions={canWrite && <Button variant="primary" onClick={() => setShowCliModal(true)}>Nuevo Cliente</Button>}>
          <DataTable columns={cCols} data={clientes.filter(c => !search || c.nombre?.toLowerCase().includes(search.toLowerCase()) || c.ruc?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))} page={cPage} totalPages={cTotal} total={cTotal*10} onPageChange={setCPage} />
        </Panel>
      )}

      {tab === 'marketing' && <TabMarketing canWrite={canWrite} search={search} />}

      {tab === 'ecommerce' && <TabEcommerce canWrite={canWrite} search={search} />}

      {/* Client Modal */}
      {showCliModal && (
        <Modal title="Nuevo Cliente" onClose={() => setShowCliModal(false)}>
          <form onSubmit={handleCliSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre o Razón Social</label>
              <input type="text" className="form-input" required value={cForm.nombre} onChange={e => setCForm({...cForm, nombre: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={cForm.tipo} onChange={e => setCForm({...cForm, tipo: e.target.value})}>
                  <option value="EMPRESA">Empresa B2B</option>
                  <option value="PERSONA">Persona Natural</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">RUC / DNI</label>
                <input type="text" className="form-input" value={cForm.ruc} onChange={e => setCForm({...cForm, ruc: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="tel" className="form-input" value={cForm.telefono} onChange={e => setCForm({...cForm, telefono: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={cForm.email} onChange={e => setCForm({...cForm, email: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Dirección Fiscal / Envío</label>
              <input type="text" className="form-input" value={cForm.direccion} onChange={e => setCForm({...cForm, direccion: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowCliModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear Cliente'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sale Modal */}
      {showVentaModal && (
        <Modal title="Procesar Nueva Venta" onClose={() => setShowVentaModal(false)}>
          <form onSubmit={handleVentaSubmit}>
            <div className="form-group">
              <label className="form-label">Cliente (Búsqueda Rápida)</label>
              <select className="form-input" required value={vForm.cliente_id} onChange={e => setVForm({...vForm, cliente_id: e.target.value})}>
                <option value="">-- Seleccionar Cliente --</option>
                {clientsList.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.ruc ? `(${c.ruc})` : ''}</option>)}
              </select>
            </div>
            
            <div className="form-label" style={{ marginTop: '16px', marginBottom: '8px' }}>Líneas de la Venta / Productos</div>
            {vForm.items.map((item, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', marginBottom: '8px' }}>
                <div className="form-group">
                  <input type="text" placeholder="Nombre del Producto o Servicio" className="form-input" required value={item.producto} onChange={e => updateItem(idx, 'producto', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) minmax(80px, 1fr) auto', gap: '8px', alignItems: 'center' }}>
                  <input type="number" placeholder="Cant." className="form-input" required min="1" value={item.cantidad} onChange={e => updateItem(idx, 'cantidad', parseInt(e.target.value) || 1)} />
                  <input type="number" placeholder="Pr. Unit S/" className="form-input" required step="0.01" value={item.precio_unitario} onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)} />
                  <Button type="button" variant="danger" size="sm" onClick={() => removeItem(idx)}>X</Button>
                </div>
              </div>
            ))}
            
            <Button type="button" size="sm" onClick={addItem}>+ Agregar Línea</Button>

            <div style={{ padding: '16px 0', borderTop: '1px solid var(--border-color)', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                <span>Total Estimado:</span>
                <span>{formatCurrency(vForm.items.reduce((s, i) => s + (i.cantidad * i.precio_unitario), 0))}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowVentaModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Procesando...' : 'Confirmar Venta'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
