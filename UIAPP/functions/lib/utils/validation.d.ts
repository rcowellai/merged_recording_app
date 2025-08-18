/**
 * Input validation utilities for Cloud Functions
 * Implements security-first validation with comprehensive error handling
 */
import * as Joi from 'joi';
import { https } from 'firebase-functions';
/**
 * Custom validation error class
 */
export declare class ValidationError extends Error {
    details: any;
    constructor(message: string, details: any);
}
/**
 * Validation schemas for different data types
 */
export declare const schemas: {
    userId: Joi.StringSchema<string>;
    email: Joi.StringSchema<string>;
    promptData: Joi.ObjectSchema<any>;
    sessionId: Joi.StringSchema<string>;
    recordingMetadata: Joi.ObjectSchema<any>;
    storyData: Joi.ObjectSchema<any>;
    pagination: Joi.ObjectSchema<any>;
};
/**
 * Validate input data against a schema
 */
export declare function validateInputData<T>(data: any, schema: Joi.Schema): T;
/**
 * Validate Firebase Auth context
 */
export declare function validateAuth(context: https.CallableContext): string;
/**
 * Validate request rate limiting
 */
export declare function validateRateLimit(userId: string, action: string): void;
/**
 * Sanitize user input to prevent injection attacks
 */
export declare function sanitizeInput(input: string): string;
/**
 * Validate file upload parameters
 */
export declare function validateFileUpload(fileName: string, fileSize: number, contentType: string): void;
/**
 * Validate session expiration
 */
export declare function validateSessionExpiration(expiresAt: Date): void;
/**
 * Validate user permissions for resource access
 */
export declare function validateResourceAccess(userId: string, resourceUserId: string, resourceType: string): void;
/**
 * Simple validation functions for Epic 1.5
 */
export declare const validateInput: {
    isValidSessionId: (sessionId: string) => boolean;
};
/**
 * Comprehensive request validation middleware
 */
export declare function validateRequest(data: any, context: https.CallableContext, schema: Joi.Schema, options?: {
    requireAuth?: boolean;
    checkRateLimit?: string;
}): {
    userId?: string;
    validatedData: any;
};
//# sourceMappingURL=validation.d.ts.map