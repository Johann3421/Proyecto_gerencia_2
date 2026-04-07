const express = require('express');
const { query } = require('../db');
const { writeGuard } = require('../middleware/auth');
const router = express.Router();

/* ── PRODUCTOS ── */
router.get('/productos', async (req, res) => {
  try {
    const { page = 1, search, almacen } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (search) { where.push(`(nombre ILIKE $${idx} OR sku ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (almacen) { where.push(`almacen = $${idx++}`); params.push(almacen); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countRes = await query(`SELECT COUNT(*) FROM productos ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM productos ${whereClause} ORDER BY nombre LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

router.post('/productos', writeGuard, async (req, res) => {
  try {
    const { sku, nombre, descripcion, stock_actual, stock_minimo, almacen } = req.body;
    if (!sku || !nombre) return res.status(400).json({ error: 'SKU y nombre son requeridos' });

    const result = await query(
      `INSERT INTO productos (sku, nombre, descripcion, stock_actual, stock_minimo, almacen)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [sku, nombre, descripcion || null, stock_actual || 0, stock_minimo || 5, almacen || 'PRINCIPAL']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU ya existe' });
    res.status(500).json({ error: 'Error creando producto' });
  }
});

router.put('/productos/:id/stock', writeGuard, async (req, res) => {
  try {
    const { stock_actual } = req.body;
    if (stock_actual === undefined) return res.status(400).json({ error: 'stock_actual es requerido' });

    const result = await query(
      `UPDATE productos SET stock_actual=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [stock_actual, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando stock' });
  }
});

/* ── ORDENES DE COMPRA ── */
router.get('/ordenes-compra', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    const countRes = await query('SELECT COUNT(*) FROM ordenes_compra');
    const total = parseInt(countRes.rows[0].count);
    const result = await query('SELECT * FROM ordenes_compra ORDER BY fecha DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo órdenes de compra' });
  }
});

router.post('/ordenes-compra', writeGuard, async (req, res) => {
  try {
    const { proveedor, total, estado } = req.body;
    const countRes = await query('SELECT COUNT(*) FROM ordenes_compra');
    const folio = `OC-${String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO ordenes_compra (folio, proveedor, total, estado)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [folio, proveedor || null, total || 0, estado || 'BORRADOR']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando orden de compra' });
  }
});

/* ── DISTRIBUCIONES ── */
router.get('/distribuciones', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    const countRes = await query('SELECT COUNT(*) FROM distribuciones');
    const total = parseInt(countRes.rows[0].count);
    const result = await query('SELECT * FROM distribuciones ORDER BY fecha_salida DESC NULLS LAST LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo distribuciones' });
  }
});

router.post('/distribuciones', writeGuard, async (req, res) => {
  try {
    const { destino, transportista, fecha_salida } = req.body;
    const countRes = await query('SELECT COUNT(*) FROM distribuciones');
    const folio = `DT-${String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO distribuciones (folio, destino, transportista, fecha_salida)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [folio, destino || null, transportista || null, fecha_salida || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando distribución' });
  }
});

/* ── METRICS ── */
router.get('/metrics', async (req, res) => {
  try {
    const [skus, critico, entregasHoy, ocsActivas] = await Promise.all([
      query('SELECT COUNT(*) FROM productos WHERE activo = true'),
      query('SELECT COUNT(*) FROM productos WHERE stock_actual < stock_minimo AND activo = true'),
      query(`SELECT COUNT(*) FROM distribuciones WHERE fecha_salida = CURRENT_DATE`),
      query(`SELECT COUNT(*) FROM ordenes_compra WHERE estado IN ('BORRADOR','ENVIADA')`),
    ]);

    res.json({
      skus: parseInt(skus.rows[0].count),
      stock_critico: parseInt(critico.rows[0].count),
      entregas_hoy: parseInt(entregasHoy.rows[0].count),
      ordenes_compra: parseInt(ocsActivas.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo métricas logística' });
  }
});

/* ── ACTIVOS EMPRESA ── */
router.get('/activos', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    const [countRes, statsRes] = await Promise.all([
      query('SELECT COUNT(*) FROM activos_empresa'),
      query(`SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado='OPERATIVO') as operativos,
        COUNT(*) FILTER (WHERE estado='EN_MANTENIMIENTO') as en_mantenimiento
        FROM activos_empresa`),
    ]);
    const total = parseInt(countRes.rows[0].count);
    const result = await query(
      'SELECT * FROM activos_empresa ORDER BY codigo LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit), stats: statsRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo activos' });
  }
});

router.post('/activos', writeGuard, async (req, res) => {
  try {
    const { codigo, nombre, tipo, numero_serie, ubicacion, valor_adquisicion } = req.body;
    if (!codigo || !nombre) return res.status(400).json({ error: 'Código y nombre son requeridos' });
    const result = await query(
      `INSERT INTO activos_empresa (codigo, nombre, tipo, numero_serie, ubicacion, valor_adquisicion)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [codigo, nombre, tipo || null, numero_serie || null, ubicacion || null,
       valor_adquisicion ? parseFloat(valor_adquisicion) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código de activo ya existe' });
    res.status(500).json({ error: 'Error creando activo' });
  }
});

/* ── MANTENIMIENTO ── */
router.get('/mantenimiento', async (req, res) => {
  try {
    const { tipo, estado, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;
    if (tipo) { where.push(`om.tipo = $${idx++}`); params.push(tipo); }
    if (estado) { where.push(`om.estado = $${idx++}`); params.push(estado); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [countRes, statsRes] = await Promise.all([
      query(`SELECT COUNT(*) FROM ordenes_mantenimiento om ${whereClause}`, params),
      query(`SELECT COUNT(*) FILTER (WHERE estado='PENDIENTE') as pendientes FROM ordenes_mantenimiento`),
    ]);
    const total = parseInt(countRes.rows[0].count);
    params.push(limit, offset);
    const result = await query(
      `SELECT om.*, ae.nombre as activo_nombre, ae.codigo as activo_codigo
       FROM ordenes_mantenimiento om
       LEFT JOIN activos_empresa ae ON ae.id = om.activo_id
       ${whereClause}
       ORDER BY om.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit), stats: statsRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo órdenes de mantenimiento' });
  }
});

router.post('/mantenimiento', writeGuard, async (req, res) => {
  try {
    const { activo_id, tipo, descripcion, tecnico, fecha_programada } = req.body;
    if (!descripcion) return res.status(400).json({ error: 'Descripción es requerida' });
    const countRes = await query('SELECT COUNT(*) FROM ordenes_mantenimiento');
    const folio = `MT-${String(parseInt(countRes.rows[0].count) + 1).padStart(5, '0')}`;
    const result = await query(
      `INSERT INTO ordenes_mantenimiento (folio, activo_id, tipo, descripcion, tecnico, fecha_programada)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [folio, activo_id || null, tipo || 'PREVENTIVO', descripcion,
       tecnico || null, fecha_programada || null]
    );
    // Mark activo as EN_MANTENIMIENTO
    if (activo_id) {
      await query(`UPDATE activos_empresa SET estado='EN_MANTENIMIENTO', updated_at=NOW() WHERE id=$1`, [activo_id]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando orden de mantenimiento' });
  }
});

router.put('/mantenimiento/:id/estado', writeGuard, async (req, res) => {
  try {
    const { estado } = req.body;
    const result = await query(
      `UPDATE ordenes_mantenimiento SET estado=$1, updated_at=NOW(),
       fecha_fin = CASE WHEN $1 IN ('COMPLETADO','CANCELADO') THEN NOW() ELSE fecha_fin END
       WHERE id=$2 RETURNING *`,
      [estado, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Orden no encontrada' });
    // If completed, mark activo back to OPERATIVO
    if (estado === 'COMPLETADO' && result.rows[0].activo_id) {
      await query(`UPDATE activos_empresa SET estado='OPERATIVO', updated_at=NOW() WHERE id=$1`, [result.rows[0].activo_id]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando orden' });
  }
});

/* ── MOVIMIENTOS DE ALMACÉN ── */
router.get('/movimientos-almacen', async (req, res) => {
  try {
    const { tipo, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;
    if (tipo) { where.push(`tipo = $${idx++}`); params.push(tipo); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [countRes, statsRes] = await Promise.all([
      query(`SELECT COUNT(*) FROM movimientos_almacen ${whereClause}`, params),
      query(`SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as hoy,
        COUNT(*) FILTER (WHERE tipo='ENTRADA' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) as entradas_mes,
        COUNT(*) FILTER (WHERE tipo='SALIDA' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) as salidas_mes
        FROM movimientos_almacen`),
    ]);
    const total = parseInt(countRes.rows[0].count);
    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM movimientos_almacen ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit), stats: statsRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo movimientos' });
  }
});

router.post('/movimientos-almacen', writeGuard, async (req, res) => {
  try {
    const { tipo, producto_id, cantidad, almacen_origen, almacen_destino, motivo, referencia } = req.body;
    if (!tipo || !cantidad) return res.status(400).json({ error: 'Tipo y cantidad son requeridos' });

    // Fetch product name
    let producto_nombre = null;
    if (producto_id) {
      const p = await query('SELECT nombre FROM productos WHERE id=$1', [producto_id]);
      producto_nombre = p.rows[0]?.nombre || null;
    }

    const countRes = await query('SELECT COUNT(*) FROM movimientos_almacen');
    const folio = `MV-${String(parseInt(countRes.rows[0].count) + 1).padStart(5, '0')}`;

    const result = await query(
      `INSERT INTO movimientos_almacen (folio, tipo, producto_id, producto_nombre, cantidad, almacen_origen, almacen_destino, motivo, referencia)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [folio, tipo, producto_id || null, producto_nombre, parseInt(cantidad),
       almacen_origen || null, almacen_destino || null, motivo || null, referencia || null]
    );

    // Update product stock
    if (producto_id) {
      if (tipo === 'ENTRADA') {
        await query(`UPDATE productos SET stock_actual = stock_actual + $1, updated_at=NOW() WHERE id=$2`, [parseInt(cantidad), producto_id]);
      } else if (tipo === 'SALIDA') {
        await query(`UPDATE productos SET stock_actual = GREATEST(0, stock_actual - $1), updated_at=NOW() WHERE id=$2`, [parseInt(cantidad), producto_id]);
      }
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error registrando movimiento' });
  }
});

module.exports = router;
