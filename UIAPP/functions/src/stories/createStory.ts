/**
 * Create Story Function - Epic 1.5 Manual Testing Support
 * HTTP callable function to manually create stories for testing
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { loggerInstance } from '../utils/logger';

const db = admin.firestore();

interface CreateStoryRequest {
  sessionId: string;
  transcript?: string;
}

interface CreateStoryResponse {
  success: boolean;
  storyId?: string;
  message: string;
}

/**
 * HTTP callable function: Manually create a story (for testing)
 */
export const createStory = functions.https.onCall<CreateStoryRequest, Promise<CreateStoryResponse>>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const { data } = request;
    
    try {
      if (!data?.sessionId) {
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

      const sessionData = sessionDoc.data()!;

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

      loggerInstance.info('Test story created', { sessionId, storyId });

      return {
        success: true,
        storyId,
        message: 'Test story created successfully',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerInstance.error('Error creating test story: ' + errorMessage);

      return {
        success: false,
        message: 'Failed to create test story',
      };
    }
  }
);