"use strict";
/**
 * Input validation utilities for Cloud Functions
 * Implements security-first validation with comprehensive error handling
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
exports.validateInput = exports.schemas = exports.ValidationError = void 0;
exports.validateInputData = validateInputData;
exports.validateAuth = validateAuth;
exports.validateRateLimit = validateRateLimit;
exports.sanitizeInput = sanitizeInput;
exports.validateFileUpload = validateFileUpload;
exports.validateSessionExpiration = validateSessionExpiration;
exports.validateResourceAccess = validateResourceAccess;
exports.validateRequest = validateRequest;
const Joi = __importStar(require("joi"));
const firebase_functions_1 = require("firebase-functions");
/**
 * Custom validation error class
 */
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Validation schemas for different data types
 */
exports.schemas = {
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
function validateInputData(data, schema) {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
    });
    if (error) {
        const details = error.details.map(detail => {
            var _a;
            return ({
                field: detail.path.join('.'),
                message: detail.message,
                value: (_a = detail.context) === null || _a === void 0 ? void 0 : _a.value,
            });
        });
        throw new ValidationError('Input validation failed', details);
    }
    return value;
}
/**
 * Validate Firebase Auth context
 */
function validateAuth(context) {
    if (!context.auth) {
        throw new firebase_functions_1.https.HttpsError('unauthenticated', 'Authentication required to access this function');
    }
    if (!context.auth.uid) {
        throw new firebase_functions_1.https.HttpsError('invalid-argument', 'Invalid authentication context');
    }
    return context.auth.uid;
}
/**
 * Validate request rate limiting
 */
function validateRateLimit(userId, action) {
    // Implementation would integrate with rate limiting service
    // For now, this is a placeholder for the rate limiting logic
    const rateLimits = {
        createPrompt: { requests: 10, window: 60 * 1000 }, // 10 per minute
        uploadRecording: { requests: 5, window: 60 * 1000 }, // 5 per minute
        validateSession: { requests: 100, window: 60 * 1000 }, // 100 per minute
    };
    const limit = rateLimits[action];
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
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }
    return input
        .trim()
        .replace(/[<>\"'&]/g, (match) => {
        const escapeMap = {
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
function validateFileUpload(fileName, fileSize, contentType) {
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
function validateSessionExpiration(expiresAt) {
    const now = new Date();
    if (expiresAt <= now) {
        throw new firebase_functions_1.https.HttpsError('deadline-exceeded', 'Recording session has expired');
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
function validateResourceAccess(userId, resourceUserId, resourceType) {
    if (userId !== resourceUserId) {
        throw new firebase_functions_1.https.HttpsError('permission-denied', `Access denied to ${resourceType}. Resource belongs to different user.`);
    }
}
/**
 * Simple validation functions for Epic 1.5
 */
exports.validateInput = {
    isValidSessionId: (sessionId) => {
        return typeof sessionId === 'string' &&
            sessionId.length >= 10 &&
            sessionId.length <= 100 &&
            /^[a-zA-Z0-9_-]+$/.test(sessionId);
    }
};
/**
 * Comprehensive request validation middleware
 */
function validateRequest(data, context, schema, options = {}) {
    const result = {
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
//# sourceMappingURL=validation.js.map