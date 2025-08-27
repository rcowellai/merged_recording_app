# Love Retold Master API Reference

**Version**: 4.1 - Distributed Architecture Update  
**Last Updated**: January 27, 2025  
**Architecture**: Firebase Functions v2 with TypeScript  

## What's Changed in v4.1
- **BREAKING**: Clarified this documents the **Master Love Retold API** (Cloud Functions deployment)
- **CRITICAL FIX**: Standardized canonical status values with security rules alignment
- **NEW**: Added distributed architecture documentation and client integration guidance
- **ENHANCED**: Added security rules alignment and client implementation patterns
- **ADDED**: Known pitfalls and FAQ section for common integration issues  

## 🏗️ Distributed Architecture Overview

### System Architecture

**Master-Client Architecture**:
- **Master Love Retold Application** deploys all Cloud Functions to `love-retold-webapp` Firebase project
- **Client Applications** (recording app, admin tools, mobile apps) consume functions via HTTP callable
- **Shared Resources**: Single Firebase project serves all environments and client applications

```
Love Retold Ecosystem Architecture
================================

Master App (love-retold-webapp)
├── Cloud Functions (this API) ────┐
├── Firestore Database ────────────┤
├── Firebase Storage ──────────────┤
├── Firebase Auth ─────────────────┤
└── Admin Console ─────────────────┤
                                   │
Client Applications:               │
├── Recording App ←────────────────┤
├── Mobile App ←───────────────────┤
├── Admin Tools ←──────────────────┤
└── Future Integrations ←──────────┘
```

**Function Deployment**: 
- Source: `packages/cloud-functions/` in master Love Retold repository
- Region: `us-central1`  
- Project ID: `love-retold-webapp`
- Client Access: `https://us-central1-love-retold-webapp.cloudfunctions.net/{functionName}`

### Design Philosophy
- **Security First**: All functions validate authentication and user ownership
- **Atomic Operations**: Use Firestore batch operations for data consistency
- **Error Resilience**: Comprehensive error handling with structured logging
- **Performance Optimized**: Batch operations, caching, and resource limits
- **Scalable**: Max 100 instances per function with cost control

### Collection Structure
```
recordingSessions/     # Recording session management
prompts/              # User prompts (flat collection)
stories/              # Generated stories from recordings
users/                # User profiles and settings
```

### Environment Configuration
| Environment | Firebase Project | Functions Region | Recording App URL |
|-------------|------------------|------------------|-------------------|
| Development | `love-retold-webapp` | `us-central1` | `https://record-dev.loveretold.com` |
| Staging | `love-retold-webapp` | `us-central1` | `https://record-staging.loveretold.com` |
| Production | `love-retold-webapp` | `us-central1` | `https://record.loveretold.com` |

---

## 📊 Canonical Status Values

### **CRITICAL**: Security Rules Enforcement

**All status values MUST use exact capitalization** - Firestore security rules enforce strict matching.

#### RecordingSession Status Values (Canonical)
```typescript
type RecordingSessionStatus = 
  | 'ReadyForRecording'    // Initial state, ready for recording
  | 'Recording'           // Currently recording in progress
  | 'Uploading'          // Upload in progress to Firebase Storage
  | 'ReadyForTranscription' // Upload complete, queued for transcription
  | 'Transcribed'        // Transcription complete, story created
  | 'failed'            // Process failed (lowercase for error states)
  | 'expired'           // Session expired (lowercase for terminal states)
  | 'deleted';          // Session cancelled (lowercase for terminal states)
```

#### Status Transition Flow
```
ReadyForRecording → Recording → Uploading → ReadyForTranscription → Transcribed
                 ↓         ↓           ↓                      ↓
                failed → failed → failed → failed → failed
```

#### Status Mapping Table

