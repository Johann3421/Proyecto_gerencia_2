const STATUS_MAP = {
  // Ventas
  PENDIENTE: 'warn', EN_PROCESO: 'info', FACTURADO: 'ok', ENTREGADO: 'ok',
  // Tickets
  ABIERTO: 'warn', RESUELTO: 'ok', CERRADO: 'ok',
  // Prioridad
  BAJA: 'info', MEDIA: 'warn', ALTA: 'err', CRITICA: 'err',
  // OC
  BORRADOR: 'info', ENVIADA: 'warn', RECIBIDA: 'ok', CANCELADA: 'err', CANCELADO: 'err',
  // Produccion
  PLANIFICADA: 'info', CONTROL_CALIDAD: 'warn', COMPLETADA: 'ok',
  // Inspección
  APROBADO: 'ok', RECHAZADO: 'err',
  // Empleado
  ACTIVO: 'ok', INACTIVO: 'err',
  // General
  OK: 'ok', CRITICO: 'err', BAJO: 'warn',
  // Distribuciones
  EN_TRANSITO: 'info',
  // Transacciones
  INGRESO: 'ok', EGRESO: 'err',
};

export default function StatusPill({ status, className = '' }) {
  const variant = STATUS_MAP[status] || 'info';
  const label = (status || '').replace(/_/g, ' ');
  return (
    <span className={`status-pill ${variant} ${className}`}>
      {label}
    </span>
  );
}
