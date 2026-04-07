const express = require('express');
const { query } = require('../db');
const { writeGuard } = require('../middleware/auth');
const router = express.Router();

/* ── ORDENES FABRICACIÓN ── */
router.get('/ordenes', async (req, res) => {
  try {
    const { page = 1, estado } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = '';
    let params = [];

    if (estado) { where = 'WHERE of2.estado = $1'; params.push(estado); }

    const countRes = await query(`SELECT COUNT(*) FROM ordenes_fabricacion of2 ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    const idx = params.length + 1;
    params.push(limit, offset);

    const result = await query(`
      SELECT of2.*, u.nombre as responsable_nombre
      FROM ordenes_fabricacion of2
      LEFT JOIN usuarios u ON of2.responsable_id = u.id
      ${where}
      ORDER BY of2.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo órdenes de fabricación' });
  }
});

router.post('/ordenes', writeGuard, async (req, res) => {
  try {
    const { producto, cantidad, responsable_id, fecha_inicio, fecha_fin } = req.body;
    if (!producto || !cantidad) return res.status(400).json({ error: 'Producto y cantidad son requeridos' });

    const countRes = await query('SELECT COUNT(*) FROM ordenes_fabricacion');
    const folio = `OF-${String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO ordenes_fabricacion (folio, producto, cantidad, responsable_id, fecha_inicio, fecha_fin)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [folio, producto, cantidad, responsable_id || null, fecha_inicio || null, fecha_fin || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando orden de fabricación' });
  }
});

router.put('/ordenes/:id/estado', writeGuard, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ error: 'Estado es requerido' });

    const result = await query(
      `UPDATE ordenes_fabricacion SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [estado, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando estado' });
  }
});

/* ── INSPECCIONES ── */
router.get('/inspecciones', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    const countRes = await query('SELECT COUNT(*) FROM inspecciones_calidad');
    const total = parseInt(countRes.rows[0].count);

    const result = await query(`
      SELECT ic.*, of2.folio as orden_folio, of2.producto,
             u.nombre as inspector_nombre
      FROM inspecciones_calidad ic
      LEFT JOIN ordenes_fabricacion of2 ON ic.orden_fabricacion_id = of2.id
      LEFT JOIN usuarios u ON ic.inspector_id = u.id
      ORDER BY ic.fecha DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo inspecciones' });
  }
});

router.post('/inspecciones', writeGuard, async (req, res) => {
  try {
    const { orden_fabricacion_id, resultado, observaciones } = req.body;
    if (!orden_fabricacion_id) return res.status(400).json({ error: 'Orden de fabricación requerida' });

    const result = await query(
      `INSERT INTO inspecciones_calidad (orden_fabricacion_id, resultado, observaciones, inspector_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [orden_fabricacion_id, resultado || 'PENDIENTE', observaciones || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando inspección' });
  }
});

module.exports = router;
