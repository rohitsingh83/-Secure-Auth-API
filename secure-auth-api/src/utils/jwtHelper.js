'use strict';

/**
 * @file utils/jwtHelper.js
 * @description Helpers for signing and verifying JSON Web Tokens.
 *              Uses a short-lived access token + long-lived refresh token
 *              pattern for production-grade session management.
 */

const jwt = require('jsonwebtoken');
const ApiError = require('./ApiError');

/**
 * Signs a new access token.
 *
 * @param {string|object} payload - Data to encode (typically { id, role }).
 * @returns {string} Signed JWT string.
 */
const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: 'secure-auth-api',
    audience: 'secure-auth-api-clients',
  });

/**
 * Signs a new refresh token.
 *
 * @param {string|object} payload - Data to encode (typically { id }).
 * @returns {string} Signed refresh JWT string.
 */
const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'secure-auth-api',
    audience: 'secure-auth-api-clients',
  });

/**
 * Verifies a JWT access token.
 *
 * @param {string} token - The JWT string to verify.
 * @returns {object} Decoded payload.
 * @throws {ApiError} 401 if the token is invalid or expired.
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'secure-auth-api',
      audience: 'secure-auth-api-clients',
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError('Access token expired. Please refresh your session.', 401);
    }
    throw new ApiError('Invalid or malformed token.', 401);
  }
};

/**
 * Verifies a JWT refresh token.
 *
 * @param {string} token - The refresh JWT string to verify.
 * @returns {object} Decoded payload.
 * @throws {ApiError} 401 if the token is invalid or expired.
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'secure-auth-api',
      audience: 'secure-auth-api-clients',
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError('Refresh token expired. Please log in again.', 401);
    }
    throw new ApiError('Invalid refresh token.', 401);
  }
};

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
