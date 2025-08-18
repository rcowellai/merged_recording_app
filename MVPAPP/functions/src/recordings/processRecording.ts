/**
 * Process Recording Function - Epic 1.5 Core Integration
 * Triggered when audio/video files are uploaded to Firebase Storage
 * Creates story documents for uploaded recordings (no OpenAI yet)
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { loggerInstance } from '../utils/logger';

const db = admin.firestore();
const storage = admin.storage();

/**
 * Storage trigger: Process uploaded recording files
 * Path pattern: recordings/{sessionId}/{fileName}
 */
export const processRecording = functions.storage.onObjectFinalized(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (event) => {
    const filePath = event.data.name;
    const bucket = event.data.bucket;
    
    loggerInstance.info('Processing recording upload', {
      filePath,
      bucket,
      size: event.data.size,
      contentType: event.data.contentType,
    });

    try {
      // Validate file path pattern: recordings/{sessionId}/{fileName}
      const pathParts = filePath.split('/');
      if (pathParts.length !== 3 || pathParts[0] !== 'recordings') {
        loggerInstance.info('Ignoring non-recording file', { filePath });
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

      const sessionData = sessionDoc.data()!;
      
      // Extract file information
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
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

      loggerInstance.info('Recording processed successfully', {
        sessionId,
        storyId,
        recordingType: isVideo ? 'video' : 'audio',
        fileSize: event.data.size,
      });

      return { success: true, storyId, sessionId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerInstance.error(`Error processing recording: ${errorMessage} (file: ${filePath})`);
      
      return { success: false, error: errorMessage };
    }
  }
);