import { useState, useEffect, useCallback } from 'react';
import { logisticaAPI } from '../api';
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

function TabAlmacen({ canWrite, search }) {
  const [movimientos, setMovimientos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tipoFilter, setTipoFilter] = useState('');
  const [stats, setStats] = useState({ hoy: 0, total: 0, entradas_mes: 0, salidas_mes: 0 });
  const [productos, setProductos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo: 'ENTRADA', producto_id: '', cantidad: 1,
    almacen_origen: 'PRINCIPAL', almacen_destino: 'PRINCIPAL',
    motivo: '', referencia: '',
  });

  const fetchMovimientos = useCallback(async (p = 1) => {
    const params = { page: p };
    if (tipoFilter) params.tipo = tipoFilter;
    const { data } = await logisticaAPI.getMovimientosAlmacen(params);
    setMovimientos(data.data);
    setPage(data.page);
    setTotalPages(data.totalPages);
    setStats(data.stats || { hoy: 0, total: 0, entradas_mes: 0, salidas_mes: 0 });
  }, [tipoFilter]);

  useEffect(() => { fetchMovimientos(1); }, [fetchMovimientos]);
  useEffect(() => {
    logisticaAPI.getProductos({ page: 1 }).then(({ data }) => setProductos(data.data || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await logisticaAPI.createMovimientoAlmacen({ ...form, cantidad: parseInt(form.cantidad) });
      setShowModal(false);
      setForm({ tipo: 'ENTRADA', producto_id: '', cantidad: 1, almacen_origen: 'PRINCIPAL', almacen_destino: 'PRINCIPAL', motivo: '', referencia: '' });
      fetchMovimientos(1);
    } catch { alert('Error registrando movimiento'); }
    finally { setLoading(false); }
  };

  const cols = [
    { key: 'folio', label: 'Folio', mono: true, width: 100 },
    { key: 'tipo', label: 'Tipo', render: v => <StatusPill status={v} />, width: 90 },
    { key: 'producto_nombre', label: 'Producto' },
    { key: 'cantidad', label: 'Cant.', width: 65 },
    { key: 'almacen_origen', label: 'Origen', render: v => v || '—', width: 100 },
    { key: 'almacen_destino', label: 'Destino', render: v => v || '—', width: 100 },
    { key: 'motivo', label: 'Motivo', render: v => v || '—' },
    { key: 'created_at', label: 'Fecha', render: formatDate, width: 110 },
  ];

  const filtered = movimientos.filter(m =>
    !search ||
    m.folio?.toLowerCase().includes(search.toLowerCase()) ||
    m.producto_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    m.motivo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        <MetricCard label="Total Movimientos" value={stats.total} />
        <MetricCard label="Movimientos Hoy" value={stats.hoy} />
        <MetricCard label="Entradas del Mes" value={stats.entradas_mes} positive />
        <MetricCard label="Salidas del Mes" value={stats.salidas_mes} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO'].map((t, i) => (
          <button key={i} style={chipStyle(tipoFilter === t)} onClick={() => setTipoFilter(t)}>
            {t || 'Todos'}
          </button>
        ))}
      </div>

      <Panel
        title="Movimientos de Almacén"
        actions={canWrite && <Button variant="primary" onClick={() => setShowModal(true)}>+ Registrar Movimiento</Button>}
      >
        <DataTable
          columns={cols}
          data={filtered}
          page={page}
          totalPages={totalPages}
          total={totalPages * 10}
          onPageChange={p => { setPage(p); fetchMovimientos(p); }}
          emptyMessage="No hay movimientos registrados"
        />
      </Panel>

      {showModal && (
        <Modal title="Registrar Movimiento de Almacén" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Tipo de Movimiento</label>
                <select className="form-input" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="ENTRADA">Entrada — Ingreso al almacén</option>
                  <option value="SALIDA">Salida — Despacho del almacén</option>
                  <option value="AJUSTE">Ajuste de Inventario</option>
                  <option value="TRASLADO">Traslado entre almacenes</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Producto</label>
                <select className="form-input" required value={form.producto_id} onChange={e => setForm({ ...form, producto_id: e.target.value })}>
                  <option value="">— Seleccionar —</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <input type="number" min="1" className="form-input" required value={form.cantidad}
                  onChange={e => setForm({ ...form, cantidad: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Referencia</label>
                <input type="text" className="form-input" value={form.referencia}
                  onChange={e => setForm({ ...form, referencia: e.target.value })}
                  placeholder="Ej: OC-00042, VT-00015" />
              </div>
              {form.tipo === 'TRASLADO' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Almacén Origen</label>
                    <select className="form-input" value={form.almacen_origen} onChange={e => setForm({ ...form, almacen_origen: e.target.value })}>
                      <option value="PRINCIPAL">Principal</option>
                      <option value="SECUNDARIO">Secundario</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Almacén Destino</label>
                    <select className="form-input" value={form.almacen_destino} onChange={e => setForm({ ...form, almacen_destino: e.target.value })}>
                      <option value="PRINCIPAL">Principal</option>
                      <option value="SECUNDARIO">Secundario</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Motivo / Descripción</label>
              <input type="text" className="form-input" value={form.motivo}
                onChange={e => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ej: Recepción OC-00042, Despacho pedido VT-00005..." />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Registrar Movimiento'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function TabMantenimiento({ canWrite, search }) {
  const [subTab, setSubTab] = useState('activos');
  const [activos, setActivos] = useState([]);
  const [activosPage, setActivosPage] = useState(1);
  const [activosTotalPages, setActivosTotalPages] = useState(1);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenesPage, setOrdenesPage] = useState(1);
  const [ordenesTotalPages, setOrdenesTotalPages] = useState(1);
  const [stats, setStats] = useState({ activos: 0, operativos: 0, en_mantenimiento: 0, ordenes_pendientes: 0 });
  const [showActivoModal, setShowActivoModal] = useState(false);
  const [showOrdenModal, setShowOrdenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activoForm, setActivoForm] = useState({ codigo: '', nombre: '', tipo: '', numero_serie: '', ubicacion: '', valor_adquisicion: '' });
  const [ordenForm, setOrdenForm] = useState({ activo_id: '', tipo: 'PREVENTIVO', descripcion: '', tecnico: '', fecha_programada: '' });

  const fetchActivos = useCallback(async (p = 1) => {
    const { data } = await logisticaAPI.getActivos({ page: p });
    setActivos(data.data);
    setActivosPage(data.page);
    setActivosTotalPages(data.totalPages);
    setStats(prev => ({ ...prev,
      activos: parseInt(data.stats?.total || data.total || 0),
      operativos: parseInt(data.stats?.operativos || 0),
      en_mantenimiento: parseInt(data.stats?.en_mantenimiento || 0),
    }));
  }, []);

  const fetchOrdenes = useCallback(async (p = 1) => {
    const { data } = await logisticaAPI.getMantenimiento({ page: p });
    setOrdenes(data.data);
    setOrdenesPage(data.page);
    setOrdenesTotalPages(data.totalPages);
    setStats(prev => ({ ...prev, ordenes_pendientes: parseInt(data.stats?.pendientes || 0) }));
  }, []);

  useEffect(() => { fetchActivos(1); fetchOrdenes(1); }, [fetchActivos, fetchOrdenes]);

  const handleActivoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await logisticaAPI.createActivo({ ...activoForm, valor_adquisicion: parseFloat(activoForm.valor_adquisicion) || null });
      setShowActivoModal(false);
      setActivoForm({ codigo: '', nombre: '', tipo: '', numero_serie: '', ubicacion: '', valor_adquisicion: '' });
      fetchActivos(1);
    } catch { alert('Error creando activo'); }
    finally { setLoading(false); }
  };

  const handleOrdenSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await logisticaAPI.createMantenimiento({ ...ordenForm });
      setShowOrdenModal(false);
      setOrdenForm({ activo_id: '', tipo: 'PREVENTIVO', descripcion: '', tecnico: '', fecha_programada: '' });
      fetchOrdenes(1);
    } catch { alert('Error creando orden de mantenimiento'); }
    finally { setLoading(false); }
  };

  const activoCols = [
    { key: 'codigo', label: 'Código', mono: true, width: 110 },
    { key: 'nombre', label: 'Nombre / Descripción' },
    { key: 'tipo', label: 'Tipo', render: v => v || '—', width: 120 },
    { key: 'ubicacion', label: 'Ubicación', render: v => v || '—' },
    { key: 'numero_serie', label: 'Nro. Serie', render: v => v || '—', mono: true },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} />, width: 140 },
  ];

  const ordenCols = [
    { key: 'folio', label: 'Folio', mono: true, width: 100 },
    { key: 'activo_nombre', label: 'Activo' },
    { key: 'tipo', label: 'Tipo', render: v => <StatusPill status={v} />, width: 110 },
    { key: 'tecnico', label: 'Técnico', render: v => v || '—' },
    { key: 'fecha_programada', label: 'Fecha Prog.', render: formatDate, width: 110 },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} />, width: 110 },
  ];

  const filteredActivos = activos.filter(a =>
    !search || a.nombre?.toLowerCase().includes(search.toLowerCase()) || a.codigo?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOrdenes = ordenes.filter(o =>
    !search || o.activo_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    o.folio?.toLowerCase().includes(search.toLowerCase()) || o.tecnico?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        <MetricCard label="Activos Registrados" value={stats.activos} />
        <MetricCard label="Operativos" value={stats.operativos} positive />
        <MetricCard label="En Mantenimiento" value={stats.en_mantenimiento} />
        <MetricCard label="Órdenes Pendientes" value={stats.ordenes_pendientes} />
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <div className={`tab ${subTab === 'activos' ? 'active' : ''}`} onClick={() => setSubTab('activos')}>Activos / Equipos</div>
        <div className={`tab ${subTab === 'ordenes' ? 'active' : ''}`} onClick={() => setSubTab('ordenes')}>Órdenes de Mantenimiento</div>
      </div>

      {subTab === 'activos' && (
        <Panel
          title="Registro de Activos y Equipos"
          actions={canWrite && <Button variant="primary" onClick={() => setShowActivoModal(true)}>+ Nuevo Activo</Button>}
        >
          <DataTable
            columns={activoCols}
            data={filteredActivos}
            page={activosPage}
            totalPages={activosTotalPages}
            total={activosTotalPages * 10}
            onPageChange={fetchActivos}
            emptyMessage="No hay activos registrados"
          />
        </Panel>
      )}

      {subTab === 'ordenes' && (
        <Panel
          title="Órdenes de Mantenimiento"
          actions={canWrite && <Button variant="primary" onClick={() => setShowOrdenModal(true)}>+ Nueva Orden</Button>}
        >
          <DataTable
            columns={ordenCols}
            data={filteredOrdenes}
            page={ordenesPage}
            totalPages={ordenesTotalPages}
            total={ordenesTotalPages * 10}
            onPageChange={fetchOrdenes}
            emptyMessage="No hay órdenes de mantenimiento"
          />
        </Panel>
      )}

      {showActivoModal && (
        <Modal title="Registrar Nuevo Activo" onClose={() => setShowActivoModal(false)} width="560px">
          <form onSubmit={handleActivoSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Código Activo</label>
                <input type="text" className="form-input" required value={activoForm.codigo}
                  onChange={e => setActivoForm({ ...activoForm, codigo: e.target.value })}
                  placeholder="Ej: EQ-006" />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del Activo</label>
                <input type="text" className="form-input" required value={activoForm.nombre}
                  onChange={e => setActivoForm({ ...activoForm, nombre: e.target.value })}
                  placeholder="Ej: Montacargas Eléctrico Toyota" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Tipo / Categoría</label>
                <input type="text" className="form-input" value={activoForm.tipo}
                  onChange={e => setActivoForm({ ...activoForm, tipo: e.target.value })}
                  placeholder="Ej: Maquinaria, Vehículo, TI" />
              </div>
              <div className="form-group">
                <label className="form-label">Nro. de Serie</label>
                <input type="text" className="form-input" value={activoForm.numero_serie}
                  onChange={e => setActivoForm({ ...activoForm, numero_serie: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Ubicación</label>
                <input type="text" className="form-input" value={activoForm.ubicacion}
                  onChange={e => setActivoForm({ ...activoForm, ubicacion: e.target.value })}
                  placeholder="Ej: Almacén Principal, Piso 2" />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Adquisición (S/)</label>
                <input type="number" step="0.01" className="form-input" value={activoForm.valor_adquisicion}
                  onChange={e => setActivoForm({ ...activoForm, valor_adquisicion: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowActivoModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Registrar Activo'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {showOrdenModal && (
        <Modal title="Nueva Orden de Mantenimiento" onClose={() => setShowOrdenModal(false)} width="560px">
          <form onSubmit={handleOrdenSubmit}>
            <div className="form-group">
              <label className="form-label">Activo / Equipo</label>
              <select className="form-input" required value={ordenForm.activo_id}
                onChange={e => setOrdenForm({ ...ordenForm, activo_id: e.target.value })}>
                <option value="">— Seleccionar activo —</option>
                {activos.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Tipo de Mantenimiento</label>
                <select className="form-input" value={ordenForm.tipo}
                  onChange={e => setOrdenForm({ ...ordenForm, tipo: e.target.value })}>
                  <option value="PREVENTIVO">Preventivo</option>
                  <option value="CORRECTIVO">Correctivo</option>
                  <option value="EMERGENCIA">Emergencia</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Técnico Asignado</label>
                <input type="text" className="form-input" value={ordenForm.tecnico}
                  onChange={e => setOrdenForm({ ...ordenForm, tecnico: e.target.value })}
                  placeholder="Nombre del técnico" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Programada</label>
              <input type="date" className="form-input" value={ordenForm.fecha_programada}
                onChange={e => setOrdenForm({ ...ordenForm, fecha_programada: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción del Trabajo</label>
              <textarea className="form-input" required rows={3} value={ordenForm.descripcion}
                onChange={e => setOrdenForm({ ...ordenForm, descripcion: e.target.value })}
                placeholder="Describe el trabajo de mantenimiento a realizar..." />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowOrdenModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Creando...' : 'Crear Orden'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function Logistica() {
  const { canWrite } = useAuth();
  const { search } = useSearch();
  const [tab, setTab] = useState('compras');
  const [metrics, setMetrics] = useState({});

  const [prods, setProds] = useState([]);
  const [pPage, setPPage] = useState(1);
  const [pTotal, setPTotal] = useState(1);

  const [ocs, setOcs] = useState([]);
  const [oPage, setOPage] = useState(1);
  const [oTotal, setOTotal] = useState(1);

  const [dists, setDists] = useState([]);
  const [dPage, setDPage] = useState(1);
  const [dTotal, setDTotal] = useState(1);

  // Modals state
  const [showProdModal, setShowProdModal] = useState(false);
  const [showOcModal, setShowOcModal] = useState(false);
  const [showDistModal, setShowDistModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forms
  const [pForm, setPForm] = useState({ sku: '', nombre: '', descripcion: '', stock_actual: 0, stock_minimo: 5, almacen: 'PRINCIPAL' });
  const [oForm, setOForm] = useState({ proveedor: '', total: 0, estado: 'BORRADOR' });
  const [dForm, setDForm] = useState({ destino: '', transportista: '', fecha_salida: '' });

  const fetchMetrics = () => logisticaAPI.metrics().then(({ data }) => setMetrics(data));

  useEffect(() => { fetchMetrics(); }, []);

  const fetchProds = async (p = 1) => {
    const { data } = await logisticaAPI.getProductos({ page: p });
    setProds(data.data); setPPage(data.page); setPTotal(data.totalPages);
  };
  const fetchOcs = async (p = 1) => {
    const { data } = await logisticaAPI.getOrdenes({ page: p });
    setOcs(data.data); setOPage(data.page); setOTotal(data.totalPages);
  };
  const fetchDists = async (p = 1) => {
    const { data } = await logisticaAPI.getDistribuciones({ page: p });
    setDists(data.data); setDPage(data.page); setDTotal(data.totalPages);
  };

  useEffect(() => {
    if (tab === 'inventarios') fetchProds(pPage);
    else if (tab === 'compras') fetchOcs(oPage);
    else if (tab === 'distribucion') fetchDists(dPage);
  }, [tab, pPage, oPage, dPage]);

  const handleProdSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await logisticaAPI.createProducto(pForm);
      setShowProdModal(false);
      setPForm({ sku: '', nombre: '', descripcion: '', stock_actual: 0, stock_minimo: 5, almacen: 'PRINCIPAL' });
      fetchProds(pPage);
      fetchMetrics();
    } catch (err) {
      alert('Error creando producto - valide que el SKU sea único');
    } finally {
      setLoading(false);
    }
  };

  const handleOcSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await logisticaAPI.createOrden(oForm);
      setShowOcModal(false);
      setOForm({ proveedor: '', total: 0, estado: 'BORRADOR' });
      fetchOcs(oPage);
    } catch (err) {
      alert('Error creando orden');
    } finally {
      setLoading(false);
    }
  };

  const handleDistSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await logisticaAPI.createDistribucion(dForm);
      setShowDistModal(false);
      setDForm({ destino: '', transportista: '', fecha_salida: '' });
      fetchDists(dPage);
    } catch (err) {
      alert('Error creando ruta de distribución');
    } finally {
      setLoading(false);
    }
  };

  const pCols = [
    { key: 'sku', label: 'SKU', mono: true },
    { key: 'nombre', label: 'Producto' },
    { key: 'almacen', label: 'Almacén' },
    { key: 'stock_actual', label: 'Stock Actual' },
    { key: 'stock_minimo', label: 'Stock Mínimo' },
    { key: 'estado', label: 'Estado', render: (_, r) => {
      const isCritical = r.stock_actual < r.stock_minimo;
      const isWarn = r.stock_actual < (r.stock_minimo * 1.5);
      const status = isCritical ? 'CRITICO' : isWarn ? 'BAJO' : 'OK';
      return <StatusPill status={status} />;
    }},
  ];

  const oCols = [
    { key: 'folio', label: 'Folio', mono: true },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'fecha', label: 'Fecha', render: formatDate },
    { key: 'total', label: 'Total', render: formatCurrency },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} /> },
  ];

  const dCols = [
    { key: 'folio', label: 'Folio (Tracking)', mono: true },
    { key: 'destino', label: 'Destino / Cliente' },
    { key: 'transportista', label: 'Agencia / Conductor' },
    { key: 'fecha_salida', label: 'Fe. Salida', render: formatDate },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} /> },
  ];

  const rowClass = (r) => {
    if (r.stock_actual < r.stock_minimo) return 'row-critical';
    if (r.stock_actual < r.stock_minimo * 1.5) return 'row-warning';
    return '';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Logística y Almacenes</h1>
          <div className="subtitle">Gestión de inventarios, compras y distribución</div>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard label="SKUs Activos" value={metrics.skus || 0} />
        <MetricCard label="Stock Crítico / Rotura" value={metrics.stock_critico || 0} positive={metrics.stock_critico === 0} />
        <MetricCard label="Envíos Despachados Hoy" value={metrics.entregas_hoy || 0} />
        <MetricCard label="Órdenes C. Borrador/Activa" value={metrics.ordenes_compra || 0} />
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'compras' ? 'active' : ''}`} onClick={() => { setTab('compras'); setOPage(1); }}>Compras</div>
        <div className={`tab ${tab === 'almacen' ? 'active' : ''}`} onClick={() => { setTab('almacen'); }}>Almacén</div>
        <div className={`tab ${tab === 'inventarios' ? 'active' : ''}`} onClick={() => { setTab('inventarios'); setPPage(1); }}>Inventarios</div>
        <div className={`tab ${tab === 'distribucion' ? 'active' : ''}`} onClick={() => { setTab('distribucion'); setDPage(1); }}>Distribución</div>
        <div className={`tab ${tab === 'mantenimiento' ? 'active' : ''}`} onClick={() => { setTab('mantenimiento'); }}>Mantenimiento</div>
      </div>

      {tab === 'inventarios' && (
        <Panel title="Catálogo de Productos" actions={canWrite && <Button variant="primary" onClick={() => setShowProdModal(true)}>Nuevo Producto</Button>}>
          <DataTable columns={pCols} data={prods.filter(p => !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))} page={pPage} totalPages={pTotal} total={pTotal*10} onPageChange={setPPage} rowClassName={rowClass} />
        </Panel>
      )}

      {tab === 'compras' && (
        <Panel title="Órdenes de Compra" actions={canWrite && <Button variant="primary" onClick={() => setShowOcModal(true)}>Nueva OC</Button>}>
          <DataTable columns={oCols} data={ocs.filter(o => !search || o.folio?.toLowerCase().includes(search.toLowerCase()) || o.proveedor?.toLowerCase().includes(search.toLowerCase()))} page={oPage} totalPages={oTotal} total={oTotal*10} onPageChange={setOPage} />
        </Panel>
      )}

      {tab === 'distribucion' && (
        <Panel title="Rutas de Distribución" actions={canWrite && <Button variant="primary" onClick={() => setShowDistModal(true)}>Nueva Ruta</Button>}>
          <DataTable columns={dCols} data={dists.filter(d => !search || d.folio?.toLowerCase().includes(search.toLowerCase()) || d.destino?.toLowerCase().includes(search.toLowerCase()) || d.transportista?.toLowerCase().includes(search.toLowerCase()))} page={dPage} totalPages={dTotal} total={dTotal*10} onPageChange={setDPage} />
        </Panel>
      )}

      {tab === 'almacen' && <TabAlmacen canWrite={canWrite} search={search} />}

      {tab === 'mantenimiento' && <TabMantenimiento canWrite={canWrite} search={search} />}

      {/* Modals */}
      {showProdModal && (
        <Modal title="Nuevo Producto en Catálogo" onClose={() => setShowProdModal(false)}>
          <form onSubmit={handleProdSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">SKU (Código)</label>
                <input type="text" className="form-input" required value={pForm.sku} onChange={e => setPForm({...pForm, sku: e.target.value})} placeholder="Ej: PROD-102" />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del Artículo</label>
                <input type="text" className="form-input" required value={pForm.nombre} onChange={e => setPForm({...pForm, nombre: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción Técnica</label>
              <textarea className="form-input" rows={2} value={pForm.descripcion} onChange={e => setPForm({...pForm, descripcion: e.target.value})}></textarea>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" title="Stock actual del inventario físico">Stock Físico</label>
                <input type="number" className="form-input" required min="0" value={pForm.stock_actual} onChange={e => setPForm({...pForm, stock_actual: parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group">
                <label className="form-label" title="Mínimo aceptable antes de rotura">Stock Mínimo</label>
                <input type="number" className="form-input" required min="0" value={pForm.stock_minimo} onChange={e => setPForm({...pForm, stock_minimo: parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group">
                <label className="form-label">Almacén Mtr.</label>
                <select className="form-input" value={pForm.almacen} onChange={e => setPForm({...pForm, almacen: e.target.value})}>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="SECUNDARIO">Secundario (Reserva)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowProdModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear Producto'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {showOcModal && (
        <Modal title="Emitir Orden de Compra" onClose={() => setShowOcModal(false)}>
          <form onSubmit={handleOcSubmit}>
            <div className="form-group">
              <label className="form-label">Empresa Proveedora</label>
              <input type="text" className="form-input" required value={oForm.proveedor} onChange={e => setOForm({...oForm, proveedor: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Importe Total Estimado (S/)</label>
                <input type="number" step="0.01" className="form-input" required min="0" value={oForm.total} onChange={e => setOForm({...oForm, total: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="form-group">
                <label className="form-label">Estado Inicial</label>
                <select className="form-input" value={oForm.estado} onChange={e => setOForm({...oForm, estado: e.target.value})}>
                  <option value="BORRADOR">Borrador</option>
                  <option value="ENVIADA">Enviada al Prov.</option>
                  <option value="RECIBIDA">Material Recibido</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowOcModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Emitiendo...' : 'Crear Orden'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {showDistModal && (
        <Modal title="Generar Hoja de Despacho" onClose={() => setShowDistModal(false)}>
          <form onSubmit={handleDistSubmit}>
            <div className="form-group">
              <label className="form-label">Dirección Final o Cliente Destino</label>
              <input type="text" className="form-input" required value={dForm.destino} onChange={e => setDForm({...dForm, destino: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Agencia / Transportista Asignado</label>
              <input type="text" className="form-input" required value={dForm.transportista} onChange={e => setDForm({...dForm, transportista: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Programada de Salida</label>
              <input type="date" className="form-input" required value={dForm.fecha_salida} onChange={e => setDForm({...dForm, fecha_salida: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowDistModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Planificando...' : 'Registrar Despacho'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
