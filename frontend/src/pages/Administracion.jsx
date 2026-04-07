import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSearch } from '../components/Topbar';
import Panel from '../components/ui/Panel';
import DataTable from '../components/ui/DataTable';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';

const formatCurrency = (val, currency = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(val || 0);
const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};
const maskAccount = (num) => {
  if (!num) return '—';
  const s = String(num);
  return s.length <= 4 ? s : '••••' + s.slice(-4);
};

/* ─────────────────────────────────────────
   CONTABILIDAD
───────────────────────────────────────── */
function TabContabilidad({ canWrite, search }) {
  const [subTab, setSubTab] = useState('asientos');

  const [asientos, setAsientos] = useState([]);
  const [asientoPage, setAsientoPage] = useState(1);
  const [asientoTotalPages, setAsientoTotalPages] = useState(1);
  const [planCuentas, setPlanCuentas] = useState([]);

  const [showAsientoModal, setShowAsientoModal] = useState(false);
  const [showVerAsientoModal, setShowVerAsientoModal] = useState(false);
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [asientoDetalle, setAsientoDetalle] = useState(null);

  const emptyLinea = () => ({ cuenta_id: '', descripcion: '', debe: '', haber: '' });
  const [asientoForm, setAsientoForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    referencia: '',
    lineas: [emptyLinea(), emptyLinea()],
  });
  const [asientoError, setAsientoError] = useState('');
  const [cuentaForm, setCuentaForm] = useState({ codigo: '', nombre: '', tipo: 'ACTIVO' });
  const [loading, setLoading] = useState(false);

  const fetchAsientos = useCallback(async (page = 1) => {
    const { data } = await adminAPI.getAsientos({ page });
    setAsientos(data.data);
    setAsientoPage(data.page);
    setAsientoTotalPages(data.totalPages);
  }, []);

  const fetchPlan = useCallback(async () => {
    const { data } = await adminAPI.getPlanCuentas();
    setPlanCuentas(data);
  }, []);

  useEffect(() => { fetchAsientos(asientoPage); }, [asientoPage]);
  useEffect(() => { fetchPlan(); }, []);

  const handleVerAsiento = async (row) => {
    const { data } = await adminAPI.getAsiento(row.id);
    setAsientoDetalle(data);
    setShowVerAsientoModal(true);
  };

  const setLinea = (idx, field, value) => {
    setAsientoForm(prev => {
      const lineas = [...prev.lineas];
      lineas[idx] = { ...lineas[idx], [field]: value };
      return { ...prev, lineas };
    });
  };

  const addLinea = () => setAsientoForm(prev => ({ ...prev, lineas: [...prev.lineas, emptyLinea()] }));
  const removeLinea = (idx) => {
    if (asientoForm.lineas.length <= 2) return;
    setAsientoForm(prev => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== idx) }));
  };

  const totalDebe = asientoForm.lineas.reduce((s, l) => s + (parseFloat(l.debe) || 0), 0);
  const totalHaber = asientoForm.lineas.reduce((s, l) => s + (parseFloat(l.haber) || 0), 0);
  const balanceado = Math.abs(totalDebe - totalHaber) < 0.01;

  const handleAsientoSubmit = async (e) => {
    e.preventDefault();
    setAsientoError('');
    if (!balanceado) {
      setAsientoError('El Total Debe debe ser igual al Total Haber para registrar el asiento.');
      return;
    }
    if (asientoForm.lineas.some(l => !l.cuenta_id)) {
      setAsientoError('Todas las líneas deben tener una cuenta asignada.');
      return;
    }
    setLoading(true);
    try {
      await adminAPI.createAsiento({
        fecha: asientoForm.fecha,
        descripcion: asientoForm.descripcion,
        referencia: asientoForm.referencia,
        lineas: asientoForm.lineas.map(l => ({
          cuenta_id: parseInt(l.cuenta_id),
          descripcion: l.descripcion,
          debe: parseFloat(l.debe) || 0,
          haber: parseFloat(l.haber) || 0,
        })),
      });
      setShowAsientoModal(false);
      setAsientoForm({ fecha: new Date().toISOString().split('T')[0], descripcion: '', referencia: '', lineas: [emptyLinea(), emptyLinea()] });
      fetchAsientos(asientoPage);
    } catch (err) {
      setAsientoError(err.response?.data?.error || 'Error al registrar el asiento');
    } finally {
      setLoading(false);
    }
  };

  const handleCuentaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createCuentaContable(cuentaForm);
      setShowCuentaModal(false);
      setCuentaForm({ codigo: '', nombre: '', tipo: 'ACTIVO' });
      fetchPlan();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creando cuenta');
    } finally {
      setLoading(false);
    }
  };

  const asientoCols = [
    { key: 'folio', label: 'Folio', mono: true, width: 110 },
    { key: 'fecha', label: 'Fecha', render: formatDate, width: 110 },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'referencia', label: 'Referencia', mono: true, width: 110 },
    { key: 'total_debe', label: 'Debe', render: v => formatCurrency(v), width: 120 },
    { key: 'total_haber', label: 'Haber', render: v => formatCurrency(v), width: 120 },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} />, width: 110 },
  ];

  const planCols = [
    { key: 'codigo', label: 'Código', mono: true, width: 90 },
    { key: 'nombre', label: 'Nombre' },
    {
      key: 'tipo', label: 'Tipo', width: 120,
      render: v => {
        const map = { ACTIVO: 'ok', PASIVO: 'err', PATRIMONIO: 'info', INGRESO: 'ok', GASTO: 'warn' };
        return <span className={`status-pill ${map[v] || 'info'}`}>{v}</span>;
      }
    },
    { key: 'nivel', label: 'Nivel', width: 70 },
  ];

  const filteredAsientos = asientos.filter(a =>
    !search ||
    a.folio?.toLowerCase().includes(search.toLowerCase()) ||
    a.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
    a.referencia?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPlan = planCuentas.filter(c =>
    !search ||
    c.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    c.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', paddingLeft: 0 }}>
        <div
          className={`tab ${subTab === 'asientos' ? 'active' : ''}`}
          style={{ fontSize: '13px', padding: '6px 14px' }}
          onClick={() => setSubTab('asientos')}
        >
          Asientos Contables
        </div>
        <div
          className={`tab ${subTab === 'plan' ? 'active' : ''}`}
          style={{ fontSize: '13px', padding: '6px 14px' }}
          onClick={() => setSubTab('plan')}
        >
          Plan de Cuentas
        </div>
      </div>

      {subTab === 'asientos' && (
        <Panel
          title="Libro Diario — Asientos Contables"
          actions={canWrite && (
            <Button variant="primary" onClick={() => setShowAsientoModal(true)}>
              + Nuevo Asiento
            </Button>
          )}
        >
          <DataTable
            columns={asientoCols}
            data={filteredAsientos}
            page={asientoPage}
            totalPages={asientoTotalPages}
            total={asientoTotalPages * 10}
            onPageChange={setAsientoPage}
            onRowClick={handleVerAsiento}
            emptyMessage="No hay asientos contables registrados"
          />
        </Panel>
      )}

      {subTab === 'plan' && (
        <Panel
          title="Plan de Cuentas (PCGE Simplificado)"
          actions={canWrite && (
            <Button variant="primary" onClick={() => setShowCuentaModal(true)}>
              + Nueva Cuenta
            </Button>
          )}
        >
          <DataTable
            columns={planCols}
            data={filteredPlan}
            emptyMessage="No hay cuentas en el plan"
          />
        </Panel>
      )}

      {/* ── Modal: Nuevo Asiento ── */}
      {showAsientoModal && (
        <Modal title="Nuevo Asiento Contable" onClose={() => { setShowAsientoModal(false); setAsientoError(''); }} width="720px">
          <form onSubmit={handleAsientoSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input type="date" className="form-input" required value={asientoForm.fecha}
                  onChange={e => setAsientoForm({ ...asientoForm, fecha: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Referencia (opcional)</label>
                <input type="text" className="form-input" placeholder="Ej: VT-00012"
                  value={asientoForm.referencia}
                  onChange={e => setAsientoForm({ ...asientoForm, referencia: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción del Asiento</label>
              <input type="text" className="form-input" required placeholder="Concepto general del movimiento"
                value={asientoForm.descripcion}
                onChange={e => setAsientoForm({ ...asientoForm, descripcion: e.target.value })} />
            </div>

            <div style={{ margin: '16px 0 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  PARTIDA DOBLE — LÍNEAS
                </span>
                <Button type="button" size="sm" onClick={addLinea}>+ Agregar Línea</Button>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 90px 90px 32px',
                gap: 6, padding: '6px 8px', background: 'var(--bg-secondary)',
                borderRadius: '6px 6px 0 0', fontSize: '11px', fontWeight: 600,
                color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                <span>Cuenta</span>
                <span>Descripción línea</span>
                <span style={{ textAlign: 'right' }}>Debe (S/)</span>
                <span style={{ textAlign: 'right' }}>Haber (S/)</span>
                <span />
              </div>

              {asientoForm.lineas.map((l, idx) => (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 90px 90px 32px',
                  gap: 6, padding: '6px 8px',
                  background: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderTop: idx === 0 ? '1px solid var(--border-color)' : 'none',
                  borderRadius: idx === asientoForm.lineas.length - 1 ? '0 0 6px 6px' : 0
                }}>
                  <select className="form-input" style={{ padding: '5px 8px', fontSize: '13px' }}
                    value={l.cuenta_id}
                    onChange={e => setLinea(idx, 'cuenta_id', e.target.value)}
                    required>
                    <option value="">— Seleccionar cuenta —</option>
                    {planCuentas.map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                    ))}
                  </select>
                  <input type="text" className="form-input" style={{ padding: '5px 8px', fontSize: '13px' }}
                    placeholder="Glosa línea"
                    value={l.descripcion}
                    onChange={e => setLinea(idx, 'descripcion', e.target.value)} />
                  <input type="number" step="0.01" min="0" className="form-input"
                    style={{ padding: '5px 8px', fontSize: '13px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                    placeholder="0.00"
                    value={l.debe}
                    onChange={e => setLinea(idx, 'debe', e.target.value)} />
                  <input type="number" step="0.01" min="0" className="form-input"
                    style={{ padding: '5px 8px', fontSize: '13px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                    placeholder="0.00"
                    value={l.haber}
                    onChange={e => setLinea(idx, 'haber', e.target.value)} />
                  <button type="button" onClick={() => removeLinea(idx)}
                    disabled={asientoForm.lineas.length <= 2}
                    style={{
                      background: 'none', border: 'none', fontSize: '16px', padding: 0,
                      cursor: asientoForm.lineas.length <= 2 ? 'not-allowed' : 'pointer',
                      color: asientoForm.lineas.length <= 2 ? 'var(--text-tertiary)' : 'var(--status-err-text)',
                    }}>×</button>
                </div>
              ))}

              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 90px 90px 32px',
                gap: 6, padding: '8px 8px', marginTop: 2,
                background: balanceado ? 'var(--status-ok-bg)' : 'var(--status-warn-bg)',
                border: `1px solid ${balanceado ? 'var(--status-ok-text)' : 'var(--status-warn-text)'}`,
                borderRadius: 6, opacity: 0.95
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', gridColumn: '1 / 3' }}>
                  {balanceado ? '✓ Asiento balanceado' : '⚠ Partida no balanceada'}
                </span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                  {formatCurrency(totalDebe)}
                </span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                  {formatCurrency(totalHaber)}
                </span>
                <span />
              </div>
            </div>

            {asientoError && (
              <div style={{
                padding: '10px 12px', background: 'var(--status-err-bg)',
                color: 'var(--status-err-text)', borderRadius: 6, fontSize: '13px', marginTop: 8
              }}>
                {asientoError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => { setShowAsientoModal(false); setAsientoError(''); }}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading || !balanceado}>
                {loading ? 'Registrando...' : 'Registrar Asiento'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Ver Asiento Detalle ── */}
      {showVerAsientoModal && asientoDetalle && (
        <Modal title={`Asiento ${asientoDetalle.folio}`} onClose={() => setShowVerAsientoModal(false)} width="680px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Fecha</div>
              <div style={{ fontWeight: 600 }}>{formatDate(asientoDetalle.fecha)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Estado</div>
              <StatusPill status={asientoDetalle.estado} />
            </div>
            <div style={{ gridColumn: '1 / 3' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Descripción</div>
              <div>{asientoDetalle.descripcion}</div>
            </div>
            {asientoDetalle.referencia && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Referencia</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{asientoDetalle.referencia}</div>
              </div>
            )}
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px 100px',
              gap: 8, padding: '8px 12px',
              background: 'var(--bg-secondary)', fontSize: '11px', fontWeight: 700,
              color: 'var(--text-tertiary)', textTransform: 'uppercase'
            }}>
              <span>Código</span><span>Cuenta</span><span>Glosa</span>
              <span style={{ textAlign: 'right' }}>Debe</span>
              <span style={{ textAlign: 'right' }}>Haber</span>
            </div>
            {(asientoDetalle.lineas || []).map((l, i) => (
              <div key={l.id} style={{
                display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px 100px',
                gap: 8, padding: '10px 12px',
                background: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                borderTop: '1px solid var(--border-color)', fontSize: '13px'
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-brand-dark)' }}>{l.codigo}</span>
                <span>{l.cuenta_nombre}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{l.descripcion || '—'}</span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {parseFloat(l.debe) > 0 ? formatCurrency(l.debe) : '—'}
                </span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {parseFloat(l.haber) > 0 ? formatCurrency(l.haber) : '—'}
                </span>
              </div>
            ))}
            <div style={{
              display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px 100px',
              gap: 8, padding: '10px 12px',
              background: 'var(--status-ok-bg)', borderTop: '2px solid var(--border-color)',
              fontSize: '13px', fontWeight: 700
            }}>
              <span style={{ gridColumn: '1 / 4', color: 'var(--text-secondary)' }}>TOTALES</span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(asientoDetalle.total_debe)}</span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(asientoDetalle.total_haber)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button onClick={() => setShowVerAsientoModal(false)}>Cerrar</Button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Nueva Cuenta Contable ── */}
      {showCuentaModal && (
        <Modal title="Nueva Cuenta Contable" onClose={() => setShowCuentaModal(false)}>
          <form onSubmit={handleCuentaSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Código PCGE</label>
                <input type="text" className="form-input" required placeholder="Ej: 1.1.3"
                  value={cuentaForm.codigo} onChange={e => setCuentaForm({ ...cuentaForm, codigo: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={cuentaForm.tipo} onChange={e => setCuentaForm({ ...cuentaForm, tipo: e.target.value })}>
                  <option value="ACTIVO">Activo</option>
                  <option value="PASIVO">Pasivo</option>
                  <option value="PATRIMONIO">Patrimonio</option>
                  <option value="INGRESO">Ingreso</option>
                  <option value="GASTO">Gasto</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre de la Cuenta</label>
              <input type="text" className="form-input" required placeholder="Ej: Clientes por cobrar"
                value={cuentaForm.nombre} onChange={e => setCuentaForm({ ...cuentaForm, nombre: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowCuentaModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear Cuenta'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   TESORERÍA
───────────────────────────────────────── */
function TabTesoreria({ canWrite, search }) {
  const [tesoreria, setTesoreria] = useState({ ingresos: 0, egresos: 0, saldo: 0, saldo_bancario: 0, pagos_vencidos: 0 });
  const [cuentasBancarias, setCuentasBancarias] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [pagosPage, setPagosPage] = useState(1);
  const [pagosTotalPages, setPagosTotalPages] = useState(1);
  const [subTabPagos, setSubTabPagos] = useState('todos');

  const [showBancoModal, setShowBancoModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [bancoForm, setBancoForm] = useState({ banco: '', numero_cuenta: '', tipo: 'CORRIENTE', moneda: 'PEN', saldo_actual: '' });
  const [pagoForm, setPagoForm] = useState({ tipo: 'COBRO', descripcion: '', monto: '', fecha_vencimiento: '', cuenta_bancaria_id: '', referencia: '' });
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async (page = 1, tipoPago = null) => {
    const [tesorRes, bancosRes, pagosRes] = await Promise.all([
      adminAPI.getTesoreria(),
      adminAPI.getCuentasBancarias(),
      adminAPI.getPagosProgramados({ page, ...(tipoPago ? { tipo: tipoPago } : {}) }),
    ]);
    setTesoreria(tesorRes.data);
    setCuentasBancarias(bancosRes.data);
    setPagos(pagosRes.data.data);
    setPagosPage(pagosRes.data.page);
    setPagosTotalPages(pagosRes.data.totalPages);
  }, []);

  useEffect(() => {
    const tipo = subTabPagos === 'cobros' ? 'COBRO' : subTabPagos === 'pagos' ? 'PAGO' : null;
    fetchAll(pagosPage, tipo);
  }, [pagosPage, subTabPagos]);

  const handleCompletar = async (id) => {
    if (!window.confirm('¿Marcar este cobro/pago como completado?')) return;
    await adminAPI.completarPago(id);
    const tipo = subTabPagos === 'cobros' ? 'COBRO' : subTabPagos === 'pagos' ? 'PAGO' : null;
    fetchAll(pagosPage, tipo);
  };

  const handleBancoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createCuentaBancaria({ ...bancoForm, saldo_actual: parseFloat(bancoForm.saldo_actual) || 0 });
      setShowBancoModal(false);
      setBancoForm({ banco: '', numero_cuenta: '', tipo: 'CORRIENTE', moneda: 'PEN', saldo_actual: '' });
      fetchAll(pagosPage);
    } catch (err) {
      alert(err.response?.data?.error || 'Error creando cuenta bancaria');
    } finally {
      setLoading(false);
    }
  };

  const handlePagoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createPagoProgramado({
        ...pagoForm,
        monto: parseFloat(pagoForm.monto),
        cuenta_bancaria_id: pagoForm.cuenta_bancaria_id || null,
      });
      setShowPagoModal(false);
      setPagoForm({ tipo: 'COBRO', descripcion: '', monto: '', fecha_vencimiento: '', cuenta_bancaria_id: '', referencia: '' });
      const tipo = subTabPagos === 'cobros' ? 'COBRO' : subTabPagos === 'pagos' ? 'PAGO' : null;
      fetchAll(pagosPage, tipo);
    } catch (err) {
      alert(err.response?.data?.error || 'Error registrando cobro/pago');
    } finally {
      setLoading(false);
    }
  };

  const bancoColors = {
    bcp: '#003087', interbank: '#E63228', bbva: '#004781', scotiabank: '#EC0101',
    banbif: '#004B93', pichincha: '#E5B700',
  };
  const getBancoColor = (banco) => {
    if (!banco) return 'var(--color-brand)';
    const key = Object.keys(bancoColors).find(k => banco.toLowerCase().includes(k));
    return key ? bancoColors[key] : 'var(--color-brand)';
  };

  const pagosCols = [
    { key: 'descripcion', label: 'Descripción' },
    { key: 'tipo', label: 'Tipo', render: v => <StatusPill status={v} />, width: 80 },
    { key: 'monto', label: 'Monto', render: v => formatCurrency(v), width: 120 },
    { key: 'fecha_vencimiento', label: 'Vencimiento', render: formatDate, width: 110 },
    { key: 'banco', label: 'Banco', width: 100 },
    { key: 'estado', label: 'Estado', render: v => <StatusPill status={v} />, width: 110 },
    {
      key: 'id', label: 'Acción', width: 100,
      render: (v, row) => (row.estado === 'PENDIENTE' || row.estado === 'VENCIDO')
        ? (
          <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleCompletar(v); }}>
            Completar
          </Button>
        )
        : <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
    },
  ];

  const filteredPagos = pagos.filter(p =>
    !search ||
    p.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
    p.banco?.toLowerCase().includes(search.toLowerCase()) ||
    p.referencia?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="metrics-grid">
        <MetricCard label="Ingresos del Mes" value={formatCurrency(tesoreria.ingresos)} positive />
        <MetricCard label="Egresos del Mes" value={formatCurrency(tesoreria.egresos)} positive={false} />
        <MetricCard
          label="Saldo Neto del Mes"
          value={formatCurrency(tesoreria.saldo)}
          positive={tesoreria.saldo >= 0}
        />
        <MetricCard
          label="Saldo Bancario Total"
          value={formatCurrency(tesoreria.saldo_bancario)}
          positive
        />
        <MetricCard
          label="Pagos Vencidos"
          value={tesoreria.pagos_vencidos || 0}
          positive={tesoreria.pagos_vencidos === 0}
          change={tesoreria.pagos_vencidos > 0 ? `${tesoreria.pagos_vencidos} pendiente${tesoreria.pagos_vencidos > 1 ? 's' : ''}` : 'Sin vencidos'}
        />
      </div>

      {/* Cuentas Bancarias */}
      <Panel
        title="Cuentas Bancarias"
        actions={canWrite && (
          <Button variant="primary" onClick={() => setShowBancoModal(true)}>+ Nueva Cuenta</Button>
        )}
      >
        {cuentasBancarias.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No hay cuentas bancarias registradas
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16, padding: '16px'
          }}>
            {cuentasBancarias.map(cb => (
              <div key={cb.id} style={{
                border: '1px solid var(--border-color)', borderRadius: 10,
                overflow: 'hidden', background: 'var(--bg-primary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
              >
                <div style={{
                  background: getBancoColor(cb.banco), padding: '14px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{cb.banco}</span>
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: '#fff',
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 20
                  }}>{cb.tipo}</span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: 12 }}>
                    {maskAccount(cb.numero_cuenta)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: 2 }}>SALDO DISPONIBLE</div>
                      <div style={{
                        fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: cb.saldo_actual >= 0 ? 'var(--color-brand-dark)' : 'var(--status-err-text)',
                      }}>
                        {formatCurrency(cb.saldo_actual, cb.moneda)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                      background: cb.moneda === 'PEN' ? 'var(--status-ok-bg)' : cb.moneda === 'USD' ? 'var(--status-info-bg)' : 'var(--status-warn-bg)',
                      color: cb.moneda === 'PEN' ? 'var(--status-ok-text)' : cb.moneda === 'USD' ? 'var(--status-info-text)' : 'var(--status-warn-text)',
                    }}>{cb.moneda}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Cobros y Pagos Programados */}
      <Panel
        title="Cobros y Pagos Programados"
        actions={canWrite && (
          <Button variant="primary" onClick={() => setShowPagoModal(true)}>+ Registrar</Button>
        )}
      >
        <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0', borderBottom: '1px solid var(--border-color)' }}>
          {[['todos', 'Todos'], ['cobros', 'Cobros'], ['pagos', 'Pagos']].map(([key, label]) => (
            <button key={key}
              onClick={() => { setSubTabPagos(key); setPagosPage(1); }}
              style={{
                padding: '6px 16px', border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0',
                fontSize: '13px', fontWeight: subTabPagos === key ? 600 : 400,
                background: subTabPagos === key ? 'var(--bg-primary)' : 'transparent',
                color: subTabPagos === key ? 'var(--color-brand)' : 'var(--text-secondary)',
                borderBottom: subTabPagos === key ? '2px solid var(--color-brand)' : '2px solid transparent',
                marginBottom: -1,
              }}>
              {label}
            </button>
          ))}
        </div>
        <DataTable
          columns={pagosCols}
          data={filteredPagos}
          page={pagosPage}
          totalPages={pagosTotalPages}
          total={pagosTotalPages * 10}
          onPageChange={setPagosPage}
          emptyMessage="No hay cobros/pagos programados"
        />
      </Panel>

      {/* ── Modal: Nueva Cuenta Bancaria ── */}
      {showBancoModal && (
        <Modal title="Nueva Cuenta Bancaria" onClose={() => setShowBancoModal(false)}>
          <form onSubmit={handleBancoSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                <label className="form-label">Banco</label>
                <input type="text" className="form-input" required placeholder="Ej: BCP, Interbank, BBVA"
                  value={bancoForm.banco} onChange={e => setBancoForm({ ...bancoForm, banco: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                <label className="form-label">Número de Cuenta</label>
                <input type="text" className="form-input" required placeholder="Número completo de la cuenta"
                  value={bancoForm.numero_cuenta} onChange={e => setBancoForm({ ...bancoForm, numero_cuenta: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={bancoForm.tipo} onChange={e => setBancoForm({ ...bancoForm, tipo: e.target.value })}>
                  <option value="CORRIENTE">Corriente</option>
                  <option value="AHORROS">Ahorros</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Moneda</label>
                <select className="form-input" value={bancoForm.moneda} onChange={e => setBancoForm({ ...bancoForm, moneda: e.target.value })}>
                  <option value="PEN">PEN — Soles</option>
                  <option value="USD">USD — Dólares</option>
                  <option value="EUR">EUR — Euros</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                <label className="form-label">Saldo Inicial</label>
                <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00"
                  value={bancoForm.saldo_actual} onChange={e => setBancoForm({ ...bancoForm, saldo_actual: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowBancoModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Registrar Cuenta'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Registrar Cobro/Pago ── */}
      {showPagoModal && (
        <Modal title="Registrar Cobro / Pago" onClose={() => setShowPagoModal(false)}>
          <form onSubmit={handlePagoSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={pagoForm.tipo} onChange={e => setPagoForm({ ...pagoForm, tipo: e.target.value })}>
                  <option value="COBRO">Cobro (a recibir)</option>
                  <option value="PAGO">Pago (a realizar)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto</label>
                <input type="number" step="0.01" min="0" className="form-input" required placeholder="0.00"
                  value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                <label className="form-label">Descripción</label>
                <input type="text" className="form-input" required placeholder="Concepto del cobro o pago"
                  value={pagoForm.descripcion} onChange={e => setPagoForm({ ...pagoForm, descripcion: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Vencimiento</label>
                <input type="date" className="form-input" required
                  value={pagoForm.fecha_vencimiento} onChange={e => setPagoForm({ ...pagoForm, fecha_vencimiento: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Referencia (opcional)</label>
                <input type="text" className="form-input" placeholder="Ej: VT-00015"
                  value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                <label className="form-label">Cuenta Bancaria (opcional)</label>
                <select className="form-input" value={pagoForm.cuenta_bancaria_id} onChange={e => setPagoForm({ ...pagoForm, cuenta_bancaria_id: e.target.value })}>
                  <option value="">— Sin asignar —</option>
                  {cuentasBancarias.map(cb => (
                    <option key={cb.id} value={cb.id}>
                      {cb.banco} — {maskAccount(cb.numero_cuenta)} ({cb.moneda})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowPagoModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function Administracion() {
  const { canWrite } = useAuth();
  const { search } = useSearch();
  const [tab, setTab] = useState('finanzas');

  const [tesoreriaSummary, setTesoreriaSummary] = useState({ ingresos: 0, egresos: 0, saldo: 0 });
  const [txs, setTxs] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);

  const [emps, setEmps] = useState([]);
  const [empPage, setEmpPage] = useState(1);
  const [empTotalPages, setEmpTotalPages] = useState(1);

  const [showTxModal, setShowTxModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [txForm, setTxForm] = useState({ tipo: 'INGRESO', monto: '', descripcion: '', area: 'ADMINISTRACION' });
  const [empForm, setEmpForm] = useState({ nombre: '', dni: '', cargo: '', salario: '', area: 'ADMINISTRACION' });
  const [loading, setLoading] = useState(false);

  const fetchTesoreriaSummary = async () => {
    const { data } = await adminAPI.getTesoreria();
    setTesoreriaSummary(data);
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
    if (tab === 'finanzas') {
      fetchTesoreriaSummary();
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
        area: txForm.area,
      });
      setShowTxModal(false);
      setTxForm({ tipo: 'INGRESO', monto: '', descripcion: '', area: 'ADMINISTRACION' });
      fetchTxs(txPage);
      fetchTesoreriaSummary();
    } catch {
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
        area: empForm.area,
      });
      setShowEmpModal(false);
      setEmpForm({ nombre: '', dni: '', cargo: '', salario: '', area: 'ADMINISTRACION' });
      fetchEmps(empPage);
    } catch {
      alert('Error creando empleado');
    } finally {
      setLoading(false);
    }
  };

  const txCols = [
    { key: 'fecha', label: 'Fecha', render: formatDate },
    { key: 'tipo', label: 'Tipo', render: v => <StatusPill status={v} /> },
    { key: 'monto', label: 'Monto', render: v => formatCurrency(v) },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'area', label: 'Área' },
  ];

  const empCols = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'dni', label: 'DNI', mono: true },
    { key: 'cargo', label: 'Cargo' },
    { key: 'area', label: 'Área' },
    { key: 'salario', label: 'Salario', render: v => formatCurrency(v) },
    { key: 'activo', label: 'Estado', render: v => <StatusPill status={v ? 'ACTIVO' : 'INACTIVO'} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Administración</h1>
          <div className="subtitle">Gestión financiera, contabilidad y recursos humanos</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'finanzas' ? 'active' : ''}`} onClick={() => setTab('finanzas')}>Finanzas</div>
        <div className={`tab ${tab === 'contabilidad' ? 'active' : ''}`} onClick={() => setTab('contabilidad')}>Contabilidad</div>
        <div className={`tab ${tab === 'rrhh' ? 'active' : ''}`} onClick={() => setTab('rrhh')}>Recursos Humanos</div>
        <div className={`tab ${tab === 'legales' ? 'active' : ''}`} onClick={() => setTab('legales')}>Asuntos Legales</div>
        <div className={`tab ${tab === 'tesoreria' ? 'active' : ''}`} onClick={() => setTab('tesoreria')}>Tesorería</div>
      </div>

      {tab === 'finanzas' && (
        <>
          <div className="metrics-grid" style={{ marginBottom: 20 }}>
            <MetricCard label="Ingresos del Mes" value={formatCurrency(tesoreriaSummary.ingresos)} positive />
            <MetricCard label="Egresos del Mes" value={formatCurrency(tesoreriaSummary.egresos)} positive={false} />
            <MetricCard label="Saldo Neto" value={formatCurrency(tesoreriaSummary.saldo)} positive={tesoreriaSummary.saldo >= 0} />
          </div>
          <Panel
            title="Transacciones"
            actions={canWrite && <Button variant="primary" onClick={() => setShowTxModal(true)}>+ Nueva Transacción</Button>}
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
        </>
      )}

      {tab === 'contabilidad' && (
        <TabContabilidad canWrite={canWrite} search={search} />
      )}

      {tab === 'rrhh' && (
        <Panel
          title="Empleados"
          actions={canWrite && <Button variant="primary" onClick={() => setShowEmpModal(true)}>+ Nuevo Empleado</Button>}
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

      {tab === 'legales' && (
        <TabLegales canWrite={canWrite} search={search} />
      )}

      {tab === 'tesoreria' && (
        <TabTesoreria canWrite={canWrite} search={search} />
      )}

      {/* ── Modal: Nueva Transacción ── */}
      {showTxModal && (
        <Modal title="Nueva Transacción" onClose={() => setShowTxModal(false)}>
          <form onSubmit={handleTxSubmit}>
            <div className="form-group">
              <label className="form-label">Tipo de Movimiento</label>
              <select className="form-input" value={txForm.tipo} onChange={e => setTxForm({ ...txForm, tipo: e.target.value })}>
                <option value="INGRESO">Ingreso (Cobro, Abono)</option>
                <option value="EGRESO">Egreso (Gasto, Pago)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monto (S/)</label>
              <input type="number" step="0.01" className="form-input" required value={txForm.monto} onChange={e => setTxForm({ ...txForm, monto: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input type="text" className="form-input" required value={txForm.descripcion} onChange={e => setTxForm({ ...txForm, descripcion: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Área Imputada</label>
              <select className="form-input" value={txForm.area} onChange={e => setTxForm({ ...txForm, area: e.target.value })}>
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

      {/* ── Modal: Registrar Empleado ── */}
      {showEmpModal && (
        <Modal title="Registrar Empleado" onClose={() => setShowEmpModal(false)}>
          <form onSubmit={handleEmpSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                <label className="form-label">Nombre Completo</label>
                <input type="text" className="form-input" required value={empForm.nombre} onChange={e => setEmpForm({ ...empForm, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">DNI</label>
                <input type="text" className="form-input" required value={empForm.dni} onChange={e => setEmpForm({ ...empForm, dni: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Cargo</label>
                <input type="text" className="form-input" required value={empForm.cargo} onChange={e => setEmpForm({ ...empForm, cargo: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Salario Base (S/)</label>
                <input type="number" step="0.01" className="form-input" value={empForm.salario} onChange={e => setEmpForm({ ...empForm, salario: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Área</label>
                <select className="form-input" value={empForm.area} onChange={e => setEmpForm({ ...empForm, area: e.target.value })}>
                  <option value="ADMINISTRACION">Administración</option>
                  <option value="TECNOLOGIA">Tecnología</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="LOGISTICA">Logística</option>
                  <option value="PRODUCCION">Producción</option>
                </select>
              </div>
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
