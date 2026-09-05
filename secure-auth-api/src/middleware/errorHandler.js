'use strict';

/**
 * @file middleware/errorHandler.js
 * @description Centralised global error-handling middleware.
 *
 *  Express identifies error handlers by their 4-argument signature (err, req, res, next).
 *  This module exports two handlers:
 *
 *    `notFound`     — 404 handler mounted after all routes.
 *    `errorHandler` — Catch-all error handler mounted last.
 *
 *  Operational errors (ApiError instances) are returned with their full message.
 *  Programmer / unexpected errors return a generic message in production so that
 *  stack traces and internal details are never exposed to clients.
 *
 *  Mongoose-specific errors (CastError, ValidationError, duplicate key) are
 *  normalised to user-friendly messages before responding.
 */

const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// ── Mongoose error normalisers ────────────────────────────────────────────────

const handleCastError = (err) =>
  new ApiError(`Invalid ${err.path}: ${err.value}.`, 400);

const handleValidationError = (err) => {
  const messages = Object.values(err.errors)
    .map((e) => e.message)
    .join(' ');
  return new ApiError(`Invalid input data: ${messages}`, 400);
};

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new ApiError(
    `The value "${value}" for field "${field}" already exists. Please use a different value.`,
    409
  );
};

// ── JWT error normalisers ────────────────────────────────────────────────────

const handleJWTError = () =>
  new ApiError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new ApiError('Your session has expired. Please log in again.', 401);

// ── 404 handler ──────────────────────────────────────────────────────────────

const notFound = (req, res, next) => {
  next(new ApiError(`Cannot ${req.method} ${req.originalUrl}`, 404));
};

// ── Global error handler ──────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Normalise Mongoose and JWT errors into ApiError instances
  if (error.name === 'CastError') error = handleCastError(error);
  if (error.name === 'ValidationError') error = handleValidationError(error);
  if (error.code === 11000) error = handleDuplicateKeyError(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  // Always log the full error server-side
  logger.error(`${error.statusCode} — ${error.message}`, {
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
  });

  // In production: never leak implementation details for 5xx errors
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected internal error occurred. Please try again later.',
    });
  }

  return res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

module.exports = { notFound, errorHandler };
