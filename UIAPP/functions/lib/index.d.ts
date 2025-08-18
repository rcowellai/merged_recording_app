/**
 * Love Retold Recording Integration - Cloud Functions
 * Enterprise-scale serverless backend with security-first architecture
 */
import * as functions from 'firebase-functions';
import { processRecording } from './recordings/processRecording';
import { validateSession } from './sessions/validateSession';
import { createStory } from './stories/createStory';
export { validateSession, createStory, };
export { validateSession as validateRecordingSession };
export { processRecording, };
export { loggerInstance as logger } from './utils/logger';
/**
 * Warmup function to prevent cold starts
 */
export declare const warmup: functions.CloudFunction<unknown>;
//# sourceMappingURL=index.d.ts.map