const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { writeGuard, requireRole } = require('../middleware/auth');
const router = express.Router();

/* GET /api/usuarios */
router.get('/', async (req, res) => {
  try {
    const { page = 1, search } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let where = '';
    let params = [];

    if (search) {
      where = `WHERE nombre ILIKE $1 OR email ILIKE $1`;
      params.push(`%${search}%`);
    }

    const countRes = await query(`SELECT COUNT(*) FROM usuarios ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    const idx = params.length + 1;
    params.push(limit, offset);

    const result = await query(
      `SELECT id, nombre, email, rol, area, activo, ultimo_acceso, created_at
       FROM usuarios ${where} ORDER BY nombre LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ data: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

/* POST /api/usuarios */
router.post('/', writeGuard, requireRole('SUPER_ADMIN', 'ADMIN_AREA'), async (req, res) => {
  try {
    const { nombre, email, password, rol, area } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    const exists = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email ya registrado' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, area)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, nombre, email, rol, area, activo`,
      [nombre, email, password_hash, rol || 'OPERARIO', area || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

/* PUT /api/usuarios/:id */
router.put('/:id', writeGuard, requireRole('SUPER_ADMIN', 'ADMIN_AREA'), async (req, res) => {
  try {
    const { nombre, email, rol, area, password } = req.body;
    let hashClause = '';
    let params = [nombre, email, rol, area, req.params.id];

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      hashClause = `, password_hash=$6`;
      params.push(password_hash);
    }

    const result = await query(
      `UPDATE usuarios SET nombre=COALESCE($1,nombre), email=COALESCE($2,email),
       rol=COALESCE($3,rol), area=$4, updated_at=NOW() ${hashClause}
       WHERE id=$5 RETURNING id, nombre, email, rol, area, activo`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

/* PUT /api/usuarios/:id/toggle */
router.put('/:id/toggle', writeGuard, requireRole('SUPER_ADMIN', 'ADMIN_AREA'), async (req, res) => {
  try {
    const result = await query(
      `UPDATE usuarios SET activo = NOT activo, updated_at = NOW()
       WHERE id = $1 RETURNING id, nombre, activo`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling usuario' });
  }
});

module.exports = router;
