const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

function createAuthRoutes(authService, authMiddleware) {
  const {
    validateEmail,
    validatePassword,
    validateUsername,
    validationErrorHandler,
    authRateLimit
  } = require('../middleware/security');

  router.post(
    '/register',
    authRateLimit,
    validateEmail,
    validatePassword,
    validateUsername,
    validationErrorHandler,
    async (req, res, next) => {
      try {
        const { email, password, username, displayName } = req.body;
        const result = await authService.register(email, username, password, displayName);
        res.status(201).json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/login',
    authRateLimit,
    validateEmail,
    body('password').notEmpty().withMessage('Password required'),
    validationErrorHandler,
    async (req, res, next) => {
      try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(401).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  router.post(
    '/refresh',
    body('refreshToken').notEmpty().withMessage('Refresh token required'),
    validationErrorHandler,
    async (req, res, next) => {
      try {
        const { refreshToken } = req.body;
        const result = await authService.refreshAccessToken(refreshToken);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(401).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  router.get(
    '/me',
    authMiddleware.verifyToken(),
    async (req, res, next) => {
      try {
        const user = await authService.verifyUser(req.userId);
        res.json({
          success: true,
          data: user
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = createAuthRoutes;