| **Master API (Canonical)** | **Client Must Use** | **Firestore Rules** | **Example Usage** |
|----------------------------|---------------------|---------------------|-------------------|
| `ReadyForRecording` | ✅ Exact match | ✅ Allowed | `status: 'ReadyForRecording'` |
| `Recording` | ✅ Exact match | ✅ Allowed | `status: 'Recording'` |
| `Uploading` | ✅ Exact match | ✅ Allowed | `status: 'Uploading'` |
| `ReadyForTranscription` | ✅ Exact match | ✅ Allowed | `status: 'ReadyForTranscription'` |
| ❌ `recording` (lowercase) | ❌ **WILL FAIL** | ❌ **REJECTED** | Security violation |
| ❌ `uploading` (lowercase) | ❌ **WILL FAIL** | ❌ **REJECTED** | Security violation |

#### Transcription Status Values
```typescript
type TranscriptionStatus = 
  | 'pending'     // Awaiting transcription
  | 'processing'  // Transcription in progress
  | 'completed'   // Transcription successful
  | 'failed';     // Transcription failed
```

---

## 📹 Recording Session Functions

### `createRecordingSession`
**Purpose**: Create a new recording session with atomic prompt update  
**Authentication**: Required (Firebase Auth)  
**Performance**: Single session creation with user validation

#### Request
```typescript
{
  promptInstanceId: string;  // Prompt instance ID for atomic update
  promptId: string;          // Core prompt identifier
  userId: string;            // User ID (must match auth.uid)
  questionText: string;      // The question/prompt text
  storytellerId?: string;    // Optional storyteller assignment
}
```

#### Response
```typescript
{
  sessionId: string;         // Generated session ID (compound format)
  uniqueUrl: string;         // Full recording URL
  expiresAt: string;         // ISO timestamp (365 days from creation)
}
```

#### Session ID Format
`{random}-{promptId}-{userId}-{storytellerId}-{timestamp}`
- **random**: 7-char alphanumeric
- **promptId**: 8-char sanitized prompt ID
- **userId**: 8-char sanitized user ID  
- **storytellerId**: 8-char sanitized storyteller ID
- **timestamp**: Unix timestamp

#### Error Scenarios
```typescript
// Missing authentication
throw new Error('User must be authenticated to create recording session');

// Missing parameters
throw new Error('Missing required parameters: promptId, userId, questionText');

// Creation failure
throw new Error('Failed to create recording session');
```

#### Atomic Operations
- Creates `recordingSessions/{sessionId}` document
- Updates `prompts/{promptInstanceId}` with session details
- Both operations succeed or both fail (Firestore batch)

#### Implementation Example
```typescript
const result = await createRecordingSessionFn({
  promptInstanceId: 'prompt_abc123',
  promptId: 'prompt_abc123', 
  userId: 'user_xyz789',
  questionText: 'What was your favorite childhood memory?',
  storytellerId: 'storyteller_456'
});

// Opens: https://record.loveretold.com/abc1234-prompt123-user456-story456-1704067200
window.open(result.data.uniqueUrl, '_blank');
```

---

### `createBatchRecordingSessions`
**Purpose**: Create multiple recording sessions efficiently  
**Authentication**: Required (Firebase Auth)  
**Performance**: Optimized for bulk operations (max 50 sessions)

#### Request
```typescript
{
  prompts: Array<{
    promptId: string;
    questionText: string;
    storytellerId?: string;
  }>;
  userId: string;  // Must match auth.uid
}
```

#### Response
```typescript
Array<{
  sessionId: string;
  recordingUrl: string;
  expiresAt: string;  // ISO timestamp
}>
```

#### Performance Optimizations
- **Storyteller Name Caching**: Avoids duplicate database lookups
- **Parallel Session Generation**: All sessions created concurrently
- **Batch Firestore Writes**: Single commit for all sessions
- **Resource Limits**: Max 50 sessions per call

#### Error Scenarios
```typescript
// Authentication mismatch
throw new Error('Unauthorized: User does not match authentication');

// Invalid input
throw new Error('Prompts array is required and must not be empty');
throw new Error('Maximum 50 prompts can be created at once');

// Missing fields
throw new Error('Each prompt must have promptId and questionText');
```

---

