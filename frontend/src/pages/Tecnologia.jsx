import { useState, useEffect } from 'react';
import { techAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';

const formatDate = (d) => new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Tecnologia() {
  const { canWrite } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState('SOPORTE');

  const fetchTickets = async (p = 1) => {
    const { data } = await techAPI.getTickets({ page: p, tipo: tab });
    setTickets(data.data);
    setPage(data.page);
    setTotalPages(data.totalPages);
  };

  useEffect(() => {
    fetchTickets(page);
  }, [page, tab]);

  const cols = [
    { key: 'folio', label: 'Folio', mono: true },
    { key: 'titulo', label: 'Asunto' },
    { key: 'prioridad', label: 'Prioridad', render: v => <StatusPill status={v} /> },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} /> },
    { key: 'asignado_nombre', label: 'Asignado a', render: v => v || '-' },
    { key: 'created_at', label: 'Fecha', render: formatDate },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tecnología (TI)</h1>
          <div className="subtitle">Gestión de soporte e infraestructura corporativa</div>
        </div>
      </div>

      <div className="tabs">
        {['SOPORTE', 'POSTVENTA', 'DESARROLLO', 'INFRAESTRUCTURA'].map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setPage(1); }}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </div>
        ))}
      </div>

      <Panel
        title={`Tickets de ${tab.charAt(0) + tab.slice(1).toLowerCase()}`}
        actions={canWrite && <Button variant="primary">Nuevo Ticket</Button>}
      >
        <DataTable
          columns={cols}
          data={tickets}
          page={page}
          totalPages={totalPages}
          total={totalPages * 10}
          onPageChange={setPage}
        />
      </Panel>
    </div>
  );
}
