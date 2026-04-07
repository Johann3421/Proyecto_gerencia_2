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

module.exports = router;
