"use strict";
/**
 * Centralized error handling for Cloud Functions
 * Implements enterprise-grade error management with security and monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.ErrorHandler = exports.ConfigurationError = exports.DatabaseError = exports.ExternalServiceError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthError = exports.ValidationError = exports.AppError = exports.ErrorCode = void 0;
exports.mapToHttpsError = mapToHttpsError;
exports.extractErrorContext = extractErrorContext;
exports.createErrorHandler = createErrorHandler;
exports.withErrorHandling = withErrorHandling;
exports.safeJsonParse = safeJsonParse;
exports.retryWithBackoff = retryWithBackoff;
const firebase_functions_1 = require("firebase-functions");
const logger_1 = require("./logger");
/**
 * Standard error codes for the application
 */
var ErrorCode;
(function (ErrorCode) {
    // Authentication and authorization errors
    ErrorCode["UNAUTHENTICATED"] = "unauthenticated";
    ErrorCode["PERMISSION_DENIED"] = "permission-denied";
    // Validation errors
    ErrorCode["INVALID_ARGUMENT"] = "invalid-argument";
    ErrorCode["FAILED_PRECONDITION"] = "failed-precondition";
    ErrorCode["OUT_OF_RANGE"] = "out-of-range";
    // Resource errors
    ErrorCode["NOT_FOUND"] = "not-found";
    ErrorCode["ALREADY_EXISTS"] = "already-exists";
    ErrorCode["RESOURCE_EXHAUSTED"] = "resource-exhausted";
    // System errors
    ErrorCode["INTERNAL"] = "internal";
    ErrorCode["UNAVAILABLE"] = "unavailable";
    ErrorCode["DEADLINE_EXCEEDED"] = "deadline-exceeded";
    ErrorCode["CANCELLED"] = "cancelled";
    // External service errors
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "external-service-error";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "rate-limit-exceeded";
    ErrorCode["QUOTA_EXCEEDED"] = "quota-exceeded";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(message, code = ErrorCode.INTERNAL, statusCode = 500, isOperational = true, context) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;
        Error.captureStackTrace(this, AppError);
    }
}
exports.AppError = AppError;
/**
 * Validation error for input validation failures
 */
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, ErrorCode.INVALID_ARGUMENT, 400, true, { validationErrors: details });
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error for auth failures
 */
class AuthError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, ErrorCode.UNAUTHENTICATED, 401, true);
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
/**
 * Authorization error for permission failures
 */