### `getRecordingSession`
**Purpose**: Validate and retrieve session details for recording app  
**Authentication**: Required (Firebase Auth)  
**Use Case**: Called by recording webapp to validate sessions

#### Request
```typescript
{
  sessionId: string;  // Session ID to validate
}
```

#### Response Scenarios

##### Valid Session
```typescript
{
  status: 'valid',
  session: {
    sessionId: string;
    promptText: string;
    askerName: string;        // Question creator's first name
    storytellerName: string;  // Assigned storyteller's first name
    coupleNames: string;      // "Sarah & John" format
    maxDuration: number;      // 900 seconds (15 minutes)
    allowAudio: boolean;      // true
    allowVideo: boolean;      // true
  }
}
```

##### Session Not Found
```typescript
{
  status: 'removed',
  message: 'This question has been removed by the account owner'
}
```

##### Expired Session
```typescript
{
  status: 'expired',
  message: 'This recording link has expired'
}
```

##### Already Completed
```typescript
{
  status: 'completed',
  message: 'This memory has been recorded'
}
```

##### Deleted Session
```typescript
{
  status: 'removed',
  message: 'This question has been removed by the account owner'
}
```

#### Automatic Session Updates
- Expired sessions automatically marked as 'expired' in database
- Status changes are permanent and logged

---

### `validateRecordingSession` (Alternative)
**Purpose**: Anonymous session validation for recording app  
**Authentication**: Not required (anonymous access)  
**Use Case**: Recording app validation without user auth

#### Request
```typescript
{
  sessionId: string;
}
```

#### Response
```typescript
{
  valid: boolean;
  error?: 'SESSION_NOT_FOUND' | 'SESSION_EXPIRED' | 'ALREADY_RECORDED' | 'PROMPT_DELETED';
  session?: {
    sessionId: string;
    promptText: string;
    askerName: string;
    storytellerName: string;
    coupleNames: string;
    maxDuration: number;
    allowAudio: boolean;
    allowVideo: boolean;
  }
}
```

---

### `cancelRecordingSession`
**Purpose**: Cancel/delete a recording session  
**Authentication**: Required (must own session)  
**Use Case**: User wants to remove a recording opportunity

#### Request
```typescript
{
  sessionId: string;
}
```

#### Response
```typescript
{
  success: boolean;
  message: string;  // "Recording session cancelled successfully"
}
```

#### Security Validation
- Verifies user owns the session (`session.userId === auth.uid`)
- Updates session status to 'deleted'
- Cannot be undone

---

## 📊 Administrative Functions

### `getRecordingStats`
**Purpose**: Get recording session statistics  
**Authentication**: Required  
**Use Case**: Admin dashboard, usage analytics

#### Request
```typescript
{} // No parameters required
```

#### Response
```typescript
{
  total: number;
  active: number;        // ReadyForRecording, Recording, Uploading
  completed: number;     // Transcribed
  expired: number;
  cancelled: number;
  pending: number;       // ReadyForRecording
  recording: number;     // Recording
  uploading: number;     // Uploading  
  processing: number;    // ReadyForTranscription
  failed: number;
  deleted: number;
}
```

---

## ⏰ Scheduled Prompt Functions

### `processScheduledPrompts`
**Purpose**: Automated prompt delivery (runs every hour)  
**Trigger**: Cloud Scheduler  
**Architecture**: Compatible with both subcollection and flat collection patterns

#### Process Flow
1. **Query Due Prompts**: `collectionGroup('prompts')` for cross-architecture compatibility
2. **Batch Processing**: Processes in groups of 10 to avoid timeouts
3. **Status Updates**: Updates `status` from 'queued' to 'sent'
4. **Notification Delivery**: TODO - Email/SMS integration planned

#### Database Updates
```typescript
// For each due prompt
{
  status: 'sent',
  sentTimestamp: string,        // ISO format
  scheduledSendTimestamp: null, // Clear schedule
  processedAt: Timestamp,       // Server timestamp
  updatedAt: Timestamp         // Server timestamp
}
```

#### Logging Output
```typescript
{
  totalFound: number,
  processed: number,
  errors: number,
  migrationPhase: 'Phase 4A - Flat Collection Compatible'
}
```

