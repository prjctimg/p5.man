import fs from 'fs/promises';
import path from 'path';

/**
 * Logger utility for consistent error handling and logging
 */
export class Logger {
  constructor(options = {}) {
    this.debug = options.debug || process.env.DEBUG === 'true';
    this.logLevel = options.level || 'info';
    this.logFile = options.file || null;
    this.colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m'
    };
    
    this.emoji = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      success: '✅',
      debug: '🐛',
      progress: '⏳',
      start: '🚀',
      complete: '🎉'
    };
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  error(message, error = null) {
    const formattedMessage = `${this.emoji.error} ${message}`;
    this.writeLog('error', formattedMessage);
    
    if (error && this.debug) {
      console.error(error.stack);
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    const formattedMessage = `${this.emoji.warn} ${message}`;
    this.writeLog('warn', formattedMessage);
  }

  /**
   * Log an info message
   * @param {string} message - Info message
   */
  info(message) {
    const formattedMessage = `${this.emoji.info} ${message}`;
    this.writeLog('info', formattedMessage);
  }

  /**
   * Log a success message
   * @param {string} message - Success message
   */
  success(message) {
    const formattedMessage = `${this.emoji.success} ${message}`;
    this.writeLog('success', formattedMessage);
  }

  /**
   * Log a debug message
   * @param {string} message - Debug message
   */
  debug(message) {
    if (!this.debug) return;
    
    const formattedMessage = `${this.emoji.debug} ${message}`;
    this.writeLog('debug', formattedMessage);
  }

  /**
   * Log a progress message
   * @param {string} message - Progress message
   */
  progress(message) {
    const formattedMessage = `${this.emoji.progress} ${message}`;
    this.writeLog('info', formattedMessage);
  }

  /**
   * Log a start message
   * @param {string} message - Start message
   */
  start(message) {
    const formattedMessage = `${this.emoji.start} ${message}`;
    this.writeLog('info', formattedMessage);
  }

  /**
   * Log a completion message
   * @param {string} message - Completion message
   */
  complete(message) {
    const formattedMessage = `${this.emoji.complete} ${message}`;
    this.writeLog('success', formattedMessage);
  }

  /**
   * Write log to console and/or file
   * @param {string} level - Log level
   * @param {string} message - Message to log
   */
  writeLog(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    // Console output with colors
    if (level === 'error') {
      console.error(this.colorize(message, 'red'));
    } else if (level === 'warn') {
      console.warn(this.colorize(message, 'yellow'));
    } else if (level === 'success') {
      console.log(this.colorize(message, 'green'));
    } else if (level === 'debug') {
      console.log(this.colorize(message, 'gray'));
    } else {
      console.log(message);
    }
    
    // File output (without colors)
    if (this.logFile) {
      this.writeToFile(logEntry, level);
    }
  }

  /**
   * Apply color to text for console output
   * @param {string} text - Text to colorize
   * @param {string} color - Color name
   * @returns {string} Colorized text
   */
  colorize(text, color) {
    if (!this.colors[color]) return text;
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  /**
   * Write log entry to file
   * @param {string} entry - Log entry
   * @param {string} level - Log level
   */
  async writeToFile(entry, level) {
    if (!this.logFile) return;
    
    try {
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
      
      const logEntry = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${entry}\n`;
      await fs.appendFile(this.logFile, logEntry, 'utf8');
    } catch (error) {
      console.warn('Failed to write to log file:', error.message);
    }
  }

  /**
   * Log operation start
   * @param {string} operation - Operation name
   * @param {Object} context - Additional context
   */
  operationStart(operation, context = {}) {
    this.start(`Starting ${operation}`);
    if (this.debug) {
      this.debug(`Context: ${JSON.stringify(context)}`);
    }
  }

  /**
   * Log operation completion
   * @param {string} operation - Operation name
   * @param {Object} result - Operation result
   */
  operationComplete(operation, result = {}) {
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    this.complete(`Completed ${operation}${duration}`);
    
    if (result.warning) {
      this.warn(`Warning: ${result.warning}`);
    }
    
    if (result.stats) {
      this.info(`Stats: ${JSON.stringify(result.stats)}`);
    }
  }

  /**
   * Log operation failure
   * @param {string} operation - Operation name
   * @param {Error|string} error - Error information
   */
  operationFail(operation, error) {
    const errorMessage = error?.message || error;
    this.error(`Failed ${operation}: ${errorMessage}`, error);
  }

  /**
   * Create a child logger with additional context
   * @param {string} context - Additional context
   * @returns {Object} Child logger
   */
  child(context) {
    return {
      error: (msg, err) => this.error(`[${context}] ${msg}`, err),
      warn: (msg) => this.warn(`[${context}] ${msg}`),
      info: (msg) => this.info(`[${context}] ${msg}`),
      success: (msg) => this.success(`[${context}] ${msg}`),
      debug: (msg) => this.debug(`[${context}] ${msg}`),
      progress: (msg) => this.progress(`[${context}] ${msg}`),
      start: (msg) => this.start(`[${context}] ${msg}`),
      complete: (msg) => this.complete(`[${context}] ${msg}`),
      operationStart: (op, ctx) => this.operationStart(`${context}.${op}`, ctx),
      operationComplete: (op, result) => this.operationComplete(`${context}.${op}`, result),
      operationFail: (op, err) => this.operationFail(`${context}.${op}`, err)
    };
  }
}

/**
 * Error handling utility with automatic retry logic
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.logger = options.logger || new Logger();
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise} Operation result
   */
  async execute(operation, options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries;
    const retryDelay = options.retryDelay || this.retryDelay;
    const shouldRetry = options.shouldRetry || this.defaultShouldRetry;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.success(`Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries && shouldRetry(error, attempt)) {
          this.logger.warn(`Attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
          this.logger.debug(`Error: ${error.message}`);
          
          await this.delay(retryDelay);
        } else {
          this.logger.error(`Operation failed after ${attempt} attempt(s)`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Default retry condition
   * @param {Error} error - Error to check
   * @param {number} attempt - Current attempt number
   * @returns {boolean} True if should retry
   */
  defaultShouldRetry(error, attempt) {
    // Retry for network errors and rate limits
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND') {
      return true;
    }
    
    // Retry for HTTP 5xx errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Retry for rate limiting (429)
    if (error.status === 429) {
      return true;
    }
    
    return false;
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a timeout for operations
   * @param {Promise} promise - Operation promise
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise} Promise with timeout
   */
  async withTimeout(promise, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    try {
      return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
      if (error.message.includes('timed out')) {
        this.logger.error('Operation timed out');
      }
      throw error;
    }
  }

  /**
   * Safely execute operation and handle errors
   * @param {Function} operation - Operation to execute
   * @param {*} defaultValue - Default value on error
   * @returns {*} Operation result or default value
   */
  safe(operation, defaultValue = null) {
    try {
      return operation();
    } catch (error) {
      this.logger.error('Safe operation failed', error);
      return defaultValue;
    }
  }
}

/**
 * Create a default logger instance
 */
export const logger = new Logger({
  debug: process.env.DEBUG === 'true',
  level: 'info'
});

/**
 * Create a default error handler instance
 */
export const errorHandler = new ErrorHandler({
  logger,
  maxRetries: 3,
  retryDelay: 1000
});

/**
 * Performance monitor utility
 */
export class PerformanceMonitor {
  constructor() {
    this.timers = new Map();
  }

  /**
   * Start timing an operation
   * @param {string} name - Operation name
   */
  start(name) {
    this.timers.set(name, {
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage()
    });
  }

  /**
   * End timing an operation
   * @param {string} name - Operation name
   * @returns {Object} Performance metrics
   */
  end(name) {
    const timer = this.timers.get(name);
    if (!timer) {
      return null;
    }
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - timer.startTime) / 1000000; // Convert to milliseconds
    const memoryDiff = endMemory.heapUsed - timer.startMemory.heapUsed;
    
    const metrics = {
      name,
      duration: Math.round(duration),
      memoryDelta: memoryDiff,
      startMemory: timer.startMemory.heapUsed,
      endMemory: endMemory.heapUsed
    };
    
    this.timers.delete(name);
    
    logger.debug(`Performance: ${name} - ${duration}ms, memory: ${memoryDiff} bytes`);
    
    return metrics;
  }

  /**
   * Get all active timers
   * @returns {Array} Array of active timer names
   */
  getActiveTimers() {
    return Array.from(this.timers.keys());
  }

  /**
   * Clear all timers
   */
  clear() {
    this.timers.clear();
  }
}