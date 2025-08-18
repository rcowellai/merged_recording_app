/**
 * Create Story Function - Epic 1.5 Manual Testing Support
 * HTTP callable function to manually create stories for testing
 */
import * as functions from 'firebase-functions/v2';
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
export declare const createStory: functions.https.CallableFunction<CreateStoryRequest, Promise<CreateStoryResponse>>;
export {};
//# sourceMappingURL=createStory.d.ts.map