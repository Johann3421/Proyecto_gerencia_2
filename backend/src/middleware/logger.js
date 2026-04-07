const { query } = require('../db');

const logger = async (req, res, next) => {
  // Only log write operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const originalEnd = res.end;
    res.end = function (...args) {
      // Log after response is sent
      if (req.user && res.statusCode < 400) {
        const accion = req.method === 'POST' ? 'CREAR'
          : req.method === 'PUT' || req.method === 'PATCH' ? 'ACTUALIZAR'
          : 'ELIMINAR';

        const modulo = req.baseUrl.replace('/api/', '').split('/')[0]?.toUpperCase() || 'SISTEMA';
        const descripcion = `${accion} ${req.originalUrl}`;
        const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';

        query(
          `INSERT INTO activity_log (usuario_id, accion, modulo, descripcion, ip)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.user.id, accion, modulo, descripcion, ip]
        ).catch(err => console.error('Logger error:', err.message));
      }
      originalEnd.apply(res, args);
    };
  }
  next();
};

module.exports = logger;
