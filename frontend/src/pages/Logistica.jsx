import { useState, useEffect } from 'react';
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

export default function Logistica() {
  const { canWrite } = useAuth();
  const { search } = useSearch();
  const [tab, setTab] = useState('inventario');
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
    if (tab === 'inventario') fetchProds(pPage);
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
        <div className={`tab ${tab === 'inventario' ? 'active' : ''}`} onClick={() => { setTab('inventario'); setPPage(1); }}>Inventario Maestro</div>
        <div className={`tab ${tab === 'compras' ? 'active' : ''}`} onClick={() => { setTab('compras'); setOPage(1); }}>Órdenes de Compra</div>
        <div className={`tab ${tab === 'distribucion' ? 'active' : ''}`} onClick={() => { setTab('distribucion'); setDPage(1); }}>Logística de Envíos</div>
      </div>

      {tab === 'inventario' && (
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
