# CORRECTED Pre-Launch Status Fix Implementation Plan

**Issue**: Two race conditions causing status field drift between Love Retold and Recording Webapp
**Context**: Pre-launch fix - no historical data to recover  
**Objective**: Implement atomic operations to prevent status synchronization issues

---

## 🎯 ROOT CAUSE ANALYSIS

**Issue 1 (Love Retold)**: Prompt update happens separately from recording session creation
**Issue 2 (Recording Webapp)**: File upload and status update happen separately  
**Solution**: Make both operations atomic using Firestore transactions

---

## 📋 STEP 1: LOVE RETOLD TEAM IMPLEMENTATION

### Task 1.1: Enhance createRecordingSession Cloud Function
**Duration**: 2 hours  
**Developer**: Any backend developer  
**Files**: `functions/src/index.ts`

**Issue**: Recording session creation and prompt status update happen separately, can fail independently

**Current Code Location**: `functions/src/index.ts` lines 286-350
**Specific Change**: Modify `createRecordingSession` Cloud Function to also update prompt status atomically

**Exact Implementation**:

1. **Update Cloud Function interface** - Add promptInstanceId parameter:
```typescript
// MODIFY the onCall function signature (around line 286)
export const createRecordingSession = onCall(async (request) => {
  const { promptId, userId, questionText, storytellerId, promptInstanceId } = request.data;
  // Add promptInstanceId to destructuring ^^^
```

2. **Replace single document creation with batch transaction** (around line 336):
```typescript
// REPLACE this line:
// await db.collection('recordingSessions').doc(sessionId).set(sessionData);

// WITH this atomic batch transaction:
const batch = db.batch();

// Create recording session
const sessionRef = db.collection('recordingSessions').doc(sessionId);
batch.set(sessionRef, sessionData);

// Update prompt if promptInstanceId provided
if (promptInstanceId) {
  const promptRef = db.collection('prompts').doc(promptInstanceId);
  batch.update(promptRef, {
    status: 'sent',
    sentTimestamp: FieldValue.serverTimestamp(),
    recordingSessionId: sessionId,
    uniqueRecordingUrl: uniqueUrl,
    recordingStatus: 'pending',
    scheduledSendTimestamp: null
  });
}

// Commit both operations atomically
await batch.commit();
```

3. **Add imports at top of file**:
```typescript
// ADD this import (around line 15)
import { FieldValue } from 'firebase-admin/firestore';
```

### Task 1.2: Update Frontend to Use Enhanced Cloud Function
**Duration**: 30 minutes  
**Developer**: Any frontend developer  
**Files**: `webapp/src/features/prompts/hooks/usePromptActions.ts`

**Issue**: Frontend makes separate call to update prompt after Cloud Function

**Exact Changes**:

1. **Update the createRecordingSession call** (line 64):
```typescript
// CHANGE this line:
const { sessionId, recordingUrl } = await createRecordingSession(
  promptInstance.eventPromptInstanceID,
  questionText,
  promptInstance.assignedToStorytellerID
);

// TO this (add promptInstanceId parameter):
const { sessionId, recordingUrl } = await createRecordingSession(
  promptInstance.eventPromptInstanceID,
  questionText,
  promptInstance.assignedToStorytellerID,
  promptInstance.eventPromptInstanceID  // Add this parameter
);
```

2. **Remove the separate prompt update** (lines 70-77):
```typescript
// DELETE these lines entirely:
await updatePromptInstance(promptInstance.eventPromptInstanceID, {
  status: 'sent',
  sentTimestamp: new Date().toISOString(),
  scheduledSendTimestamp: null,
  recordingSessionId: sessionId,
  uniqueRecordingUrl: recordingUrl,
  recordingStatus: 'pending',
});
```

### Task 1.3: Remove Manual Completion Function
**Duration**: 15 minutes  
**Developer**: Any frontend developer  
**Files**: `webapp/src/features/prompts/hooks/usePromptActions.ts`, `webapp/src/pages/prompts/ManagePromptsPage.tsx`

**Issue**: Users can manually mark recordings complete due to system unreliability

**Exact Changes**:

1. **Delete handleRecordConfirm function** (lines 89-100 in usePromptActions.ts):
```typescript
// DELETE this entire function:
const handleRecordConfirm = async (promptId: string) => {
  // ... delete all of this
};
```

2. **Remove from hook return** (line 236 in usePromptActions.ts):
```typescript
// CHANGE this line:
return {
  handleRecordNow,
  handleRecordConfirm,  // REMOVE this line
  handleSendNow,
  // ...
};

// TO this:
return {
  handleRecordNow,
  handleSendNow,
  // ...
};
```

3. **Remove from ManagePromptsPage** (lines 95, 763):
```typescript
// REMOVE from destructuring (line 95):
const {
  handleRecordNow,
  handleRecordConfirm,  // DELETE this line
  handleSendNow,
  // ...
} = usePromptActions();

// REMOVE the RecordConfirmDialog component (around line 763):
// Delete the entire <RecordConfirmDialog> component and its props
```