---

### `deliverPromptNotification`
**Purpose**: Send prompt notifications (placeholder for future email/SMS)  
**Authentication**: Required  
**Status**: TODO - Implementation pending

#### Request
```typescript
{
  promptId: string;
  userId: string;
  questionText: string;
  assignedToStorytellerID: string;
}
```

#### Response
```typescript
{
  success: boolean;
  promptId: string;
  deliveredAt: string;  // ISO timestamp
  method: 'logged';     // Will change to 'email'/'sms' when implemented
}
```

---

### `monitorScheduleIntegrity`
**Purpose**: Daily schedule validation and repair (runs every 24 hours)  
**Trigger**: Cloud Scheduler  
**Architecture**: Cross-compatible with collection architectures

#### Validation Checks
1. **Missing Timestamps**: Prompts without `scheduledSendTimestamp`
2. **Order Violations**: Timestamps not in display order sequence
3. **Automatic Repair**: Clears timestamps to force recalculation

#### Response Pattern
```typescript
{
  totalUsers: number,
  usersWithIssues: number,
  totalIssuesFixed: number
}
```

---

### `forceScheduleRecalculation`
**Purpose**: Manual schedule recalculation for specific user  
**Authentication**: Required (TODO: Add admin check)  
**Use Case**: Manual repair of scheduling issues

#### Request
```typescript
{
  userId: string;
}
```

#### Response
```typescript
{
  success: boolean;
  message: string;
  promptsUpdated: number;
}
```

#### Data Access Validation
- Uses compatibility layer for safe migration support
- Validates user data access before modification
- Fails gracefully if data migration is in progress

---

## 🔧 Client Integration Guide

### Authentication & CORS

**Authentication Requirements**:
- Client apps must authenticate users via Firebase Auth
- Auth tokens automatically passed with Firebase SDK callable functions
- No manual token handling required for HTTP callable functions

**CORS Configuration**:
- Automatically handled by Firebase Functions SDK
- Manual CORS setup only needed for webhook endpoints (`receiveTranscription`)
- Cross-origin calls supported for `record.loveretold.com` domains

### Client Implementation Patterns

#### ✅ **DO**: Status Updates That Pass Security
```typescript
// Correct - Use canonical capitalized status values
await updateDoc(sessionRef, {
  status: 'Recording',           // ✅ Passes Firestore rules
  recordingStartedAt: serverTimestamp()
});

await updateDoc(sessionRef, {
  status: 'Uploading',           // ✅ Passes Firestore rules
  'recordingData.uploadProgress': 50
});

await updateDoc(sessionRef, {
  status: 'ReadyForTranscription', // ✅ Passes Firestore rules
  'storagePaths.finalVideo': '/path/to/file.mp4'
});
```

#### ❌ **DON'T**: Status Updates That Fail Security
```typescript
// WRONG - Lowercase status values will be REJECTED
await updateDoc(sessionRef, {
  status: 'recording',    // ❌ SECURITY VIOLATION
});

await updateDoc(sessionRef, {
  status: 'uploading',    // ❌ SECURITY VIOLATION
});

// WRONG - Clients cannot update these fields
await updateDoc(sessionRef, {
  userId: 'new-user',     // ❌ SECURITY VIOLATION
  promptId: 'new-prompt'  // ❌ SECURITY VIOLATION
});
```

### Function Call Examples

#### Session Validation
```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase-config';

const getRecordingSession = httpsCallable(functions, 'getRecordingSession');
const result = await getRecordingSession({ sessionId: 'abc123-prompt456-user789' });

if (result.data.status === 'valid') {
  // Proceed with recording
  const session = result.data.session;
  console.log('Question:', session.promptText);
} else {
  // Handle error cases: 'removed', 'expired', 'completed'
  console.error('Validation failed:', result.data.message);
}
```

