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
        askerName: string;
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