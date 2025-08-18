"use strict";
/**
 * Love Retold Recording Integration - Cloud Functions
 * Enterprise-scale serverless backend with security-first architecture
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
exports.warmup = exports.logger = exports.processRecording = exports.validateRecordingSession = exports.createStory = exports.validateSession = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
// Initialize Firebase Admin SDK
admin.initializeApp();
// Set global options for all functions
(0, v2_1.setGlobalOptions)({
    maxInstances: 100,
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
});
// Import function modules - Epic 1.5 Implementation
const processRecording_1 = require("./recordings/processRecording");
Object.defineProperty(exports, "processRecording", { enumerable: true, get: function () { return processRecording_1.processRecording; } });
const validateSession_1 = require("./sessions/validateSession");
Object.defineProperty(exports, "validateSession", { enumerable: true, get: function () { return validateSession_1.validateSession; } });
Object.defineProperty(exports, "validateRecordingSession", { enumerable: true, get: function () { return validateSession_1.validateSession; } });
const createStory_1 = require("./stories/createStory");
Object.defineProperty(exports, "createStory", { enumerable: true, get: function () { return createStory_1.createStory; } });
// Export utility functions for testing
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.loggerInstance; } });
/**
 * Warmup function to prevent cold starts
 */
exports.warmup = functions
    .runWith({
    memory: '128MB',
    timeoutSeconds: 10,
})
    .pubsub.schedule('every 5 minutes')
    .onRun(async (context) => {
    functions.logger.info('Warmup ping executed', {
        timestamp: context.timestamp,
        eventId: context.eventId,
    });
    return null;
});
/**
 * Global error handler for unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    functions.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
/**
 * Global error handler for uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    functions.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
functions.logger.info('Love Retold Functions initialized successfully', {
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
});
//# sourceMappingURL=index.js.map