#### Session Creation (Love Retold App Only)
```typescript
const createSession = httpsCallable(functions, 'createRecordingSession');
const result = await createSession({
  promptId: 'prompt_123',
  userId: 'user_456',
  questionText: 'What was your favorite memory?',
  storytellerId: 'storyteller_789'
});

const recordingUrl = result.data.uniqueUrl;
// Opens: https://record.loveretold.com/{sessionId}
```

### Field Write Permissions

#### Client Apps CAN Update
- `status` (with canonical values only)
- `recordingData.*` (progress, file info)
- `storagePaths.*` (upload paths)
- `recordingStartedAt`, `recordingCompletedAt`
- `error` (error information)

#### Only Master API CAN Update
- `userId`, `promptId`, `storytellerId` (immutable after creation)
- `askerName`, `storytellerName`, `coupleNames` (set at creation)
- `transcription.*` (managed by transcription pipeline)
- `createdAt`, `expiresAt` (set at creation)

---

## 🔐 Security & Rules Alignment

### Firestore Rules Compliance

**Critical Requirements**:
1. **Status values must use exact capitalization** - lowercase values will be rejected
2. **Anonymous users can only update recording progress fields** during active recording
3. **Core session metadata is immutable** after creation
4. **Status transitions must follow valid flow** - security rules validate allowed transitions

#### Security Checklist for Client Implementations
- [ ] Use canonical status values (`'ReadyForRecording'` not `'ready'`)
- [ ] Only update allowed fields during recording (`recordingData.*`, `storagePaths.*`)
- [ ] Handle authentication properly (Firebase Auth + anonymous for recording)
- [ ] Implement proper error handling for security violations
- [ ] Test against actual Firestore rules in development

#### Anonymous Recording Updates (Recording App Pattern)
```typescript
// ✅ Allowed during recording session
{
  status: 'Recording',                    // Valid transition
  'recordingData.uploadProgress': 75,     // Progress updates allowed
  'storagePaths.chunks': [...],           // Storage path updates allowed
  recordingStartedAt: serverTimestamp(),  // Timestamp updates allowed
  updatedAt: serverTimestamp()           // System field allowed
}

// ❌ Rejected by security rules
{
  userId: 'different-user',              // Ownership cannot change
  promptId: 'different-prompt',          // Prompt cannot change
  storytellerId: 'different-storyteller' // Assignment cannot change
}
```

---

## 🎙️ Recording Processing Pipeline

### `onRecordingStatusChange`
**Purpose**: Recording completion trigger and Make.com integration  
**Trigger**: Firestore `onDocumentUpdated('recordingSessions/{sessionId}')`  
**Integration**: Make.com + OpenAI Whisper transcription pipeline

#### Trigger Conditions
- Status changes TO `'ReadyForTranscription'` (canonical capitalized value)
- Has `storagePaths.finalVideo` field
- Previous status was NOT `'ReadyForTranscription'`

#### Process Flow
1. **Prompt Removal**: Immediately removes completed prompt from user's list
2. **Signed URL Generation**: 24-hour access for Make.com
3. **Transcription Queue**: Updates status to 'queued'
4. **Make.com Webhook**: Sends recording for transcription

#### Make.com Webhook Payload
```typescript
{
  sessionId: string;
  signedVideoUrl: string;      // 24-hour signed URL
  duration: number;            // Recording duration in seconds
  metadata: {
    promptId: string;
    userId: string;
    storytellerId: string;
    promptText: string;
  }
}
```

#### Configuration Requirements
```typescript
// Environment variables required
MAKE_TRANSCRIPTION_WEBHOOK="https://hook.us1.make.com/..."
OPENAI_API_KEY="sk-..."
```

#### Error Recovery
- **Recording Failures**: Resets prompt to 'queued' for user retry
- **Transcription Failures**: Implements retry logic with exponential backoff
- **User Experience Priority**: Never re-adds prompts to user list after removal

---

### `receiveTranscription`
**Purpose**: Webhook endpoint for Make.com transcription results  
**Trigger**: HTTP POST from Make.com  
**Authentication**: Not required (webhook endpoint)

