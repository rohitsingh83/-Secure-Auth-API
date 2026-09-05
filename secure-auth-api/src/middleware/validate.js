'use strict';

/**
 * @file middleware/validate.js
 * @description Express-validator result checker middleware.
 *
 *  Reads the validation result set by `express-validator` chains declared
 *  on routes. If any errors exist, responds 400 with a structured payload
 *  listing every field error — no further middleware is called.
 *
 *  Usage:
 *    router.post('/register', registerValidators, validate, registerHandler);
 */

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed. Please check the errors below.',
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }

  return next();
};

module.exports = validate;
