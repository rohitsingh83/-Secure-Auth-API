'use strict';

/**
 * @file routes/auth.routes.js
 * @description Auth router — public endpoints with strict rate limiting.
 */

const { Router } = require('express');
const {
  registerValidators,
  loginValidators,
  refreshTokenValidators,
} = require('../validators/auth.validators');
const validate        = require('../middleware/validate');
const authenticate    = require('../middleware/authenticate');
const { authRateLimiter } = require('../middleware/rateLimiter');
const {
  register,
  login,
  refresh,
  logout,
} = require('../controllers/auth.controller');

const router = Router();

// Apply strict rate limiting to every auth route
router.use(authRateLimiter);

// ── Public ────────────────────────────────────────────────────────────────────

/** @route  POST /api/v1/auth/register */
router.post('/register', registerValidators, validate, register);

/** @route  POST /api/v1/auth/login */
router.post('/login', loginValidators, validate, login);

/** @route  POST /api/v1/auth/refresh */
router.post('/refresh', refreshTokenValidators, validate, refresh);

// ── Protected ─────────────────────────────────────────────────────────────────

/** @route  POST /api/v1/auth/logout */
router.post('/logout', authenticate, logout);

module.exports = router;
