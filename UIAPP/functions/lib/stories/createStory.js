"use strict";
/**
 * Create Story Function - Epic 1.5 Manual Testing Support
 * HTTP callable function to manually create stories for testing
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
exports.createStory = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const db = admin.firestore();
/**
 * HTTP callable function: Manually create a story (for testing)
 */
exports.createStory = functions.https.onCall({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
}, async (request) => {
    const { data } = request;
    try {
        if (!(data === null || data === void 0 ? void 0 : data.sessionId)) {
            return {
                success: false,
                message: 'Session ID is required',
            };
        }
        const { sessionId, transcript = 'Test transcript for Epic 1.5 validation' } = data;
        // Get session document
        const sessionDoc = await db.collection('recordingSessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return {
                success: false,
                message: 'Recording session not found',
            };
        }
        const sessionData = sessionDoc.data();
        // Create story
        const storyId = `test_story_${sessionId}_${Date.now()}`;
        const storyData = {
            id: storyId,
            sessionId,
            userId: sessionData.userId,
            questionText: sessionData.questionText || 'Test Question',
            transcript,
            recordingUrl: null, // No actual recording for manual test
            recordingType: 'audio',
            metadata: {
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                testStory: true,
            },
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection('stories').doc(storyId).set(storyData);
        logger_1.loggerInstance.info('Test story created', { sessionId, storyId });
        return {
            success: true,
            storyId,
            message: 'Test story created successfully',
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.loggerInstance.error('Error creating test story: ' + errorMessage);
        return {
            success: false,
            message: 'Failed to create test story',
        };
    }
});
//# sourceMappingURL=createStory.js.map