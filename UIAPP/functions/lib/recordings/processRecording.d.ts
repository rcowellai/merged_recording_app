/**
 * Process Recording Function - Epic 1.5 Core Integration
 * Triggered when audio/video files are uploaded to Firebase Storage
 * Creates story documents for uploaded recordings (no OpenAI yet)
 */
import * as functions from 'firebase-functions/v2';
/**
 * Storage trigger: Process uploaded recording files
 * Path pattern: recordings/{sessionId}/{fileName}
 */
export declare const processRecording: functions.CloudFunction<functions.storage.StorageEvent>;
//# sourceMappingURL=processRecording.d.ts.map