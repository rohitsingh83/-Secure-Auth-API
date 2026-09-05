'use strict';

/**
 * @file config/db.js
 * @description MongoDB connection factory using Mongoose.
 *              Retries on failure and logs connection lifecycle events.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Establishes a MongoDB connection.
 * Exits the process if the connection cannot be established (fail-fast).
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    logger.error('MONGO_URI environment variable is not defined.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 7+ no longer needs these flags, but they are kept for clarity
      serverSelectionTimeoutMS: 5000, // Timeout after 5 s if no server found
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost.');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected.');
    });
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
