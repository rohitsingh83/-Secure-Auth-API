'use strict';

/**
 * @file validators/auth.validators.js
 * @description express-validator chains for authentication endpoints.
 *
 *  Each exported array can be spread directly into route definitions:
 *    router.post('/register', registerValidators, validate, handler);
 */

const { body } = require('express-validator');

// ── Register ──────────────────────────────────────────────────────────────────

const registerValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/\d/).withMessage('Password must contain at least one number.')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.'),

  body('passwordConfirm')
    .notEmpty().withMessage('Password confirmation is required.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
];

// ── Login ────────────────────────────────────────────────────────────────────

const loginValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ── Refresh token ─────────────────────────────────────────────────────────────

const refreshTokenValidators = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required.')
    .isString().withMessage('Refresh token must be a string.'),
];

module.exports = { registerValidators, loginValidators, refreshTokenValidators };