#### Request Format
```typescript
{
  sessionId: string;
  transcript?: string;         // Plain text transcript
  transcriptBase64?: string;   // Base64 encoded (for special characters)
  wordCount?: number;          // Word count
  processingTime?: number;     // Transcription processing time
  error?: string;             // Error message if failed
  success: boolean;           // Success/failure flag
}
```

#### Success Response Updates
```typescript
{
  status: 'Transcribed',
  'transcription.status': 'completed',
  'transcription.text': string,
  'transcription.confidence': 0.95,        // Default confidence
  'transcription.wordCount': number,
  'transcription.completedAt': Timestamp,
  'transcription.processingTime': number
}
```

#### Story Creation
Automatically creates `stories/{storyId}` document:
```typescript
{
  storyId: string,              // "story_{sessionId}"
  userId: string,
  promptId: string,
  sessionId: string,
  storytellerId: string,
  
  // Content
  title: string,                // Prompt text
  originalTranscription: string,
  editedTranscription: string,  // User can edit later
  finalText: string,
  
  // Media
  recordingUrl: string,         // Storage path
  thumbnailUrl: string,         // Thumbnail path
  duration: number,             // Duration in seconds
  
  // Organization
  chapter: 'Recorded Stories',  // Default chapter
  orderInChapter: number,       // Timestamp-based ordering
  includeInBook: boolean,       // true
  photos: [],                   // Empty array
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### User Statistics Update
```typescript
{
  'stats.totalRecordings': FieldValue.increment(1),
  'stats.lastRecordingAt': FieldValue.serverTimestamp()
}
```

#### Failure Handling
- **Retry Logic**: Up to 3 attempts with exponential backoff
- **Retry Delays**: 30s, 1min, 2min
- **Final Failure**: Marks session as permanently failed

---

## 🧹 Maintenance Functions

### `cleanupExpiredSessions`
**Purpose**: Hourly cleanup of expired sessions  
**Trigger**: Cloud Scheduler (every 1 hour)  
**Performance**: Batch operations for efficiency

#### Query Pattern
```typescript
db.collection('recordingSessions')
  .where('expiresAt', '<', now)
  .where('status', 'in', ['ReadyForRecording', 'Recording', 'Uploading'])  // Canonical values
```

#### Batch Updates
```typescript
{
  status: 'expired',  // Terminal state uses lowercase
  completedAt: Timestamp
}
```

---

## 🔧 Admin Utility Functions

### `findUserByEmail`
**Purpose**: Locate user by email address  
**Authentication**: Required  
**Use Case**: User support, data lookup

#### Request
```typescript
{
  email: string;  // Email to search for
}
```

#### Response
```typescript
{
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
  // ... other user profile data
}
```

---

### `getUserData`
**Purpose**: Comprehensive user data retrieval  
**Authentication**: Required  
**Use Case**: User support, data analysis

#### Request
```typescript
{
  userId: string;
}
```

#### Response
```typescript
{
  profile: UserProfile;
  prompts: PromptInstance[];
  stories: Story[];
  recordingSessions: RecordingSession[];
  statistics: UserStats;
}
```

---

### `searchUsersByEmail`
**Purpose**: Pattern-based email search  
**Authentication**: Required  
**Use Case**: Admin user management

#### Request
```typescript
{
  emailPattern: string;  // Partial email to match
}
```

#### Response
```typescript
Array<{
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
  lastLoginAt?: Date;
}>
```

---

### `validateUserDataIntegrity`
**Purpose**: Data consistency validation  
**Authentication**: Required  
**Use Case**: Data quality assurance

#### Request
```typescript
{
  userId: string;
}
```

#### Response
```typescript
{
  isValid: boolean;
  issues: string[];
  statistics: {
    promptsCount: number;
    storiesCount: number;
    sessionsCount: number;
  };
  recommendations: string[];
}
```

---

## 🔐 Security Model

### Authentication Requirements
- **All functions**: Require Firebase Auth token except webhooks
- **User Ownership**: Functions validate user owns requested data
- **Admin Functions**: Use simple admin key (production should use proper RBAC)

### Admin Key Authentication
```typescript
// Simple admin key for development
if (adminKey !== 'admin-love-retold-2025') {
  throw new Error('Invalid admin key');
}
```

### Data Access Patterns
```typescript
// User ownership validation
if (session.userId !== request.auth.uid) {
  throw new Error('Unauthorized: User does not own this session');
}

