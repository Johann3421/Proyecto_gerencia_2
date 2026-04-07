import { useState, useEffect } from 'react';
import { logisticaAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';

const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-PE') : '-';

export default function Logistica() {
  const { canWrite } = useAuth();
  const [tab, setTab] = useState('inventario');
  const [metrics, setMetrics] = useState({});

  const [prods, setProds] = useState([]);
  const [pPage, setPPage] = useState(1);
  const [pTotal, setPTotal] = useState(1);

  const [ocs, setOcs] = useState([]);
  const [oPage, setOPage] = useState(1);
  const [oTotal, setOTotal] = useState(1);

  useEffect(() => {
    logisticaAPI.metrics().then(({ data }) => setMetrics(data));
  }, []);

  useEffect(() => {
    if (tab === 'inventario') {
      logisticaAPI.getProductos({ page: pPage }).then(({ data }) => {
        setProds(data.data); setPPage(data.page); setPTotal(data.totalPages);
      });
    } else if (tab === 'compras') {
      logisticaAPI.getOrdenes({ page: oPage }).then(({ data }) => {
        setOcs(data.data); setOPage(data.page); setOTotal(data.totalPages);
      });
    }
  }, [tab, pPage, oPage]);

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
        <MetricCard label="SKUs en Stock" value={metrics.skus || 0} />
        <MetricCard label="Stock Crítico" value={metrics.stock_critico || 0} positive={metrics.stock_critico === 0} />
        <MetricCard label="Entregas Hoy" value={metrics.entregas_hoy || 0} />
        <MetricCard label="Órdenes Activas" value={metrics.ordenes_compra || 0} />
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'inventario' ? 'active' : ''}`} onClick={() => setTab('inventario')}>Inventario</div>
        <div className={`tab ${tab === 'compras' ? 'active' : ''}`} onClick={() => setTab('compras')}>Órdenes de Compra</div>
      </div>

      {tab === 'inventario' && (
        <Panel title="Maestro de Productos" actions={canWrite && <Button variant="primary">Nuevo SKU</Button>}>
          <DataTable columns={pCols} data={prods} page={pPage} totalPages={pTotal} total={pTotal * 10} onPageChange={setPPage} rowClassName={rowClass} />
        </Panel>
      )}

      {tab === 'compras' && (
        <Panel title="Registro de Compras" actions={canWrite && <Button variant="primary">Nueva Orden</Button>}>
          <DataTable columns={oCols} data={ocs} page={oPage} totalPages={oTotal} total={oTotal * 10} onPageChange={setOPage} />
        </Panel>
      )}
    </div>
  );
}
