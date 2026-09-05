const AppError = require('../utils/appError');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsedBody = schema.parse(req.body);
      req.body = parsedBody; // Replace with validated/transformed data
      next();
    } catch (error) {
      // Zod v3 uses error.errors; Zod v4 uses error.issues
      const issues = error.issues || error.errors;
      if (issues) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: issues.map(e => ({ path: e.path.join('.'), message: e.message }))
          }
        });
      }
      next(error);
    }
  };
};

module.exports = validate;
