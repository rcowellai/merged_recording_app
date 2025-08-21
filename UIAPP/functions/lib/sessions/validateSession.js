"use strict";
/**
 * Session Validation Function - Epic 1.5 Core Integration
 * HTTP callable function to validate recording session status
 * Used by recording app to check session validity before recording
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
exports.validateSession = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const db = admin.firestore();
/**
 * HTTP callable function: Validate recording session
 */
exports.validateSession = functions.https.onCall({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
}, async (request) => {
    const { data, auth } = request;
    logger_1.loggerInstance.info('Session validation request', {
        sessionId: data === null || data === void 0 ? void 0 : data.sessionId,
        authUid: auth === null || auth === void 0 ? void 0 : auth.uid,
    });
    try {
        // Validate input
        if (!(data === null || data === void 0 ? void 0 : data.sessionId)) {
            return {
                isValid: false,
                status: 'invalid',
                message: 'Session ID is required',
            };
        }
        const { sessionId } = data;
        // Simple session ID validation
        if (!sessionId || sessionId.length < 10) {
            return {
                isValid: false,
                status: 'invalid',
                message: 'Invalid session ID format',
            };
        }
        // Get session document
        const sessionDoc = await db.collection('recordingSessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            logger_1.loggerInstance.warn('Session not found', { sessionId });
            return {
                isValid: false,
                status: 'removed',
                message: 'Recording session not found or has been removed',
            };
        }
        const sessionData = sessionDoc.data();
        const now = admin.firestore.Timestamp.now();
        // Check if session is expired
        if (sessionData.expiresAt && sessionData.expiresAt.toMillis() < now.toMillis()) {
            logger_1.loggerInstance.info('Session expired', {
                sessionId,
                expiresAt: sessionData.expiresAt.toDate(),
                now: now.toDate(),
            });
            return {
                isValid: false,
                status: 'expired',
                message: 'This recording link has expired. Please contact the sender for a new link.',
            };
        }
        // Check session status
        if (sessionData.status === 'completed') {
            return {
                isValid: false,
                status: 'completed',
                message: 'This recording has already been completed.',
            };
        }
        if (sessionData.status === 'removed') {
            return {
                isValid: false,
                status: 'removed',
                message: 'This recording session has been removed.',
            };
        }
        // Accept both 'active' and 'pending' as valid recording states
        if (sessionData.status !== 'active' && sessionData.status !== 'pending') {
            return {
                isValid: false,
                status: 'invalid',
                message: `Session status is ${sessionData.status}`,
            };
        }
        // Validate that prompt text exists - critical data integrity check
        const promptText = sessionData.promptText || sessionData.questionText;
        if (!promptText || promptText.trim() === '') {
            logger_1.loggerInstance.warn('Session has no prompt text - treating as removed', {
                sessionId,
                hasPromptText: !!sessionData.promptText,
                hasQuestionText: !!sessionData.questionText,
            });
            return {
                isValid: false,
                status: 'removed',
                message: 'This prompt has been removed or is no longer available.',
            };
        }
        // Session is valid (active or pending) with required data
        logger_1.loggerInstance.info('Session validation successful', {
            sessionId,
            status: sessionData.status,
            userId: sessionData.userId,
            storytellerId: sessionData.storytellerId,
            storytellerName: sessionData.storytellerName,
            askerName: sessionData.askerName, // NEW: Log the askerName field
            hasPromptText: true,
            hasStorytellerName: !!sessionData.storytellerName,
            hasAskerName: !!sessionData.askerName, // NEW: Track askerName availability
            storytellerNameValue: sessionData.storytellerName || 'NOT_SET',
            askerNameValue: sessionData.askerName || 'NOT_SET', // NEW: Log askerName value
        });
        return {
            isValid: true,
            status: sessionData.status === 'pending' ? 'pending' : 'active',
            message: 'Session is valid and ready for recording',
            sessionData: {
                questionText: promptText,
                storytellerName: sessionData.storytellerName,
                askerName: sessionData.askerName, // NEW: Pass through askerName field
                createdAt: sessionData.createdAt,
                expiresAt: sessionData.expiresAt,
            },
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.loggerInstance.error(`Error validating session: ${errorMessage} (sessionId: ${data === null || data === void 0 ? void 0 : data.sessionId})`);
        return {
            isValid: false,
            status: 'invalid',
            message: 'Unable to validate session. Please try again.',
        };
    }
});
//# sourceMappingURL=validateSession.js.map