import { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSearch } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';

const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
const formatDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Administracion() {
  const { canWrite } = useAuth();
  const { search } = useSearch();
  const [tab, setTab] = useState('finanzas');
  
  const [tesoreria, setTesoreria] = useState({ ingresos: 0, egresos: 0, saldo: 0 });
  const [txs, setTxs] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  
  const [emps, setEmps] = useState([]);
  const [empPage, setEmpPage] = useState(1);
  const [empTotalPages, setEmpTotalPages] = useState(1);

  // Modals state
  const [showTxModal, setShowTxModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  
  // Forms state
  const [txForm, setTxForm] = useState({ tipo: 'INGRESO', monto: '', descripcion: '', area: 'ADMINISTRACION' });
  const [empForm, setEmpForm] = useState({ nombre: '', dni: '', cargo: '', salario: '', area: 'ADMINISTRACION' });
  const [loading, setLoading] = useState(false);

  const fetchTesoreria = async () => {
    const { data } = await adminAPI.getTesoreria();
    setTesoreria(data);
  };

  const fetchTxs = async (page = 1) => {
    const { data } = await adminAPI.getTransacciones({ page });
    setTxs(data.data);
    setTxPage(data.page);
    setTxTotalPages(data.totalPages);
  };

  const fetchEmps = async (page = 1) => {
    const { data } = await adminAPI.getEmpleados({ page });
    setEmps(data.data);
    setEmpPage(data.page);
    setEmpTotalPages(data.totalPages);
  };

  useEffect(() => {
    if (tab === 'finanzas' || tab === 'tesoreria') {
      fetchTesoreria();
      fetchTxs(txPage);
    } else if (tab === 'rrhh') {
      fetchEmps(empPage);
    }
  }, [tab, txPage, empPage]);

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createTransaccion({
        tipo: txForm.tipo,
        monto: parseFloat(txForm.monto),
        descripcion: txForm.descripcion,
        area: txForm.area
      });
      setShowTxModal(false);
      setTxForm({ tipo: 'INGRESO', monto: '', descripcion: '', area: 'ADMINISTRACION' });
      fetchTxs(txPage);
      fetchTesoreria();
    } catch (err) {
      alert('Error creando transacción');
    } finally {
      setLoading(false);
    }
  };

  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createEmpleado({
        nombre: empForm.nombre,
        dni: empForm.dni,
        cargo: empForm.cargo,
        salario: parseFloat(empForm.salario) || null,
        area: empForm.area
      });
      setShowEmpModal(false);
      setEmpForm({ nombre: '', dni: '', cargo: '', salario: '', area: 'ADMINISTRACION' });
      fetchEmps(empPage);
    } catch (err) {
      alert('Error creando empleado');
    } finally {
      setLoading(false);
    }
  };

  const txCols = [
    { key: 'fecha', label: 'Fecha', render: formatDate },
    { key: 'tipo', label: 'Tipo', render: v => <StatusPill status={v} /> },
    { key: 'monto', label: 'Monto', render: formatCurrency },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'area', label: 'Área' },
  ];

  const empCols = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'dni', label: 'DNI', mono: true },
    { key: 'cargo', label: 'Cargo' },
    { key: 'area', label: 'Área' },
    { key: 'salario', label: 'Salario', render: formatCurrency },
    { key: 'activo', label: 'Estado', render: v => <StatusPill status={v ? 'ACTIVO' : 'INACTIVO'} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Administración</h1>
          <div className="subtitle">Gestión financiera y recursos humanos</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'finanzas' ? 'active' : ''}`} onClick={() => setTab('finanzas')}>Finanzas</div>
        <div className={`tab ${tab === 'tesoreria' ? 'active' : ''}`} onClick={() => setTab('tesoreria')}>Tesorería</div>
        <div className={`tab ${tab === 'rrhh' ? 'active' : ''}`} onClick={() => setTab('rrhh')}>RRHH</div>
      </div>

      {tab === 'tesoreria' && (
        <div className="metrics-grid">
          <MetricCard label="Ingresos del Mes" value={formatCurrency(tesoreria.ingresos)} positive />
          <MetricCard label="Egresos del Mes" value={formatCurrency(tesoreria.egresos)} positive={false} />
          <MetricCard label="Saldo Neto" value={formatCurrency(tesoreria.saldo)} positive={tesoreria.saldo >= 0} />
        </div>
      )}

      {tab === 'finanzas' && (
        <Panel
          title="Transacciones"
          actions={canWrite && <Button variant="primary" onClick={() => setShowTxModal(true)}>Nueva Transacción</Button>}
        >
          <DataTable
            columns={txCols}
            data={txs.filter(t => !search || t.descripcion?.toLowerCase().includes(search.toLowerCase()) || t.tipo?.toLowerCase().includes(search.toLowerCase()))}
            page={txPage}
            totalPages={txTotalPages}
            total={txTotalPages * 10}
            onPageChange={setTxPage}
          />
        </Panel>
      )}

      {tab === 'rrhh' && (
        <Panel
          title="Empleados"
          actions={canWrite && <Button variant="primary" onClick={() => setShowEmpModal(true)}>Nuevo Empleado</Button>}
        >
          <DataTable
            columns={empCols}
            data={emps.filter(e => !search || e.nombre?.toLowerCase().includes(search.toLowerCase()) || e.dni?.toLowerCase().includes(search.toLowerCase()) || e.cargo?.toLowerCase().includes(search.toLowerCase()))}
            page={empPage}
            totalPages={empTotalPages}
            total={empTotalPages * 10}
            onPageChange={setEmpPage}
          />
        </Panel>
      )}

      {/* Modals */}
      {showTxModal && (
        <Modal title="Nueva Transacción" onClose={() => setShowTxModal(false)}>
          <form onSubmit={handleTxSubmit}>
            <div className="form-group">
              <label className="form-label">Tipo de Movimiento</label>
              <select className="form-input" value={txForm.tipo} onChange={e => setTxForm({...txForm, tipo: e.target.value})}>
                <option value="INGRESO">Ingreso (Cobro, Abono)</option>
                <option value="EGRESO">Egreso (Gasto, Pago)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monto (S/)</label>
              <input type="number" step="0.01" className="form-input" required value={txForm.monto} onChange={e => setTxForm({...txForm, monto: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input type="text" className="form-input" required value={txForm.descripcion} onChange={e => setTxForm({...txForm, descripcion: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Área Imputada</label>
              <select className="form-input" value={txForm.area} onChange={e => setTxForm({...txForm, area: e.target.value})}>
                <option value="ADMINISTRACION">Administración</option>
                <option value="TECNOLOGIA">Tecnología</option>
                <option value="COMERCIAL">Comercial</option>
                <option value="LOGISTICA">Logística</option>
                <option value="PRODUCCION">Producción</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowTxModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Registrar Transacción'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {showEmpModal && (
        <Modal title="Registrar Empleado" onClose={() => setShowEmpModal(false)}>
          <form onSubmit={handleEmpSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input type="text" className="form-input" required value={empForm.nombre} onChange={e => setEmpForm({...empForm, nombre: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">DNI</label>
              <input type="text" className="form-input" required value={empForm.dni} onChange={e => setEmpForm({...empForm, dni: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Cargo</label>
              <input type="text" className="form-input" required value={empForm.cargo} onChange={e => setEmpForm({...empForm, cargo: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Salario Base (S/)</label>
              <input type="number" step="0.01" className="form-input" value={empForm.salario} onChange={e => setEmpForm({...empForm, salario: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Área</label>
              <select className="form-input" value={empForm.area} onChange={e => setEmpForm({...empForm, area: e.target.value})}>
                <option value="ADMINISTRACION">Administración</option>
                <option value="TECNOLOGIA">Tecnología</option>
                <option value="COMERCIAL">Comercial</option>
                <option value="LOGISTICA">Logística</option>
                <option value="PRODUCCION">Producción</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowEmpModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Empleado'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