class AuthorizationError extends AppError {
    constructor(message = 'Permission denied') {
        super(message, ErrorCode.PERMISSION_DENIED, 403, true);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Resource not found error
 */
class NotFoundError extends AppError {
    constructor(resource, id) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(message, ErrorCode.NOT_FOUND, 404, true, { resource, id });
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Resource conflict error
 */
class ConflictError extends AppError {
    constructor(message, context) {
        super(message, ErrorCode.ALREADY_EXISTS, 409, true, context);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/**
 * Rate limiting error
 */
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', retryAfter) {
        super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true, { retryAfter });
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
/**
 * External service error
 */
class ExternalServiceError extends AppError {
    constructor(service, message, originalError) {
        super(`External service error from ${service}: ${message}`, ErrorCode.EXTERNAL_SERVICE_ERROR, 502, true, { service, originalError: originalError === null || originalError === void 0 ? void 0 : originalError.message });
        this.name = 'ExternalServiceError';
    }
}
exports.ExternalServiceError = ExternalServiceError;
/**
 * Database operation error
 */
class DatabaseError extends AppError {
    constructor(operation, collection, error) {
        super(`Database ${operation} failed on ${collection}: ${error.message}`, ErrorCode.INTERNAL, 500, true, { operation, collection, originalError: error.message });
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Configuration error
 */
class ConfigurationError extends AppError {
    constructor(setting, message) {
        super(`Configuration error for ${setting}${message ? ': ' + message : ''}`, ErrorCode.FAILED_PRECONDITION, 500, false, // Not operational - requires code fix
        { setting });
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Map error to appropriate Firebase Functions error
 */
function mapToHttpsError(error) {
    // If it's already an HttpsError, return as is
    if (error instanceof firebase_functions_1.https.HttpsError) {
        return error;
    }
    // If it's our custom AppError, map appropriately
    if (error instanceof AppError) {
        return new firebase_functions_1.https.HttpsError(error.code, error.message, error.context);
    }
    // Map common Firebase errors
    if (error.message.includes('permission-denied')) {
        return new firebase_functions_1.https.HttpsError('permission-denied', error.message);
    }
    if (error.message.includes('not-found')) {
        return new firebase_functions_1.https.HttpsError('not-found', error.message);
    }
    if (error.message.includes('already-exists')) {
        return new firebase_functions_1.https.HttpsError('already-exists', error.message);
    }
    // Default to internal error
    return new firebase_functions_1.https.HttpsError('internal', 'Internal server error');
}
/**
 * Error context extractor for logging
 */
function extractErrorContext(error) {
    const context = {
        name: error.name,
        message: error.message,
        stack: error.stack,
    };
    if (error instanceof AppError) {
        context.code = error.code;
        context.statusCode = error.statusCode;
        context.isOperational = error.isOperational;
        context.context = error.context;
    }
    return context;
}
/**
 * Global error handler for Cloud Functions
 */
class ErrorHandler {
    constructor(functionName) {
        this.logger = (0, logger_1.createLogger)(functionName);
    }
    /**
     * Handle and format errors for Cloud Functions
     */
    handleError(error, context) {
        const errorContext = Object.assign(Object.assign({}, extractErrorContext(error)), context);
        // Log the error
        if (error instanceof AppError && error.isOperational) {
            // Operational errors are expected - log as warning
            this.logger.warn('Operational error occurred', errorContext);
        }
        else {
            // Programming errors are unexpected - log as error
            this.logger.error('Unexpected error occurred', error, errorContext);
        }
        // Throw appropriate Firebase error
        throw mapToHttpsError(error);
    }
    /**
     * Async error wrapper for Cloud Functions
     */
    async handleAsync(operation, context) {
        try {
            return await operation();
        }
        catch (error) {
            this.handleError(error, context);
        }
    }
    /**
     * Sync error wrapper for Cloud Functions
     */
    handle(operation, context) {
        try {
            return operation();
        }
        catch (error) {
            this.handleError(error, context);
        }
    }
}
exports.ErrorHandler = ErrorHandler;
/**
 * Create error handler for a function
 */
function createErrorHandler(functionName) {
    return new ErrorHandler(functionName);
}
/**
 * Decorator for automatic error handling
 */
function withErrorHandling(functionName) {
    const errorHandler = createErrorHandler(functionName);
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            return errorHandler.handleAsync(() => originalMethod.apply(this, args));
        };
        return descriptor;
    };
}
/**
 * Utility function to safely parse JSON with error handling
 */
function safeJsonParse(jsonString, defaultValue, errorHandler) {
    try {
        return JSON.parse(jsonString);
    }
    catch (error) {
        if (errorHandler) {
            errorHandler.logger.warn('Failed to parse JSON', {
                jsonString: jsonString.substring(0, 100), // First 100 chars for debugging
                error: error.message,
            });
        }
        return defaultValue;
    }
}
/**
 * Utility function to retry operations with exponential backoff
 */
async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000, errorHandler) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (errorHandler) {
                errorHandler.logger.warn(`Attempt ${attempt} failed, retrying...`, {
                    attempt,
                    maxRetries,
                    error: lastError.message,
                });
            }
            if (attempt === maxRetries) {
                break;
            }
            // Exponential backoff with jitter
            const delay = baseDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
/**
 * Circuit breaker implementation for external services
 */
class CircuitBreaker {
    constructor(maxFailures = 5, timeout = 60000, // 1 minute
    logger) {
        this.maxFailures = maxFailures;
        this.timeout = timeout;
        this.logger = logger;
        this.failures = 0;
        this.lastFailureTime = 0;
        this.state = 'CLOSED';
    }
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime < this.timeout) {
                throw new ExternalServiceError('circuit-breaker', 'Circuit breaker is OPEN - too many recent failures');
            }
            else {
                this.state = 'HALF_OPEN';
            }
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        var _a;
        this.failures = 0;
        this.state = 'CLOSED';
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.info('Circuit breaker reset to CLOSED state');
    }
    onFailure() {
        var _a;
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.maxFailures) {
            this.state = 'OPEN';
            (_a = this.logger) === null || _a === void 0 ? void 0 : _a.warn('Circuit breaker opened due to failures', {
                failures: this.failures,
                maxFailures: this.maxFailures,
            });
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=errorHandler.js.map