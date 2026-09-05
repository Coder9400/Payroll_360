const AppError = require('../utils/appError');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsedBody = schema.parse(req.body);
      req.body = parsedBody; // Replace with validated/transformed data
      next();
    } catch (error) {
      if (error.errors) {
        // Zod error
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
          }
        });
      }
      next(error);
    }
  };
};

module.exports = validate;
