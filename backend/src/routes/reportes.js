const express = require('express');
const { query } = require('../db');
const router = express.Router();

const buildCSV = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]).join(',');
  const lines = rows.map(r =>
    Object.values(r).map(v => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  );
  return headers + '\n' + lines.join('\n');
};

const sendCSV = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv); // BOM for Excel
};

/* GET /api/reportes/ventas/csv */
router.get('/ventas/csv', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let where = '';
    let params = [];
    if (desde && hasta) {
      where = 'WHERE v.fecha_venta BETWEEN $1 AND $2';
      params = [desde, hasta];
    }

    const result = await query(`
      SELECT v.folio, c.nombre as cliente, u.nombre as vendedor,
             v.total, v.estado, v.fecha_venta
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.vendedor_id = u.id
      ${where} ORDER BY v.fecha_venta DESC
    `, params);

    sendCSV(res, 'ventas.csv', buildCSV(result.rows));
  } catch (err) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

/* GET /api/reportes/inventario/csv */
router.get('/inventario/csv', async (req, res) => {
  try {
    const result = await query(`
      SELECT sku, nombre, almacen, stock_actual, stock_minimo,
             CASE WHEN stock_actual < stock_minimo THEN 'CRITICO'
                  WHEN stock_actual < stock_minimo * 1.5 THEN 'BAJO' ELSE 'OK' END as estado
      FROM productos WHERE activo = true ORDER BY nombre
    `);
    sendCSV(res, 'inventario.csv', buildCSV(result.rows));
  } catch (err) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

/* GET /api/reportes/financiero/csv */
router.get('/financiero/csv', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let where = '';
    let params = [];
    if (desde && hasta) {
      where = 'WHERE fecha BETWEEN $1 AND $2';
      params = [desde, hasta];
    }
    const result = await query(`SELECT tipo, monto, descripcion, area, fecha, referencia FROM transacciones ${where} ORDER BY fecha DESC`, params);
    sendCSV(res, 'financiero.csv', buildCSV(result.rows));
  } catch (err) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

/* GET /api/reportes/actividad/csv */
router.get('/actividad/csv', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let where = '';
    let params = [];
    if (desde && hasta) {
      where = 'WHERE al.created_at BETWEEN $1 AND $2';
      params = [desde, hasta];
    }
    const result = await query(`
      SELECT al.accion, al.modulo, al.descripcion, u.nombre as usuario, al.ip, al.created_at
      FROM activity_log al LEFT JOIN usuarios u ON al.usuario_id = u.id
      ${where} ORDER BY al.created_at DESC
    `, params);
    sendCSV(res, 'actividad.csv', buildCSV(result.rows));
  } catch (err) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

/* GET /api/reportes/produccion/csv */
router.get('/produccion/csv', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let where = '';
    let params = [];
    if (desde && hasta) {
      where = 'WHERE of2.fecha_inicio BETWEEN $1 AND $2';
      params = [desde, hasta];
    }
    const result = await query(`
      SELECT of2.folio, of2.producto, of2.cantidad, of2.estado,
             u.nombre as responsable, of2.fecha_inicio, of2.fecha_fin
      FROM ordenes_fabricacion of2
      LEFT JOIN usuarios u ON of2.responsable_id = u.id
      ${where} ORDER BY of2.created_at DESC
    `, params);
    sendCSV(res, 'produccion.csv', buildCSV(result.rows));
  } catch (err) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

/* GET /api/reportes/rrhh/csv */
router.get('/rrhh/csv', async (req, res) => {
  try {
    const result = await query(`
      SELECT nombre, dni, cargo, area, salario, fecha_ingreso,
             CASE WHEN activo THEN 'ACTIVO' ELSE 'INACTIVO' END as estado
      FROM empleados ORDER BY nombre
    `);
    sendCSV(res, 'rrhh.csv', buildCSV(result.rows));
  } catch (err) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

module.exports = router;
