import { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';

const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
const formatDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Administracion() {
  const { canWrite } = useAuth();
  const [tab, setTab] = useState('finanzas');
  
  // Tesoreria
  const [tesoreria, setTesoreria] = useState({ ingresos: 0, egresos: 0, saldo: 0 });
  const [txs, setTxs] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  
  // RRHH
  const [emps, setEmps] = useState([]);
  const [empPage, setEmpPage] = useState(1);
  const [empTotalPages, setEmpTotalPages] = useState(1);

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
          actions={canWrite && <Button variant="primary">Nueva Transacción</Button>}
        >
          <DataTable
            columns={txCols}
            data={txs}
            page={txPage}
            totalPages={txTotalPages}
            total={txTotalPages * 10} // Just for UI
            onPageChange={setTxPage}
          />
        </Panel>
      )}

      {tab === 'rrhh' && (
        <Panel
          title="Empleados"
          actions={canWrite && <Button variant="primary">Nuevo Empleado</Button>}
        >
          <DataTable
            columns={empCols}
            data={emps}
            page={empPage}
            totalPages={empTotalPages}
            total={empTotalPages * 10}
            onPageChange={setEmpPage}
          />
        </Panel>
      )}
    </div>
  );
}
