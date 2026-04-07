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

    // Saldo bancario total (PEN only for simplicity)
    const bancosRes = await query(`SELECT COALESCE(SUM(saldo_actual),0) as total FROM cuentas_bancarias WHERE activo=TRUE AND moneda='PEN'`);
    const saldoBancario = parseFloat(bancosRes.rows[0].total);

    // Pagos vencidos
    const vencidosRes = await query(`SELECT COUNT(*) FROM pagos_programados WHERE estado='VENCIDO'`);
    const pagosVencidos = parseInt(vencidosRes.rows[0].count);

    res.json({ ingresos, egresos, saldo: ingresos - egresos, saldo_bancario: saldoBancario, pagos_vencidos: pagosVencidos });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo tesorería' });
  }
});

/* ── PLAN DE CUENTAS ── */
router.get('/plan-cuentas', async (req, res) => {
  try {
    const result = await query('SELECT * FROM plan_cuentas WHERE activo=TRUE ORDER BY codigo');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo plan de cuentas' });
  }
});

router.post('/plan-cuentas', writeGuard, async (req, res) => {
  try {
    const { codigo, nombre, tipo, nivel } = req.body;
    if (!codigo || !nombre || !tipo) return res.status(400).json({ error: 'Código, nombre y tipo son requeridos' });
    const result = await query(
      `INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel) VALUES ($1,$2,$3,$4) RETURNING *`,
      [codigo, nombre, tipo, parseInt(nivel) || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El código de cuenta ya existe' });
    res.status(500).json({ error: 'Error creando cuenta contable' });
  }
});

/* ── ASIENTOS CONTABLES ── */
router.get('/asientos', async (req, res) => {
  try {
    const { mes, estado, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (mes) { where.push(`TO_CHAR(fecha, 'YYYY-MM') = $${idx++}`); params.push(mes); }
    if (estado) { where.push(`estado = $${idx++}`); params.push(estado); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countRes = await query(`SELECT COUNT(*) FROM asientos_contables ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM asientos_contables ${whereClause} ORDER BY fecha DESC, id DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo asientos contables' });
  }
});

router.get('/asientos/:id', async (req, res) => {
  try {
    const asientoRes = await query('SELECT * FROM asientos_contables WHERE id=$1', [req.params.id]);
    if (!asientoRes.rows[0]) return res.status(404).json({ error: 'Asiento no encontrado' });
    const lineasRes = await query(
      `SELECT al.*, pc.codigo, pc.nombre as cuenta_nombre, pc.tipo as cuenta_tipo
       FROM asiento_lineas al
       JOIN plan_cuentas pc ON pc.id = al.cuenta_id
       WHERE al.asiento_id = $1 ORDER BY al.id`,
      [req.params.id]
    );
    res.json({ ...asientoRes.rows[0], lineas: lineasRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo asiento' });
  }
});

router.post('/asientos', writeGuard, async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    const { fecha, descripcion, referencia, lineas } = req.body;
    if (!descripcion || !lineas || lineas.length < 2) {
      return res.status(400).json({ error: 'Descripción y al menos 2 líneas son requeridas' });
    }

    const totalDebe = lineas.reduce((s, l) => s + (parseFloat(l.debe) || 0), 0);
    const totalHaber = lineas.reduce((s, l) => s + (parseFloat(l.haber) || 0), 0);
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      return res.status(400).json({ error: 'El total del Debe debe ser igual al total del Haber' });
    }

    await client.query('BEGIN');

    // Generate folio
    const countRes = await client.query('SELECT COUNT(*) FROM asientos_contables');
    const nextNum = parseInt(countRes.rows[0].count) + 1;
    const folio = `CT-${String(nextNum).padStart(5, '0')}`;

    const asientoRes = await client.query(
      `INSERT INTO asientos_contables (folio, fecha, descripcion, referencia, estado, total_debe, total_haber, creado_por)
       VALUES ($1,$2,$3,$4,'REGISTRADO',$5,$6,$7) RETURNING *`,
      [folio, fecha || new Date().toISOString().split('T')[0], descripcion, referencia || null,
       totalDebe, totalHaber, req.user?.id || null]
    );
    const asientoId = asientoRes.rows[0].id;

    for (const l of lineas) {
      await client.query(
        `INSERT INTO asiento_lineas (asiento_id, cuenta_id, descripcion, debe, haber) VALUES ($1,$2,$3,$4,$5)`,
        [asientoId, l.cuenta_id, l.descripcion || null, parseFloat(l.debe) || 0, parseFloat(l.haber) || 0]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(asientoRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error creando asiento contable' });
  } finally {
    client.release();
  }
});

/* ── CUENTAS BANCARIAS ── */
router.get('/cuentas-bancarias', async (req, res) => {
  try {
    const result = await query('SELECT * FROM cuentas_bancarias WHERE activo=TRUE ORDER BY banco');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo cuentas bancarias' });
  }
});

router.post('/cuentas-bancarias', writeGuard, async (req, res) => {
  try {
    const { banco, numero_cuenta, tipo, moneda, saldo_actual } = req.body;
    if (!banco || !numero_cuenta || !tipo) return res.status(400).json({ error: 'Banco, número y tipo son requeridos' });
    const result = await query(
      `INSERT INTO cuentas_bancarias (banco, numero_cuenta, tipo, moneda, saldo_actual)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [banco, numero_cuenta, tipo, moneda || 'PEN', parseFloat(saldo_actual) || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando cuenta bancaria' });
  }
});

/* ── PAGOS PROGRAMADOS ── */
router.get('/pagos-programados', async (req, res) => {
  try {
    const { tipo, estado, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (tipo) { where.push(`pp.tipo = $${idx++}`); params.push(tipo); }
    if (estado) { where.push(`pp.estado = $${idx++}`); params.push(estado); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countRes = await query(`SELECT COUNT(*) FROM pagos_programados pp ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await query(
      `SELECT pp.*, cb.banco, cb.numero_cuenta FROM pagos_programados pp
       LEFT JOIN cuentas_bancarias cb ON cb.id = pp.cuenta_bancaria_id
       ${whereClause} ORDER BY pp.fecha_vencimiento ASC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo pagos programados' });
  }
});

router.post('/pagos-programados', writeGuard, async (req, res) => {
  try {
    const { descripcion, monto, tipo, fecha_vencimiento, cuenta_bancaria_id, referencia } = req.body;
    if (!descripcion || !monto || !tipo || !fecha_vencimiento) {
      return res.status(400).json({ error: 'Descripción, monto, tipo y fecha de vencimiento son requeridos' });
    }
    const result = await query(
      `INSERT INTO pagos_programados (descripcion, monto, tipo, fecha_vencimiento, cuenta_bancaria_id, referencia)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [descripcion, parseFloat(monto), tipo, fecha_vencimiento, cuenta_bancaria_id || null, referencia || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando pago programado' });
  }
});

router.put('/pagos-programados/:id/completar', writeGuard, async (req, res) => {
  try {
    const result = await query(
      `UPDATE pagos_programados SET estado='COMPLETADO', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error completando pago' });
  }
});

module.exports = router;
