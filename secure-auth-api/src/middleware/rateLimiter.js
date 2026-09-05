'use strict';

/**
 * @file middleware/rateLimiter.js
 * @description Rate-limiting middleware using express-rate-limit.
 *
 *  - `globalRateLimiter`:  Applied to all routes — limits abuse of any endpoint.
 *  - `authRateLimiter`:    Applied only to auth routes — strict limit to
 *                          mitigate brute-force login / registration attacks.
 */

const rateLimit = require('express-rate-limit');

/**
 * Default handler that returns a structured JSON response instead of plain text.
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    status: 'fail',
    message: 'Too many requests from this IP. Please try again later.',
  });
};

/**
 * Global rate limiter — protects every API route.
 * Default: 100 requests per 15-minute window per IP.
 */
const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,   // Include RateLimit-* headers in responses
  legacyHeaders: false,     // Disable X-RateLimit-* headers
  handler: rateLimitHandler,
});

/**
 * Strict rate limiter for authentication endpoints.
 * Default: 10 requests per 15-minute window per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = { globalRateLimiter, authRateLimiter };
