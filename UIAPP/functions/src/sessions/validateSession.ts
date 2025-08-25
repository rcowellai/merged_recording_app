/**
 * Session Validation Function - Epic 1.5 Core Integration
 * HTTP callable function to validate recording session status
 * Used by recording app to check session validity before recording
 * 
 * BUSINESS RULES:
 * A) If a UID has already been used to submit a recording → "This memory has already been recorded"
 * B) If the prompt tied to the UID was deleted after the UID was issued → "This question has been deleted by <<UserId>> and is no longer available to record"
 * C) If the prompt was sent >365 days ago → "This link is over 365 days old and can no longer be accessed"
 * D) If the UID doesn't exist → "This recording link is invalid or no longer exists"
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { loggerInstance } from '../utils/logger';

const db = admin.firestore();

interface ValidateSessionRequest {
  sessionId: string;
}

interface ValidateSessionResponse {
  isValid: boolean;
  status: 'active' | 'pending' | 'expired' | 'completed' | 'removed' | 'invalid';
  message: string;
  sessionData?: {
    questionText: string;
    storytellerName: string;
    askerName: string;  // NEW: Support for Love Retold's askerName field (Jan 20, 2025)
    createdAt: admin.firestore.Timestamp;
    expiresAt: admin.firestore.Timestamp;
  };
}

/**
 * HTTP callable function: Validate recording session
 */
export const validateSession = functions.https.onCall<ValidateSessionRequest, Promise<ValidateSessionResponse>>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const { data, auth } = request;
    
    loggerInstance.info('Session validation request', {
      sessionId: data?.sessionId,
      authUid: auth?.uid,
    });

    try {
      // Validate input
      if (!data?.sessionId) {
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
        loggerInstance.warn('Session not found', { sessionId });
        return {
          isValid: false,
          status: 'removed',
          message: 'This recording link is invalid or no longer exists',
        };
      }

      const sessionData = sessionDoc.data()!;
      const now = admin.firestore.Timestamp.now();

      // Check if session is expired (Business Rule C)
      if (sessionData.expiresAt && sessionData.expiresAt.toMillis() < now.toMillis()) {
        loggerInstance.info('Session expired', {
          sessionId,
          expiresAt: sessionData.expiresAt.toDate(),
          now: now.toDate(),
        });
        return {
          isValid: false,
          status: 'expired',
          message: 'This link is over 365 days old and can no longer be accessed',
        };
      }

      // Define all post-recording statuses that indicate recording has already happened (Business Rule A)
      const POST_RECORDING_STATUSES = [
        'completed', 'processing', 'transcribed', 'ReadyForTranscription',
        'uploading', 'recording', 'Transcribed', 'Processing', 'Uploading', 'Recording'
      ];

      // Check if recording has already been done (Business Rule A)
      if (POST_RECORDING_STATUSES.includes(sessionData.status)) {
        loggerInstance.info('Session already recorded', {
          sessionId,
          status: sessionData.status,
        });
        return {
          isValid: false,
          status: 'completed',
          message: 'This memory has already been recorded',
        };
      }

      if (sessionData.status === 'removed') {
        return {
          isValid: false,
          status: 'removed',
          message: 'This recording session has been removed.',
        };
      }

      // Validate that prompt text exists (Business Rule B)
      const promptText = sessionData.promptText || sessionData.questionText;
      if (!promptText || promptText.trim() === '') {
        const deletedBy = sessionData.deletedBy || 'the account owner';
        loggerInstance.warn('Session has no prompt text - treating as deleted', {
          sessionId,
          hasPromptText: !!sessionData.promptText,
          hasQuestionText: !!sessionData.questionText,
          deletedBy,
        });
        return {
          isValid: false,
          status: 'removed',
          message: `This question has been deleted by ${deletedBy} and is no longer available to record`,
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

      // Session is valid (active or pending) with required data
      loggerInstance.info('Session validation successful', {
        sessionId,
        status: sessionData.status,
        userId: sessionData.userId,
        storytellerId: sessionData.storytellerId,
        storytellerName: sessionData.storytellerName,
        askerName: sessionData.askerName,  // NEW: Log the askerName field
        hasPromptText: true,
        hasStorytellerName: !!sessionData.storytellerName,
        hasAskerName: !!sessionData.askerName,  // NEW: Track askerName availability
        storytellerNameValue: sessionData.storytellerName || 'NOT_SET',
        askerNameValue: sessionData.askerName || 'NOT_SET',  // NEW: Log askerName value
      });

      return {
        isValid: true,
        status: sessionData.status === 'pending' ? 'pending' : 'active',
        message: 'Session is valid and ready for recording',
        sessionData: {
          questionText: promptText,
          storytellerName: sessionData.storytellerName,
          askerName: sessionData.askerName,  // NEW: Pass through askerName field
          createdAt: sessionData.createdAt,
          expiresAt: sessionData.expiresAt,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerInstance.error(`Error validating session: ${errorMessage} (sessionId: ${data?.sessionId})`);

      return {
        isValid: false,
        status: 'invalid',
        message: 'Unable to validate session. Please try again.',
      };
    }
  }
);