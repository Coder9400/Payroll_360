const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { isConfigured } = require('./config/supabase');

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`===============================================`);
  logger.info(` PeoplePay360 Backend Service Started `);
  logger.info(` Environment : ${config.env}`);
  logger.info(` Listening on: http://localhost:${PORT}`);
  logger.info(` Health Check: http://localhost:${PORT}/api/health`);
  logger.info(` Supabase DB : ${isConfigured ? 'Configured' : 'Using Placeholder/Unconfigured'}`);
  logger.info(`===============================================`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = server;
