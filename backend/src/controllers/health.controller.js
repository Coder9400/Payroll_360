const { sendSuccess } = require('../utils/apiResponse');
const { checkDatabaseConnection } = require('../config/supabase');
const config = require('../config/env');

/**
 * Health check controller
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getHealth = async (req, res, next) => {
  try {
    const dbStatus = await checkDatabaseConnection();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${process.uptime().toFixed(2)}s`,
      environment: config.env,
      database: dbStatus,
      version: '1.0.0',
    };

    return sendSuccess(res, {
      data: healthData,
      message: 'PeoplePay360 Backend API is operational',
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealth,
};
