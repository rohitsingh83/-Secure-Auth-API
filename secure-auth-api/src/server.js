'use strict';

/**
 * @file server.js
 * @description Application entry point. Connects to MongoDB and starts the
 *              HTTP server. Handles uncaught exceptions and unhandled promise
 *              rejections to prevent silent process crashes.
 */

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

// ── Crash-safety guards ──────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`UNHANDLED REJECTION: ${reason}`);
  process.exit(1);
});

// ── Startup ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(
      `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();
