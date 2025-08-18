"use strict";
/**
 * Process Recording Function - Epic 1.5 Core Integration
 * Triggered when audio/video files are uploaded to Firebase Storage
 * Creates story documents for uploaded recordings (no OpenAI yet)
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
exports.processRecording = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const db = admin.firestore();
const storage = admin.storage();
/**
 * Storage trigger: Process uploaded recording files
 * Path pattern: recordings/{sessionId}/{fileName}
 */
exports.processRecording = functions.storage.onObjectFinalized({
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 120,
}, async (event) => {
    var _a;
    const filePath = event.data.name;
    const bucket = event.data.bucket;
    logger_1.loggerInstance.info('Processing recording upload', {
        filePath,
        bucket,
        size: event.data.size,
        contentType: event.data.contentType,
    });
    try {
        // Validate file path pattern: recordings/{sessionId}/{fileName}
        const pathParts = filePath.split('/');
        if (pathParts.length !== 3 || pathParts[0] !== 'recordings') {
            logger_1.loggerInstance.info('Ignoring non-recording file', { filePath });
            return null;
        }
        const [, sessionId, fileName] = pathParts;
        // Simple session ID validation
        if (!sessionId || sessionId.length < 10) {
            throw new Error(`Invalid session ID: ${sessionId}`);
        }
        // Get recording session document
        const sessionDoc = await db.collection('recordingSessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            throw new Error(`Recording session not found: ${sessionId}`);
        }
        const sessionData = sessionDoc.data();
        // Extract file information
        const fileExtension = (_a = fileName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        const isVideo = ['mp4', 'webm'].includes(fileExtension || '');
        const isAudio = ['wav', 'm4a', 'webm'].includes(fileExtension || '');
        if (!isVideo && !isAudio) {
            throw new Error(`Unsupported file type: ${fileExtension}`);
        }
        // Generate download URL for the uploaded file
        const file = storage.bucket(bucket).file(filePath);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        // Create story document
        const storyId = `story_${sessionId}_${Date.now()}`;
        const storyData = {
            id: storyId,
            sessionId,
            userId: sessionData.userId,
            questionText: sessionData.questionText || 'Recording',
            recordingUrl: url,
            recordingType: isVideo ? 'video' : 'audio',
            fileName,
            fileSize: parseInt(String(event.data.size || '0')),
            transcript: 'Manual transcript placeholder - OpenAI integration pending',
            metadata: {
                uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                processingVersion: '1.0-epic15',
                contentType: event.data.contentType,
                duration: null,
            },
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Save story to Firestore
        await db.collection('stories').doc(storyId).set(storyData);
        // Update session status to completed
        await db.collection('recordingSessions').doc(sessionId).update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            storyId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger_1.loggerInstance.info('Recording processed successfully', {
            sessionId,
            storyId,
            recordingType: isVideo ? 'video' : 'audio',
            fileSize: event.data.size,
        });
        return { success: true, storyId, sessionId };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.loggerInstance.error(`Error processing recording: ${errorMessage} (file: ${filePath})`);
        return { success: false, error: errorMessage };
    }
});
//# sourceMappingURL=processRecording.js.map