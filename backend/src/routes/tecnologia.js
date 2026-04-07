const express = require('express');
const { query } = require('../db');
const { writeGuard } = require('../middleware/auth');
const router = express.Router();

/* ── TICKETS ── */
router.get('/tickets', async (req, res) => {
  try {
    const { estado, prioridad, tipo, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (estado) { where.push(`t.estado = $${idx++}`); params.push(estado); }
    if (prioridad) { where.push(`t.prioridad = $${idx++}`); params.push(prioridad); }
    if (tipo) { where.push(`t.tipo = $${idx++}`); params.push(tipo); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countRes = await query(`SELECT COUNT(*) FROM tickets t ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await query(`
      SELECT t.*, u.nombre as asignado_nombre
      FROM tickets t
      LEFT JOIN usuarios u ON t.asignado_a = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `, params);

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo tickets' });
  }
});

router.post('/tickets', writeGuard, async (req, res) => {
  try {
    const { titulo, descripcion, tipo, asignado_a, prioridad } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título es requerido' });

    const countRes = await query('SELECT COUNT(*) FROM tickets');
    const folio = `TK-${String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO tickets (folio, titulo, descripcion, tipo, asignado_a, prioridad)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [folio, titulo, descripcion || null, tipo || 'SOPORTE', asignado_a || null, prioridad || 'MEDIA']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando ticket' });
  }
});

router.get('/tickets/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT t.*, u.nombre as asignado_nombre
      FROM tickets t LEFT JOIN usuarios u ON t.asignado_a = u.id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo ticket' });
  }
});

router.put('/tickets/:id', writeGuard, async (req, res) => {
  try {
    const { titulo, descripcion, tipo, asignado_a, estado, prioridad } = req.body;
    const result = await query(
      `UPDATE tickets SET titulo=COALESCE($1,titulo), descripcion=COALESCE($2,descripcion),
       tipo=COALESCE($3,tipo), asignado_a=COALESCE($4::int,asignado_a), estado=COALESCE($5,estado),
       prioridad=COALESCE($6,prioridad), updated_at=NOW() WHERE id=$7 RETURNING *`,
      [titulo || null, descripcion || null, tipo || null, asignado_a || null, estado || null, prioridad || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando ticket' });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const { tipo } = req.query;
    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'ABIERTO') as abiertos,
        COUNT(*) FILTER (WHERE estado = 'EN_PROCESO') as en_proceso,
        COUNT(*) FILTER (WHERE estado IN ('RESUELTO','CERRADO')) as resueltos,
        COUNT(*) FILTER (WHERE prioridad = 'CRITICA' AND estado IN ('ABIERTO','EN_PROCESO')) as criticos
      FROM tickets
      WHERE ($1::text IS NULL OR tipo = $1::ticket_tipo)
    `, [tipo || null]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

module.exports = router;
