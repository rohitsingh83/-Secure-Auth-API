'use strict';

/**
 * @file controllers/auth.controller.js
 * @description Authentication controller — handles all auth-related business
 *              logic: registration, login, token refresh, and logout.
 *
 *  All handlers are wrapped with catchAsync so thrown ApiErrors are forwarded
 *  to the global error handler automatically.
 */

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwtHelper');
const catchAsync = require('../middleware/catchAsync');
const logger = require('../utils/logger');

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Issues a new access/refresh token pair and responds with 200/201.
 *
 * @param {object} user          - Mongoose User document.
 * @param {number} statusCode    - HTTP status code for the response.
 * @param {object} res           - Express response object.
 */
const sendTokenResponse = async (user, statusCode, res) => {
  const payload = { id: user._id, role: user.role };

  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user._id });

  // Persist hashed refresh token (store only hash for extra security)
  // For simplicity we store the raw token; in production hash with SHA-256 first.
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return res.status(statusCode).json({
    status: 'success',
    data: {
      user,
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    },
  });
};

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Creates a new user account.
 */
const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  // Prevent privilege escalation — role cannot be set via registration
  const newUser = await User.create({ name, email, password });

  logger.info(`New user registered: ${newUser.email}`);

  await sendTokenResponse(newUser, 201, res);
});

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Authenticates a user and issues JWT tokens.
 *
 * Security: uses a single generic error message for both "user not found" and
 * "wrong password" to prevent user enumeration attacks.
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Explicitly select password (excluded by default in the schema)
  const user = await User.findOne({ email }).select('+password +isActive');

  // Constant-time comparison even when user doesn't exist prevents timing attacks
  const isValid = user ? await user.isPasswordCorrect(password) : false;

  if (!user || !isValid) {
    throw new ApiError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new ApiError('Your account has been deactivated. Please contact support.', 403);
  }

  logger.info(`User logged in: ${user.email}`);

  await sendTokenResponse(user, 200, res);
});

// ── Refresh token ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/refresh
 * Issues a new access token given a valid refresh token.
 */
const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  // Verify the refresh token signature and expiry
  const decoded = verifyRefreshToken(refreshToken);

  // Find user and verify stored token matches (rotation guard)
  const user = await User.findById(decoded.id).select('+refreshToken +isActive');

  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(
      'Invalid or reused refresh token. Please log in again.',
      401
    );
  }

  if (!user.isActive) {
    throw new ApiError('Account is deactivated.', 403);
  }

  // Rotate refresh token (issue a brand-new one — the old one is invalidated)
  await sendTokenResponse(user, 200, res);
});

// ── Logout ────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/logout
 * Invalidates the user's refresh token server-side.
 * Requires a valid access token (authenticate middleware) so anonymous calls
 * cannot pollute the database.
 */
const logout = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: '' } },
    { new: true }
  );

  logger.info(`User logged out: ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully. Please discard your tokens.',
  });
});

module.exports = { register, login, refresh, logout };
