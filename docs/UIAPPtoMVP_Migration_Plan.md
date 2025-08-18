# UIAPP ↔ MVPAPP True Consolidation Migration

## 1. Title & Purpose

**Migration Goal**: Consolidate MVPAPP's Firebase backend infrastructure into UIAPP to create a fully standalone application with complete Firebase functionality, enabling MVPAPP deletion upon completion.

**Approach**: Copy and rewrite MVPAPP's Firebase infrastructure and services into UIAPP following UIAPP conventions, building a self-contained app that preserves pixel-perfect UI/UX.

**Strategic Foundation**: This document provides actionable execution steps based on the [Comprehensive Merger Plan](../COMPREHENSIVE_MERGER_PLAN.md) architectural analysis, modified for true consolidation rather than integration.

## 2. How to Use This Document

### 📚 Pre-Flight Artifacts (C00 Completed)
Before starting any slice, review these essential documents created during C00:
- [`docs/migration/env-mapping.md`](../migration/env-mapping.md) - VITE_ → REACT_APP_ variable conversion reference
- [`docs/migration/firebase-config-analysis.md`](../migration/firebase-config-analysis.md) - Firebase configuration requirements and adaptations
- [`docs/migration/dependency-compatibility-report.md`](../migration/dependency-compatibility-report.md) - Package.json updates needed
- [`docs/migration/risk-assessment-matrix.md`](../migration/risk-assessment-matrix.md) - **CRITICAL**: Deployment safety protocols
- [`docs/migration/rollback-procedures.md`](../migration/rollback-procedures.md) - Recovery procedures for each slice
- [`docs/migration/dev-environment-checklist.md`](../migration/dev-environment-checklist.md) - Validated tool requirements

### True Consolidation Rules
- **Copy & Rewrite**: Use MVPAPP as reference material, copy/rewrite into UIAPP structure
- **UIAPP-Centric**: All development, testing, and deployment happens in UIAPP
- **Standalone Goal**: Build UIAPP as fully functional app independent of MVPAPP
- **Progressive Build-up**: Each slice adds complete functionality before proceeding
- **Validation-Driven**: Every piece must work in UIAPP before moving forward

### Progress Tracking
- Update Status Board when starting/completing slices
- Log all work in Work Log (append-only, never edit previous entries)
- Commit frequently with descriptive messages referencing source MVPAPP files
- Tag completion of each functional area clearly

### Logging Conventions
```
YYYY-MM-DD HH:MM | @developer | SliceX | [STARTED|PROGRESS|COMPLETED|BLOCKED] | commit/PR | MVPAPP source → UIAPP target | notes
```

## 3. Status Board

| Slice | Title | Owner | Started | Done | Status |
|-------|-------|-------|---------|------|--------|
| C00 | Pre-Flight Validation & Environment Setup | @superclaude | 2025-01-18 | 2025-01-18 | COMPLETED |
| C01 | Firebase Infrastructure Setup | - | - | - | PENDING |
| C02 | Firebase Configuration & Environment | - | - | - | PENDING |
| C03 | Firebase Functions Migration | - | - | - | PENDING |
| C04 | Firebase Authentication Service | - | - | - | PENDING |
| C05 | Firebase Session Management Service | - | - | - | PENDING |
| C06 | Firebase Recording Upload Service | - | - | - | PENDING |
| C07 | Firebase Storage & Download Service | - | - | - | PENDING |
| C08 | Error Handling & Fallback Logic | - | - | - | PENDING |
| C09 | UI Integration & Testing | - | - | - | PENDING |
| C10 | Production Deployment & Validation | - | - | - | PENDING |
| C11 | MVPAPP Deletion Verification | - | - | - | PENDING |

## 4. Work Log

```
<!-- APPEND-ONLY LOG - DO NOT EDIT PREVIOUS ENTRIES -->
2025-01-18 08:30 | @superclaude | C00 | COMPLETED | Pre-flight validation complete | Investigation only | Environment validated, all dependencies compatible, Firebase access confirmed, comprehensive migration artifacts created

<!-- Future entries go here -->
```

## 5. Assumptions & Non-Goals

### Assumptions
- **MVPAPP as Reference Only**: MVPAPP is never modified, only used for copying/reference
- **Same Firebase Project**: Use existing Love Retold Firebase project for immediate compatibility
- **UIAPP Build Stability**: Current UIAPP builds and runs successfully
- **Firebase Project Access**: Developers have appropriate Firebase project permissions
- **No User Migration**: No existing users to migrate, pre-launch environment

### Non-Goals
- **No MVPAPP Modifications**: MVPAPP remains untouched during migration
- **No Adapter Patterns**: Direct Firebase integration rather than adapters
- **No Dual Maintenance**: Only UIAPP will be maintained post-migration
- **No UX Changes**: UIAPP interface remains pixel-perfect
- **No Phased User Rollout**: Full consolidation before user exposure

### End State Goals
- **Fully Standalone UIAPP**: Complete Firebase functionality within UIAPP
- **MVPAPP Deletion**: MVPAPP directory can be safely deleted
- **Single App Maintenance**: Only UIAPP requires ongoing development
- **Complete Functionality**: All Love Retold recording workflows in UIAPP

## 6. Target Workspace Layout

### Before Migration (Current State)
```
apps/
├── uiapp/                          # Frontend-only app
│   ├── src/
│   │   ├── services/
│   │   │   └── localRecordingService.js
│   │   └── ...existing structure
│   └── package.json
├── mvpapp/                         # Reference Firebase implementation
│   ├── functions/                  # Firebase Functions
│   ├── firebase.json               # Firebase project config
│   ├── firestore.rules             # Security rules
│   ├── storage.rules               # Storage security rules
│   ├── recording-app/              # Recording frontend
│   │   └── src/services/           # Firebase service implementations
│   └── scripts/                    # Database and deployment scripts
```