// Collection path validation
const userPromptsRef = db.collection('prompts').where('userId', '==', userId);
```

---

## 🚀 Performance Optimizations

### Resource Management
- **Max Instances**: 10 per function (cost control)
- **Memory Limits**: 512MiB for most functions
- **Timeouts**: 300 seconds for processing functions

### Batch Operations
```typescript
// Efficient batch writes
const batch = db.batch();
sessions.forEach(({ sessionId, sessionData }) => {
  const docRef = db.collection('recordingSessions').doc(sessionId);
  batch.set(docRef, sessionData);
});
await batch.commit();
```

### Caching Strategies
```typescript
// Storyteller name caching in batch operations
const storytellerNameCache = new Map<string, string>();
```

---

## 🐛 Error Handling Patterns

### Standard Error Format
```typescript
{
  code: string;           // Error code
  message: string;        // Human-readable message
  timestamp: Timestamp;   // When error occurred
  retryable: boolean;     // Can this be retried?
  retryCount: number;     // How many retries attempted
}
```

### Logging Standards
```typescript
// Structured logging
logger.info('Operation completed', {
  sessionId,
  userId,
  processingTime: Date.now() - startTime
});

logger.error('Operation failed', {
  sessionId,
  error: error.message,
  stack: error.stack
});
```

---

## 📈 Monitoring & Observability

### Key Metrics
- **Session Creation Rate**: Sessions created per hour
- **Transcription Success Rate**: Percentage of successful transcriptions
- **Processing Latency**: Time from recording to story creation
- **Error Rates**: By function and error type

### Health Check Endpoints
- Use `getRecordingStats` for system health monitoring
- Monitor Cloud Function execution logs
- Track Firestore read/write operations

---

## 🔄 Migration Compatibility

### Collection Architecture Support
```typescript
// Phase 4A: Supports both subcollections and flat collections
const userPromptsQuery = await db
  .collectionGroup('prompts')  // Works with both architectures
  .where('status', '==', 'queued')
  .get();
```

### Data Access Validation
```typescript
// Safe migration support
const { validateUserDataAccess } = await import("./utils/collection-compatibility.js");
const isAccessValid = await validateUserDataAccess(userId);
```

---

## 📝 Development Guidelines

### Function Naming Convention
- **Verbs**: `create`, `get`, `validate`, `process`, `cleanup`
- **Resources**: `RecordingSession`, `Prompt`, `User`
- **Actions**: `createRecordingSession`, `processScheduledPrompts`

### Response Format Standards
```typescript
// Success responses
{ success: true, data: any, message?: string }

// Error responses  
{ success: false, error: string, code?: string }

// Validation responses
{ valid: boolean, error?: string, data?: any }
```

### Testing Integration Points
```typescript
// Key test scenarios
1. Authentication validation
2. User ownership verification
3. Batch operation atomicity
4. Error recovery workflows
5. Webhook payload validation
```

---

## 🚀 Deployment Architecture

### Function Organization
```
functions/src/
├── index.ts              # Main exports
├── config.ts             # Configuration
├── utils/
│   ├── admin-utilities.ts
│   ├── collection-compatibility.ts
│   └── legacy-cleanup.ts
└── triggers/             # Event triggers
```

### Environment Configuration
```typescript
// Required environment variables
VITE_RECORDING_APP_URL="https://record.loveretold.com"
MAKE_TRANSCRIPTION_WEBHOOK="https://hook.us1.make.com/..."
OPENAI_API_KEY="sk-..."
FIREBASE_PROJECT_ID="love-retold-webapp"
```

### Deployment Commands
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:createRecordingSession

# Deploy with environment
firebase functions:config:set app.recording_url="https://record.loveretold.com"
```

---

## 📞 Integration Support

