const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en pool de PostgreSQL:', err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

/* ─────────── Schema creation ─────────── */
const initDB = async () => {
  console.log('🔧 Inicializando base de datos...');

  await query(`
    /* ── ENUMS ── */
    DO $$ BEGIN
      CREATE TYPE rol_enum AS ENUM('SUPER_ADMIN','ADMIN_AREA','SUPERVISOR','OPERARIO','AUDITOR');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE area_enum AS ENUM('ADMINISTRACION','TECNOLOGIA','COMERCIAL','LOGISTICA','PRODUCCION');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE venta_estado AS ENUM('PENDIENTE','EN_PROCESO','FACTURADO','ENTREGADO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE almacen_enum AS ENUM('PRINCIPAL','SECUNDARIO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE oc_estado AS ENUM('BORRADOR','ENVIADA','RECIBIDA','CANCELADA');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE tx_tipo AS ENUM('INGRESO','EGRESO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_tipo AS ENUM('SOPORTE','POSTVENTA','DESARROLLO','INFRAESTRUCTURA');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_estado AS ENUM('ABIERTO','EN_PROCESO','RESUELTO','CERRADO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_prioridad AS ENUM('BAJA','MEDIA','ALTA','CRITICA');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE of_estado AS ENUM('PLANIFICADA','EN_PROCESO','CONTROL_CALIDAD','COMPLETADA','CANCELADA');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE inspeccion_resultado AS ENUM('APROBADO','RECHAZADO','PENDIENTE');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE dist_estado AS ENUM('PENDIENTE','EN_TRANSITO','ENTREGADO','CANCELADO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE cuenta_tipo AS ENUM('ACTIVO','PASIVO','PATRIMONIO','INGRESO','GASTO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE asiento_estado AS ENUM('BORRADOR','REGISTRADO','ANULADO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE pago_tipo AS ENUM('PAGO','COBRO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE pago_estado AS ENUM('PENDIENTE','COMPLETADO','VENCIDO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE cuenta_bancaria_tipo AS ENUM('CORRIENTE','AHORROS');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE moneda_enum AS ENUM('PEN','USD','EUR');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE tipo_contrato AS ENUM('LABORAL','PROVEEDOR','CLIENTE','ARRENDAMIENTO','SERVICIOS','OTROS');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE contrato_estado AS ENUM('BORRADOR','VIGENTE','POR_VENCER','VENCIDO','CANCELADO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE campana_tipo AS ENUM('EMAIL','SOCIAL_MEDIA','FLYER','EVENTO','DIGITAL');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE campana_estado AS ENUM('BORRADOR','ACTIVA','PAUSADA','FINALIZADA');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE pedido_canal_enum AS ENUM('WEB','APP','WHATSAPP','MARKETPLACE');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE pedido_online_estado AS ENUM('NUEVO','CONFIRMADO','PREPARANDO','DESPACHADO','ENTREGADO','CANCELADO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE activo_estado AS ENUM('OPERATIVO','EN_MANTENIMIENTO','DADO_DE_BAJA');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE mant_tipo AS ENUM('PREVENTIVO','CORRECTIVO','EMERGENCIA');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE mant_estado AS ENUM('PENDIENTE','EN_PROCESO','COMPLETADO','CANCELADO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE movimiento_tipo AS ENUM('ENTRADA','SALIDA','AJUSTE','TRASLADO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await query(`
    /* ── USERS ── */
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      rol rol_enum NOT NULL DEFAULT 'OPERARIO',
      area area_enum,
      activo BOOLEAN DEFAULT TRUE,
      ultimo_acceso TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    DO $$ BEGIN
      ALTER TABLE usuarios ADD COLUMN avatar_url TEXT;
    EXCEPTION WHEN duplicate_column THEN
      NULL;
    END $$;

    /* ── ACTIVITY LOG ── */
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      usuario_id INT REFERENCES usuarios(id),
      accion VARCHAR(50) NOT NULL,
      modulo VARCHAR(50),
      descripcion TEXT,
      ip VARCHAR(45),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── COMERCIAL ── */
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(200) NOT NULL,
      tipo VARCHAR(50) DEFAULT 'EMPRESA',
      ruc VARCHAR(20),
      telefono VARCHAR(30),
      email VARCHAR(180),
      direccion TEXT,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      cliente_id INT REFERENCES clientes(id),
      vendedor_id INT REFERENCES usuarios(id),
      total NUMERIC(12,2) DEFAULT 0,
      estado venta_estado DEFAULT 'PENDIENTE',
      fecha_venta DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS venta_items (
      id SERIAL PRIMARY KEY,
      venta_id INT REFERENCES ventas(id) ON DELETE CASCADE,
      producto VARCHAR(200) NOT NULL,
      cantidad INT NOT NULL DEFAULT 1,
      precio_unitario NUMERIC(10,2) NOT NULL,
      subtotal NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── LOGISTICA ── */
    CREATE TABLE IF NOT EXISTS productos (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(200) NOT NULL,
      descripcion TEXT,
      stock_actual INT DEFAULT 0,
      stock_minimo INT DEFAULT 5,
      almacen almacen_enum DEFAULT 'PRINCIPAL',
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ordenes_compra (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      proveedor VARCHAR(200),
      total NUMERIC(12,2) DEFAULT 0,
      estado oc_estado DEFAULT 'BORRADOR',
      fecha DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS distribuciones (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      destino VARCHAR(200),
      transportista VARCHAR(200),
      estado dist_estado DEFAULT 'PENDIENTE',
      fecha_salida DATE,
      fecha_llegada DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── ADMINISTRACION ── */
    CREATE TABLE IF NOT EXISTS transacciones (
      id SERIAL PRIMARY KEY,
      tipo tx_tipo NOT NULL,
      monto NUMERIC(12,2) NOT NULL,
      descripcion TEXT,
      area area_enum,
      fecha DATE DEFAULT CURRENT_DATE,
      referencia VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS empleados (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      dni VARCHAR(15),
      cargo VARCHAR(100),
      area area_enum,
      salario NUMERIC(10,2),
      fecha_ingreso DATE DEFAULT CURRENT_DATE,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── TECNOLOGIA ── */
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      titulo VARCHAR(200) NOT NULL,
      descripcion TEXT,
      tipo ticket_tipo DEFAULT 'SOPORTE',
      asignado_a INT REFERENCES usuarios(id),
      estado ticket_estado DEFAULT 'ABIERTO',
      prioridad ticket_prioridad DEFAULT 'MEDIA',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── PRODUCCION ── */
    CREATE TABLE IF NOT EXISTS ordenes_fabricacion (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      producto VARCHAR(200) NOT NULL,
      cantidad INT NOT NULL DEFAULT 1,
      estado of_estado DEFAULT 'PLANIFICADA',
      responsable_id INT REFERENCES usuarios(id),
      fecha_inicio DATE,
      fecha_fin DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inspecciones_calidad (
      id SERIAL PRIMARY KEY,
      orden_fabricacion_id INT REFERENCES ordenes_fabricacion(id),
      resultado inspeccion_resultado DEFAULT 'PENDIENTE',
      observaciones TEXT,
      inspector_id INT REFERENCES usuarios(id),
      fecha DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── CONTABILIDAD ── */
    CREATE TABLE IF NOT EXISTS plan_cuentas (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(10) UNIQUE NOT NULL,
      nombre VARCHAR(200) NOT NULL,
      tipo cuenta_tipo NOT NULL,
      nivel INT NOT NULL DEFAULT 1,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS asientos_contables (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      fecha DATE DEFAULT CURRENT_DATE,
      descripcion TEXT NOT NULL,
      referencia VARCHAR(100),
      estado asiento_estado DEFAULT 'BORRADOR',
      total_debe NUMERIC(12,2) DEFAULT 0,
      total_haber NUMERIC(12,2) DEFAULT 0,
      creado_por INT REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS asiento_lineas (
      id SERIAL PRIMARY KEY,
      asiento_id INT REFERENCES asientos_contables(id) ON DELETE CASCADE,
      cuenta_id INT REFERENCES plan_cuentas(id),
      descripcion TEXT,
      debe NUMERIC(12,2) DEFAULT 0,
      haber NUMERIC(12,2) DEFAULT 0
    );

    /* ── TESORERÍA ── */
    CREATE TABLE IF NOT EXISTS cuentas_bancarias (
      id SERIAL PRIMARY KEY,
      banco VARCHAR(100) NOT NULL,
      numero_cuenta VARCHAR(50) NOT NULL,
      tipo cuenta_bancaria_tipo NOT NULL DEFAULT 'CORRIENTE',
      moneda moneda_enum NOT NULL DEFAULT 'PEN',
      saldo_actual NUMERIC(14,2) DEFAULT 0,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pagos_programados (
      id SERIAL PRIMARY KEY,
      descripcion TEXT NOT NULL,
      monto NUMERIC(12,2) NOT NULL,
      tipo pago_tipo NOT NULL,
      fecha_vencimiento DATE NOT NULL,
      estado pago_estado DEFAULT 'PENDIENTE',
      cuenta_bancaria_id INT REFERENCES cuentas_bancarias(id),
      referencia VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── LEGALES ── */
    CREATE TABLE IF NOT EXISTS contratos (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      titulo VARCHAR(200) NOT NULL,
      tipo tipo_contrato NOT NULL DEFAULT 'OTROS',
      contraparte VARCHAR(200),
      descripcion TEXT,
      fecha_inicio DATE DEFAULT CURRENT_DATE,
      fecha_vencimiento DATE,
      monto NUMERIC(12,2),
      moneda moneda_enum DEFAULT 'PEN',
      estado contrato_estado DEFAULT 'BORRADOR',
      creado_por INT REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── MARKETING ── */
    CREATE TABLE IF NOT EXISTS campanas_marketing (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      nombre VARCHAR(200) NOT NULL,
      tipo campana_tipo NOT NULL DEFAULT 'DIGITAL',
      descripcion TEXT,
      presupuesto NUMERIC(12,2) DEFAULT 0,
      gasto_actual NUMERIC(12,2) DEFAULT 0,
      fecha_inicio DATE DEFAULT CURRENT_DATE,
      fecha_fin DATE,
      estado campana_estado DEFAULT 'BORRADOR',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pedidos_online (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      cliente_nombre VARCHAR(200) NOT NULL,
      email VARCHAR(180),
      telefono VARCHAR(30),
      canal pedido_canal_enum NOT NULL DEFAULT 'WEB',
      total NUMERIC(12,2) DEFAULT 0,
      descripcion TEXT,
      estado pedido_online_estado DEFAULT 'NUEVO',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* ── MANTENIMIENTO / ACTIVOS ── */
    CREATE TABLE IF NOT EXISTS activos_empresa (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(30) UNIQUE NOT NULL,
      nombre VARCHAR(200) NOT NULL,
      tipo VARCHAR(100),
      numero_serie VARCHAR(100),
      ubicacion VARCHAR(200),
      valor_adquisicion NUMERIC(12,2),
      estado activo_estado DEFAULT 'OPERATIVO',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ordenes_mantenimiento (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      activo_id INT REFERENCES activos_empresa(id),
      tipo mant_tipo NOT NULL DEFAULT 'PREVENTIVO',
      descripcion TEXT NOT NULL,
      tecnico VARCHAR(200),
      fecha_programada DATE,
      fecha_fin DATE,
      costo NUMERIC(10,2),
      estado mant_estado DEFAULT 'PENDIENTE',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS movimientos_almacen (
      id SERIAL PRIMARY KEY,
      folio VARCHAR(20) UNIQUE NOT NULL,
      tipo movimiento_tipo NOT NULL,
      producto_id INT REFERENCES productos(id),
      producto_nombre VARCHAR(200),
      cantidad INT NOT NULL DEFAULT 1,
      almacen_origen almacen_enum,
      almacen_destino almacen_enum,
      motivo TEXT,
      referencia VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('✅ Base de datos inicializada correctamente');
};

module.exports = { pool, query, initDB };