### After Migration (Consolidated State)
```
apps/
├── uiapp/                          # Fully standalone app with Firebase backend
│   ├── functions/                  # Copied & adapted from MVPAPP
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── sessions/validateSession.ts
│   │   │   ├── recordings/processRecording.ts
│   │   │   └── utils/
│   │   └── package.json
│   ├── firebase.json               # Copied & adapted from MVPAPP
│   ├── firestore.rules             # Copied from MVPAPP
│   ├── storage.rules               # Copied from MVPAPP
│   ├── scripts/                    # Database seeding & deployment scripts
│   │   ├── seed-database.js
│   │   └── deploy-functions.js
│   ├── src/
│   │   ├── services/
│   │   │   ├── firebaseAuth.js     # Rewritten from MVPAPP
│   │   │   ├── firebaseSession.js  # Rewritten from MVPAPP
│   │   │   ├── firebaseRecording.js # Rewritten from MVPAPP
│   │   │   ├── firebaseStorage.js  # Rewritten from MVPAPP
│   │   │   └── localRecordingService.js # Existing fallback
│   │   ├── config/
│   │   │   ├── firebase.js         # Firebase configuration
│   │   │   └── index.js            # Extended with Firebase config
│   │   └── ...existing structure
│   ├── .env.example               # Firebase environment template
│   └── package.json               # Extended with Firebase dependencies
├── mvpapp/                         # DELETE after verification
└── docs/
    └── UIAPP↔MVPAPP_Migration_Plan_Pre-Launch.md
```

## 7. Architecture Overview

### Consolidation Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    UIAPP (Standalone)                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                UI Components                            ││ ← No changes
│  │         (RecordingFlow, etc.)                           ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Service Layer                              ││ ← Rewritten Firebase services
│  │  ┌─────────────────┬─────────────────┬───────────────┐  ││
│  │  │ firebaseAuth.js │firebaseSession.js│firebaseRec... │  ││
│  │  └─────────────────┴─────────────────┴───────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │            Firebase Infrastructure                      ││ ← Copied from MVPAPP
│  │  ┌─────────────┬─────────────┬─────────────────────────┐││
│  │  │ Functions   │ Rules       │ Configuration           │││
│  │  └─────────────┴─────────────┴─────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Project                               │
│          (Same as MVPAPP uses)                             │
└─────────────────────────────────────────────────────────────┘
```

### Service Integration Pattern
- **Direct Integration**: Firebase services written natively in UIAPP patterns
- **Configuration-Driven**: Services can fall back to localStorage via config
- **UI Preservation**: Existing UI components use same service interfaces
- **Standalone Deployment**: UIAPP deploys its own Firebase Functions and rules

## 8. Environment & Secrets

**📖 Reference**: See [`docs/migration/env-mapping.md`](../migration/env-mapping.md) for complete VITE_ → REACT_APP_ conversion table

### .env.example Template (UIAPP)
```bash
# Firebase Configuration (REQUIRED)
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Feature Flags (REQUIRED)
REACT_APP_USE_FIREBASE=true
REACT_APP_FIREBASE_AUTH_ENABLED=true
REACT_APP_FIREBASE_STORAGE_ENABLED=true
REACT_APP_SESSION_VALIDATION_ENABLED=true

# Environment (REQUIRED)
REACT_APP_ENVIRONMENT=production
REACT_APP_DEBUG_MODE=false

# Firebase Emulator (DEVELOPMENT)
REACT_APP_USE_EMULATOR=false
REACT_APP_EMULATOR_AUTH_URL=http://localhost:9099
REACT_APP_EMULATOR_FIRESTORE_URL=http://localhost:8080
REACT_APP_EMULATOR_FUNCTIONS_URL=http://localhost:5001
REACT_APP_EMULATOR_STORAGE_URL=http://localhost:9199
```

### Environment Migration Mapping
```javascript
// MVPAPP (VITE) → UIAPP (REACT_APP) conversion
const envMapping = {
  'VITE_FIREBASE_API_KEY': 'REACT_APP_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN': 'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID': 'REACT_APP_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET': 'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID': 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID': 'REACT_APP_FIREBASE_APP_ID'
};
```

### Environment Validation Checklist
- [ ] All Firebase config variables copied and converted to REACT_APP_ prefix
- [ ] Feature flags configured for progressive enablement
- [ ] Environment variables load correctly in UIAPP
- [ ] Firebase project accessible with provided credentials
- [ ] Emulator configuration ready for local development
- [ ] No secrets committed to repository

## 9. Interface Contracts (TypeScript Signatures)

### Core Data Types
```typescript
// Session Management (from MVPAPP validateSession.ts)
interface SessionInfo {
  sessionId: string;
  userId: string;
  storytellerId: string;
  promptId: string;
  questionText: string;
  isValid: boolean;
  expiresAt: Date;
  createdAt: Date;
  status: 'active' | 'pending' | 'expired' | 'completed' | 'removed' | 'invalid';
}

interface SessionValidationResult {
  isValid: boolean;
  status: string;
  message: string;
  sessionData?: {
    questionText: string;
    createdAt: any;
    expiresAt: any;
  };
}

// Recording Services (adapted from MVPAPP)
interface RecordingMetadata {
  sessionId: string;
  userId: string;
  fileType: 'audio' | 'video';
  mimeType: string;
  duration: number;
  createdAt: Date;
  size: number;
  storagePaths?: {
    chunks: string[];
    final: string;
    thumbnail?: string;
  };
}

interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  currentChunk?: number;
  totalChunks?: number;
}

interface UploadResult {
  success: boolean;
  recordingId: string;
  downloadUrl?: string;
  storagePath?: string;
  error?: string;
}

// Error Types (extended from UIAPP)
interface FirebaseError extends Error {
  code: string;
  customData?: any;
  retry?: boolean;
}
```

### Service Interfaces (UIAPP Pattern)
```typescript
// Following UIAPP's localRecordingService.js pattern
interface FirebaseAuthService {
  // Core authentication
  initialize(): Promise<void>;
  signInAnonymously(): Promise<User>;
  getCurrentUser(): User | null;
  
  // State management
  onAuthStateChange(callback: (user: User | null) => void): () => void;
  
  // Error handling
  getAuthError(): FirebaseError | null;
}

interface FirebaseSessionService {
  // Session parsing (from MVPAPP SessionRouter.jsx)
  parseUrlParams(url?: string): SessionInfo | null;
  
  // Session validation (from MVPAPP session.js)
  validateSession(sessionId: string): Promise<SessionValidationResult>;
  
  // Session state
  getCurrentSession(): SessionInfo | null;
  setCurrentSession(session: SessionInfo): void;
}

