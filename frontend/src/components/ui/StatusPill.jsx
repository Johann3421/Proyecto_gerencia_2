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
  // Contabilidad
  REGISTRADO: 'ok', ANULADO: 'err',
  // Tesorería
  COMPLETADO: 'ok', VENCIDO: 'err',
  COBRO: 'info', PAGO: 'warn',
  CORRIENTE: 'info', AHORROS: 'ok',
  // Moneda
  PEN: 'ok', USD: 'info', EUR: 'warn',
  // Tipo cuenta contable
  ACTIVO_CONTA: 'ok', PASIVO: 'err', PATRIMONIO: 'info', GASTO: 'warn',
  // Contratos
  VIGENTE: 'ok', POR_VENCER: 'warn',
  LABORAL: 'info', PROVEEDOR: 'warn', CLIENTE: 'ok', ARRENDAMIENTO: 'info', SERVICIOS: 'info', OTROS: 'info',
  // Marketing - campaña estados
  ACTIVA: 'ok', PAUSADA: 'warn', FINALIZADA: 'info',
  // Marketing - tipos
  EMAIL: 'info', SOCIAL_MEDIA: 'ok', FLYER: 'info', EVENTO: 'ok', DIGITAL: 'info',
  // E-commerce - estados pedido
  NUEVO: 'warn', CONFIRMADO: 'info', PREPARANDO: 'warn', DESPACHADO: 'ok',
  // E-commerce - canales
  WEB: 'info', APP: 'ok', WHATSAPP: 'ok', MARKETPLACE: 'warn',
  // Activos
  OPERATIVO: 'ok', EN_MANTENIMIENTO: 'warn', DADO_DE_BAJA: 'err',
  // Mantenimiento tipos
  PREVENTIVO: 'info', CORRECTIVO: 'warn', EMERGENCIA: 'err',
  // Movimientos almacén
  ENTRADA: 'ok', SALIDA: 'err', AJUSTE: 'warn', TRASLADO: 'info',
};

export default function StatusPill({ status, label: customLabel, className = '' }) {
  const variant = STATUS_MAP[status] || 'info';
  const label = customLabel || (status || '').replace(/_/g, ' ');
  return (
    <span className={`status-pill ${variant} ${className}`}>
      {label}
    </span>
  );
}
