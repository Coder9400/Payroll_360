/**
 * Custom application error class for centralized error handling
 */
class AppError extends Error {
  /**
   * @param {string} message - Error description
   * @param {number} [statusCode=500] - HTTP status code
   * @param {string} [errorCode='INTERNAL_ERROR'] - Application specific error code
   */
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
