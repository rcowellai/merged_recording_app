/**
 * Structured logging utility for Cloud Functions
 * Implements enterprise-grade logging with security and performance monitoring
 */
/**
 * Log levels in order of severity
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
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
    eventType: 'auth_success' | 'auth_failure' | 'permission_denied' | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_access';
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
export declare class Logger {
    private functionName;
    private requestId;
    private userId?;
    private sessionId?;
    private startTime;
    constructor(functionName: string, requestId?: string);
    /**
     * Generate unique request ID for tracing
     */
    private generateRequestId;
    /**
     * Set user context for all subsequent logs
     */
    setUser(userId: string): void;
    /**
     * Set session context for all subsequent logs
     */
    setSession(sessionId: string): void;
    /**
     * Create base log entry with context
     */
    private createLogEntry;
    /**
     * Log debug information
     */
    debug(message: string, metadata?: Record<string, any>): void;
    /**
     * Log general information
     */
    info(message: string, metadata?: Record<string, any>): void;
    /**
     * Log warning conditions
     */
    warn(message: string, metadata?: Record<string, any>): void;
    /**
     * Log error conditions
     */
    error(message: string, error?: Error, metadata?: Record<string, any>): void;
    /**
     * Log fatal errors that cause function termination
     */
    fatal(message: string, error?: Error, metadata?: Record<string, any>): void;
    /**
     * Log function performance metrics
     */
    logPerformance(success: boolean, metadata?: Record<string, any>): void;
    /**
     * Log security events for audit trail
     */
    logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void;
    /**
     * Log user action for business analytics
     */
    logUserAction(action: string, resource?: string, metadata?: Record<string, any>): void;
    /**
     * Log database operations for monitoring
     */
    logDatabaseOperation(operation: 'read' | 'write' | 'delete' | 'query', collection: string, documentId?: string, queryDetails?: Record<string, any>): void;
    /**
     * Log external API calls for monitoring
     */
    logExternalAPICall(service: string, endpoint: string, method: string, responseTime: number, success: boolean, statusCode?: number): void;
    /**
     * Create child logger with additional context
     */
    child(additionalContext: {
        userId?: string;
        sessionId?: string;
        metadata?: Record<string, any>;
    }): Logger;
}
/**
 * Create logger instance for a function
 */
export declare function createLogger(functionName: string, requestId?: string): Logger;
/**
 * Global logger instance for utility functions
 */
export declare const loggerInstance: Logger;
/**
 * Utility function to log function execution time
 */
export declare function logExecutionTime<T>(functionName: string, fn: () => Promise<T>, logger?: Logger): Promise<T>;
/**
 * Error boundary for Cloud Functions
 */
export declare function withErrorBoundary<T extends any[], R>(functionName: string, fn: (...args: T) => Promise<R>): (...args: T) => Promise<R>;
//# sourceMappingURL=logger.d.ts.map