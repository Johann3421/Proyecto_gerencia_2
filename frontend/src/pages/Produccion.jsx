import { useState, useEffect } from 'react';
import { produccionAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSearch } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-PE') : '-';

const OF_PIPELINE = ['PLANIFICADA', 'EN_PROCESO', 'CONTROL_CALIDAD', 'COMPLETADA'];

function PipelineVisual({ estado }) {
  const currentIdx = OF_PIPELINE.indexOf(estado);
  if (currentIdx === -1) return <div style={{ fontSize: '12px', opacity: 0.6 }}>{estado}</div>;

  return (
    <div className="pipeline">
      {OF_PIPELINE.map((step, i) => (
        <span key={step} style={{display: 'flex', alignItems: 'center'}}>
          <div className={`pipeline-step ${i < currentIdx ? 'completed' : i === currentIdx ? 'active' : ''}`}>
            {step.replace('_', ' ')}
          </div>
          {i < OF_PIPELINE.length - 1 && <span className="pipeline-arrow" style={{margin: '0 4px', fontSize: '10px'}}>›</span>}
        </span>
      ))}
    </div>
  );
}

export default function Produccion() {
  const { canWrite, user } = useAuth();
  const { search } = useSearch();
  const [tab, setTab] = useState('fabricacion');
  
  const [ordenes, setOrdenes] = useState([]);
  const [oPage, setOPage] = useState(1);
  const [oTotal, setOTotal] = useState(1);
  const [allOrdenes, setAllOrdenes] = useState([]);

  const [insp, setInsp] = useState([]);
  const [iPage, setIPage] = useState(1);
  const [iTotal, setITotal] = useState(1);

  // Modals state
  const [showOFModal, setShowOFModal] = useState(false);
  const [showInspModal, setShowInspModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forms
  const [ofForm, setOfForm] = useState({ producto: '', cantidad: 1, fecha_inicio: '', fecha_fin: '' });
  const [iForm, setIForm] = useState({ orden_fabricacion_id: '', resultado: 'PENDIENTE', observaciones: '' });

  const fetchOrdenes = async (p = 1) => {
    const { data } = await produccionAPI.getOrdenes({ page: p });
    setOrdenes(data.data); setOPage(data.page); setOTotal(data.totalPages);
    if (p === 1) setAllOrdenes(data.data);
  };

  const fetchInspecciones = async (p = 1) => {
    const { data } = await produccionAPI.getInspecciones({ page: p });
    setInsp(data.data); setIPage(data.page); setITotal(data.totalPages);
  };

  useEffect(() => {
    if (tab === 'fabricacion') {
      fetchOrdenes(oPage);
    } else if (tab === 'calidad') {
      fetchInspecciones(iPage);
      if (allOrdenes.length === 0) fetchOrdenes(1);
    }
  }, [tab, oPage, iPage]);

  const handleOFSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await produccionAPI.createOrden({ ...ofForm, responsable_id: user.id });
      setShowOFModal(false);
      setOfForm({ producto: '', cantidad: 1, fecha_inicio: '', fecha_fin: '' });
      fetchOrdenes(oPage);
    } catch (err) {
      alert('Error creando orden de fabricación');
    } finally {
      setLoading(false);
    }
  };

  const handleInspSubmit = async (e) => {
    e.preventDefault();
    if (!iForm.orden_fabricacion_id) return alert('Seleccione la Orden de Fabricación vinculada');
    setLoading(true);
    try {
      await produccionAPI.createInspeccion(iForm);
      // Auto-advance order if approved
      if (iForm.resultado === 'APROBADO') {
        await produccionAPI.updateEstado(iForm.orden_fabricacion_id, { estado: 'COMPLETADA' });
      } else if (iForm.resultado === 'RECHAZADO') {
        await produccionAPI.updateEstado(iForm.orden_fabricacion_id, { estado: 'EN_PROCESO' });
      }
      setShowInspModal(false);
      setIForm({ orden_fabricacion_id: '', resultado: 'PENDIENTE', observaciones: '' });
      fetchInspecciones(iPage);
    } catch (err) {
      alert('Error registrando inspección');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceOF = async (of) => {
    if (!canWrite) return;
    const currentIdx = OF_PIPELINE.indexOf(of.estado);
    if (currentIdx === -1 || currentIdx >= OF_PIPELINE.length - 1) return;
    const nextState = OF_PIPELINE[currentIdx + 1];
    if (confirm(`¿Avanzar orden ${of.folio} a fase "${nextState.replace('_', ' ')}"?`)) {
      await produccionAPI.updateEstado(of.id, { estado: nextState });
      fetchOrdenes(oPage);
    }
  };

  const oCols = [
    { key: 'folio', label: 'Folio', mono: true },
    { key: 'producto', label: 'Producto' },
    { key: 'cantidad', label: 'Ctd.' },
    { key: 'fecha_inicio', label: 'Inicio', render: formatDate },
    { key: 'estado', label: 'Progreso', render: (v) => <PipelineVisual estado={v} /> },
    { key: 'actions', label: 'Acción', render: (_, r) => {
        const cIdx = OF_PIPELINE.indexOf(r.estado);
        if (cIdx >= 0 && cIdx < OF_PIPELINE.length - 1) {
          return <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAdvanceOF(r); }}>Avanzar</Button>;
        }
        return <span style={{fontSize:'12px', color:'var(--text-tertiary)'}}>Hecho</span>;
    }},
  ];

  const iCols = [
    { key: 'fecha', label: 'Fecha', render: formatDate },
    { key: 'orden_folio', label: 'OF Ref.', mono: true },
    { key: 'producto', label: 'Producto' },
    { key: 'inspector_nombre', label: 'Inspector' },
    { key: 'observaciones', label: 'Observaciones' },
    { key: 'resultado', label: 'Resultado', render: v => <StatusPill status={v} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Planta y Producción</h1>
          <div className="subtitle">Gestión de órdenes de fabricación y calidad</div>
        </div>
      </div>

      <div className="module-cards">
        <div className={`module-card ${tab === 'fabricacion' ? 'active' : ''}`} onClick={() => setTab('fabricacion')}>
          <div className="module-icon">🏭</div>
          <h3>Fabricación</h3>
          <p>Línea de producción (OF)</p>
        </div>
        <div className={`module-card ${tab === 'calidad' ? 'active' : ''}`} onClick={() => setTab('calidad')}>
          <div className="module-icon">✨</div>
          <h3>Control de Calidad</h3>
          <p>Inspecciones y validaciones</p>
        </div>
        <div className={`module-card ${tab === 'ingenieria' ? 'active' : ''}`} onClick={() => setTab('ingenieria')}>
          <div className="module-icon">📐</div>
          <h3>Ingeniería de Hardware</h3>
          <p>Planos y especificaciones</p>
        </div>
      </div>

      {tab === 'fabricacion' && (
        <Panel title="Órdenes de Fabricación Activas" actions={canWrite && <Button variant="primary" onClick={() => setShowOFModal(true)}>Nueva Orden (OF)</Button>}>
          <DataTable columns={oCols} data={ordenes.filter(o => !search || o.folio?.toLowerCase().includes(search.toLowerCase()) || o.producto?.toLowerCase().includes(search.toLowerCase()))} page={oPage} totalPages={oTotal} total={oTotal*10} onPageChange={setOPage} onRowClick={handleAdvanceOF} />
        </Panel>
      )}

      {tab === 'calidad' && (
        <Panel title="Registro de Inspecciones y Auditorías" actions={canWrite && <Button variant="primary" onClick={() => setShowInspModal(true)}>Registrar Inspección</Button>}>
          <DataTable columns={iCols} data={insp.filter(i => !search || i.orden_folio?.toLowerCase().includes(search.toLowerCase()) || i.inspector_nombre?.toLowerCase().includes(search.toLowerCase()))} page={iPage} totalPages={iTotal} total={iTotal*10} onPageChange={setIPage} />
        </Panel>
      )}

      {tab === 'ingenieria' && (
        <Panel title="Ingeniería de Hardware">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Módulo de Ingeniería de Hardware en desarrollo...</div>
        </Panel>
      )}

      {/* Modals */}
      {showOFModal && (
        <Modal title="Emitir Órden de Fabricación" onClose={() => setShowOFModal(false)}>
          <form onSubmit={handleOFSubmit}>
            <div className="form-group">
              <label className="form-label">Producto a Fabricar (Lote/SKU)</label>
              <input type="text" className="form-input" required value={ofForm.producto} onChange={e => setOfForm({...ofForm, producto: e.target.value})} placeholder="Ej: Lote de Tubos 400x" />
            </div>
            <div className="form-group">
              <label className="form-label">Cantidad Esperada</label>
              <input type="number" className="form-input" min="1" required value={ofForm.cantidad} onChange={e => setOfForm({...ofForm, cantidad: parseInt(e.target.value) || 1})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Fecha Planificada Inicio</label>
                <input type="date" className="form-input" required value={ofForm.fecha_inicio} onChange={e => setOfForm({...ofForm, fecha_inicio: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Planificada Término</label>
                <input type="date" className="form-input" required value={ofForm.fecha_fin} onChange={e => setOfForm({...ofForm, fecha_fin: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowOFModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Planificando...' : 'Lanzar a Planta'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {showInspModal && (
        <Modal title="Auditoría / Control de Calidad" onClose={() => setShowInspModal(false)}>
          <form onSubmit={handleInspSubmit}>
            <div className="form-group">
              <label className="form-label">Orden Evaluada (Fase QC)</label>
              <select className="form-input" required value={iForm.orden_fabricacion_id} onChange={e => setIForm({...iForm, orden_fabricacion_id: e.target.value})}>
                <option value="">-- Seleccionar OF --</option>
                {allOrdenes.map(of => <option key={of.id} value={of.id}>{of.folio} - {of.producto}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Dictamen de Calidad</label>
              <select className="form-input" value={iForm.resultado} onChange={e => setIForm({...iForm, resultado: e.target.value})}>
                <option value="APROBADO">Aprobado (Pasa a Bodega)</option>
                <option value="RECHAZADO">Rechazado (Regresa a Proceso)</option>
                <option value="PENDIENTE">En Estudio / Pendiente</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones y Hallazgos</label>
              <textarea className="form-input" rows={3} value={iForm.observaciones} onChange={e => setIForm({...iForm, observaciones: e.target.value})} placeholder="Detalle fallas o aciertos de tolerancia..."></textarea>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowInspModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Firmando...' : 'Firmar Inspección'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
