const jwt = require('jsonwebtoken');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

/* ── Permission matrix ── */
const PERMISSIONS = {
  SUPER_ADMIN: { read: '*', write: '*', delete: '*' },
  ADMIN_AREA:  { read: '*', write: 'own_area', delete: 'own_area' },
  SUPERVISOR:  { read: '*', write: 'own_area_approve', delete: false },
  OPERARIO:    { read: 'own_area', write: 'own_area_create_edit', delete: false },
  AUDITOR:     { read: '*', write: false, delete: false },
};

/* ── Verify JWT ── */
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/* ── Role check middleware factory ── */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
};

/* ── Write guard (blocks AUDITOR from any POST / PUT / DELETE) ── */
const writeGuard = (req, res, next) => {
  if (req.user?.rol === 'AUDITOR') {
    return res.status(403).json({ error: 'Auditor: solo lectura' });
  }
  next();
};

/* ── Area guard ── */
const areaGuard = (areaField) => {
  return (req, res, next) => {
    const { rol, area } = req.user;
    if (rol === 'SUPER_ADMIN' || rol === 'AUDITOR') return next();
    // For area-bound roles, check they match
    if (['ADMIN_AREA', 'SUPERVISOR', 'OPERARIO'].includes(rol)) {
      if (areaField && req.body[areaField] && req.body[areaField] !== area) {
        return res.status(403).json({ error: 'No tienes acceso a esta área' });
      }
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, writeGuard, areaGuard, PERMISSIONS };
