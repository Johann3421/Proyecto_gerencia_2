const bcrypt = require('bcryptjs');
const { pool, query, initDB } = require('../db');

const seed = async () => {
  try {
    await initDB();

    // Check if already seeded
    const existing = await query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('⚡ Base de datos ya tiene datos — omitiendo seed');
      return;
    }

    console.log('🌱 Sembrando datos iniciales...');
    const hash = await bcrypt.hash('Admin1234!', 10);
    const opHash = await bcrypt.hash('User1234!', 10);

    // ── USUARIOS ──
    const users = [
      ['Admin Principal', 'admin@nexo.pe', hash, 'SUPER_ADMIN', null],
      ['Carlos Mendoza', 'admin.adm@nexo.pe', opHash, 'ADMIN_AREA', 'ADMINISTRACION'],
      ['María Torres', 'admin.tec@nexo.pe', opHash, 'ADMIN_AREA', 'TECNOLOGIA'],
      ['Jorge Paredes', 'admin.com@nexo.pe', opHash, 'ADMIN_AREA', 'COMERCIAL'],
      ['Ana Quispe', 'admin.log@nexo.pe', opHash, 'ADMIN_AREA', 'LOGISTICA'],
      ['Pedro Huamán', 'admin.prod@nexo.pe', opHash, 'ADMIN_AREA', 'PRODUCCION'],
      ['Lucía Vargas', 'auditor@nexo.pe', opHash, 'AUDITOR', null],
      ['Roberto Silva', 'supervisor.com@nexo.pe', opHash, 'SUPERVISOR', 'COMERCIAL'],
    ];

    for (const [nombre, email, pw, rol, area] of users) {
      await query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, area) VALUES ($1,$2,$3,$4,$5)`,
        [nombre, email, pw, rol, area]
      );
    }

    // ── CLIENTES ──
    const clientes = [
      ['Distribuidora Lima SAC', 'EMPRESA', '20512345678', '01-4567890', 'ventas@distlima.pe', 'Av. Javier Prado 1234, Lima'],
      ['Importadora Callao EIRL', 'EMPRESA', '20198765432', '01-3456789', 'compras@impcallao.pe', 'Jr. Grau 567, Callao'],
      ['Comercial Andina SRL', 'EMPRESA', '20334455667', '054-234567', 'info@andina.pe', 'Calle Mercaderes 120, Arequipa'],
      ['Tech Solutions Perú', 'EMPRESA', '20445566778', '01-9876543', 'soporte@techsol.pe', 'Av. La Marina 890, San Miguel'],
      ['Mercado Central EIRL', 'EMPRESA', '20556677889', '01-2345678', 'admin@mercentral.pe', 'Jr. Ucayali 345, Lima'],
      ['Juan Pérez López', 'PERSONA', '10234567890', '987654321', 'jperez@gmail.com', 'Av. Brasil 456, Jesús María'],
      ['Minera del Sur SA', 'EMPRESA', '20667788990', '054-987654', 'logistica@minasur.pe', 'Prolongación Ayacucho 789, AQP'],
      ['Agroindustrias Norte SAC', 'EMPRESA', '20778899001', '044-345678', 'ventas@agronorte.pe', 'Av. Mansiche 1456, Trujillo'],
      ['Rosa García Mendoza', 'PERSONA', '10345678901', '976543210', 'rosa.garcia@hotmail.com', 'Av. Salaverry 234, Lima'],
      ['Constructora Pacífico', 'EMPRESA', '20889900112', '01-5678901', 'proyectos@conpac.pe', 'Av. Del Ejército 567, Miraflores'],
    ];

    for (const [nombre, tipo, ruc, telefono, email, direccion] of clientes) {
      await query(
        `INSERT INTO clientes (nombre, tipo, ruc, telefono, email, direccion) VALUES ($1,$2,$3,$4,$5,$6)`,
        [nombre, tipo, ruc, telefono, email, direccion]
      );
    }

    // ── PRODUCTOS ──
    const productos = [
      ['SKU-001', 'Laptop HP ProBook 450', 'Laptop empresarial 15.6"', 25, 10, 'PRINCIPAL'],
      ['SKU-002', 'Monitor Dell 24"', 'Monitor IPS Full HD', 40, 15, 'PRINCIPAL'],
      ['SKU-003', 'Teclado Logitech K120', 'Teclado USB estándar', 100, 30, 'PRINCIPAL'],
      ['SKU-004', 'Mouse Inalámbrico', 'Mouse ergonómico 2.4GHz', 80, 25, 'PRINCIPAL'],
      ['SKU-005', 'Cable HDMI 2m', 'Cable HDMI 2.0 alta velocidad', 3, 20, 'SECUNDARIO'],
      ['SKU-006', 'Disco SSD 256GB', 'SSD SATA III Kingston', 15, 10, 'PRINCIPAL'],
      ['SKU-007', 'Memoria RAM 8GB DDR4', 'RAM DDR4 3200MHz', 8, 10, 'PRINCIPAL'],
      ['SKU-008', 'Impresora Epson L3250', 'Impresora multifuncional tinta', 12, 5, 'PRINCIPAL'],
      ['SKU-009', 'Router TP-Link AC1200', 'Router WiFi dual band', 2, 8, 'SECUNDARIO'],
      ['SKU-010', 'UPS APC 750VA', 'UPS para estación de trabajo', 6, 5, 'PRINCIPAL'],
      ['SKU-011', 'Webcam Logitech C920', 'Webcam Full HD 1080p', 20, 8, 'PRINCIPAL'],
      ['SKU-012', 'Headset Jabra Evolve2', 'Auricular profesional USB-C', 30, 10, 'PRINCIPAL'],
      ['SKU-013', 'Patch Cord Cat6 3m', 'Cable de red categoría 6', 200, 50, 'SECUNDARIO'],
      ['SKU-014', 'Switch Cisco 24P', 'Switch gestionable 24 puertos', 4, 3, 'PRINCIPAL'],
      ['SKU-015', 'Servidor Dell T40', 'Servidor torre Xeon E-2224G', 1, 2, 'PRINCIPAL'],
    ];

    for (const [sku, nombre, desc, stock, minimo, almacen] of productos) {
      await query(
        `INSERT INTO productos (sku, nombre, descripcion, stock_actual, stock_minimo, almacen)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [sku, nombre, desc, stock, minimo, almacen]
      );
    }

    // ── VENTAS (20) ──
    const estados = ['PENDIENTE', 'EN_PROCESO', 'FACTURADO', 'ENTREGADO'];
    for (let i = 1; i <= 20; i++) {
      const folio = `VT-${String(i).padStart(5, '0')}`;
      const clienteId = (i % 10) + 1;
      const vendedorId = 4; // admin comercial
      const total = Math.round((Math.random() * 5000 + 500) * 100) / 100;
      const estado = estados[i % 4];
      const dia = Math.max(1, Math.min(28, i));
      const fecha = `2026-${String(Math.ceil(i / 7)).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

      await query(
        `INSERT INTO ventas (folio, cliente_id, vendedor_id, total, estado, fecha_venta)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [folio, clienteId, vendedorId, total, estado, fecha]
      );

      // Add 1-3 items per sale
      const numItems = (i % 3) + 1;
      for (let j = 0; j < numItems; j++) {
        const qty = Math.floor(Math.random() * 5) + 1;
        const price = Math.round((Math.random() * 500 + 50) * 100) / 100;
        await query(
          `INSERT INTO venta_items (venta_id, producto, cantidad, precio_unitario, subtotal)
           VALUES ($1,$2,$3,$4,$5)`,
          [i, productos[((i + j) % 15)][1], qty, price, qty * price]
        );
      }
    }

    // ── TICKETS (5) ──
    const ticketTipos = ['SOPORTE', 'POSTVENTA', 'DESARROLLO', 'INFRAESTRUCTURA'];
    const ticketEstados = ['ABIERTO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];
    const prioridades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
    const ticketData = [
      ['No enciende PC de contabilidad', 'La PC del área no enciende desde ayer', 'SOPORTE', 'ABIERTO', 'ALTA'],
      ['Error en módulo de facturación', 'Al generar factura da error 500', 'DESARROLLO', 'EN_PROCESO', 'CRITICA'],
      ['Configurar nuevo router oficina 2', 'Instalar y configurar router en 2do piso', 'INFRAESTRUCTURA', 'ABIERTO', 'MEDIA'],
      ['Cliente reclama producto defectuoso', 'El cliente #3 reporta falla en monitor', 'POSTVENTA', 'RESUELTO', 'ALTA'],
      ['Actualizar sistema operativo servers', 'Migración a última versión del OS', 'INFRAESTRUCTURA', 'EN_PROCESO', 'BAJA'],
    ];

    for (let i = 0; i < ticketData.length; i++) {
      const [titulo, desc, tipo, estado, prioridad] = ticketData[i];
      const folio = `TK-${String(i + 1).padStart(4, '0')}`;
      await query(
        `INSERT INTO tickets (folio, titulo, descripcion, tipo, asignado_a, estado, prioridad)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [folio, titulo, desc, tipo, 3, estado, prioridad]
      );
    }

    // ── ORDENES FABRICACIÓN (3) ──
    const ofData = [
      ['Ensamblaje PC Gamer', 10, 'PLANIFICADA'],
      ['Servidor Custom Enterprise', 5, 'EN_PROCESO'],
      ['Kit Cableado Estructurado', 20, 'CONTROL_CALIDAD'],
    ];

    for (let i = 0; i < ofData.length; i++) {
      const [producto, cantidad, estado] = ofData[i];
      const folio = `OF-${String(i + 1).padStart(4, '0')}`;
      await query(
        `INSERT INTO ordenes_fabricacion (folio, producto, cantidad, estado, responsable_id, fecha_inicio)
         VALUES ($1,$2,$3,$4,$5,CURRENT_DATE - INTERVAL '${i * 5} days')`,
        [folio, producto, cantidad, estado, 6]
      );
    }

    // ── INSPECCIONES ──
    await query(
      `INSERT INTO inspecciones_calidad (orden_fabricacion_id, resultado, observaciones, inspector_id)
       VALUES (3, 'PENDIENTE', 'En revisión por control de calidad', 6)`
    );

    // ── TRANSACCIONES (10) ──
    const txData = [
      ['INGRESO', 15000, 'Pago cliente Distribuidora Lima', 'COMERCIAL', '2026-03-01'],
      ['EGRESO', 3500, 'Compra de materiales oficina', 'ADMINISTRACION', '2026-03-03'],
      ['INGRESO', 8200, 'Pago cliente Importadora Callao', 'COMERCIAL', '2026-03-05'],
      ['EGRESO', 12000, 'Nómina quincenal marzo', 'ADMINISTRACION', '2026-03-15'],
      ['INGRESO', 4500, 'Servicio de soporte técnico', 'TECNOLOGIA', '2026-03-18'],
      ['EGRESO', 2800, 'Compra insumos producción', 'PRODUCCION', '2026-03-20'],
      ['INGRESO', 22000, 'Venta lote servidores', 'COMERCIAL', '2026-04-01'],
      ['EGRESO', 1500, 'Servicios públicos abril', 'ADMINISTRACION', '2026-04-02'],
      ['INGRESO', 6700, 'Servicio mantenimiento preventivo', 'TECNOLOGIA', '2026-04-03'],
      ['EGRESO', 9800, 'Compra equipos networking', 'LOGISTICA', '2026-04-05'],
    ];

    for (const [tipo, monto, desc, area, fecha] of txData) {
      await query(
        `INSERT INTO transacciones (tipo, monto, descripcion, area, fecha)
         VALUES ($1,$2,$3,$4,$5)`,
        [tipo, monto, desc, area, fecha]
      );
    }

    // ── EMPLEADOS ──
    const empData = [
      ['Carlos Mendoza Ríos', '48123456', 'Gerente Administrativo', 'ADMINISTRACION', 5500],
      ['María Torres Luna', '45234567', 'Jefe de Tecnología', 'TECNOLOGIA', 5000],
      ['Jorge Paredes Vega', '42345678', 'Director Comercial', 'COMERCIAL', 5200],
      ['Ana Quispe Flores', '43456789', 'Jefe de Logística', 'LOGISTICA', 4800],
      ['Pedro Huamán Castro', '44567890', 'Jefe de Producción', 'PRODUCCION', 4900],
      ['Lucía Vargas Prado', '46678901', 'Auditora Interna', 'ADMINISTRACION', 4500],
      ['Roberto Silva Díaz', '47789012', 'Supervisor Comercial', 'COMERCIAL', 3800],
      ['Carmen López Ruiz', '49890123', 'Asistente RRHH', 'ADMINISTRACION', 2800],
    ];

    for (const [nombre, dni, cargo, area, salario] of empData) {
      await query(
        `INSERT INTO empleados (nombre, dni, cargo, area, salario) VALUES ($1,$2,$3,$4,$5)`,
        [nombre, dni, cargo, area, salario]
      );
    }

    console.log('✅ Seed completado exitosamente');
    console.log('📧 Login: admin@nexo.pe / Admin1234!');
  } catch (err) {
    console.error('❌ Error en seed:', err);
  } finally {
    await pool.end();
  }
};

// Run directly or as module
if (require.main === module) {
  seed();
} else {
  module.exports = seed;
}
