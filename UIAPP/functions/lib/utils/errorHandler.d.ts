/**
 * Centralized error handling for Cloud Functions
 * Implements enterprise-grade error management with security and monitoring
 */
import { https } from 'firebase-functions';
import { Logger } from './logger';
/**
 * Standard error codes for the application
 */
export declare enum ErrorCode {
    UNAUTHENTICATED = "unauthenticated",
    PERMISSION_DENIED = "permission-denied",
    INVALID_ARGUMENT = "invalid-argument",
    FAILED_PRECONDITION = "failed-precondition",
    OUT_OF_RANGE = "out-of-range",
    NOT_FOUND = "not-found",
    ALREADY_EXISTS = "already-exists",
    RESOURCE_EXHAUSTED = "resource-exhausted",
    INTERNAL = "internal",
    UNAVAILABLE = "unavailable",
    DEADLINE_EXCEEDED = "deadline-exceeded",
    CANCELLED = "cancelled",
    EXTERNAL_SERVICE_ERROR = "external-service-error",
    RATE_LIMIT_EXCEEDED = "rate-limit-exceeded",
    QUOTA_EXCEEDED = "quota-exceeded"
}
/**
 * Custom application error class
 */
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly context?: Record<string, any>;
    constructor(message: string, code?: ErrorCode, statusCode?: number, isOperational?: boolean, context?: Record<string, any>);
}
/**
 * Validation error for input validation failures
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Authentication error for auth failures
 */
export declare class AuthError extends AppError {
    constructor(message?: string);
}
/**
 * Authorization error for permission failures
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Resource not found error
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: string);
}
/**
 * Resource conflict error
 */
export declare class ConflictError extends AppError {
    constructor(message: string, context?: Record<string, any>);
}
/**
 * Rate limiting error
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string, retryAfter?: number);
}
/**
 * External service error
 */
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message: string, originalError?: Error);
}
/**
 * Database operation error
 */
export declare class DatabaseError extends AppError {
    constructor(operation: string, collection: string, error: Error);
}
/**
 * Configuration error
 */
export declare class ConfigurationError extends AppError {
    constructor(setting: string, message?: string);
}
/**
 * Map error to appropriate Firebase Functions error
 */
export declare function mapToHttpsError(error: Error): https.HttpsError;
/**
 * Error context extractor for logging
 */
export declare function extractErrorContext(error: Error): Record<string, any>;
/**
 * Global error handler for Cloud Functions
 */
export declare class ErrorHandler {
    private logger;
    constructor(functionName: string);
    /**
     * Handle and format errors for Cloud Functions
     */
    handleError(error: Error, context?: Record<string, any>): never;
    /**
     * Async error wrapper for Cloud Functions
     */
    handleAsync<T>(operation: () => Promise<T>, context?: Record<string, any>): Promise<T>;
    /**
     * Sync error wrapper for Cloud Functions
     */
    handle<T>(operation: () => T, context?: Record<string, any>): T;
}
/**
 * Create error handler for a function
 */
export declare function createErrorHandler(functionName: string): ErrorHandler;
/**
 * Decorator for automatic error handling
 */
export declare function withErrorHandling(functionName: string): <T extends any[], R>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>) => TypedPropertyDescriptor<(...args: T) => Promise<R>>;
/**
 * Utility function to safely parse JSON with error handling
 */
export declare function safeJsonParse<T>(jsonString: string, defaultValue: T, errorHandler?: ErrorHandler): T;
/**
 * Utility function to retry operations with exponential backoff
 */
export declare function retryWithBackoff<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number, errorHandler?: ErrorHandler): Promise<T>;
/**
 * Circuit breaker implementation for external services
 */
export declare class CircuitBreaker {
    private maxFailures;
    private timeout;
    private logger?;
    private failures;
    private lastFailureTime;
    private state;
    constructor(maxFailures?: number, timeout?: number, // 1 minute
    logger?: Logger | undefined);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
}
//# sourceMappingURL=errorHandler.d.ts.map