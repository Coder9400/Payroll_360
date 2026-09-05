const logger = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');

/**
 * Centralized error handling middleware
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (err.status ? parseInt(err.status, 10) : 500);
  const errorCode = err.errorCode || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred on the server';

  // Log server/internal errors with stack trace
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${message}`, {
      stack: err.stack,
      errorCode,
      statusCode,
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${statusCode} [${errorCode}]: ${message}`);
  }

  return sendError(res, {
    message,
    code: errorCode,
    statusCode,
  });
};

module.exports = errorHandler;
