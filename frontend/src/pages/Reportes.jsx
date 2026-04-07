import { useState } from 'react';
import { reportesAPI } from '../api';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';

const REPORT_MODULES = [
  { id: 'ventas', title: 'Ventas Mensuales', desc: 'Historial de ventas y contratos cerrados', icon: '💰' },
  { id: 'inventario', title: 'Inventario Actual', desc: 'Stock de productos, mínimos y almacenes', icon: '📦' },
  { id: 'financiero', title: 'Estado Financiero', desc: 'Ingresos, egresos y transacciones de tesorería', icon: '📊' },
  { id: 'actividad', title: 'Log de Actividad', desc: 'Auditoría de acciones de usuarios', icon: '🔍' },
  { id: 'produccion', title: 'Producción en Plata', desc: 'Órdenes de fabricación y dictámenes de calidad', icon: '⚙️' },
  { id: 'rrhh', title: 'Recursos Humanos', desc: 'Directorio de empleados, rangos salariales y áreas', icon: '👥' },
];

export default function Reportes() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const exportCSV = async (moduleId) => {
    if (desde && hasta && new Date(desde) > new Date(hasta)) {
      setMsg({ text: 'Error: La fecha "Desde" no puede ser mayor a la fecha "Hasta".', type: 'error' });
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
      return;
    }

    try {
      setLoading(moduleId);
      setMsg({ text: 'Preparando descarga...', type: 'info' });
      const res = await reportesAPI.downloadCSV(moduleId, { desde, hasta });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_${moduleId}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMsg({ text: 'Reporte descargado correctamente.', type: 'success' });
    } catch (err) {
      console.error('Error exportando:', err);
      setMsg({ text: 'Error al intentar descargar el reporte. Verifique su conexión.', type: 'error' });
    } finally {
      setLoading('');
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reportes Consolidados</h1>
          <div className="subtitle">Extracción de datos y métricas para auditoría y gerencia</div>
        </div>
        <div className="date-filter" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: '13px' }}>Filtrar por rango (opcional):</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px' }}>
            <label style={{ fontSize: '12px' }}>Desde:</label>
            <input type="date" className="form-input" style={{ width: '130px', padding: '4px 8px' }} value={desde} onChange={(e) => setDesde(e.target.value)} />
            <span style={{ color: 'var(--text-tertiary)' }}>—</span>
            <label style={{ fontSize: '12px' }}>Hasta:</label>
            <input type="date" className="form-input" style={{ width: '130px', padding: '4px 8px' }} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </div>

      {msg.text && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: msg.type === 'error' ? '#FEF2F2' : msg.type === 'success' ? '#ECFDF5' : '#F0F9FF',
          color: msg.type === 'error' ? '#991B1B' : msg.type === 'success' ? '#065F46' : '#0369A1',
          border: `1px solid ${msg.type === 'error' ? '#FCA5A5' : msg.type === 'success' ? '#6EE7B7' : '#7DD3FC'}`
        }}>
          {msg.text}
        </div>
      )}

      <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {REPORT_MODULES.map((mod) => (
          <div key={mod.id} className="report-card" style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div className="report-icon" style={{ background: 'var(--bg-secondary)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                {mod.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>{mod.title}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{mod.desc}</p>
              </div>
            </div>
            
            <div style={{ marginTop: 'auto' }}>
              <Button
                variant={loading === mod.id ? 'default' : 'primary'}
                style={{ width: '100%' }}
                onClick={() => exportCSV(mod.id)}
                disabled={loading === mod.id}
              >
                {loading === mod.id ? 'Generando Archivo...' : 'Exportar a Excel (CSV)'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
