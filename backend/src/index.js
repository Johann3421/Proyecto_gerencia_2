const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { initDB, query } = require('./db');
const { verifyToken } = require('./middleware/auth');
const logger = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3001;

/* ── Global middleware ── */
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

/* ── Routes ── */
app.use('/api/auth', require('./routes/auth'));

// All routes below require auth
app.use('/api/dashboard', verifyToken, logger, require('./routes/dashboard'));
app.use('/api/administracion', verifyToken, logger, require('./routes/administracion'));
app.use('/api/tecnologia', verifyToken, logger, require('./routes/tecnologia'));
app.use('/api/comercial', verifyToken, logger, require('./routes/comercial'));
app.use('/api/logistica', verifyToken, logger, require('./routes/logistica'));
app.use('/api/produccion', verifyToken, logger, require('./routes/produccion'));
app.use('/api/usuarios', verifyToken, logger, require('./routes/usuarios'));
app.use('/api/reportes', verifyToken, logger, require('./routes/reportes'));

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── Error handler ── */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

/* ── Start ── */
const start = async () => {
  try {
    await initDB();

    // Auto-seed on first run
    const userCount = await query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('📦 Primera ejecución detectada — ejecutando seed...');
      const seedFunc = require('./scripts/seed');
      await seedFunc();
    }

    app.listen(PORT, () => {
      console.log(`🚀 NEXO ERP Backend corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error iniciando servidor:', err);
    process.exit(1);
  }
};

start();
