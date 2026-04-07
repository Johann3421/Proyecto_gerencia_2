const express = require('express');
const { query } = require('../db');
const { writeGuard } = require('../middleware/auth');
const router = express.Router();

/* ── TRANSACCIONES ── */
router.get('/transacciones', async (req, res) => {
  try {
    const { tipo, mes, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (tipo) { where.push(`tipo = $${idx++}`); params.push(tipo); }
    if (mes) { where.push(`TO_CHAR(fecha, 'YYYY-MM') = $${idx++}`); params.push(mes); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countRes = await query(`SELECT COUNT(*) FROM transacciones ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM transacciones ${whereClause} ORDER BY fecha DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo transacciones' });
  }
});

router.post('/transacciones', writeGuard, async (req, res) => {
  try {
    const { tipo, monto, descripcion, area, fecha, referencia } = req.body;
    if (!tipo || !monto) return res.status(400).json({ error: 'Tipo y monto son requeridos' });

    const result = await query(
      `INSERT INTO transacciones (tipo, monto, descripcion, area, fecha, referencia)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [tipo, monto, descripcion || null, area || null, fecha || new Date(), referencia || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando transacción' });
  }
});

/* ── EMPLEADOS ── */
router.get('/empleados', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    const countRes = await query('SELECT COUNT(*) FROM empleados');
    const total = parseInt(countRes.rows[0].count);
    const result = await query('SELECT * FROM empleados ORDER BY nombre LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo empleados' });
  }
});

router.post('/empleados', writeGuard, async (req, res) => {
  try {
    const { nombre, dni, cargo, area, salario, fecha_ingreso } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });

    const result = await query(
      `INSERT INTO empleados (nombre, dni, cargo, area, salario, fecha_ingreso)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, dni || null, cargo || null, area || null, salario || null, fecha_ingreso || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando empleado' });
  }
});

router.put('/empleados/:id', writeGuard, async (req, res) => {
  try {
    const { nombre, dni, cargo, area, salario, activo } = req.body;
    const result = await query(
      `UPDATE empleados SET nombre=COALESCE($1,nombre), dni=COALESCE($2,dni),
       cargo=COALESCE($3,cargo), area=COALESCE($4,area), salario=COALESCE($5,salario),
       activo=COALESCE($6,activo), updated_at=NOW() WHERE id=$7 RETURNING *`,
      [nombre, dni, cargo, area, salario, activo, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando empleado' });
  }
});

/* ── TESORERIA metrics ── */
router.get('/tesoreria', async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const result = await query(`
      SELECT tipo, COALESCE(SUM(monto),0) as total
      FROM transacciones WHERE fecha BETWEEN $1 AND $2
      GROUP BY tipo
    `, [firstDay, lastDay]);

    let ingresos = 0, egresos = 0;
    result.rows.forEach(r => {
      if (r.tipo === 'INGRESO') ingresos = parseFloat(r.total);
      if (r.tipo === 'EGRESO') egresos = parseFloat(r.total);
    });

    res.json({ ingresos, egresos, saldo: ingresos - egresos });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo tesorería' });
  }
});

module.exports = router;
