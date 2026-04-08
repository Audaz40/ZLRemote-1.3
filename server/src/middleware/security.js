const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production'
});

const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production'
});

const websocketRateLimit = rateLimit({
  windowMs: 1000,
  max: 50,
  message: 'Too many WebSocket messages',
  skip: () => process.env.NODE_ENV !== 'production'
});

const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email required');

const validatePassword = body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/)
  .withMessage('Password must be at least 8 characters with letters, numbers, and special characters');

const validateUsername = body('username')
  .isLength({ min: 3, max: 20 })
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Username must be 3-20 characters, alphanumeric with underscores and hyphens');

const validateSessionId = body('sessionId')
  .isLength({ min: 5, max: 20 })
  .matches(/^[A-Z0-9]+$/)
  .withMessage('Invalid session ID format');

module.exports = {
  securityHeaders,
  authRateLimit,
  apiRateLimit,
  websocketRateLimit,
  validationErrorHandler,
  validateEmail,
  validatePassword,
  validateUsername,
  validateSessionId
};
