const express = require('express');
const { query } = require('../db');
const { writeGuard } = require('../middleware/auth');
const router = express.Router();

/* ── VENTAS ── */
router.get('/ventas', async (req, res) => {
  try {
    const { estado, vendedor, page = 1, search } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (estado) { where.push(`v.estado = $${idx++}`); params.push(estado); }
    if (vendedor) { where.push(`v.vendedor_id = $${idx++}`); params.push(vendedor); }
    if (search) { where.push(`(c.nombre ILIKE $${idx++} OR v.folio ILIKE $${idx - 1})`); params.push(`%${search}%`); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countRes = await query(`
      SELECT COUNT(*) FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id ${whereClause}
    `, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await query(`
      SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.vendedor_id = u.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `, params);

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo ventas' });
  }
});

router.post('/ventas', writeGuard, async (req, res) => {
  try {
    const { cliente_id, items } = req.body;
    if (!cliente_id || !items || !items.length) {
      return res.status(400).json({ error: 'Cliente e items son requeridos' });
    }

    const countRes = await query('SELECT COUNT(*) FROM ventas');
    const folio = `VT-${String(parseInt(countRes.rows[0].count) + 1).padStart(5, '0')}`;
    const total = items.reduce((sum, it) => sum + (it.cantidad * it.precio_unitario), 0);

    const venta = await query(
      `INSERT INTO ventas (folio, cliente_id, vendedor_id, total, estado)
       VALUES ($1,$2,$3,$4,'PENDIENTE') RETURNING *`,
      [folio, cliente_id, req.user.id, total]
    );

    for (const item of items) {
      const sub = item.cantidad * item.precio_unitario;
      await query(
        `INSERT INTO venta_items (venta_id, producto, cantidad, precio_unitario, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [venta.rows[0].id, item.producto, item.cantidad, item.precio_unitario, sub]
      );
    }

    res.status(201).json(venta.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando venta' });
  }
});

router.get('/ventas/:id', async (req, res) => {
  try {
    const venta = await query(`
      SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.vendedor_id = u.id
      WHERE v.id = $1
    `, [req.params.id]);
    if (!venta.rows[0]) return res.status(404).json({ error: 'Venta no encontrada' });

    const items = await query('SELECT * FROM venta_items WHERE venta_id = $1', [req.params.id]);
    res.json({ ...venta.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo venta' });
  }
});

router.put('/ventas/:id', writeGuard, async (req, res) => {
  try {
    const { estado } = req.body;
    const result = await query(
      `UPDATE ventas SET estado=COALESCE($1,estado), updated_at=NOW() WHERE id=$2 RETURNING *`,
      [estado, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando venta' });
  }
});

router.delete('/ventas/:id', writeGuard, async (req, res) => {
  try {
    const result = await query('DELETE FROM ventas WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json({ message: 'Venta eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando venta' });
  }
});

/* ── CLIENTES ── */
router.get('/clientes', async (req, res) => {
  try {
    const { search, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = '';
    let params = [];

    if (search) {
      where = `WHERE nombre ILIKE $1 OR ruc ILIKE $1`;
      params.push(`%${search}%`);
    }

    const countRes = await query(`SELECT COUNT(*) FROM clientes ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const idx = params.length + 1;
    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM clientes ${where} ORDER BY nombre LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo clientes' });
  }
});

router.post('/clientes', writeGuard, async (req, res) => {
  try {
    const { nombre, tipo, ruc, telefono, email, direccion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });

    const result = await query(
      `INSERT INTO clientes (nombre, tipo, ruc, telefono, email, direccion)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, tipo || 'EMPRESA', ruc || null, telefono || null, email || null, direccion || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando cliente' });
  }
});

module.exports = router;
