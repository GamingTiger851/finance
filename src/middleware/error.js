const logger = require('../utils/logger');

function notFound(req, _res, next) { 
  const error = new Error(`Not found: ${req.method} ${req.originalUrl}`); 
  error.status = 404; 
  next(error); 
}

function errorHandler(error, _req, res, _next) {
  const status = error.status || (error.name === 'ValidationError' ? 400 : 500);
  
  if (status >= 500) {
    logger.error('Internal server error:', { message: error.message, stack: error.stack });
  }

  // Prevent internal error details and stack traces from leaking in production
  const isProd = process.env.NODE_ENV === 'production';
  const responseMessage = (status >= 500 && isProd) 
    ? 'An unexpected error occurred. Please try again later.' 
    : (error.message || 'Internal server error');

  res.status(status).json({ error: responseMessage });
}

module.exports = { notFound, errorHandler };
