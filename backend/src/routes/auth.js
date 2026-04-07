const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!user.activo) return res.status(403).json({ error: 'Usuario desactivado' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Update last access
    await query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);

    const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, area: user.area };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Log login
    await query(
      `INSERT INTO activity_log (usuario_id, accion, modulo, descripcion, ip)
       VALUES ($1, 'LOGIN', 'AUTH', 'Inicio de sesión', $2)`,
      [user.id, req.ip]
    );

    res.json({ user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/* POST /api/auth/logout */
router.post('/logout', verifyToken, (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ message: 'Sesión cerrada' });
});

/* GET /api/auth/me */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nombre, email, rol, area, activo, ultimo_acceso, avatar_url FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