interface FirebaseRecordingService {
  // Upload functionality (from MVPAPP unifiedRecording.js)
  uploadRecording(
    blob: Blob, 
    metadata: RecordingMetadata,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult>;
  
  // Retrieval (following UIAPP pattern)
  fetchRecording(recordingId: string): Promise<RecordingData | null>;
  fetchAllRecordings(filters?: RecordingFilters): Promise<RecordingData[]>;
  
  // Management
  deleteRecording(recordingId: string): Promise<boolean>;
  
  // Chunked upload specifics (from MVPAPP)
  resumeUpload(uploadId: string): Promise<UploadResult>;
  cancelUpload(uploadId: string): Promise<void>;
}

interface FirebaseStorageService {
  // Storage operations (from MVPAPP firebase.js)
  generateUploadPath(sessionId: string, userId: string, fileName: string): string;
  
  // File operations
  upload(path: string, blob: Blob, metadata?: any): Promise<string>;
  download(path: string): Promise<Blob>;
  getDownloadUrl(path: string): Promise<string>;
  delete(path: string): Promise<void>;
  
  // Chunked operations (from MVPAPP chunkUploadManager.js)
  uploadChunked(
    path: string, 
    blob: Blob, 
    chunkSize: number, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string>;
}
```

## 10. Thin Slices

### Slice C00: Pre-Flight Validation & Environment Setup ✅ **COMPLETED**

**Objective**: Validate environment readiness and resolve potential blockers before Firebase infrastructure migration

**Entry Criteria**: 
- Access to both MVPAPP and UIAPP codebases
- Understanding of consolidation goals and approach
- Development environment set up with Node.js 18+

**📚 Completed Artifacts** (2025-01-18):
- ✅ [`docs/migration/env-mapping.md`](../migration/env-mapping.md) - Complete VITE_ → REACT_APP_ variable reference
- ✅ [`docs/migration/firebase-config-analysis.md`](../migration/firebase-config-analysis.md) - Firebase configuration requirements
- ✅ [`docs/migration/dependency-compatibility-report.md`](../migration/dependency-compatibility-report.md) - Dependency conflict analysis
- ✅ [`docs/migration/dev-environment-checklist.md`](../migration/dev-environment-checklist.md) - Tool validation results
- ✅ [`docs/migration/risk-assessment-matrix.md`](../migration/risk-assessment-matrix.md) - Risk analysis with mitigations
- ✅ [`docs/migration/rollback-procedures.md`](../migration/rollback-procedures.md) - Complete recovery procedures

**Tasks**:
1. **Firebase Project Access Verification**
   - Check `.firebaserc` in MVPAPP for project configuration
   - Verify Firebase CLI login and project access permissions
   - Test Firebase project connectivity (`firebase projects:list`)
   - Document actual Firebase project ID and aliases

2. **Environment Configuration Discovery** 
   - Locate and review MVPAPP environment files (`.env`, `.env.example`, etc.)
   - Document all Firebase environment variables and their current values
   - Identify Love Retold platform-specific configuration requirements
   - Map VITE_ environment variables to REACT_APP_ equivalents for UIAPP

3. **Firebase Configuration Analysis**
   - Review `storage.rules` for hardcoded paths or MVPAPP-specific assumptions
   - Check `firestore.rules` for any path dependencies on MVPAPP structure
   - Validate `firebase.json` hosting configuration needs for UIAPP (build/ vs dist/)
   - Review Firebase Functions runtime and dependency requirements

4. **Dependency Compatibility Assessment**
   - Check UIAPP's existing dependencies against Firebase SDK v10.4.0 requirements
   - Identify potential conflicts with Firebase dependencies
   - Review Node.js version compatibility (Functions require Node 18+)
   - Document any dependency updates needed for UIAPP

5. **UIAPP Build System Validation**
   - Confirm UIAPP builds successfully in current state
   - Test that UIAPP build output goes to `build/` directory (CRA standard)
   - Verify UIAPP's existing service patterns are compatible with Firebase integration
   - Document any build system modifications needed

6. **Development Environment Setup**
   - Install Firebase CLI globally if not present (`npm install -g firebase-tools`)
   - Test Firebase emulator suite functionality
   - Verify Node.js 18+ for Firebase Functions compatibility
   - Create workspace backup before making any changes

7. **Integration Boundary Validation**
   - Review MVPAPP documentation (INTEGRATION_BOUNDARIES.md, ARCHITECTURE.md)
   - Confirm understanding of Love Retold platform integration requirements
   - Validate session ID format and validation requirements
   - Document any Love Retold platform coordination needed

8. **Risk Assessment & Mitigation Planning**
   - Document all identified risks and their mitigation strategies
   - Create rollback plan for each potential modification
   - Identify critical path dependencies that could block later slices
   - Prepare troubleshooting guide for common issues

**Acceptance Tests**:
- [x] Firebase CLI authenticated and can access target Firebase project
- [x] All MVPAPP environment variables documented and mapped to UIAPP equivalents
- [x] Firebase configuration files reviewed and UIAPP adaptations identified
- [x] No dependency conflicts identified between UIAPP and Firebase SDK
- [x] UIAPP builds successfully and outputs to correct directory
- [x] Development environment ready with all required tools
- [x] Love Retold platform integration requirements clearly understood
- [x] Comprehensive risk assessment completed with mitigation strategies

**Artifacts**:
- **Environment Mapping Document**: Complete mapping of MVPAPP → UIAPP environment variables
- **Firebase Configuration Analysis**: Required changes to firebase.json, rules, etc.
- **Dependency Compatibility Report**: Any required package.json updates
- **Development Environment Checklist**: Setup validation and tool requirements
- **Risk Assessment Matrix**: Identified risks with mitigation strategies
- **Rollback Procedures**: Step-by-step rollback for each planned change

**Source Investigation**:
- `mvpapp/.firebaserc` - Firebase project configuration
- `mvpapp/.env*` - Environment variable templates and examples
- `mvpapp/firebase.json` - Firebase hosting and service configuration
- `mvpapp/storage.rules` & `mvpapp/firestore.rules` - Security rules analysis
- `mvpapp/functions/package.json` - Functions dependencies and runtime
- `uiapp/package.json` - Current dependencies and build configuration

**Rollback**: No changes made to codebase during this slice - investigation only

**Critical Success Factors**:
- [x] **Firebase Project Access Confirmed**: Can deploy to correct Firebase project
- [x] **Environment Variables Mapped**: All required config identified for UIAPP
- [x] **No Blocking Conflicts**: All compatibility issues resolved or mitigated
- [x] **Clear Integration Requirements**: Love Retold platform requirements documented
- [x] **Risk Mitigation Ready**: Rollback and recovery procedures prepared

**🚨 Stop Criteria** - If any of these are discovered, resolve before proceeding:
- Unable to access Firebase project or unclear project permissions
- Major dependency conflicts that require significant UIAPP modifications
- Missing critical environment variables or configuration
- Love Retold platform integration requirements unclear or impossible
- Development environment cannot support Firebase Functions (Node.js version, etc.)

---

### Slice C01: Firebase Infrastructure Setup

**Objective**: Copy Firebase project infrastructure from MVPAPP to UIAPP and establish deployment capability

**Entry Criteria**: 
- **C00 completed** with all critical success factors validated
- Firebase project access confirmed and documented
- Environment variable mapping completed
- No blocking dependency conflicts identified
- UIAPP build system validated and ready

**📖 Required References from C00**:
- Use [`docs/migration/firebase-config-analysis.md`](../migration/firebase-config-analysis.md) - Section "Required Adaptations for UIAPP"
- Use [`docs/migration/env-mapping.md`](../migration/env-mapping.md) - For environment variable conversion
- Follow [`docs/migration/risk-assessment-matrix.md`](../migration/risk-assessment-matrix.md) - Section "R1: Shared Firebase Project Conflicts"

**Tasks**:
1. Copy `firebase.json` from MVPAPP to UIAPP root (apply C00 hosting adaptations)
2. Copy `firestore.rules` from MVPAPP to UIAPP root  
3. Copy `storage.rules` from MVPAPP to UIAPP root
4. Copy `firestore.indexes.json` from MVPAPP to UIAPP root
5. Copy `.firebaserc` from MVPAPP to UIAPP root (apply C00 project configuration)
6. Create `scripts/` directory and copy deployment scripts (adapt for UIAPP)
7. Add Firebase CLI dependencies to UIAPP package.json (versions from C00 analysis)
8. Test Firebase deployment from UIAPP directory
9. Verify Firebase project configuration works from UIAPP

**Acceptance Tests**:
- [ ] Firebase configuration files copied successfully
- [ ] Firebase CLI can deploy rules from UIAPP directory
- [ ] Firestore rules deploy without errors
- [ ] Storage rules deploy without errors
- [ ] Firebase indexes deploy correctly
- [ ] No conflicts with existing Firebase project setup

**Artifacts**:
- `firebase.json` - Firebase project configuration
- `firestore.rules` - Database security rules
- `storage.rules` - Storage security rules  
- `firestore.indexes.json` - Database indexes
- `scripts/deploy-firebase.js` - Deployment scripts

**Source Mapping**:
- `mvpapp/firebase.json` → `uiapp/firebase.json` (adapted per C00 analysis)
- `mvpapp/.firebaserc` → `uiapp/.firebaserc`
- `mvpapp/firestore.rules` → `uiapp/firestore.rules`
- `mvpapp/storage.rules` → `uiapp/storage.rules`
- `mvpapp/firestore.indexes.json` → `uiapp/firestore.indexes.json`
- `mvpapp/scripts/*` → `uiapp/scripts/*` (adapted for UIAPP build system)

**Rollback**: Delete copied files, remove Firebase CLI dependencies

---

### Slice C02: Firebase Configuration & Environment

**Objective**: Establish Firebase configuration in UIAPP following UIAPP patterns with environment variables

**Entry Criteria**: 
- C01 completed
- Firebase infrastructure files in place
- UIAPP environment setup understanding

**📖 Required References from C00**:
- Use [`docs/migration/env-mapping.md`](../migration/env-mapping.md) - Complete variable conversion table
- Use [`docs/migration/dependency-compatibility-report.md`](../migration/dependency-compatibility-report.md) - Required package.json updates

**Tasks**:
1. Create `src/config/firebase.js` based on MVPAPP's firebase configuration
2. Convert MVPAPP environment variables from VITE_ to REACT_APP_ prefix
3. Update UIAPP's `src/config/index.js` to include Firebase configuration section
4. Create `.env.example` with Firebase environment template
5. Add Firebase SDK dependencies to package.json (match MVPAPP versions)
6. Test Firebase SDK initialization in UIAPP
7. Verify environment variable loading
8. Create Firebase emulator configuration for local development

**Acceptance Tests**:
- [ ] Firebase configuration initializes without errors
- [ ] Environment variables load correctly with REACT_APP_ prefix
- [ ] Firebase SDK connects to project successfully
- [ ] UIAPP builds with Firebase dependencies
- [ ] Emulator configuration works for local development
- [ ] No secrets committed to repository
- [ ] Configuration follows UIAPP patterns

**Artifacts**:
- `src/config/firebase.js` - Firebase initialization
- Updated `src/config/index.js` - Extended configuration
- `.env.example` - Environment template
- Updated `package.json` - Firebase dependencies

**Source Mapping**:
- `mvpapp/recording-app/src/services/firebase.js` → `uiapp/src/config/firebase.js`
- `mvpapp/recording-app/.env.example` → `uiapp/.env.example` (converted)

**Rollback**: Remove Firebase config, revert package.json, delete .env.example

---

### Slice C03: Firebase Functions Migration

**Objective**: Copy and adapt MVPAPP Firebase Functions to UIAPP structure for deployment

**Entry Criteria**: 
- C02 completed
- Firebase configuration working
- Understanding of MVPAPP Functions structure

**Tasks**:
1. Copy `functions/` directory from MVPAPP to UIAPP
2. Update functions package.json if needed for UIAPP deployment context
3. Review and adapt function source code for any UIAPP-specific requirements
4. Test function compilation and deployment from UIAPP
5. Verify `validateRecordingSession` function works correctly
6. Test `processRecording` function if applicable
7. Update firebase.json functions configuration if needed
8. Document function endpoints and their usage

**Acceptance Tests**:
- [ ] Functions directory copied and builds successfully
- [ ] validateRecordingSession function deploys and responds correctly
- [ ] processRecording function deploys and works (if applicable)
- [ ] Function deployment succeeds from UIAPP directory
- [ ] Functions accessible from UIAPP Firebase config
- [ ] Function logs appear correctly in Firebase console
- [ ] No breaking changes to function interfaces

**Artifacts**:
- `functions/` - Complete Firebase Functions codebase
- `functions/src/index.ts` - Function exports
- `functions/src/sessions/validateSession.ts` - Session validation
- `functions/src/recordings/processRecording.ts` - Recording processing
- Function deployment documentation

**Source Mapping**:
- `mvpapp/functions/` → `uiapp/functions/` (complete directory copy)

**Rollback**: Delete functions directory, revert firebase.json functions config

---

### Slice C04: Firebase Authentication Service

**Objective**: Rewrite MVPAPP's Firebase authentication into UIAPP service following UIAPP patterns

**Entry Criteria**: 
- C03 completed
- Firebase Functions deployed
- UIAPP service patterns understood

**Tasks**:
1. Create `src/services/firebaseAuth.js` based on MVPAPP's authentication logic
2. Implement anonymous authentication with retry logic from MVPAPP
3. Add authentication state management compatible with UIAPP's useReducer pattern
4. Implement error handling and mapping to UIAPP error patterns
5. Create authentication status monitoring
6. Test authentication service in isolation
7. Add authentication service to UIAPP's existing service loading pattern
8. Verify authentication works with Firebase project

**Acceptance Tests**:
- [ ] Anonymous authentication succeeds consistently
- [ ] Retry logic handles network failures (3 attempts, exponential backoff)
- [ ] Authentication state integrates with UIAPP state management
- [ ] Authentication errors map to UIAPP error handling patterns
- [ ] Service follows UIAPP coding conventions and patterns
- [ ] Authentication status is properly monitored and updated
- [ ] No impact on existing UIAPP functionality

**Artifacts**:
- `src/services/firebaseAuth.js` - Firebase authentication service
- Updated `src/reducers/appReducer.js` - Auth state integration (if needed)

**Source Mapping**:
- `mvpapp/recording-app/src/services/firebase.js` (auth parts) → `uiapp/src/services/firebaseAuth.js`

**Rollback**: Delete firebaseAuth.js, revert state management changes

---

### Slice C05: Firebase Session Management Service

**Objective**: Rewrite MVPAPP's session validation and parameter parsing into UIAPP service

**Entry Criteria**: 
- C04 completed
- Authentication service working
- Understanding of session validation flow

**Tasks**:
1. Create `src/services/firebaseSession.js` based on MVPAPP session management
2. Implement session ID parsing from URL parameters (Love Retold format)
3. Add session validation using Firebase Functions (`validateRecordingSession`)
4. Implement session timeout handling (4-second timeout)
5. Add session state management compatible with UIAPP patterns
6. Map all session status codes to appropriate user messages
7. Test session validation with various session ID formats
8. Integrate session validation into recording flow preparation

**Acceptance Tests**:
- [ ] Session ID parsing works for all Love Retold session formats
- [ ] Session validation calls Firebase function successfully
- [ ] All session states handled correctly (active, expired, invalid, etc.)
- [ ] Session timeout handled gracefully with fallback
- [ ] Session validation errors map to user-friendly messages
- [ ] Session state integrates with existing UIAPP recording flow
- [ ] Service follows UIAPP patterns and conventions

**Artifacts**:
- `src/services/firebaseSession.js` - Session management service
- Updated recording flow integration for session validation

**Source Mapping**:
- `mvpapp/recording-app/src/services/session.js` → `uiapp/src/services/firebaseSession.js`
- `mvpapp/recording-app/src/components/SessionValidator.jsx` (logic) → integrated into service

**Rollback**: Delete firebaseSession.js, remove session validation from recording flow

---

### Slice C06: Firebase Recording Upload Service

**Objective**: Rewrite MVPAPP's recording upload functionality into UIAPP service with chunked uploads

**Entry Criteria**: 
- C05 completed
- Session management working
- Understanding of MVPAPP upload strategy

**Tasks**:
1. Create `src/services/firebaseRecording.js` based on MVPAPP recording services
2. Implement chunked upload strategy from MVPAPP unifiedRecording.js
3. Add real-time upload progress tracking (replace UIAPP's simulated progress)
4. Implement Firestore metadata storage for recordings
5. Add upload resume capability for failed uploads
6. Generate storage paths following MVPAPP conventions
7. Integrate with UIAPP's existing recording flow and progress UI
8. Test upload with various file sizes and network conditions

**Acceptance Tests**:
- [ ] Recordings upload to Firebase Storage successfully
- [ ] Chunked upload strategy works for large files
- [ ] Upload progress tracking is accurate and smooth
- [ ] Recording metadata stored correctly in Firestore
- [ ] Failed uploads can be resumed from interruption point
- [ ] Storage paths follow MVPAPP naming conventions
- [ ] Upload progress integrates seamlessly with existing UIAPP progress UI
- [ ] Service maintains UIAPP's existing recording interface patterns

**Artifacts**:
- `src/services/firebaseRecording.js` - Recording upload service
- Updated recording flow with real Firebase progress tracking

**Source Mapping**:
- `mvpapp/recording-app/src/services/unifiedRecording.js` → `uiapp/src/services/firebaseRecording.js`
- `mvpapp/recording-app/src/services/chunkUploadManager.js` (logic) → integrated into service

**Rollback**: Delete firebaseRecording.js, revert to localStorage upload with simulated progress

---

### Slice C07: Firebase Storage & Download Service

**Objective**: Implement Firebase Storage operations for recording retrieval and management

**Entry Criteria**: 
- C06 completed
- Recording uploads working
- Understanding of storage operations needed

**Tasks**:
1. Create `src/services/firebaseStorage.js` for storage operations
2. Implement recording download and URL generation for playback
3. Add recording listing functionality via Firestore queries
4. Implement storage cleanup for failed/cancelled recordings
5. Add recording deletion with storage and metadata cleanup
6. Test storage operations match UIAPP's admin and playback needs
7. Ensure download URLs work correctly with UIAPP's media player
8. Add storage quota monitoring and error handling

**Acceptance Tests**:
- [ ] Recordings can be retrieved and played back successfully
- [ ] Recording lists load correctly from Firestore
- [ ] Download URLs work with UIAPP's Plyr media player
- [ ] Failed recordings are cleaned up automatically
- [ ] Recording deletion works end-to-end (storage + metadata)
- [ ] Storage quota errors are handled gracefully
- [ ] Admin page can list and filter Firebase recordings
- [ ] Storage operations maintain same interface as localStorage version

**Artifacts**:
- `src/services/firebaseStorage.js` - Storage operations service
- Updated admin page integration for Firebase storage
- Updated media playback integration

**Source Mapping**:
- `mvpapp/recording-app/src/services/stories.js` → `uiapp/src/services/firebaseStorage.js`
- MVPAPP storage patterns → UIAPP admin page integration

**Rollback**: Delete firebaseStorage.js, revert admin page and playback to localStorage

---

### Slice C08: Error Handling & Fallback Logic

**Objective**: Implement comprehensive Firebase error handling with automatic fallback to localStorage

**Entry Criteria**: 
- C07 completed
- All Firebase services implemented
- Understanding of UIAPP error patterns

**📖 Required References from C00**:
- Follow [`docs/migration/rollback-procedures.md`](../migration/rollback-procedures.md) - For fallback implementation patterns

**Tasks**:
1. Create comprehensive Firebase error mapping to UIAPP error types
2. Implement automatic fallback to localStorage on Firebase failures
3. Add error boundary components for Firebase service failures
4. Implement retry logic for transient Firebase errors
5. Add production error logging compatible with UIAPP patterns
6. Test all error scenarios and fallback behaviors
7. Ensure fallback mode provides complete UIAPP functionality
8. Document error handling and recovery procedures

**Acceptance Tests**:
- [ ] All Firebase errors map to appropriate UIAPP error messages
- [ ] Automatic fallback to localStorage works for all service failures
- [ ] Error boundaries prevent app crashes from Firebase issues
- [ ] Retry logic handles transient errors appropriately
- [ ] Error logging captures sufficient information for debugging
- [ ] All error scenarios tested and validated
- [ ] Fallback mode provides full UIAPP functionality
- [ ] Error handling follows UIAPP patterns and conventions

**Artifacts**:
- `src/utils/firebaseErrorHandler.js` - Error mapping and handling utilities
- `src/components/FirebaseErrorBoundary.jsx` - Error boundary component
- Updated all Firebase services with error handling

**Rollback**: Remove error handling, disable fallback logic

---

### Slice C09: UI Integration & Testing

**Objective**: Complete integration of Firebase services with UIAPP UI and comprehensive testing

**Entry Criteria**: 
- C08 completed
- All Firebase services implemented with error handling
- UIAPP UI integration points identified

**Tasks**:
1. Integrate Firebase services into UIAPP's useRecordingFlow hook
2. Update service selection logic to choose Firebase vs localStorage
3. Test complete recording flow end-to-end with Firebase
4. Verify UI behavior is identical to localStorage version
5. Test all error scenarios and fallback behaviors with UI
6. Conduct cross-browser compatibility testing
7. Performance testing to ensure no UI/UX degradation
8. Test admin page functionality with Firebase storage

**Acceptance Tests**:
- [ ] Complete recording flow works identically to localStorage version
- [ ] UI behavior is pixel-perfect compared to original
- [ ] All error scenarios display appropriate user messages
- [ ] Cross-browser testing passes for all major browsers
- [ ] Performance benchmarks meet or exceed localStorage version
- [ ] Admin page works correctly with Firebase storage
- [ ] Media playback works seamlessly with Firebase storage
- [ ] Service switching (Firebase/localStorage) works transparently

**Artifacts**:
- Updated `src/hooks/useRecordingFlow.js` - Firebase service integration
- Updated admin page components for Firebase storage
- Test results documentation
- Cross-browser compatibility report

**Rollback**: Revert useRecordingFlow changes, disable Firebase service selection

---

### Slice C10: Production Deployment & Validation

**Objective**: Deploy UIAPP with Firebase integration to production and validate full functionality

**Entry Criteria**: 
- C09 completed
- All integration testing passed
- Production deployment process understood

**📖 Required References from C00**:
- **CRITICAL**: Follow [`docs/migration/risk-assessment-matrix.md`](../migration/risk-assessment-matrix.md) - Section "R1: Shared Firebase Project Conflicts"
- Review [`docs/migration/firebase-config-analysis.md`](../migration/firebase-config-analysis.md) - Section "Deployment Safety"

**Tasks**:
1. Deploy UIAPP to production environment
2. Deploy Firebase Functions from UIAPP directory
3. Verify all Firebase services work in production
4. Test with real session IDs from main Love Retold platform
5. Validate complete recording workflow in production
6. Set up monitoring and alerting for Firebase services
7. Test emergency fallback to localStorage in production
8. Document production configuration and procedures

**Acceptance Tests**:
- [ ] Production deployment successful from UIAPP
- [ ] Firebase Functions deployed and operational from UIAPP
- [ ] Firebase services work correctly in production environment
- [ ] Real session IDs from main platform validate correctly
- [ ] Complete recording workflow functions in production
- [ ] Monitoring and alerting configured and working
- [ ] Emergency fallback to localStorage validated in production
- [ ] Production documentation complete and accurate

**Artifacts**:
- Production deployment documentation
- Monitoring and alerting configuration
- Emergency procedures documentation
- Production validation report

**Rollback**: Redeploy previous UIAPP version, disable Firebase in production

---

### Slice C11: MVPAPP Deletion Verification

**Objective**: Verify MVPAPP can be safely deleted and complete the consolidation

**Entry Criteria**: 
- C10 completed
- Production validation successful
- UIAPP fully functional independently

**Tasks**:
1. Verify UIAPP deploys and operates completely independently
2. Confirm no external dependencies on MVPAPP directory or services
3. Test complete Firebase project lifecycle from UIAPP (deploy, manage, monitor)
4. Verify Firebase Functions, rules, and configuration work from UIAPP only
5. Document migration completion and MVPAPP deletion safety
6. Create backup of MVPAPP directory before deletion
7. Delete MVPAPP directory and verify no broken references
8. Update documentation to reflect single-app architecture

**Acceptance Tests**:
- [ ] UIAPP operates completely independently of MVPAPP
- [ ] No broken references or dependencies after MVPAPP deletion
- [ ] Firebase infrastructure deploys and manages from UIAPP only
- [ ] Complete recording workflow verified post-MVPAPP deletion
- [ ] No external systems depend on MVPAPP
- [ ] Documentation updated to reflect consolidated architecture
- [ ] Backup of MVPAPP created and stored safely
- [ ] Migration completion documented

**Artifacts**:
- MVPAPP backup archive
- Migration completion documentation
- Updated architecture documentation
- MVPAPP deletion verification report

**Rollback**: Restore MVPAPP directory from backup, revert references

## 11. Testing Protocol

### Local Development Testing
```bash
# Firebase emulator testing (UIAPP directory)
firebase emulators:start
npm test src/services/firebase*.test.js
npm run test:e2e:local

# Firebase service integration testing
npm test src/hooks/useRecordingFlow.test.js
npm test src/pages/AdminPage.test.js
```

### Production Testing Strategy
```bash
# Deploy to test Firebase project
firebase use test-project
firebase deploy --only functions,firestore:rules,storage:rules

# Full integration testing
npm run test:integration
npm run test:e2e:production
```

### Manual Testing Checklist
#### Core Functionality
- [ ] **Anonymous Authentication**: Sign-in, retry logic, state monitoring
- [ ] **Session Validation**: URL parsing, Firebase function calls, timeout handling
- [ ] **Recording Upload**: File upload, chunked strategy, progress tracking
- [ ] **Recording Playback**: File retrieval, download URLs, media player integration
- [ ] **Admin Functionality**: Recording lists, filtering, deletion

#### Error Scenarios
- [ ] **Network Failures**: Auth retry, upload retry, validation timeout
- [ ] **Firebase Service Failures**: Automatic fallback to localStorage
- [ ] **Storage Quota**: Quota exceeded error handling
- [ ] **Session Expiry**: Session expires during recording
- [ ] **Invalid Session**: Malformed session IDs, non-existent sessions

#### Cross-Platform Testing
- [ ] **Browsers**: Chrome, Firefox, Safari, Edge
- [ ] **Devices**: Desktop, tablet, mobile
- [ ] **Network Conditions**: Fast, slow, intermittent
- [ ] **File Types**: Audio, video, various formats
- [ ] **File Sizes**: Small, medium, large recordings

### E2E Testing Scenarios
1. **Complete Happy Path**: Session validation → recording → upload → playback
2. **Error Recovery**: Upload failure → automatic retry → eventual success
3. **Fallback Flow**: Firebase failure → automatic localStorage fallback → full functionality
4. **Session Management**: Session expiry during recording → graceful handling
5. **Admin Workflow**: Recording → admin list → playback → deletion

## 12. Success Criteria

### Functional Requirements
- [ ] **Complete Standalone Operation**: UIAPP operates independently without MVPAPP
- [ ] **Firebase Integration**: All Firebase services (auth, storage, functions) work natively in UIAPP
- [ ] **Session Validation**: Love Retold session IDs validate correctly via UIAPP
- [ ] **Recording Workflow**: Complete recording upload and playback from UIAPP
- [ ] **UI Preservation**: UIAPP interface remains pixel-perfect and unchanged
- [ ] **Error Handling**: All Firebase errors handled gracefully with localStorage fallback

### Performance Requirements
- [ ] **Load Time**: App loads within 3 seconds (same as current UIAPP)
- [ ] **Upload Performance**: Firebase uploads equal or better than localStorage performance
- [ ] **Playback Quality**: No degradation in recording playback quality
- [ ] **Memory Usage**: No significant increase in memory consumption
- [ ] **Bundle Size**: Minimal increase in application bundle size

### Quality Requirements
- [ ] **Type Safety**: All Firebase integrations properly typed
- [ ] **Test Coverage**: Comprehensive test coverage for all Firebase services
- [ ] **Error Coverage**: All Firebase error codes mapped to user messages
- [ ] **Documentation**: Complete documentation of Firebase integration

### Consolidation Requirements
- [ ] **MVPAPP Independence**: UIAPP functions without any MVPAPP dependencies
- [ ] **Firebase Deployment**: UIAPP can deploy and manage Firebase infrastructure independently
- [ ] **Configuration Management**: All Firebase configuration managed from UIAPP
- [ ] **MVPAPP Deletion**: MVPAPP directory safely deleted with no functionality loss
- [ ] **Single Maintenance**: Only UIAPP requires ongoing development and maintenance

## 13. Handover Notes Template

### Developer Handover Checklist
When pausing/resuming work, fill in the following:

```markdown
### Handover: [Date] - [Your Name] to [Next Developer]

**Slice in Progress**: C0X - [Slice Title]

**Consolidation Status**: 
- [ ] MVPAPP files copied: [List files copied]
- [ ] UIAPP services implemented: [List services completed]
- [ ] Integration testing: [COMPLETED/IN_PROGRESS/BLOCKED]
- [ ] Firebase deployment: [COMPLETED/IN_PROGRESS/BLOCKED]

**Current Progress**:
- [List completed tasks with source → target mapping]
- [Include commit hashes/PR numbers]
- [Note any MVPAPP reference materials used]

**Next Steps**:
- [What MVPAPP files need to be copied next]
- [What UIAPP services need implementation]
- [Any blockers or integration issues]

**Firebase Status**:
- [Functions deployment status]
- [Configuration status]
- [Any Firebase project issues]

**Testing Results**:
- [What's been tested and results]
- [Any failed tests or issues found]
- [What still needs testing]

**MVPAPP Reference Usage**:
- [Which MVPAPP files/patterns were referenced]
- [How they were adapted to UIAPP conventions]
- [Any deviations from MVPAPP implementation]

**Integration Points**:
- [Which UI components have been integrated]
- [Service connections established]
- [Any UI behavior changes (should be none)]

**Rollback Status**:
- [How to rollback current Firebase integration]
- [Which localStorage functionality is preserved]
- [What's safe to revert vs. what needs preservation]

**Consolidation Readiness**:
- [Progress toward MVPAPP deletion capability]
- [Dependencies on MVPAPP that still exist]
- [Standalone operation verification status]
```

### File Tracking Template
```markdown
**MVPAPP → UIAPP File Mapping Completed**:
- mvpapp/firebase.json → uiapp/firebase.json [✓/✗]
- mvpapp/functions/src/index.ts → uiapp/functions/src/index.ts [✓/✗]
- mvpapp/recording-app/src/services/firebase.js → uiapp/src/services/firebaseAuth.js [✓/✗]
- [Continue mapping...]

**Files Created in UIAPP**:
- uiapp/src/services/firebaseAuth.js - [Status/Notes]
- uiapp/src/services/firebaseSession.js - [Status/Notes]
- [Continue list...]

**Files Ready for Deletion from MVPAPP** (when consolidation complete):
- [List files that have been successfully migrated]
```

## 14. MVPAPP Documentation Reference Strategy

### Critical Value Assessment: **PRESERVE AND REFERENCE**

The MVPAPP documentation folder contains **irreplaceable production integration knowledge** that future developers will need throughout the consolidation process and beyond. This documentation should be preserved and actively referenced.

### 🎯 **High-Value Documentation Components**

#### **INTEGRATION_BOUNDARIES.md** - Production Integration Patterns
**Critical for understanding Love Retold platform integration**:
- ✅ **Frontend-Only Architecture**: Documents that MVPAPP integrates with Love Retold's existing Firebase backend
- ✅ **Shared Firebase Project**: Clarifies this is `love-retold-production`, not standalone
- ✅ **Integration Boundaries**: Explicit guidance on what NOT to build (prevents duplication)
- ✅ **SESSION_ID Patterns**: Shows URL parsing and session management integration with Love Retold
- ✅ **Wave 3 Task Checklist**: 5-day frontend integration roadmap

#### **ARCHITECTURE.md** - Production Implementation Details
**Comprehensive technical architecture for Firebase integration**:
- ✅ **Complete Firestore Schema**: All collections, documents, relationships with Love Retold platform
- ✅ **Security Rules**: Production rules showing user data isolation and session validation
- ✅ **Cloud Functions Architecture**: Recording triggers, transcription pipeline, story creation
- ✅ **Anonymous Authentication Flow**: Critical for recording sessions without user login
- ✅ **Love Retold Platform Integration**: How recording app connects to main platform

#### **CLAUDE.md** - Production Safety Protocols
**Critical deployment warnings preventing production outages**:
- 🚨 **Shared Firebase Project Rules**: Never use `firebase deploy --only functions` on shared projects
- 🚨 **Firestore Rules Synchronization**: Coordination protocol between teams
- 🚨 **Historical Context**: Documents previous production issues caused by rule conflicts
- 🚨 **Deployment Safety**: Specific commands for safe function deployment

### 📚 **Documentation Preservation Strategy**

```yaml
documentation_reference_plan:
  preserve_location: "./docs/reference/mvpapp-integration-patterns/"
  
  primary_references:
    INTEGRATION_BOUNDARIES.md:
      value: "Production integration patterns with Love Retold platform"
      usage: "Slices C01-C03 (Firebase setup), C04-C06 (authentication/sessions)"
      critical_sections: 
        - "Frontend-Only Integration pattern"
        - "SESSION_ID parsing and validation"
        - "Love Retold platform boundaries"
    
    ARCHITECTURE.md:
      value: "Complete production Firebase architecture"
      usage: "All slices - comprehensive reference for implementation"
      critical_sections:
        - "Firestore schema and collections"
        - "Security rules implementation"
        - "Anonymous authentication flow"
    
    CLAUDE.md:
      value: "Production deployment safety protocols"
      usage: "Slices C03, C10 (Functions deployment, production)"
      critical_sections:
        - "Shared Firebase project warnings"
        - "Safe function deployment commands"
        - "Firestore rules coordination"

  handoff_document: "MVPAPP_Integration_Reference.md"
  archive_strategy: "Reference during consolidation, preserve post-completion"
```

### 🔗 **Integration with Consolidation Slices**

**Slice Usage Guide**:
- **C01-C03** (Firebase Infrastructure): Use ARCHITECTURE.md for schema, rules, and function structure
- **C04-C06** (Auth/Sessions): Reference INTEGRATION_BOUNDARIES.md for Love Retold integration patterns
- **C07-C09** (Storage/UI): Follow ARCHITECTURE.md storage patterns and session flows
- **C10-C11** (Deployment): Apply CLAUDE.md safety protocols for production deployment

### 📋 **Developer Handoff Integration**

**Add to Developer Handover Template**:
```markdown
**MVPAPP Documentation Usage**:
- [ ] INTEGRATION_BOUNDARIES.md reviewed for current slice
- [ ] ARCHITECTURE.md patterns applied to UIAPP implementation
- [ ] CLAUDE.md safety protocols followed for deployments
- [ ] Deviations from MVPAPP patterns documented with rationale
```

### ⚠️ **Critical Integration Warnings**

**Based on MVPAPP Documentation Analysis**:
1. **Shared Firebase Project**: NEVER use broad deploy commands that could affect Love Retold's functions
2. **Firestore Rules Coordination**: ALWAYS coordinate rule changes with Love Retold team
3. **Frontend-Only Pattern**: MVPAPP is frontend integration, not standalone backend
4. **Session Integration**: Follow exact URL parsing patterns for Love Retold compatibility
5. **Production Safety**: Use CLAUDE.md protocols to prevent historical production issues

### 🎯 **Recommendation Implementation**

**Immediate Actions**:
1. **Preserve MVPAPP Docs**: Copy to `./docs/reference/mvpapp-integration-patterns/`
2. **Create Reference Guide**: Generate `MVPAPP_Integration_Reference.md` with key patterns
3. **Update Slice Instructions**: Add specific MVPAPP doc references to each slice
4. **Safety Protocol Integration**: Include CLAUDE.md warnings in deployment slices

**Long-term Value**:
- Future developers working on Love Retold integration
- Troubleshooting production issues
- Understanding historical architectural decisions
- Maintaining compatibility with Love Retold platform

## 15. References

### Strategic Foundation
- **[Comprehensive Merger Plan](../COMPREHENSIVE_MERGER_PLAN.md)**: Complete architectural analysis and risk assessment
- **Original Integration Plan**: Previous adapter-based integration approach (superseded by this consolidation plan)

### MVPAPP Source References
- **Firebase Infrastructure**: `mvpapp/functions/`, `mvpapp/firebase.json`, `mvpapp/*.rules`
- **Firebase Services**: `mvpapp/recording-app/src/services/`
- **Session Management**: `mvpapp/recording-app/src/components/SessionValidator.jsx`
- **Upload Strategy**: `mvpapp/recording-app/src/services/unifiedRecording.js`
- **Configuration**: `mvpapp/recording-app/.env.example`

### UIAPP Target Integration Points
- **Service Layer**: `uiapp/src/services/localRecordingService.js`
- **Configuration**: `uiapp/src/config/index.js`
- **Recording Flow**: `uiapp/src/hooks/useRecordingFlow.js`
- **State Management**: `uiapp/src/reducers/appReducer.js`
- **Admin Interface**: `uiapp/src/pages/AdminPage.jsx`

### Technical References
- **React Firebase Hooks**: https://github.com/csfrequency/react-firebase-hooks
- **Firebase Web SDK v10**: https://firebase.google.com/docs/web/setup
- **Firebase Functions**: https://firebase.google.com/docs/functions
- **Firebase Security Rules**: https://firebase.google.com/docs/firestore/security/get-started

### Emergency Contacts
- **Firebase Project Admin**: [To be filled in]
- **Love Retold Platform Team**: [To be filled in]
- **UIAPP Product Owner**: [To be filled in]

---

**Document Version**: 2.0 - True Consolidation Approach  
**Last Updated**: [To be filled in by first developer]  
**Migration Type**: Copy & Rewrite for Standalone Operation  
**End Goal**: MVPAPP Directory Deletion Capability