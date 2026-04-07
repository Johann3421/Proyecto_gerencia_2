const express = require('express');
const { query } = require('../db');
const router = express.Router();

/* GET /api/dashboard/metrics */
router.get('/metrics', async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [ventasMes, pedidosActivos, stockCritico, usersActivos] = await Promise.all([
      query(`SELECT COALESCE(SUM(total),0) as total FROM ventas WHERE fecha_venta BETWEEN $1 AND $2`, [firstDay, lastDay]),
      query(`SELECT COUNT(*) as count FROM ventas WHERE estado IN ('PENDIENTE','EN_PROCESO')`),
      query(`SELECT COUNT(*) as count FROM productos WHERE stock_actual < stock_minimo AND activo = true`),
      query(`SELECT COUNT(*) as count FROM usuarios WHERE activo = true`),
    ]);

    // Last 10 orders
    const pedidos = await query(`
      SELECT v.id, v.folio, c.nombre as cliente, v.total, v.estado, v.fecha_venta,
             u.nombre as vendedor
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.vendedor_id = u.id
      ORDER BY v.created_at DESC LIMIT 10
    `);

    res.json({
      metrics: {
        ventas_mes: parseFloat(ventasMes.rows[0].total),
        pedidos_activos: parseInt(pedidosActivos.rows[0].count),
        stock_critico: parseInt(stockCritico.rows[0].count),
        usuarios_activos: parseInt(usersActivos.rows[0].count),
      },
      pedidos: pedidos.rows,
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

/* GET /api/dashboard/activity */
router.get('/activity', async (req, res) => {
  try {
    const result = await query(`
      SELECT al.*, u.nombre as usuario_nombre
      FROM activity_log al
      LEFT JOIN usuarios u ON al.usuario_id = u.id
      ORDER BY al.created_at DESC LIMIT 8
    `);
    res.json({ activity: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo actividad' });
  }
});

module.exports = router;
