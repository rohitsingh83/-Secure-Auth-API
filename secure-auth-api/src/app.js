'use strict';

/**
 * @file app.js
 * @description Express application factory. Wires together all middleware,
 *              security headers, rate limiters, routes, and global error
 *              handling — completely decoupled from the HTTP server so the
 *              same instance can be used in integration tests without
 *              binding a port.
 */

require('dotenv').config();

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');

const { globalRateLimiter } = require('./middleware/rateLimiter');
const authRoutes             = require('./routes/auth.routes');
const userRoutes             = require('./routes/user.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger                 = require('./utils/logger');

const app = express();

// ── Security headers (OWASP recommended) ────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── HTTP request logger ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── NoSQL injection sanitization (Express 5 compatible) ──────────────────────
// express-mongo-sanitize v2 mutates req.query which is read-only in Express 5.
// This inline sanitizer strips '$'-prefixed and dot-containing keys from
// req.body only — safe with Express 5's read-only query getter.
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  return Object.keys(obj).reduce((acc, key) => {
    if (!key.startsWith('$') && !key.includes('.')) {
      acc[key] = sanitizeObject(obj[key]);
    }
    return acc;
  }, {});
};

app.use((req, _res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  next();
});

// ── Global rate limiter ──────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// ── 404 & global error handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
