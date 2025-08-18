/**
 * Centralized error handling for Cloud Functions
 * Implements enterprise-grade error management with security and monitoring
 */

import { https } from 'firebase-functions';
import { Logger, createLogger } from './logger';

/**
 * Standard error codes for the application
 */
export enum ErrorCode {
  // Authentication and authorization errors
  UNAUTHENTICATED = 'unauthenticated',
  PERMISSION_DENIED = 'permission-denied',
  
  // Validation errors
  INVALID_ARGUMENT = 'invalid-argument',
  FAILED_PRECONDITION = 'failed-precondition',
  OUT_OF_RANGE = 'out-of-range',
  
  // Resource errors
  NOT_FOUND = 'not-found',
  ALREADY_EXISTS = 'already-exists',
  RESOURCE_EXHAUSTED = 'resource-exhausted',
  
  // System errors
  INTERNAL = 'internal',
  UNAVAILABLE = 'unavailable',
  DEADLINE_EXCEEDED = 'deadline-exceeded',
  CANCELLED = 'cancelled',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'external-service-error',
  RATE_LIMIT_EXCEEDED = 'rate-limit-exceeded',
  QUOTA_EXCEEDED = 'quota-exceeded',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    Error.captureStackTrace(this, AppError);
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.INVALID_ARGUMENT, 400, true, { validationErrors: details });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorCode.UNAUTHENTICATED, 401, true);
    this.name = 'AuthError';
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, ErrorCode.PERMISSION_DENIED, 403, true);
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, 404, true, { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * Resource conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.ALREADY_EXISTS, 409, true, context);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: Error) {
    super(
      `External service error from ${service}: ${message}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      502,
      true,
      { service, originalError: originalError?.message }
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * Database operation error
 */
export class DatabaseError extends AppError {
  constructor(operation: string, collection: string, error: Error) {
    super(
      `Database ${operation} failed on ${collection}: ${error.message}`,
      ErrorCode.INTERNAL,
      500,
      true,
      { operation, collection, originalError: error.message }
    );
    this.name = 'DatabaseError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends AppError {
  constructor(setting: string, message?: string) {
    super(
      `Configuration error for ${setting}${message ? ': ' + message : ''}`,
      ErrorCode.FAILED_PRECONDITION,
      500,
      false, // Not operational - requires code fix
      { setting }
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Map error to appropriate Firebase Functions error
 */
export function mapToHttpsError(error: Error): https.HttpsError {
  // If it's already an HttpsError, return as is
  if (error instanceof https.HttpsError) {
    return error;
  }
  
  // If it's our custom AppError, map appropriately
  if (error instanceof AppError) {
    return new https.HttpsError(
      error.code as any,
      error.message,
      error.context
    );
  }
  
  // Map common Firebase errors
  if (error.message.includes('permission-denied')) {
    return new https.HttpsError('permission-denied', error.message);
  }
  
  if (error.message.includes('not-found')) {
    return new https.HttpsError('not-found', error.message);
  }
  
  if (error.message.includes('already-exists')) {
    return new https.HttpsError('already-exists', error.message);
  }
  
  // Default to internal error
  return new https.HttpsError('internal', 'Internal server error');
}

/**
 * Error context extractor for logging
 */
export function extractErrorContext(error: Error): Record<string, any> {
  const context: Record<string, any> = {
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
export class ErrorHandler {
  private logger: Logger;
  
  constructor(functionName: string) {
    this.logger = createLogger(functionName);
  }
  
  /**
   * Handle and format errors for Cloud Functions
   */
  handleError(error: Error, context?: Record<string, any>): never {
    const errorContext = {
      ...extractErrorContext(error),
      ...context,
    };
    
    // Log the error
    if (error instanceof AppError && error.isOperational) {
      // Operational errors are expected - log as warning
      this.logger.warn('Operational error occurred', errorContext);
    } else {
      // Programming errors are unexpected - log as error
      this.logger.error('Unexpected error occurred', error, errorContext);
    }
    
    // Throw appropriate Firebase error
    throw mapToHttpsError(error);
  }
  
  /**
   * Async error wrapper for Cloud Functions
   */
  async handleAsync<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error, context);
    }
  }
  
  /**
   * Sync error wrapper for Cloud Functions
   */
  handle<T>(
    operation: () => T,
    context?: Record<string, any>
  ): T {
    try {
      return operation();
    } catch (error) {
      this.handleError(error as Error, context);
    }
  }
}

/**
 * Create error handler for a function
 */
export function createErrorHandler(functionName: string): ErrorHandler {
  return new ErrorHandler(functionName);
}

/**
 * Decorator for automatic error handling
 */
export function withErrorHandling(functionName: string) {
  const errorHandler = createErrorHandler(functionName);
  
  return function <T extends any[], R>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const originalMethod = descriptor.value!;
    
    descriptor.value = async function (...args: T): Promise<R> {
      return errorHandler.handleAsync(() => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
}

/**
 * Utility function to safely parse JSON with error handling
 */
export function safeJsonParse<T>(
  jsonString: string,
  defaultValue: T,
  errorHandler?: ErrorHandler
): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (errorHandler) {
      errorHandler.logger.warn('Failed to parse JSON', {
        jsonString: jsonString.substring(0, 100), // First 100 chars for debugging
        error: (error as Error).message,
      });
    }
    return defaultValue;
  }
}

/**
 * Utility function to retry operations with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  errorHandler?: ErrorHandler
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
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
  
  throw lastError!;
}

/**
 * Circuit breaker implementation for external services
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private maxFailures: number = 5,
    private timeout: number = 60000, // 1 minute
    private logger?: Logger
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new ExternalServiceError(
          'circuit-breaker',
          'Circuit breaker is OPEN - too many recent failures'
        );
      } else {
        this.state = 'HALF_OPEN';
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.logger?.info('Circuit breaker reset to CLOSED state');
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
      this.logger?.warn('Circuit breaker opened due to failures', {
        failures: this.failures,
        maxFailures: this.maxFailures,
      });
    }
  }
}