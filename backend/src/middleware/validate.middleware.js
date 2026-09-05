const AppError = require('../utils/appError');

/**
 * Express middleware to validate request body/query/params using a Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} [source='body']
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return next(new AppError(`Validation failed: ${message}`, 400, 'VALIDATION_ERROR'));
      }
      return next(new AppError('Invalid request data', 400, 'VALIDATION_ERROR'));
    }
  };
};

module.exports = validate;
