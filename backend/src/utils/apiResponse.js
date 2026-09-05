/**
 * Standard API response helper utilities
 */

/**
 * Sends a standardized success response
 * @param {import('express').Response} res
 * @param {object} options
 * @param {any} [options.data={}] - Response payload
 * @param {string} [options.message='Success'] - Human readable message
 * @param {number} [options.statusCode=200] - HTTP status code
 */
const sendSuccess = (res, { data = {}, message = 'Success', statusCode = 200 } = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

/**
 * Sends a standardized error response
 * @param {import('express').Response} res
 * @param {object} options
 * @param {string} options.message - Error message
 * @param {string} [options.code='INTERNAL_ERROR'] - Error code identifier
 * @param {number} [options.statusCode=500] - HTTP status code
 */
const sendError = (res, { message = 'An unexpected error occurred', code = 'INTERNAL_ERROR', statusCode = 500 } = {}) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

/**
 * Positional-args success helper used across most controllers.
 * successResponse(res, data, message, statusCode)
 */
const successResponse = (res, data = {}, message = 'Success', statusCode = 200) =>
  sendSuccess(res, { data, message, statusCode });

module.exports = {
  sendSuccess,
  sendError,
  successResponse,
};
