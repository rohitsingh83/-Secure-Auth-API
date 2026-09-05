'use strict';

/**
 * @file middleware/catchAsync.js
 * @description Higher-order function that wraps async route handlers and
 *              forwards any thrown errors to Express's next() error pipeline,
 *              eliminating the need for try/catch blocks in every controller.
 *
 * @param {Function} fn - Async Express handler (req, res, next) => Promise.
 * @returns {Function} Wrapped handler that catches rejected promises.
 */

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
