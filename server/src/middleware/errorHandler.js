const Logger = require('../services/Logger');

class ErrorHandler {
  static handle(err, req, res, next) {
    const correlationId = req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    Logger.error('Request error', err, {
      correlationId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.userId
    });

    let statusCode = 500;
    let message = 'Internal server error';
    let details = {};

    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      details = err.details;
    } else if (err.name === 'AuthenticationError') {
      statusCode = 401;
      message = 'Authentication failed';
    } else if (err.name === 'AuthorizationError') {
      statusCode = 403;
      message = 'Insufficient permissions';
    } else if (err.name === 'NotFoundError') {
      statusCode = 404;
      message = 'Resource not found';
    } else if (err.statusCode) {
      statusCode = err.statusCode;
      message = err.message;
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      correlationId,
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }

  static notFound(req, res) {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });
  }
}

module.exports = ErrorHandler;
