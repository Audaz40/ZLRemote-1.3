class Logger {
    constructor(context = 'App') {
      this.context = context;
      this.level = process.env.LOG_LEVEL || 'info';
      this.levels = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4,
      };
    }
  
    shouldLog(level) {
      return this.levels[level] <= this.levels[this.level];
    }
  
    formatMessage(level, message, meta = {}) {
      const timestamp = new Date().toISOString();
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaStr}`;
    }
  
    error(message, meta = {}) {
      if (this.shouldLog('error')) {
        console.error(this.formatMessage('error', message, meta));
      }
    }
  
    warn(message, meta = {}) {
      if (this.shouldLog('warn')) {
        console.warn(this.formatMessage('warn', message, meta));
      }
    }
  
    info(message, meta = {}) {
      if (this.shouldLog('info')) {
        console.info(this.formatMessage('info', message, meta));
      }
    }
  
    debug(message, meta = {}) {
      if (this.shouldLog('debug')) {
        console.debug(this.formatMessage('debug', message, meta));
      }
    }
  
    trace(message, meta = {}) {
      if (this.shouldLog('trace')) {
        console.trace(this.formatMessage('trace', message, meta));
      }
    }
  
    child(context) {
      return new Logger(`${this.context}:${context}`);
    }
  }
  
  module.exports = Logger;