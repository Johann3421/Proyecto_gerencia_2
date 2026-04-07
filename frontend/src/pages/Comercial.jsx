import { useState, useEffect } from 'react';
import { comercialAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSearch } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';

const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
const formatDate = (d) => new Date(d).toLocaleDateString('es-PE');

export default function Comercial() {
  const { canWrite } = useAuth();
  const { search } = useSearch();
  const [tab, setTab] = useState('ventas');
  
  const [ventas, setVentas] = useState([]);
  const [vPage, setVPage] = useState(1);
  const [vTotal, setVTotal] = useState(1);

  const [clientes, setClientes] = useState([]);
  const [cPage, setCPage] = useState(1);
  const [cTotal, setCTotal] = useState(1);

  const [showVentaModal, setShowVentaModal] = useState(false);
  const [showCliModal, setShowCliModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Venta Form
  const [vForm, setVForm] = useState({ cliente_id: '', items: [{ producto: '', cantidad: 1, precio_unitario: 100 }] });
  
  // Client Form
  const [cForm, setCForm] = useState({ nombre: '', tipo: 'EMPRESA', ruc: '', telefono: '', email: '', direccion: '' });

  const [clientsList, setClientsList] = useState([]);

  const fetchVentas = async (p = 1) => {
    const { data } = await comercialAPI.getVentas({ page: p });
    setVentas(data.data);
    setVPage(data.page);
    setVTotal(data.totalPages);
  };

  const fetchClientes = async (p = 1) => {
    const { data } = await comercialAPI.getClientes({ page: p });
    setClientes(data.data);
    setCPage(data.page);
    setCTotal(data.totalPages);
    if (p === 1) setClientsList(data.data); // Save the first page for the dropdown
  };

  useEffect(() => {
    if (tab === 'ventas') {
      fetchVentas(vPage);
      if (clientsList.length === 0) fetchClientes(1); // Ensure dropdown is populated
    }
    if (tab === 'atencion') fetchClientes(cPage);
  }, [tab, vPage, cPage]);

  const handleCliSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await comercialAPI.createCliente(cForm);
      setShowCliModal(false);
      setCForm({ nombre: '', tipo: 'EMPRESA', ruc: '', telefono: '', email: '', direccion: '' });
      fetchClientes(cPage);
    } catch (err) {
      alert('Error creando cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleVentaSubmit = async (e) => {
    e.preventDefault();
    if (!vForm.cliente_id) return alert('Seleccione un cliente');
    setLoading(true);
    try {
      await comercialAPI.createVenta(vForm);
      setShowVentaModal(false);
      setVForm({ cliente_id: '', items: [{ producto: '', cantidad: 1, precio_unitario: 100 }] });
      fetchVentas(vPage);
    } catch (err) {
      alert('Error registrando la venta');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setVForm(prev => ({ ...prev, items: [...prev.items, { producto: '', cantidad: 1, precio_unitario: 0 }] }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...vForm.items];
    newItems[index][field] = value;
    setVForm(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    if (vForm.items.length === 1) return;
    const newItems = [...vForm.items];
    newItems.splice(index, 1);
    setVForm(prev => ({ ...prev, items: newItems }));
  };

  const vCols = [
    { key: 'folio', label: 'Folio', mono: true },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'vendedor_nombre', label: 'Vendedor' },
    { key: 'fecha_venta', label: 'Fecha', render: formatDate },
    { key: 'total', label: 'Total', render: formatCurrency },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} /> },
  ];

  const cCols = [
    { key: 'nombre', label: 'Razón Social / Nombre' },
    { key: 'ruc', label: 'RUC/DNI', mono: true, render: v => v || '-' },
    { key: 'telefono', label: 'Teléfono', render: v => v || '-' },
    { key: 'email', label: 'Email', render: v => v || '-' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Área Comercial</h1>
          <div className="subtitle">Gestión de ventas y cartera de clientes</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'ventas' ? 'active' : ''}`} onClick={() => setTab('ventas')}>Ventas</div>
        <div className={`tab ${tab === 'marketing' ? 'active' : ''}`} onClick={() => setTab('marketing')}>Marketing</div>
        <div className={`tab ${tab === 'atencion' ? 'active' : ''}`} onClick={() => setTab('atencion')}>Atención al Cliente</div>
        <div className={`tab ${tab === 'ecommerce' ? 'active' : ''}`} onClick={() => setTab('ecommerce')}>Comercio Electrónico</div>
      </div>

      {tab === 'ventas' && (
        <Panel title="Registro de Ventas" actions={canWrite && <Button variant="primary" onClick={() => setShowVentaModal(true)}>Nueva Venta</Button>}>
          <DataTable columns={vCols} data={ventas.filter(v => !search || v.folio?.toLowerCase().includes(search.toLowerCase()) || v.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) || v.vendedor_nombre?.toLowerCase().includes(search.toLowerCase()))} page={vPage} totalPages={vTotal} total={vTotal*10} onPageChange={setVPage} />
        </Panel>
      )}

      {tab === 'atencion' && (
        <Panel title="Directorio de Clientes" actions={canWrite && <Button variant="primary" onClick={() => setShowCliModal(true)}>Nuevo Cliente</Button>}>
          <DataTable columns={cCols} data={clientes.filter(c => !search || c.nombre?.toLowerCase().includes(search.toLowerCase()) || c.ruc?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))} page={cPage} totalPages={cTotal} total={cTotal*10} onPageChange={setCPage} />
        </Panel>
      )}

      {tab === 'marketing' && (
        <Panel title="Campaña de Marketing">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Módulo de Marketing en desarrollo...</div>
        </Panel>
      )}

      {tab === 'ecommerce' && (
        <Panel title="Comercio Electrónico">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Módulo de E-Commerce en desarrollo...</div>
        </Panel>
      )}

      {/* Client Modal */}
      {showCliModal && (
        <Modal title="Nuevo Cliente" onClose={() => setShowCliModal(false)}>
          <form onSubmit={handleCliSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre o Razón Social</label>
              <input type="text" className="form-input" required value={cForm.nombre} onChange={e => setCForm({...cForm, nombre: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={cForm.tipo} onChange={e => setCForm({...cForm, tipo: e.target.value})}>
                  <option value="EMPRESA">Empresa B2B</option>
                  <option value="PERSONA">Persona Natural</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">RUC / DNI</label>
                <input type="text" className="form-input" value={cForm.ruc} onChange={e => setCForm({...cForm, ruc: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="tel" className="form-input" value={cForm.telefono} onChange={e => setCForm({...cForm, telefono: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={cForm.email} onChange={e => setCForm({...cForm, email: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Dirección Fiscal / Envío</label>
              <input type="text" className="form-input" value={cForm.direccion} onChange={e => setCForm({...cForm, direccion: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowCliModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear Cliente'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sale Modal */}
      {showVentaModal && (
        <Modal title="Procesar Nueva Venta" onClose={() => setShowVentaModal(false)}>
          <form onSubmit={handleVentaSubmit}>
            <div className="form-group">
              <label className="form-label">Cliente (Búsqueda Rápida)</label>
              <select className="form-input" required value={vForm.cliente_id} onChange={e => setVForm({...vForm, cliente_id: e.target.value})}>
                <option value="">-- Seleccionar Cliente --</option>
                {clientsList.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.ruc ? `(${c.ruc})` : ''}</option>)}
              </select>
            </div>
            
            <div className="form-label" style={{ marginTop: '16px', marginBottom: '8px' }}>Líneas de la Venta / Productos</div>
            {vForm.items.map((item, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', marginBottom: '8px' }}>
                <div className="form-group">
                  <input type="text" placeholder="Nombre del Producto o Servicio" className="form-input" required value={item.producto} onChange={e => updateItem(idx, 'producto', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) minmax(80px, 1fr) auto', gap: '8px', alignItems: 'center' }}>
                  <input type="number" placeholder="Cant." className="form-input" required min="1" value={item.cantidad} onChange={e => updateItem(idx, 'cantidad', parseInt(e.target.value) || 1)} />
                  <input type="number" placeholder="Pr. Unit S/" className="form-input" required step="0.01" value={item.precio_unitario} onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)} />
                  <Button type="button" variant="danger" size="sm" onClick={() => removeItem(idx)}>X</Button>
                </div>
              </div>
            ))}
            
            <Button type="button" size="sm" onClick={addItem}>+ Agregar Línea</Button>

            <div style={{ padding: '16px 0', borderTop: '1px solid var(--border-color)', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                <span>Total Estimado:</span>
                <span>{formatCurrency(vForm.items.reduce((s, i) => s + (i.cantidad * i.precio_unitario), 0))}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowVentaModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Procesando...' : 'Confirmar Venta'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
