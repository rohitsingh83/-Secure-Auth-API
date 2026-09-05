'use strict';

/**
 * @file controllers/user.controller.js
 * @description Protected user resource controller.
 *
 *  All handlers require a valid JWT (enforced via the `authenticate` middleware
 *  on the router level). Role-restricted handlers additionally use `authorize`.
 */

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../middleware/catchAsync');

// ── Get my profile (any authenticated user) ───────────────────────────────────

/**
 * GET /api/v1/users/me
 * Returns the authenticated user's own profile.
 */
const getMe = catchAsync(async (req, res) => {
  // req.user is already populated by the authenticate middleware
  res.status(200).json({
    status: 'success',
    data: { user: req.user },
  });
});

// ── Update my profile ─────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/users/me
 * Allows a user to update their own name.
 * Sensitive fields (password, role, email) are explicitly blocked here.
 */
const updateMe = catchAsync(async (req, res) => {
  // Prevent updates to sensitive fields via this endpoint
  const forbidden = ['password', 'passwordConfirm', 'role', 'email'];
  forbidden.forEach((field) => {
    if (req.body[field]) {
      throw new ApiError(
        `Field "${field}" cannot be updated via this endpoint.`,
        400
      );
    }
  });

  const allowedUpdates = { name: req.body.name };

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    allowedUpdates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

// ── Admin: get all users ──────────────────────────────────────────────────────

/**
 * GET /api/v1/users
 * Returns a paginated list of all users.
 * Restricted to users with the "admin" role.
 */
const getAllUsers = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip  = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(),
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
    data: { users },
  });
});

// ── Admin: get user by ID ─────────────────────────────────────────────────────

/**
 * GET /api/v1/users/:id
 * Returns a specific user by ID.
 * Restricted to users with the "admin" role.
 */
const getUserById = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(`No user found with ID: ${req.params.id}`, 404);
  }

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

module.exports = { getMe, updateMe, getAllUsers, getUserById };
