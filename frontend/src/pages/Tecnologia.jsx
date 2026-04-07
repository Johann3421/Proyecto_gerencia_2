import { useState, useEffect } from 'react';
import { techAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSearch } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';

const formatDate = (d) => new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Tecnologia() {
  const { canWrite } = useAuth();
  const { search } = useSearch();
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState('SOPORTE');

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'MEDIA' });

  const fetchTickets = async (p = 1) => {
    const { data } = await techAPI.getTickets({ page: p, tipo: tab });
    setTickets(data.data);
    setPage(data.page);
    setTotalPages(data.totalPages);
  };

  useEffect(() => {
    fetchTickets(page);
  }, [page, tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await techAPI.createTicket({ ...form, tipo: tab });
      setShowModal(false);
      setForm({ titulo: '', descripcion: '', prioridad: 'MEDIA' });
      fetchTickets(1);
    } catch (err) {
      alert('Error creando elemento');
    } finally {
      setLoading(false);
    }
  };

  const cols = [
    { key: 'folio', label: 'Folio', mono: true },
    { key: 'titulo', label: 'Asunto' },
    { key: 'prioridad', label: 'Prioridad', render: v => <StatusPill status={v} /> },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} /> },
    { key: 'asignado_nombre', label: 'Asignado a', render: v => v || '-' },
    { key: 'created_at', label: 'Fecha', render: formatDate },
  ];

  const modalTitles = {
    'SOPORTE': 'Nuevo Ticket de Soporte',
    'POSTVENTA': 'Reporte de Postventa',
    'DESARROLLO': 'Requerimiento de Desarrollo',
    'INFRAESTRUCTURA': 'Nueva Infraestructura/Activo'
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tecnología (TI)</h1>
          <div className="subtitle">Gestión de soporte e infraestructura corporativa</div>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'SOPORTE', label: 'Soporte Técnico' },
          { id: 'POSTVENTA', label: 'Servicio PostVenta' },
          { id: 'DESARROLLO', label: 'Desarrollo Software' },
          { id: 'INFRAESTRUCTURA', label: 'Infraestructura Tecnológica' }
        ].map(t => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); setPage(1); }}>
            {t.label}
          </div>
        ))}
      </div>

      <Panel
        title={`Registros de ${tab}`}
        actions={canWrite && <Button variant="primary" onClick={() => setShowModal(true)}>Nuevo Registro</Button>}
      >
        <DataTable
          columns={cols}
          data={tickets.filter(t => !search || t.folio?.toLowerCase().includes(search.toLowerCase()) || t.titulo?.toLowerCase().includes(search.toLowerCase()) || t.asignado_nombre?.toLowerCase().includes(search.toLowerCase()))}
          page={page}
          totalPages={totalPages}
          total={totalPages * 10}
          onPageChange={setPage}
        />
      </Panel>

      {showModal && (
        <Modal title={modalTitles[tab]} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Asunto / Nombre del elemento</label>
              <input type="text" className="form-input" required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ej: Falla en equipo, Servidor AWS..." />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-input" required rows={3} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">Nivel de Prioridad / Criticidad</label>
              <select className="form-input" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                <option value="BAJA">Baja / Trivial</option>
                <option value="MEDIA">Media / Estándar</option>
                <option value="ALTA">Alta / Urgente</option>
                <option value="CRITICA">Crítica / Bloqueante</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear Registro'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
