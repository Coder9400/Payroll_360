const AppError = require('../utils/appError');

/**
 * Middleware to handle 404 Route Not Found
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = notFoundHandler;
