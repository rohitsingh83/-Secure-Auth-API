'use strict';

/**
 * @file routes/user.routes.js
 * @description User resource router — all routes protected by JWT auth.
 *              Admin-only routes additionally guarded by the authorize middleware.
 */

const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getMe,
  updateMe,
  getAllUsers,
  getUserById,
} = require('../controllers/user.controller');

const router = Router();

// Every route below requires a valid JWT
router.use(authenticate);

// ── Current user ──────────────────────────────────────────────────────────────

/** @route  GET   /api/v1/users/me  — returns the authenticated user's profile */
router.get('/me', getMe);

/** @route  PATCH /api/v1/users/me  — updates the authenticated user's name */
router.patch('/me', updateMe);

// ── Admin only ────────────────────────────────────────────────────────────────

/** @route  GET /api/v1/users       — paginated list of all users (admin only) */
router.get('/', authorize('admin'), getAllUsers);

/** @route  GET /api/v1/users/:id   — single user by ID (admin only) */
router.get('/:id', authorize('admin'), getUserById);

module.exports = router;
