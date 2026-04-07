import { useState, useEffect } from 'react';
import { produccionAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-PE') : '-';

const OF_PIPELINE = ['PLANIFICADA', 'EN_PROCESO', 'CONTROL_CALIDAD', 'COMPLETADA'];

function PipelineVisual({ estado }) {
  const currentIdx = OF_PIPELINE.indexOf(estado);
  if (currentIdx === -1) return <StatusPill status={estado} />;

  return (
    <div className="pipeline">
      {OF_PIPELINE.map((step, i) => (
        <span key={step} style={{display: 'flex', alignItems: 'center'}}>
          <div className={`pipeline-step ${i < currentIdx ? 'completed' : i === currentIdx ? 'active' : ''}`}>
            {step.replace('_', ' ')}
          </div>
          {i < OF_PIPELINE.length - 1 && <span className="pipeline-arrow" style={{margin: '0 4px'}}>›</span>}
        </span>
      ))}
    </div>
  );
}

export default function Produccion() {
  const { canWrite } = useAuth();
  const [tab, setTab] = useState('ordenes');
  
  const [ordenes, setOrdenes] = useState([]);
  const [oPage, setOPage] = useState(1);
  const [oTotal, setOTotal] = useState(1);

  const [insp, setInsp] = useState([]);
  const [iPage, setIPage] = useState(1);
  const [iTotal, setITotal] = useState(1);

  useEffect(() => {
    if (tab === 'ordenes') {
      produccionAPI.getOrdenes({ page: oPage }).then(({ data }) => {
        setOrdenes(data.data); setOPage(data.page); setOTotal(data.totalPages);
      });
    } else if (tab === 'calidad') {
      produccionAPI.getInspecciones({ page: iPage }).then(({ data }) => {
        setInsp(data.data); setIPage(data.page); setITotal(data.totalPages);
      });
    }
  }, [tab, oPage, iPage]);

  const oCols = [
    { key: 'folio', label: 'Folio', mono: true },
    { key: 'producto', label: 'Producto' },
    { key: 'cantidad', label: 'Ctd.' },
    { key: 'responsable_nombre', label: 'Responsable' },
    { key: 'fecha_inicio', label: 'Inicio', render: formatDate },
    { key: 'estado', label: 'Estado/Progreso', render: (v) => <PipelineVisual estado={v} /> },
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
        <div className={`module-card ${tab === 'ordenes' ? 'active' : ''}`} onClick={() => setTab('ordenes')}>
          <div className="module-icon">🏭</div>
          <h3>Línea de Fabricación</h3>
          <p>Control de órdenes de producción</p>
        </div>
        <div className={`module-card ${tab === 'calidad' ? 'active' : ''}`} onClick={() => setTab('calidad')}>
          <div className="module-icon">✨</div>
          <h3>Control de Calidad</h3>
          <p>Inspecciones y validaciones</p>
        </div>
        <div className="module-card">
          <div className="module-icon">📐</div>
          <h3>Ingeniería</h3>
          <p>Planos y especificaciones</p>
        </div>
      </div>

      {tab === 'ordenes' && (
        <Panel title="Órdenes de Fabricación" actions={canWrite && <Button variant="primary">Nueva Orden</Button>}>
          <DataTable columns={oCols} data={ordenes} page={oPage} totalPages={oTotal} total={oTotal*10} onPageChange={setOPage} />
        </Panel>
      )}

      {tab === 'calidad' && (
        <Panel title="Registro de Inspecciones" actions={canWrite && <Button variant="primary">Nueva Inspección</Button>}>
          <DataTable columns={iCols} data={insp} page={iPage} totalPages={iTotal} total={iTotal*10} onPageChange={setIPage} />
        </Panel>
      )}
    </div>
  );
}
