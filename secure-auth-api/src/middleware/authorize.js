'use strict';

/**
 * @file middleware/authorize.js
 * @description Role-based access control (RBAC) middleware.
 *
 *  Must be used AFTER the `authenticate` middleware so that `req.user` is set.
 *
 *  Usage:
 *    router.delete('/users/:id', authenticate, authorize('admin'), handler);
 *
 * @param {...string} roles - One or more allowed roles.
 * @returns {Function} Express middleware.
 */

const ApiError = require('../utils/ApiError');

const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new ApiError(
      `Role "${req.user.role}" is not authorised to access this resource.`,
      403
    );
  }
  next();
};

module.exports = authorize;