### Common Integration Patterns

#### Webapp → Cloud Function
```typescript
import { httpsCallable } from 'firebase/functions';

const createSessionFn = httpsCallable(functions, 'createRecordingSession');
const result = await createSessionFn({
  promptInstanceId: 'prompt_123',
  promptId: 'prompt_123',
  userId: 'user_456', 
  questionText: 'What was your favorite memory?',
  storytellerId: 'storyteller_789'
});
```

#### Recording App → Cloud Function
```typescript
// Anonymous validation
const validateFn = httpsCallable(functions, 'validateRecordingSession');
const validation = await validateFn({ sessionId: 'abc123' });

if (validation.data.valid) {
  // Proceed with recording
} else {
  // Show error message
}
```

#### Make.com → Webhook
```typescript
// POST to receiveTranscription
{
  "sessionId": "abc123-prompt456-user789-story012-1704067200",
  "transcript": "This is my favorite childhood memory...",
  "wordCount": 45,
  "processingTime": 12.34,
  "success": true
}
```

### Error Handling Best Practices
```typescript
try {
  const result = await cloudFunction(params);
  // Handle success
} catch (error) {
  if (error.code === 'unauthenticated') {
    // Redirect to login
  } else if (error.code === 'permission-denied') {
    // Show access error
  } else {
    // Show generic error
  }
}
```

---

## ⚠️ Known Pitfalls & FAQ

### Common Integration Issues

**Q: Why do my status updates get rejected by Firestore rules?**  
**A**: Status values are case-sensitive. Use `'ReadyForRecording'` not `'ready_for_recording'` or `'readyForRecording'`.

**Q: Can I update `userId` or `promptId` after session creation?**  
**A**: No. These fields are immutable after creation to prevent security violations.

**Q: Why can't I call `createRecordingSession` from my client app?**  
**A**: This function requires special permissions. Only the master Love Retold app can create sessions.

**Q: How do I test against the Master API during development?**  
**A**: Use Firebase emulators (`firebase emulators:start`) or point to staging functions URL.

**Q: What happens if I use the wrong field paths in updates?**  
**A**: Use dot notation for nested fields: `'recordingData.uploadProgress'` not `recordingData: { uploadProgress }`.

### Field Path Reference
```typescript
// ✅ Correct nested field updates
'recordingData.uploadProgress': 75
'recordingData.fileSize': 1024000
'storagePaths.finalVideo': '/path/to/video.mp4'
'transcription.status': 'completed'

// ❌ Incorrect - overwrites entire objects
recordingData: { uploadProgress: 75 }  // Destroys other recordingData fields
storagePaths: { finalVideo: '/path' }  // Destroys other storage paths
```

### Debugging Checklist
1. **Status Case**: Verify exact capitalization matches canonical values
2. **Field Paths**: Use dot notation for nested field updates
3. **Authentication**: Ensure Firebase Auth is properly initialized
4. **Function Names**: Confirm function exists and is spelled correctly
5. **Project ID**: Verify calling correct Firebase project (`love-retold-webapp`)

---

## 🔍 Open Questions

**VERIFICATION NEEDED**:
1. **Function Deployment Status**: Run `firebase functions:list --project love-retold-webapp` to confirm all documented functions are actually deployed
2. **Environment Variables**: Verify production configuration of `MAKE_TRANSCRIPTION_WEBHOOK` and `OPENAI_API_KEY`
3. **Admin Authentication**: Confirm production admin authentication replaces simple admin key
4. **Cross-App Testing**: Validate recording app → master API integration in all environments

---

This reference guide documents the **Master Love Retold Cloud Functions API** deployed to `love-retold-webapp` Firebase project. Client applications (recording app, admin tools) consume these functions via HTTP callable. 

For questions about API integration, refer to the function source code in the master Love Retold repository `packages/cloud-functions/` or contact the backend team.

**Architecture**: Master API deployment serving multiple client applications  
**Security**: Firestore rules enforce strict field validation and status value matching  
**Integration**: Use Firebase Functions SDK with proper authentication for reliable access