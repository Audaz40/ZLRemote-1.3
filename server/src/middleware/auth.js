const AuthService = require('../services/AuthService');
const Logger = require('../services/Logger');

class AuthMiddleware {
  constructor(authService) {
    this.authService = authService;
  }

  verifyToken() {
    return (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'Missing or invalid authorization header'
          });
        }

        const token = authHeader.slice(7);
        const decoded = this.authService.verifyAccessToken(token);
        req.userId = decoded.sub;
        next();
      } catch (error) {
        Logger.security('Invalid token attempt', {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
    };
  }

  verifyAPIKey() {
    return async (req, res, next) => {
      try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
          return res.status(401).json({
            success: false,
            error: 'Missing API key'
          });
        }

        const keyHash = require('crypto')
          .createHash('sha256')
          .update(apiKey)
          .digest('hex');

        const { data, error } = await this.authService.supabase
          .from('api_keys')
          .select('user_id')
          .eq('key_hash', keyHash)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !data) {
          Logger.security('Invalid API key attempt', {
            ip: req.ip
          });
          return res.status(401).json({
            success: false,
            error: 'Invalid API key'
          });
        }

        req.userId = data.user_id;
        next();
      } catch (error) {
        Logger.error('API key verification failed', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }

  verifyWSToken(token) {
    try {
      return this.authService.verifyAccessToken(token);
    } catch (error) {
      throw new Error('Invalid WebSocket token');
    }
  }
}

module.exports = AuthMiddleware;
