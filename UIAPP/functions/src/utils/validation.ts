/**
 * Input validation utilities for Cloud Functions
 * Implements security-first validation with comprehensive error handling
 */

import * as Joi from 'joi';
import { https } from 'firebase-functions';

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validation schemas for different data types
 */
export const schemas = {
  // User input validation
  userId: Joi.string().min(1).max(128).required(),
  email: Joi.string().email().required(),
  
  // Prompt validation
  promptData: Joi.object({
    question: Joi.string().min(10).max(1000).required(),
    scheduledDate: Joi.date().iso().min('now').required(),
    userId: Joi.string().min(1).max(128).required(),
  }),
  
  // Session validation
  sessionId: Joi.string().min(10).max(100).pattern(/^[a-zA-Z0-9_-]+$/).required(),
  
  // Recording metadata
  recordingMetadata: Joi.object({
    type: Joi.string().valid('audio', 'video').required(),
    duration: Joi.number().min(1).max(3600).required(), // Max 1 hour
    size: Joi.number().min(1).max(100 * 1024 * 1024).required(), // Max 100MB
    format: Joi.string().valid('webm', 'wav', 'mp4', 'm4a').required(),
  }),
  
  // Story creation
  storyData: Joi.object({
    userId: Joi.string().min(1).max(128).required(),
    originalPromptId: Joi.string().min(1).max(128).required(),
    question: Joi.string().min(10).max(1000).required(),
    audioUrl: Joi.string().uri().required(),
    videoUrl: Joi.string().uri().optional().allow(null),
    transcript: Joi.string().min(1).max(10000).required(),
    duration: Joi.number().min(1).max(3600).required(),
  }),
  
  // Pagination
  pagination: Joi.object({
    limit: Joi.number().min(1).max(100).default(20),
    offset: Joi.number().min(0).default(0),
    orderBy: Joi.string().valid('createdAt', 'recordedAt', 'scheduledDate').default('createdAt'),
    orderDirection: Joi.string().valid('asc', 'desc').default('desc'),
  }).optional(),
};

/**
 * Validate input data against a schema
 */
export function validateInputData<T>(data: any, schema: Joi.Schema): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  
  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));
    
    throw new ValidationError('Input validation failed', details);
  }
  
  return value as T;
}

/**
 * Validate Firebase Auth context
 */
export function validateAuth(context: https.CallableContext): string {
  if (!context.auth) {
    throw new https.HttpsError(
      'unauthenticated',
      'Authentication required to access this function'
    );
  }
  
  if (!context.auth.uid) {
    throw new https.HttpsError(
      'invalid-argument',
      'Invalid authentication context'
    );
  }
  
  return context.auth.uid;
}

/**
 * Validate request rate limiting
 */
export function validateRateLimit(userId: string, action: string): void {
  // Implementation would integrate with rate limiting service
  // For now, this is a placeholder for the rate limiting logic
  
  const rateLimits = {
    createPrompt: { requests: 10, window: 60 * 1000 }, // 10 per minute
    uploadRecording: { requests: 5, window: 60 * 1000 }, // 5 per minute
    validateSession: { requests: 100, window: 60 * 1000 }, // 100 per minute
  };
  
  const limit = rateLimits[action as keyof typeof rateLimits];
  if (!limit) {
    return; // No limit defined for this action
  }
  
  // TODO: Implement actual rate limiting with Redis or Firestore
  // This would check the user's request count within the time window
  // and throw an error if the limit is exceeded
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>\"'&]/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return escapeMap[match];
    })
    .substring(0, 10000); // Prevent extremely long inputs
}

/**
 * Validate file upload parameters
 */
export function validateFileUpload(
  fileName: string,
  fileSize: number,
  contentType: string
): void {
  // Validate file name
  if (!fileName || fileName.length > 255) {
    throw new ValidationError('Invalid file name', { fileName });
  }
  
  // Validate file extension
  const allowedExtensions = ['.webm', '.wav', '.mp4', '.m4a'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(extension)) {
    throw new ValidationError('Unsupported file type', {
      fileName,
      extension,
      allowedExtensions,
    });
  }
  
  // Validate file size (max 100MB)
  const maxSize = 100 * 1024 * 1024;
  if (fileSize > maxSize) {
    throw new ValidationError('File too large', {
      fileSize,
      maxSize,
      fileName,
    });
  }
  
  // Validate content type
  const allowedContentTypes = [
    'audio/webm',
    'audio/wav',
    'video/webm',
    'video/mp4',
    'audio/mp4',
  ];
  
  if (!allowedContentTypes.includes(contentType)) {
    throw new ValidationError('Invalid content type', {
      contentType,
      allowedContentTypes,
      fileName,
    });
  }
}

/**
 * Validate session expiration
 */
export function validateSessionExpiration(expiresAt: Date): void {
  const now = new Date();
  
  if (expiresAt <= now) {
    throw new https.HttpsError(
      'deadline-exceeded',
      'Recording session has expired'
    );
  }
  
  // Check if session expires within next 5 minutes (warning)
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  if (expiresAt <= fiveMinutesFromNow) {
    // Log warning but don't throw error
    console.warn('Recording session expires soon', {
      expiresAt: expiresAt.toISOString(),
      minutesRemaining: Math.floor((expiresAt.getTime() - now.getTime()) / 60000),
    });
  }
}

/**
 * Validate user permissions for resource access
 */
export function validateResourceAccess(
  userId: string,
  resourceUserId: string,
  resourceType: string
): void {
  if (userId !== resourceUserId) {
    throw new https.HttpsError(
      'permission-denied',
      `Access denied to ${resourceType}. Resource belongs to different user.`
    );
  }
}

/**
 * Simple validation functions for Epic 1.5
 */
export const validateInput = {
  isValidSessionId: (sessionId: string): boolean => {
    return typeof sessionId === 'string' && 
           sessionId.length >= 10 && 
           sessionId.length <= 100 && 
           /^[a-zA-Z0-9_-]+$/.test(sessionId);
  }
};

/**
 * Comprehensive request validation middleware
 */
export function validateRequest(
  data: any,
  context: https.CallableContext,
  schema: Joi.Schema,
  options: {
    requireAuth?: boolean;
    checkRateLimit?: string;
  } = {}
): { userId?: string; validatedData: any } {
  const result: { userId?: string; validatedData: any } = {
    validatedData: validateInputData(data, schema),
  };
  
  // Validate authentication if required
  if (options.requireAuth !== false) {
    result.userId = validateAuth(context);
    
    // Check rate limiting if specified
    if (options.checkRateLimit && result.userId) {
      validateRateLimit(result.userId, options.checkRateLimit);
    }
  }
  
  return result;
}