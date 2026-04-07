import { useState, useEffect } from 'react';
import { comercialAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';

const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
const formatDate = (d) => new Date(d).toLocaleDateString('es-PE');

export default function Comercial() {
  const { canWrite } = useAuth();
  const [tab, setTab] = useState('ventas');
  
  const [ventas, setVentas] = useState([]);
  const [vPage, setVPage] = useState(1);
  const [vTotal, setVTotal] = useState(1);

  const [clientes, setClientes] = useState([]);
  const [cPage, setCPage] = useState(1);
  const [cTotal, setCTotal] = useState(1);

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
  };

  useEffect(() => {
    if (tab === 'ventas') fetchVentas(vPage);
    if (tab === 'clientes') fetchClientes(cPage);
  }, [tab, vPage, cPage]);

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
        <div className={`tab ${tab === 'ventas' ? 'active' : ''}`} onClick={() => setTab('ventas')}>Ventas y Contratos</div>
        <div className={`tab ${tab === 'clientes' ? 'active' : ''}`} onClick={() => setTab('clientes')}>Cartera de Clientes</div>
      </div>

      {tab === 'ventas' && (
        <Panel title="Registro de Ventas" actions={canWrite && <Button variant="primary">Nueva Venta</Button>}>
          <DataTable columns={vCols} data={ventas} page={vPage} totalPages={vTotal} total={vTotal*10} onPageChange={setVPage} />
        </Panel>
      )}

      {tab === 'clientes' && (
        <Panel title="Directorio de Clientes" actions={canWrite && <Button variant="primary">Nuevo Cliente</Button>}>
          <DataTable columns={cCols} data={clientes} page={cPage} totalPages={cTotal} total={cTotal*10} onPageChange={setCPage} />
        </Panel>
      )}
    </div>
  );
}