### Task 1.4: Update Recording Service Interface
**Duration**: 15 minutes  
**Developer**: Any frontend developer  
**Files**: `webapp/src/features/recording/services/recordingService.ts`

**Add promptInstanceId parameter to service interface** (around line 73):
```typescript
// UPDATE the createRecordingSession method signature:
async createRecordingSession(
  promptInstanceId: string,  // ADD this parameter first
  promptId: string,
  userId: string,
  questionText: string,
  storytellerId?: string
): Promise<{ sessionId: string; recordingUrl: string }> {
  try {
    const result = await createRecordingSessionFn({
      promptInstanceId,  // ADD this field
      promptId,
      userId,
      questionText,
      storytellerId,
    });
    // ... rest unchanged
  }
}
```

## ✅ LOVE RETOLD VALIDATION STEPS

### Test 1: Atomic Session + Prompt Creation
```bash
# Test in browser DevTools
1. Open Network tab
2. Create a prompt with recording
3. Check single Cloud Function call creates both:
   - recordingSession with status: 'ReadyForRecording'
   - prompt with status: 'sent', recordingStatus: 'pending'
```

### Test 2: Manual Completion Removed
```bash
# Verify UI changes
grep -r "handleRecordConfirm" webapp/src/
# Should return 0 results

grep -r "RecordConfirmDialog" webapp/src/
# Should return 0 results
```

### Test 3: Deploy and Test
```bash
cd functions
npm run build
firebase deploy --only functions:createRecordingSession

# Test in staging environment that prompt creation works end-to-end
```

---

## 📤 STEP 2: HANDOFF TO RECORDING WEBAPP TEAM

### Dear Recording Webapp Team,

Love Retold has completed their fixes. We now need you to implement atomic transactions in your upload completion flow.

### What We Fixed on Our Side
- ✅ Recording session + prompt creation is now atomic (single Cloud Function call)
- ✅ No separate frontend calls that can fail independently  
- ✅ Removed manual user completion workflows

### Critical Issue You Must Fix
Your current upload completion process:
1. ✅ Upload file to Firebase Storage (robust - 3 retries)
2. ❌ Update recordingSession status (fragile - 1 retry, no cleanup)

**Problem**: If step 2 fails, file exists but Love Retold never processes it

### Required Implementation

#### Change 1: Atomic Upload Completion
**Find your upload completion code** (approximately where you set status to 'ReadyForTranscription')

**Replace with this pattern**:
```javascript
async function completeRecordingUpload(sessionId, recordedFile) {
  const filePath = `users/${this.userId}/recordings/${sessionId}/final/recording.mp4`;
  let fileWasUploaded = false;
  
  try {
    // Step 1: Upload with your existing retry logic
    await this.uploadFileWithRetries(recordedFile, filePath);
    fileWasUploaded = true;
    console.log('File upload successful');
    
    // Step 2: Atomic Firestore transaction for ALL status fields
    await this.db.runTransaction(async (transaction) => {
      const sessionRef = this.db.collection('recordingSessions').doc(sessionId);
      const sessionDoc = await transaction.get(sessionRef);
      
      if (!sessionDoc.exists) {
        throw new Error('Recording session not found');
      }
      
      // Update ALL related fields atomically
      transaction.update(sessionRef, {
        status: 'ReadyForTranscription',
        'storagePaths.finalVideo': filePath,
        'recordingData.uploadProgress': 100,
        'recordingData.fileSize': recordedFile.size,
        'recordingData.mimeType': recordedFile.type,
        recordingCompletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    console.log('Recording completed successfully');
    
    // Only show success if BOTH file upload AND status update succeeded
    this.showUserSuccess('Recording uploaded successfully! Your story will be processed.');
    
  } catch (error) {
    console.error('Recording completion failed:', error);
    
    // CRITICAL: Clean up uploaded file if status update failed
    if (fileWasUploaded) {
      try {
        await this.storage.bucket().file(filePath).delete();
        console.log('Cleaned up uploaded file after status update failure');
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
        // Still show error to user about main failure
      }
    }
    
    // Show honest error message to user
    this.showUserError('Recording upload failed. Please try recording again.');
  }
}
```

