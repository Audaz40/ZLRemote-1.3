const pino = require('pino');
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isDevelopment = process.env.NODE_ENV !== 'production';

const pinoConfig = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
};

class LoggerService {
  constructor() {
    this.logger = pino(pinoConfig);
    this.correlationIds = new WeakMap();
  }

  getCorrelationId(req) {
    return req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  info(msg, data = {}) {
    this.logger.info(data, msg);
  }

  error(msg, error, data = {}) {
    const errorData = {
      ...data,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    };
    this.logger.error(errorData, msg);
  }

  warn(msg, data = {}) {
    this.logger.warn(data, msg);
  }

  debug(msg, data = {}) {
    this.logger.debug(data, msg);
  }

  websocket(msg, clientId, data = {}) {
    this.logger.debug({ clientId, ...data }, `[WebSocket] ${msg}`);
  }

  session(msg, sessionId, data = {}) {
    this.logger.info({ sessionId, ...data }, `[Session] ${msg}`);
  }

  security(msg, data = {}) {
    this.logger.warn({ ...data }, `[SECURITY] ${msg}`);
  }

  performance(msg, data = {}) {
    this.logger.debug({ ...data }, `[Performance] ${msg}`);
  }
}

module.exports = new LoggerService();
