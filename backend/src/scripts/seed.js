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

    // ── PLAN DE CUENTAS + CONTABILIDAD + TESORERÍA (conditional) ──
    const cuentasExist = await query('SELECT COUNT(*) FROM plan_cuentas');
    if (parseInt(cuentasExist.rows[0].count) === 0) {
      // Plan de cuentas PCGE simplificado
      const planCuentas = [
        ['1.1.1', 'Caja', 'ACTIVO', 1],
        ['1.1.2', 'Bancos', 'ACTIVO', 1],
        ['1.2.1', 'Cuentas por Cobrar Comerciales', 'ACTIVO', 1],
        ['1.3.1', 'Inventarios', 'ACTIVO', 1],
        ['1.4.1', 'Activos Fijos', 'ACTIVO', 1],
        ['2.1.1', 'Cuentas por Pagar Comerciales', 'PASIVO', 1],
        ['2.1.2', 'Tributos por Pagar (IGV)', 'PASIVO', 1],
        ['2.2.1', 'Obligaciones Financieras', 'PASIVO', 1],
        ['3.1.1', 'Capital Social', 'PATRIMONIO', 1],
        ['3.2.1', 'Resultados Acumulados', 'PATRIMONIO', 1],
        ['4.1.1', 'Ventas de Mercaderías', 'INGRESO', 1],
        ['4.1.2', 'Ingresos por Servicios', 'INGRESO', 1],
        ['5.1.1', 'Costo de Ventas', 'GASTO', 1],
        ['5.2.1', 'Gastos Administrativos', 'GASTO', 1],
        ['5.2.2', 'Gastos de Ventas y Marketing', 'GASTO', 1],
        ['5.2.3', 'Gastos Financieros', 'GASTO', 1],
      ];
      for (const [codigo, nombre, tipo, nivel] of planCuentas) {
        await query(
          `INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel) VALUES ($1,$2,$3,$4)`,
          [codigo, nombre, tipo, nivel]
        );
      }

      // Asientos contables de ejemplo
      const asientos = [
        { folio: 'CT-00001', fecha: '2026-04-01', descripcion: 'Cobro venta VT-00001 — Distribuidora Lima SAC', referencia: 'VT-00001', estado: 'REGISTRADO', debe: 15000, haber: 15000, creado_por: 1,
          lineas: [[2, 'Depósito en cuenta BCP', 15000, 0], [11, 'Reconocimiento de ingreso por venta', 0, 15000]] },
        { folio: 'CT-00002', fecha: '2026-04-02', descripcion: 'Pago servicios públicos abril — ENEL y Sedapal', referencia: 'SERV-ABR-01', estado: 'REGISTRADO', debe: 1500, haber: 1500, creado_por: 1,
          lineas: [[14, 'Gasto servicios públicos administrativos', 1500, 0], [2, 'Pago desde cuenta bancaria', 0, 1500]] },
        { folio: 'CT-00003', fecha: '2026-04-03', descripcion: 'Ingreso servicio mantenimiento preventivo — Tech Solutions', referencia: 'TK-0003', estado: 'BORRADOR', debe: 6700, haber: 6700, creado_por: 1,
          lineas: [[3, 'Cuenta por cobrar por servicio TI', 6700, 0], [12, 'Ingreso reconocido por servicio técnico', 0, 6700]] },
      ];

      for (const a of asientos) {
        const res = await query(
          `INSERT INTO asientos_contables (folio, fecha, descripcion, referencia, estado, total_debe, total_haber, creado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [a.folio, a.fecha, a.descripcion, a.referencia, a.estado, a.debe, a.haber, a.creado_por]
        );
        const asientoId = res.rows[0].id;
        for (const [cuentaOffset, desc, debe, haber] of a.lineas) {
          // cuentaOffset is 1-based position in planCuentas array
          const cuentaRes = await query('SELECT id FROM plan_cuentas ORDER BY id LIMIT 1 OFFSET $1', [cuentaOffset - 1]);
          const cuentaId = cuentaRes.rows[0]?.id || cuentaOffset;
          await query(
            `INSERT INTO asiento_lineas (asiento_id, cuenta_id, descripcion, debe, haber) VALUES ($1,$2,$3,$4,$5)`,
            [asientoId, cuentaId, desc, debe, haber]
          );
        }
      }

      // Cuentas bancarias
      const bancos = [
        ['BCP', '191-1234567-0-12', 'CORRIENTE', 'PEN', 45820.50],
        ['Interbank', '200-3001234567', 'CORRIENTE', 'PEN', 22350.00],
        ['BBVA', '0011-0175-01-00234567', 'AHORROS', 'USD', 15000.00],
        ['Scotiabank', '000-2134567', 'CORRIENTE', 'PEN', 8750.75],
      ];
      for (const [banco, numero, tipo, moneda, saldo] of bancos) {
        await query(
          `INSERT INTO cuentas_bancarias (banco, numero_cuenta, tipo, moneda, saldo_actual) VALUES ($1,$2,$3,$4,$5)`,
          [banco, numero, tipo, moneda, saldo]
        );
      }

      // Pagos programados
      const pagos = [
        ['Cobro pendiente — Importadora Callao EIRL', 8200, 'COBRO', '2026-04-10', 'PENDIENTE', 1, 'VT-00002'],
        ['Cobro pendiente — Tech Solutions Perú', 4500, 'COBRO', '2026-04-15', 'PENDIENTE', 1, 'VT-00004'],
        ['Cobro completado — Distribuidora Lima SAC', 15000, 'COBRO', '2026-04-01', 'COMPLETADO', 2, 'VT-00001'],
        ['Pago planilla quincenal mayo', 14000, 'PAGO', '2026-04-15', 'PENDIENTE', 1, 'NOM-ABR-02'],
        ['Pago proveedor equipos networking', 9800, 'PAGO', '2026-04-12', 'VENCIDO', 4, 'OC-00042'],
        ['Pago servicios cloud AWS', 2300, 'PAGO', '2026-04-30', 'PENDIENTE', 2, 'AWS-ABR-26'],
      ];
      for (const [desc, monto, tipo, fecha, estado, cuentaIdx, ref] of pagos) {
        const cuentaRes = await query('SELECT id FROM cuentas_bancarias ORDER BY id LIMIT 1 OFFSET $1', [cuentaIdx - 1]);
        const cuentaId = cuentaRes.rows[0]?.id;
        await query(
          `INSERT INTO pagos_programados (descripcion, monto, tipo, fecha_vencimiento, estado, cuenta_bancaria_id, referencia)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [desc, monto, tipo, fecha, estado, cuentaId, ref]
        );
      }
    }

    // ── CONTRATOS LEGALES ──
    const contratosExist = await query('SELECT COUNT(*) FROM contratos');
    if (parseInt(contratosExist.rows[0].count) === 0) {
      const contratos = [
        ['LG-00001', 'Contrato Laboral — Gerente Administrativo', 'LABORAL', 'Carlos Mendoza Ríos', 'Contrato de trabajo a plazo indeterminado para el cargo de Gerente Administrativo. Incluye beneficios de ley, CTS, gratificaciones y EsSalud.', '2022-01-01', '2027-12-31', 5500.00, 'PEN', 'VIGENTE'],
        ['LG-00002', 'Contrato Laboral — Jefe de Tecnología', 'LABORAL', 'María Torres Luna', 'Contrato de trabajo para el cargo de Jefe de Tecnología. Sujeto a renovación anual.', '2023-03-01', '2026-04-30', 5000.00, 'PEN', 'POR_VENCER'],
        ['LG-00003', 'Contrato Suministro — Distribuidora Lima SAC', 'PROVEEDOR', 'Distribuidora Lima SAC', 'Contrato marco de suministro de insumos y materiales con condiciones preferentes y descuentos por volumen.', '2025-01-01', '2026-12-31', 180000.00, 'PEN', 'VIGENTE'],
        ['LG-00004', 'Contrato Servicios Cloud — AWS', 'PROVEEDOR', 'Amazon Web Services Inc.', 'Acuerdo Enterprise Support y servicios de infraestructura cloud (EC2, RDS, S3). Pago anual.', '2025-07-01', '2027-06-30', 48000.00, 'USD', 'VIGENTE'],
        ['LG-00005', 'Contrato Servicio — Tech Solutions Perú', 'CLIENTE', 'Tech Solutions Perú SAC', 'Contrato de prestación de servicios de mantenimiento y soporte técnico mensual.', '2025-06-01', '2026-05-31', 24000.00, 'PEN', 'VIGENTE'],
        ['LG-00006', 'Arrendamiento — Oficina Principal San Isidro', 'ARRENDAMIENTO', 'Inmobiliaria Colonial SAC', 'Arrendamiento de oficinas piso 8, Torre B, Centro Empresarial San Isidro. 450m² con estacionamientos.', '2024-01-01', '2024-12-31', 15000.00, 'PEN', 'VENCIDO'],
        ['LG-00007', 'Contrato Servicios IT — Soporte Externo', 'SERVICIOS', 'DataCenter Andino SAC', 'Servicios de soporte técnico externo, help desk nivel 2 y mantenimiento preventivo de infraestructura.', '2025-09-01', '2026-08-31', 36000.00, 'PEN', 'VIGENTE'],
      ];
      for (const [folio, titulo, tipo, contraparte, descripcion, fecha_inicio, fecha_vencimiento, monto, moneda, estado] of contratos) {
        await query(
          `INSERT INTO contratos (folio, titulo, tipo, contraparte, descripcion, fecha_inicio, fecha_vencimiento, monto, moneda, estado, creado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)`,
          [folio, titulo, tipo, contraparte, descripcion, fecha_inicio, fecha_vencimiento, monto, moneda, estado]
        );
      }
    }

    // -- CAMPAÑAS MARKETING --
    const campanaCount = await query('SELECT COUNT(*) FROM campanas_marketing');
    if (parseInt(campanaCount.rows[0].count) === 0) {
      const campanas = [
        ['MK-00001', 'Campaña Día de la Madre 2025', 'EMAIL', 'Email masivo a base de clientes segmentada por historial de compras. Descuentos del 20% en categorías seleccionadas.', 5000.00, 3200.00, '2025-04-15', '2025-05-11', 'FINALIZADA'],
        ['MK-00002', 'Lanzamiento Redes Sociales Q2', 'SOCIAL_MEDIA', 'Campaña de branding en Instagram y Facebook. Pauta pagada, stories, reels y colaboraciones con micro-influencers.', 8000.00, 6500.00, '2025-04-01', '2025-06-30', 'ACTIVA'],
        ['MK-00003', 'Feria Expo Industrial 2025', 'EVENTO', 'Participación en Expo Industrial Lima. Stand 6x4m, material POP, demos de producto y sorteo entre visitantes.', 12000.00, 4100.00, '2025-09-10', '2025-09-13', 'BORRADOR'],
        ['MK-00004', 'Campaña Digital — Temporada Alta', 'DIGITAL', 'Google Ads + Meta Ads para temporada navideña. Remarketing, búsqueda paga y display en principales portales.', 15000.00, 2800.00, '2025-11-01', '2025-12-31', 'ACTIVA'],
      ];
      for (const [folio, nombre, tipo, descripcion, presupuesto, gasto_actual, fecha_inicio, fecha_fin, estado] of campanas) {
        await query(
          `INSERT INTO campanas_marketing (folio, nombre, tipo, descripcion, presupuesto, gasto_actual, fecha_inicio, fecha_fin, estado)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [folio, nombre, tipo, descripcion, presupuesto, gasto_actual, fecha_inicio, fecha_fin, estado]
        );
      }
    }

    // -- PEDIDOS ONLINE --
    const pedidoCount = await query('SELECT COUNT(*) FROM pedidos_online');
    if (parseInt(pedidoCount.rows[0].count) === 0) {
      const pedidos = [
        ['PO-00001', 'Carlos Mendoza Ríos', 'cmendoza@gmail.com', '987654321', 'WEB', 1250.00, '2x Casco Seguridad EPP-001, 1x Guantes Industriales', 'DESPACHADO'],
        ['PO-00002', 'Ferretería El Maestro SAC', 'compras@ferreteriame.pe', '01-5551234', 'WHATSAPP', 3800.50, 'Pedido: 50 rollos cable NYY 2.5mm, 20x tomacorrientes dobles, 10x disyuntores 20A', 'CONFIRMADO'],
        ['PO-00003', 'Construcciones Andes EIRL', null, '999888777', 'MARKETPLACE', 540.00, 'Kit herramientas básico x3 unidades — Ref. CAT-2025-KH3', 'NUEVO'],
        ['PO-00004', 'Laura Sánchez Vidal', 'laurasv@hotmail.com', '956321478', 'APP', 890.00, '1x Taladro Percutor 750W + accesorios. Entrega en domicilio San Borja.', 'PREPARANDO'],
        ['PO-00005', 'Grupo Construcción Norte SAC', 'logistica@gcnorte.pe', '01-7896540', 'WEB', 12450.00, 'Pedido corporativo: 200u cemento Portland, 50 sacos cal, transporte incluido', 'ENTREGADO'],
      ];
      for (const [folio, cliente_nombre, email, telefono, canal, total, descripcion, estado] of pedidos) {
        await query(
          `INSERT INTO pedidos_online (folio, cliente_nombre, email, telefono, canal, total, descripcion, estado)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [folio, cliente_nombre, email, telefono, canal, total, descripcion, estado]
        );
      }
    }

    // -- ACTIVOS EMPRESA --
    const activoCount = await query('SELECT COUNT(*) FROM activos_empresa');
    if (parseInt(activoCount.rows[0].count) === 0) {
      const activos = [
        ['EQ-001', 'Montacargas Eléctrico Toyota 8FBE15', 'Maquinaria', 'T8FBE15-00234', 'Almacén Principal — Zona A', 85000.00, 'OPERATIVO'],
        ['EQ-002', 'Servidor Dell PowerEdge R750', 'TI — Servidor', 'CNF1234XZ7', 'CPD — Rack 3', 42000.00, 'OPERATIVO'],
        ['VH-001', 'Camión Hino 500 FC — Placa ABC-123', 'Vehículo', 'JHDFC9JKXX001', 'Patio de Vehículos', 175000.00, 'EN_MANTENIMIENTO'],
        ['EQ-003', 'Compresor Industrial 200L — Atlas Copco', 'Maquinaria', 'AC200-LM-5566', 'Taller de Producción', 22000.00, 'OPERATIVO'],
        ['MOB-001', 'UPS APC Smart-UPS 3000VA', 'TI — Infraestructura', 'SUA3000I-990XP', 'CPD — Área eléctrica', 8500.00, 'OPERATIVO'],
      ];
      for (const [codigo, nombre, tipo, numero_serie, ubicacion, valor_adquisicion, estado] of activos) {
        await query(
          `INSERT INTO activos_empresa (codigo, nombre, tipo, numero_serie, ubicacion, valor_adquisicion, estado)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [codigo, nombre, tipo, numero_serie, ubicacion, valor_adquisicion, estado]
        );
      }
    }

    // -- ORDENES MANTENIMIENTO --
    const mantCount = await query('SELECT COUNT(*) FROM ordenes_mantenimiento');
    if (parseInt(mantCount.rows[0].count) === 0) {
      const activoIds = await query('SELECT id, codigo FROM activos_empresa ORDER BY codigo');
      const idMap = {};
      activoIds.rows.forEach(r => { idMap[r.codigo] = r.id; });
      const ordenes = [
        ['MT-00001', idMap['VH-001'], 'CORRECTIVO', 'Falla en sistema de frenos delanteros. Requiere cambio de pastillas y revisión de discos. Vehículo fuera de servicio hasta la reparación.', 'Miguel Ángel Torres', '2025-07-05', 850.00, 'EN_PROCESO'],
        ['MT-00002', idMap['EQ-001'], 'PREVENTIVO', 'Mantenimiento preventivo mensual montacargas: cambio de aceite hidráulico, revisión de batería, calibración de horquillas y lubricación general.', 'Servicio Técnico Toyota', '2025-07-15', null, 'PENDIENTE'],
        ['MT-00003', idMap['EQ-002'], 'PREVENTIVO', 'Limpieza de filtros, actualización de firmware, revisión de temperatura de operación y backup de configuraciones del servidor Dell PowerEdge.', 'Gerardo Espinoza', '2025-07-20', null, 'PENDIENTE'],
        ['MT-00004', idMap['EQ-003'], 'CORRECTIVO', 'Pérdida de presión en compresor industrial. Revisión de válvulas y sellos, prueba de presión máxima y ajuste de regulador. Completado.', 'Mecánico Industrial SAC', '2025-06-10', 1200.00, 'COMPLETADO'],
      ];
      for (const [folio, activo_id, tipo, descripcion, tecnico, fecha_programada, costo, estado] of ordenes) {
        if (activo_id) {
          await query(
            `INSERT INTO ordenes_mantenimiento (folio, activo_id, tipo, descripcion, tecnico, fecha_programada, costo, estado)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [folio, activo_id, tipo, descripcion, tecnico, fecha_programada, costo, estado]
          );
        }
      }
    }

    // -- MOVIMIENTOS ALMACÉN --
    const movCount = await query('SELECT COUNT(*) FROM movimientos_almacen');
    if (parseInt(movCount.rows[0].count) === 0) {
      const prodIds = await query('SELECT id, sku FROM productos ORDER BY sku LIMIT 5');
      if (prodIds.rows.length > 0) {
        const p = prodIds.rows;
        const movs = [
          ['MV-00001', 'ENTRADA', p[0]?.id, p[0]?.sku, 150, 'PRINCIPAL', null, 'Recepción OC-00003 — proveedor confirmado', 'OC-00003'],
          ['MV-00002', 'SALIDA', p[1]?.id, p[1]?.sku, 30, null, 'PRINCIPAL', 'Despacho pedido VT-00002 — cliente Ferrex SAC', 'VT-00002'],
          ['MV-00003', 'TRASLADO', p[0]?.id, p[0]?.sku, 50, 'PRINCIPAL', 'SECUNDARIO', 'Reposición punto de venta secundario julio 2025', null],
          ['MV-00004', 'ENTRADA', p[2]?.id, p[2]?.sku, 80, 'PRINCIPAL', null, 'Recepción OC-00004 — llegó con 5 unidades faltantes anotado', 'OC-00004'],
          ['MV-00005', 'AJUSTE', p[3]?.id, p[3]?.sku, 5, 'PRINCIPAL', null, 'Ajuste por inventario físico mensual — diferencia contada', null],
        ];
        for (const [folio, tipo, producto_id, producto_nombre, cantidad, almacen_origen, almacen_destino, motivo, referencia] of movs) {
          if (producto_id) {
            await query(
              `INSERT INTO movimientos_almacen (folio, tipo, producto_id, producto_nombre, cantidad, almacen_origen, almacen_destino, motivo, referencia)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
              [folio, tipo, producto_id, producto_nombre, cantidad, almacen_origen, almacen_destino, motivo, referencia]
            );
          }
        }
      }
    }

    console.log('✅ Seed completado exitosamente');
    console.log('📧 Login: admin@nexo.pe / Admin1234!');
  } catch (err) {
    console.error('❌ Error en seed:', err);
  } finally {
    if (require.main === module) {
      await pool.end();
    }
  }
};

// Run directly or as module
if (require.main === module) {
  seed();
} else {
  module.exports = seed;
}
