/**
 * Structured logging utility for Cloud Functions
 * Implements enterprise-grade logging with security and performance monitoring
 */

import * as functions from 'firebase-functions';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * Log entry structure for consistent formatting
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  functionName?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Performance metrics for function monitoring
 */
export interface PerformanceMetrics {
  functionName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsed?: number;
  success: boolean;
  userId?: string;
  sessionId?: string;
}

/**
 * Security event logging for audit trails
 */
export interface SecurityEvent {
  eventType: 'auth_success' | 'auth_failure' | 'permission_denied' | 
            'rate_limit_exceeded' | 'suspicious_activity' | 'data_access';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private functionName: string;
  private requestId: string;
  private userId?: string;
  private sessionId?: string;
  private startTime: number;

  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName;
    this.requestId = requestId || this.generateRequestId();
    this.startTime = Date.now();
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set user context for all subsequent logs
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Set session context for all subsequent logs
   */
  setSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Create base log entry with context
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      functionName: this.functionName,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  /**
   * Log debug information
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata);
    functions.logger.debug(message, entry);
  }

  /**
   * Log general information
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata);
    functions.logger.info(message, entry);
  }

  /**
   * Log warning conditions
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata);
    functions.logger.warn(message, entry);
  }

  /**
   * Log error conditions
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, metadata, error);
    functions.logger.error(message, entry);
  }

  /**
   * Log fatal errors that cause function termination
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, metadata, error);
    functions.logger.error(`FATAL: ${message}`, entry);
  }

  /**
   * Log function performance metrics
   */
  logPerformance(success: boolean, metadata?: Record<string, any>): void {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const metrics: PerformanceMetrics = {
      functionName: this.functionName,
      startTime: this.startTime,
      endTime,
      duration,
      success,
      userId: this.userId,
      sessionId: this.sessionId,
      memoryUsed: process.memoryUsage().heapUsed,
    };

    const message = `Function ${this.functionName} ${success ? 'completed' : 'failed'} in ${duration}ms`;
    this.info(message, { ...metrics, ...metadata });

    // Log performance warning if function is slow
    if (duration > 5000) { // 5 seconds
      this.warn(`Slow function execution detected`, {
        duration,
        functionName: this.functionName,
        threshold: 5000,
      });
    }
  }

  /**
   * Log security events for audit trail
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.info(`Security event: ${event.eventType}`, {
      securityEvent,
      audit: true,
    });
  }

  /**
   * Log user action for business analytics
   */
  logUserAction(
    action: string,
    resource?: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`User action: ${action}`, {
      action,
      resource,
      userId: this.userId,
      sessionId: this.sessionId,
      analytics: true,
      ...metadata,
    });
  }

  /**
   * Log database operations for monitoring
   */
  logDatabaseOperation(
    operation: 'read' | 'write' | 'delete' | 'query',
    collection: string,
    documentId?: string,
    queryDetails?: Record<string, any>
  ): void {
    this.debug(`Database ${operation}: ${collection}`, {
      operation,
      collection,
      documentId,
      queryDetails,
      database: true,
    });
  }

  /**
   * Log external API calls for monitoring
   */
  logExternalAPICall(
    service: string,
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean,
    statusCode?: number
  ): void {
    const message = `External API call to ${service}: ${method} ${endpoint}`;
    const logData = {
      service,
      endpoint,
      method,
      responseTime,
      success,
      statusCode,
      externalAPI: true,
    };

    if (success) {
      this.info(message, logData);
    } else {
      this.error(`${message} failed`, undefined, logData);
    }

    // Log slow API calls
    if (responseTime > 10000) { // 10 seconds
      this.warn(`Slow external API call detected`, {
        ...logData,
        threshold: 10000,
      });
    }
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: {
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Logger {
    const childLogger = new Logger(this.functionName, this.requestId);
    
    if (additionalContext.userId) {
      childLogger.setUser(additionalContext.userId);
    }
    
    if (additionalContext.sessionId) {
      childLogger.setSession(additionalContext.sessionId);
    }
    
    return childLogger;
  }
}

/**
 * Create logger instance for a function
 */
export function createLogger(functionName: string, requestId?: string): Logger {
  return new Logger(functionName, requestId);
}

/**
 * Global logger instance for utility functions
 */
export const loggerInstance = new Logger('global');

/**
 * Utility function to log function execution time
 */
export function logExecutionTime<T>(
  functionName: string,
  fn: () => Promise<T>,
  logger?: Logger
): Promise<T> {
  const log = logger || createLogger(functionName);
  const startTime = Date.now();

  return fn()
    .then((result) => {
      const duration = Date.now() - startTime;
      log.info(`${functionName} completed successfully`, { duration });
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      log.error(`${functionName} failed`, error, { duration });
      throw error;
    });
}

/**
 * Error boundary for Cloud Functions
 */
export function withErrorBoundary<T extends any[], R>(
  functionName: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const logger = createLogger(functionName);
    
    try {
      logger.info(`${functionName} started`);
      const result = await fn(...args);
      logger.logPerformance(true);
      return result;
    } catch (error) {
      logger.error(`${functionName} failed`, error as Error);
      logger.logPerformance(false, { error: (error as Error).message });
      throw error;
    }
  };
}