/**
 * Session Validation Function - Epic 1.5 Core Integration
 * HTTP callable function to validate recording session status
 * Used by recording app to check session validity before recording
 */
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
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
export declare const validateSession: functions.https.CallableFunction<ValidateSessionRequest, Promise<ValidateSessionResponse>>;
export {};
//# sourceMappingURL=validateSession.d.ts.map