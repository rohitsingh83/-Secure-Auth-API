'use strict';

/**
 * @file middleware/authenticate.js
 * @description JWT authentication guard.
 *
 *  Extracts the Bearer token from the Authorization header, verifies its
 *  signature, checks that the user still exists and has not changed their
 *  password since the token was issued, then attaches the user document to
 *  `req.user` for downstream handlers.
 *
 *  Usage:
 *    router.get('/protected', authenticate, handler);
 */

const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwtHelper');
const ApiError = require('../utils/ApiError');
const catchAsync = require('./catchAsync');

const authenticate = catchAsync(async (req, _res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(
      'No token provided. Please log in to access this resource.',
      401
    );
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify signature and expiry
  const decoded = verifyAccessToken(token);

  // 3. Check the user still exists (they may have been deleted after token issue)
  const currentUser = await User.findById(decoded.id).select(
    '+passwordChangedAt +isActive'
  );

  if (!currentUser) {
    throw new ApiError(
      'The account belonging to this token no longer exists.',
      401
    );
  }

  // 4. Check account is active
  if (!currentUser.isActive) {
    throw new ApiError('Your account has been deactivated. Please contact support.', 403);
  }

  // 5. Check if password was changed after the token was issued
  if (currentUser.passwordChangedAfter(decoded.iat)) {
    throw new ApiError(
      'Password was recently changed. Please log in again.',
      401
    );
  }

  // 6. Attach user to request — available to all downstream middleware/handlers
  req.user = currentUser;
  next();
});

module.exports = authenticate;
