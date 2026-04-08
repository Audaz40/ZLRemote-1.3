const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

function createSessionRoutes(sessionManager, authMiddleware) {
  const { validateSessionId } = require('../middleware/security');

  router.post(
    '/create',
    authMiddleware.verifyToken(),
    body('quality').optional().isIn(['low', 'medium', 'high', 'adaptive']),
    body('maxFPS').optional().isInt({ min: 30, max: 240 }),
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }

        const session = await sessionManager.createSession(req.userId, req.body);
        res.status(201).json({
          success: true,
          data: session
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/:sessionId',
    authMiddleware.verifyToken(),
    async (req, res, next) => {
      try {
        const session = await sessionManager.getSession(req.params.sessionId);
        res.json({
          success: true,
          data: session
        });
      } catch (error) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
    }
  );

  router.get(
    '',
    authMiddleware.verifyToken(),
    async (req, res, next) => {
      try {
        const sessions = await sessionManager.getUserSessions(req.userId);
        res.json({
          success: true,
          data: sessions
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:sessionId/end',
    authMiddleware.verifyToken(),
    async (req, res, next) => {
      try {
        const session = await sessionManager.getSession(req.params.sessionId);
        if (session.host_id !== req.userId) {
          return res.status(403).json({
            success: false,
            error: 'Only host can end session'
          });
        }

        await sessionManager.endSession(req.params.sessionId);
        res.json({
          success: true,
          message: 'Session ended'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = createSessionRoutes;
