require('dotenv').config();
require('express-async-errors');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const fs = require('fs');
const logger = require('./logger');
const { Part } = require('./models');
const { globalLimiter, authLimiter } = require('./security');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Prevent Node.js from crashing on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173')
  .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(compression());
app.use(express.static(path.join(__dirname, '..', 'client', 'dist'), { index: false, maxAge: '1d' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '30d' }));

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https:'],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", 'https:'],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(mongoSanitize());
app.use('/api/', globalLimiter);
app.use('/api/auth', authLimiter);

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  logger.error('Falta JWT_SECRET en el entorno. Configúralo en .env para producción.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) logger.warn('usando JWT_SECRET de desarrollo. Define JWT_SECRET en .env.');

// Routers
app.use(require('./routes/auth'));
app.use(require('./routes/catalog'));
app.use(require('./routes/orders'));
app.use(require('./routes/payments'));
app.use(require('./routes/admin'));

app.get('/api/health', async (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
    db: { readyState: mongoose.connection.readyState, name: mongoose.connection.name || null },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/sitemap.xml', async (req, res) => {
  const base = process.env.BASE_URL || `http://localhost:${PORT}`;
  const parts = await Part.find({ active: true }).select('name updatedAt').limit(2000);
  const urls = [
    `${base}/`, `${base}/catalogo`, `${base}/contacto`, `${base}/login`, `${base}/registro`
  ].map(loc => `<url><loc>${loc}</loc><changefreq>weekly</changefreq></url>`);
  urls.push(...parts.map(p => `<url><loc>${base}/producto/${p._id}</loc><lastmod>${(p.updatedAt || new Date()).toISOString()}</lastmod><changefreq>monthly</changefreq></url>`));
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
});

// SPA fallback (los 404 de API se resuelven en los routers)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'client', 'dist', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(err.status || 500).json({ error: err.message || 'Error interno' });
  } else {
    res.status(500).sendFile(path.join(__dirname, '..', 'client', 'dist', '500.html'), (fileErr) => {
      if (fileErr) res.status(500).send('Error interno del servidor');
    });
  }
});

mongoose.connection.on('error', err => {
  logger.error({ err: err.message }, 'CRITICAL: MongoDB connection error');
});
mongoose.connection.on('disconnected', () => {
  logger.error('CRITICAL: MongoDB disconnected. Waiting for reconnect...');
});

const { pruneAuditLogs, releaseExpiredReservations } = require('./services');

async function ensurePlaceholders() {
  try {
    const { imageUrlFor, bannerUrlFor } = require('./part-image');
    // Generar banners principales
    bannerUrlFor('MUERTE A LOS PREJUICIOS', 'MUERTE A LOS PREJUICIOS');
    bannerUrlFor('AUTO#PRO', 'AUTO#PRO');
    // Generar SVG para todos los repuestos activos si no existen
    const parts = await Part.find({ active: true }).select('sku name category price brand');
    for (const p of parts) {
      imageUrlFor(p);
    }
  } catch (err) {
    logger.error('Error generando imágenes placeholder:', err.message);
  }
}

const start = () => {
  if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'test') {
    logger.warn('Tests que no requieren Mongo deberían importar la app directamente');
  }
  return mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autopartes_pro').then(async () => {
    
    // Garantizar que las imágenes SVG existan en el disco
    await ensurePlaceholders();

    const server = app.listen(PORT, () => logger.info(`Autopartes Pro en http://localhost:${PORT}`));
    
    // Tareas en segundo plano (cron)
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => pruneAuditLogs().catch(e => logger.error({ err: e.message }, 'prune cron error')), 24 * 60 * 60 * 1000); // Diario
      setInterval(() => releaseExpiredReservations().catch(e => logger.error({ err: e.message }, 'release cron error')), 5 * 60 * 1000); // 5 min
    }
    
    return server;
  }).catch(err => {
    logger.error({ err: err.message }, 'MongoDB initial connection error');
  });
};

if (require.main === module) start();

module.exports = { app, mongoose, start, models: require('./models') };