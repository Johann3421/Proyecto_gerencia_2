import { useState } from 'react';
import { reportesAPI } from '../api';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';

const REPORT_MODULES = [
  { id: 'ventas', title: 'Ventas Mensuales', desc: 'Historial de ventas y contratos cerrados', icon: '💰' },
  { id: 'inventario', title: 'Inventario Actual', desc: 'Stock de productos, mínimos y almacenes', icon: '📦' },
  { id: 'financiero', title: 'Estado Financiero', desc: 'Ingresos, egresos y transacciones', icon: '📊' },
  { id: 'actividad', title: 'Log de Actividad', desc: 'Auditoría de acciones de usuarios', icon: '🔍' },
  { id: 'produccion', title: 'Producción', desc: 'Órdenes de fabricación y estados', icon: '⚙️' },
  { id: 'rrhh', title: 'Recursos Humanos', desc: 'Directorio de empleados y salarios', icon: '👥' },
];

export default function Reportes() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [loading, setLoading] = useState('');

  const exportCSV = async (moduleId) => {
    try {
      setLoading(moduleId);
      const res = await reportesAPI.downloadCSV(moduleId, { desde, hasta });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${moduleId}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exportando:', err);
      // In a real app we'd trigger a toast here
    } finally {
      setLoading('');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reportes Consolidados</h1>
          <div className="subtitle">Extracción de datos y métricas para auditoría</div>
        </div>
        <div className="date-filter">
          <label>Desde:</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <label>Hasta:</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      <div className="report-grid">
        {REPORT_MODULES.map((mod) => (
          <div key={mod.id} className="report-card">
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="report-icon" style={{ background: 'var(--bg-secondary)' }}>
                {mod.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3>{mod.title}</h3>
                <p>{mod.desc}</p>
              </div>
            </div>
            <Button
              variant="default"
              style={{ width: '100%' }}
              onClick={() => exportCSV(mod.id)}
              disabled={loading === mod.id}
            >
              {loading === mod.id ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
