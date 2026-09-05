'use strict';

// Load environment variables from .env before any tests run
require('dotenv').config();

// Override DB for tests so we never touch the dev/prod database
process.env.MONGO_URI = 'mongodb://localhost:27017/secure_auth_test';
process.env.NODE_ENV  = 'test';

// Use fast bcrypt rounds in tests to keep suite fast
process.env.BCRYPT_SALT_ROUNDS = '4';

// Short-lived tokens for easier test coverage
process.env.JWT_EXPIRES_IN         = '5m';
process.env.JWT_REFRESH_EXPIRES_IN = '10m';