#### Change 2: Enhanced Status Update Retry Logic
**Apply this retry pattern to ALL Firestore operations**:
```javascript
async function updateFirestoreWithRetry(ref, updates, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await ref.update(updates);
      console.log(`Firestore update succeeded on attempt ${attempt}`);
      return;
    } catch (error) {
      console.error(`Firestore update attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Firestore update failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      const jitter = Math.random() * 500; // Add jitter to prevent thundering herd
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
}
```

### Your Testing Checklist
- [ ] Upload recording → file exists in Storage AND status = 'ReadyForTranscription'
- [ ] Simulate Firestore failure → file gets deleted AND user sees error  
- [ ] Test retry logic → 3 attempts with exponential backoff
- [ ] Test transaction conflicts → handled gracefully

### What We Need From You
1. ✅ Confirmation that atomic transactions are implemented
2. ✅ Test results for all scenarios above
3. ✅ Your code commit hash/version after deployment

---

## 📥 STEP 3: RECORDING WEBAPP RESPONSE SECTION

**Recording Webapp Team - Fill this out after implementation:**

### Implementation Status
- [ ] Atomic transaction pattern implemented for upload completion
- [ ] File cleanup implemented for status update failures
- [ ] 3-retry logic with exponential backoff implemented
- [ ] User experience updated to show honest success/failure

### Test Results
- [ ] **Happy Path Test**: Upload + status update both succeed → PASS/FAIL
- [ ] **Firestore Failure Test**: Status update fails → file deleted, user sees error → PASS/FAIL  
- [ ] **Retry Test**: Intermittent failures retry 3 times → PASS/FAIL
- [ ] **Transaction Conflict Test**: Concurrent updates handled → PASS/FAIL

### Implementation Details
**Code Location**: `[Recording Webapp team to specify file path]`
**Deployed Version**: `[Recording Webapp team to provide commit hash]`
**Date Completed**: `[Recording Webapp team to fill in]`

### Issues Encountered
`[Recording Webapp team to document any problems or questions]`

---

## 📋 STEP 4: FINAL LOVE RETOLD COMPLETION

**After Recording Webapp confirms their fixes are complete:**

### Task 4.1: Add Automatic Status Sync
**Duration**: 1 hour  
**Developer**: Any backend developer  
**Files**: `functions/src/index.ts`

**Purpose**: Automatically update prompt status when recording transcription completes

**Implementation**:
```typescript
// ADD this new Cloud Function at the end of functions/src/index.ts

/**
 * Automatically mark prompts as complete when recording transcription finishes
 * This eliminates the need for manual user confirmation
 */
export const autoCompletePromptOnRecordingTranscribed = onDocumentUpdated(
  'recordingSessions/{sessionId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    
    // Only trigger when recording becomes 'Transcribed'
    if (before?.status !== 'Transcribed' && after?.status === 'Transcribed') {
      const sessionId = event.params.sessionId;
      
      try {
        // Find the prompt linked to this recording session
        const promptQuery = await db.collection('prompts')
          .where('recordingSessionId', '==', sessionId)
          .limit(1)
          .get();
        
        if (!promptQuery.empty) {
          const promptDoc = promptQuery.docs[0];
          
          // Automatically mark prompt as complete
          await promptDoc.ref.update({
            recordingStatus: 'completed',
            status: 'responded',
            respondedTimestamp: FieldValue.serverTimestamp()
          });
          
          logger.info(`Auto-completed prompt for recording session ${sessionId}`);
        } else {
          logger.error(`No prompt found for completed recording session ${sessionId}`);
        }
      } catch (error) {
        logger.error(`Failed to auto-complete prompt for session ${sessionId}:`, error);
        // Don't throw - we don't want to retry this trigger indefinitely
      }
    }
  }
);
```

### Task 4.2: Deploy and Test Final Integration
**Duration**: 30 minutes  
**Developer**: Same as Task 4.1  

**Deployment**:
```bash
cd functions
npm run build
firebase deploy --only functions:autoCompletePromptOnRecordingTranscribed
```

**Testing**:
```bash
# Test complete end-to-end flow:
# 1. Create prompt with recording in Love Retold
# 2. Complete recording in Recording Webapp  
# 3. Verify prompt automatically updates to 'responded' status
# 4. Verify no manual intervention needed
```

---

## 🎯 FINAL VALIDATION CHECKLIST

### Pre-Launch Requirements
**All must be checked before launch:**

#### Love Retold Team Validation
- [x] Task 1.1: Enhanced Cloud Function deployed and tested
- [x] Task 1.2: Frontend uses enhanced Cloud Function correctly
- [x] Task 1.3: Manual completion function removed completely
- [x] Task 1.4: Recording service interface updated
- [ ] Task 4.1: Automatic status sync deployed and tested (Phase 2 - after Recording Webapp completes Step 2)

#### Recording Webapp Team Validation  
- [ ] Atomic transactions implemented for upload completion
- [ ] File cleanup on status update failure working
- [ ] 3-retry logic with exponential backoff working
- [ ] Honest UX (no false success messages) implemented

#### Integration Validation
- [ ] **End-to-End Happy Path**: Prompt creation → Recording → Auto-completion works
- [ ] **Love Retold Failure Handling**: Cloud Function failures handled gracefully
- [ ] **Recording Webapp Failure Handling**: Upload failures clean up properly
- [ ] **No Manual Intervention**: Users never need to manually mark anything complete
- [ ] **Status Accuracy**: All status fields stay synchronized automatically

### Success Criteria
✅ **No orphaned recordings possible**  
✅ **No manual user workarounds needed**  
✅ **All operations are atomic and reliable**  
✅ **Users see accurate status at all times**  
✅ **System ready for production launch**

---

## 📞 TEAM COORDINATION

**Love Retold Team Lead**: `[Contact Info]`  
**Recording Webapp Team Lead**: `[Contact Info]`  

**For Integration Issues**: Schedule joint debugging session between teams

**Remember**: This must be 100% working before launch - no compromises on data reliability!