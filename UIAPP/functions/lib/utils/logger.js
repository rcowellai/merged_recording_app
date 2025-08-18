"use strict";
/**
 * Structured logging utility for Cloud Functions
 * Implements enterprise-grade logging with security and performance monitoring
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerInstance = exports.Logger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.logExecutionTime = logExecutionTime;
exports.withErrorBoundary = withErrorBoundary;
const functions = __importStar(require("firebase-functions"));
/**
 * Log levels in order of severity
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Logger class for structured logging
 */
class Logger {
    constructor(functionName, requestId) {
        this.functionName = functionName;
        this.requestId = requestId || this.generateRequestId();
        this.startTime = Date.now();
    }
    /**
     * Generate unique request ID for tracing
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Set user context for all subsequent logs
     */
    setUser(userId) {
        this.userId = userId;
    }
    /**
     * Set session context for all subsequent logs
     */
    setSession(sessionId) {
        this.sessionId = sessionId;
    }
    /**
     * Create base log entry with context
     */
    createLogEntry(level, message, metadata, error) {
        const entry = {
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
                code: error.code,
            };
        }
        return entry;
    }
    /**
     * Log debug information
     */
    debug(message, metadata) {
        const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata);
        functions.logger.debug(message, entry);
    }
    /**
     * Log general information
     */
    info(message, metadata) {
        const entry = this.createLogEntry(LogLevel.INFO, message, metadata);
        functions.logger.info(message, entry);
    }
    /**
     * Log warning conditions
     */
    warn(message, metadata) {
        const entry = this.createLogEntry(LogLevel.WARN, message, metadata);
        functions.logger.warn(message, entry);
    }
    /**
     * Log error conditions
     */
    error(message, error, metadata) {
        const entry = this.createLogEntry(LogLevel.ERROR, message, metadata, error);
        functions.logger.error(message, entry);
    }
    /**
     * Log fatal errors that cause function termination
     */
    fatal(message, error, metadata) {
        const entry = this.createLogEntry(LogLevel.FATAL, message, metadata, error);
        functions.logger.error(`FATAL: ${message}`, entry);
    }
    /**
     * Log function performance metrics
     */
    logPerformance(success, metadata) {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        const metrics = {
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
        this.info(message, Object.assign(Object.assign({}, metrics), metadata));
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
    logSecurityEvent(event) {
        const securityEvent = Object.assign(Object.assign({}, event), { timestamp: new Date().toISOString() });
        this.info(`Security event: ${event.eventType}`, {
            securityEvent,
            audit: true,
        });
    }
    /**
     * Log user action for business analytics
     */
    logUserAction(action, resource, metadata) {
        this.info(`User action: ${action}`, Object.assign({ action,
            resource, userId: this.userId, sessionId: this.sessionId, analytics: true }, metadata));
    }
    /**
     * Log database operations for monitoring
     */
    logDatabaseOperation(operation, collection, documentId, queryDetails) {
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
    logExternalAPICall(service, endpoint, method, responseTime, success, statusCode) {
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
        }
        else {
            this.error(`${message} failed`, undefined, logData);
        }
        // Log slow API calls
        if (responseTime > 10000) { // 10 seconds
            this.warn(`Slow external API call detected`, Object.assign(Object.assign({}, logData), { threshold: 10000 }));
        }
    }
    /**
     * Create child logger with additional context
     */
    child(additionalContext) {
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
exports.Logger = Logger;
/**
 * Create logger instance for a function
 */
function createLogger(functionName, requestId) {
    return new Logger(functionName, requestId);
}
/**
 * Global logger instance for utility functions
 */
exports.loggerInstance = new Logger('global');
/**
 * Utility function to log function execution time
 */
function logExecutionTime(functionName, fn, logger) {
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
function withErrorBoundary(functionName, fn) {
    return async (...args) => {
        const logger = createLogger(functionName);
        try {
            logger.info(`${functionName} started`);
            const result = await fn(...args);
            logger.logPerformance(true);
            return result;
        }
        catch (error) {
            logger.error(`${functionName} failed`, error);
            logger.logPerformance(false, { error: error.message });
            throw error;
        }
    };
}
//# sourceMappingURL=logger.js.map