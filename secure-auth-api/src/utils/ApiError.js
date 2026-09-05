'use strict';

/**
 * @file utils/ApiError.js
 * @description Custom operational error class.
 *              Distinguishes between trusted (operational) errors that should
 *              be returned to the client and unexpected programmer errors that
 *              should never leak implementation details.
 */

class ApiError extends Error {
  /**
   * @param {string}  message        - Human-readable error message.
   * @param {number}  statusCode     - HTTP status code (e.g., 400, 401, 404).
   * @param {boolean} [isOperational=true] - Set false for programmer errors.
   */
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;

    // Capture a clean stack trace excluding this constructor frame
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
