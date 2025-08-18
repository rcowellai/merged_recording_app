/**
 * Session Validation Function - Epic 1.5 Core Integration
 * HTTP callable function to validate recording session status
 * Used by recording app to check session validity before recording
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
          message: 'Recording session not found or has been removed',
        };
      }

      const sessionData = sessionDoc.data()!;
      const now = admin.firestore.Timestamp.now();

      // Check if session is expired
      if (sessionData.expiresAt && sessionData.expiresAt.toMillis() < now.toMillis()) {
        loggerInstance.info('Session expired', {
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

      // Session is valid (active or pending)
      loggerInstance.info('Session validation successful', {
        sessionId,
        status: sessionData.status,
        userId: sessionData.userId,
      });

      return {
        isValid: true,
        status: sessionData.status === 'pending' ? 'pending' : 'active',
        message: 'Session is valid and ready for recording',
        sessionData: {
          questionText: sessionData.promptText || sessionData.questionText,
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