'use strict';

/**
 * @file models/User.js
 * @description Mongoose User schema.
 *
 * Security considerations:
 *  - Password is hashed with bcrypt before every save (pre-save hook).
 *  - `passwordChangedAt` is updated on password change so issued JWTs become
 *    invalid after a password reset.
 *  - `toJSON` transform strips the password hash and internal fields before
 *    any response serialisation.
 *  - Timestamps are enabled for audit trails.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

// ── Schema definition ────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [60, 'Name must not exceed 60 characters.'],
    },

    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address.',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters.'],
      // Never return the password field in query results by default
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role must be either "user" or "admin".',
      },
      default: 'user',
    },

    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },

    passwordChangedAt: {
      type: Date,
      select: false,
    },

    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,  // Adds createdAt and updatedAt automatically
    // Remove __v from output
    versionKey: false,
  }
);

// ── Pre-save hook — hash password ────────────────────────────────────────────

userSchema.pre('save', async function hashPassword(next) {
  // Only hash when the password field has actually been modified
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);

  // Invalidate any tokens issued before this password change
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Ensure JWT iat < changedAt
  }

  return next();
});

// ── Instance method — verify candidate password ───────────────────────────────

/**
 * Compares a plain-text candidate password against the stored bcrypt hash.
 *
 * @param {string} candidatePassword - Plain-text password from the request body.
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Returns true if the user changed their password AFTER the JWT was issued.
 * Used to invalidate stale tokens after a password reset.
 *
 * @param {number} jwtIssuedAt - `iat` claim from the decoded JWT (seconds).
 * @returns {boolean}
 */
userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    const changedAtSeconds = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return jwtIssuedAt < changedAtSeconds;
  }
  return false;
};

// ── toJSON transform — strip sensitive fields ─────────────────────────────────

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.passwordChangedAt;
    delete ret.isActive;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
module.exports = User;
