import { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';
import MetricCard from '../components/ui/MetricCard';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import StatusPill from '../components/ui/StatusPill';

const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);

export default function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [pedidos, setPedidos] = useState([]);
  const [actividad, setActividad] = useState([]);

  useEffect(() => {
    dashboardAPI.metrics().then(({ data }) => {
      setMetrics(data.metrics);
      setPedidos(data.pedidos);
    });
    dashboardAPI.activity().then(({ data }) => setActividad(data.activity));
  }, []);

  const cols = [
    { key: 'folio', label: 'Folio', mono: true },
    { key: 'cliente', label: 'Cliente' },
    { key: 'vendedor', label: 'Vendedor' },
    { key: 'fecha_venta', label: 'Fecha' },
    { key: 'total', label: 'Total', render: formatCurrency },
    { key: 'estado', label: 'Estado', render: (val) => <StatusPill status={val} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">Resumen general del sistema</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="metrics-grid">
            <MetricCard label="Ventas del mes" value={formatCurrency(metrics.ventas_mes)} positive />
            <MetricCard label="Pedidos activos" value={metrics.pedidos_activos} />
            <MetricCard label="Stock crítico" value={metrics.stock_critico} change={"¡Revisar!"} positive={false} />
            <MetricCard label="Usuarios activos" value={metrics.usuarios_activos} />
          </div>

          <Panel title="Últimos Pedidos" className="flex-1">
            <DataTable columns={cols} data={pedidos} total={pedidos.length} page={1} totalPages={1} />
          </Panel>
        </div>

        <div className="dashboard-side">
          <Panel title="Estado y Áreas">
            <div className="area-cards">
              {['ADMINISTRACION', 'TECNOLOGIA', 'COMERCIAL', 'LOGISTICA', 'PRODUCCION'].map((area, i) => (
                <div key={area} className="area-card">
                  <div className="area-icon" style={{ background: ['#E1F5EE', '#E6F1FB', '#F4F4F2', '#FAEEDA', '#F5DDD6'][i] }}>
                    {['💼', '💻', '🛒', '🚚', '⚙️'][i]}
                  </div>
                  <div className="area-info">
                    <div className="area-name">{area}</div>
                    <div className="area-progress">
                      <div className="area-progress-bar" style={{ width: `${Math.random() * 60 + 30}%`, background: 'var(--color-brand)' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Actividad Reciente">
            <div className="activity-feed">
              {actividad.map((it) => (
                <div key={it.id} className="activity-item">
                  <div className="activity-icon">⚡</div>
                  <div className="activity-text">
                    <strong>{it.usuario_nombre || 'Sistema'}</strong> {it.descripcion.toLowerCase()} en {it.modulo}
                    <div className="activity-time">{new Date(it.created_at).toLocaleString('es-PE')}</div>
                  </div>
                </div>
              ))}
              {actividad.length === 0 && <span style={{fontSize: 11, color: 'gray'}}>No hay actividad reciente.</span>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
