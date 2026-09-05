'use strict';

/**
 * @file app.js
 * @description Express application factory with static frontend serving,
 *              tailored Helmet CSP, CORS, and security middleware.
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { globalRateLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ── Security Headers & Content Security Policy (CSP) ─────────────────────────
// Whitelist Tailwind CDN, Google Fonts, and FontAwesome so frontend styles render properly
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com"
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        connectSrc: ["'self'", "https://api-production-6a66.up.railway.app"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

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

// ── HTTP Request Logger ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}

// ── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── NoSQL Injection Sanitization (Express 5 Safe) ────────────────────────────
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

// ── Global Rate Limiter ──────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ── Serve Static Frontend Website (public/ folder) ───────────────────────────
// Anyone opening https://api-production-6a66.up.railway.app/ will see the website!
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// ── Fallback: Serve index.html for Root/Client Navigation ─────────────────────
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ── 404 & Global Error Handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;