'use strict';

/**
 * @file utils/logger.js
 * @description Structured Winston logger.
 *              - In production: JSON format to stdout for log-aggregation pipelines.
 *              - In development: colourised, human-readable format.
 */

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize, errors, json } = format;

const developmentFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    stack
      ? `${ts} [${level}]: ${message}\n${stack}`
      : `${ts} [${level}]: ${message}`
  )
);

const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format:
    process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: [new transports.Console()],
  // Prevent Winston from exiting on unhandled errors
  exitOnError: false,
});

// Expose a stream for Morgan HTTP logging
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
