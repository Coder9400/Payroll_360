const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom morgan stream to use application logger
const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Morgan format configuration
const format = process.env.NODE_ENV === 'production' 
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'
  : ':method :url :status :response-time ms - :res[content-length]';

const requestLogger = morgan(format, { stream });

module.exports = requestLogger;
