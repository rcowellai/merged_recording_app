# Error Handling Implementation Plan - Junior Developer Guide

**Document ID**: ERR-FIX-001  
**Version**: 1.0  
**Date**: January 2025  
**Author**: System Analysis Team  
**Status**: Ready for Implementation

---

## 1. Executive Summary

### Goal
Fix error handling in UIAPP recording application to display accurate, contextual error messages from Love Retold server instead of generic hardcoded client messages.

### Scope
**IN SCOPE**:
- Remove client-side message override logic in `functions.js`
- Simplify response processing to trust server messages
- Update documentation project references
- Validate error scenarios with Love Retold system

**OUT OF SCOPE**:
- Server-side changes (Love Retold handles correctly)
- New error states or business rules
- UI/UX redesign (messages remain same content)
- Authentication or security model changes

### Success Criteria
- ✅ Users see server-provided error messages with full context
- ✅ Expiration messages show correct 365-day period
- ✅ Client code simplified by removing duplicate logic
- ✅ All error scenarios validated against Love Retold system
- ✅ No regression in existing functionality

---

## 2. Context Recap

### Current Behavior & Issues
**Problem**: UIAPP receives correct error messages from Love Retold's `getRecordingSession` function but immediately overwrites them with identical hardcoded messages, losing server context and creating maintenance burden.

**Key Issues**:
- Client duplicates server business logic unnecessarily
- Wrong expiration period displayed (7 vs 365 days)
- Server context lost (e.g., who deleted a prompt)
- Maintenance burden from dual message sources

### Architecture Snapshot
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Browser  │    │   UIAPP Client   │    │ Love Retold API │
│                 │    │                  │    │                 │
│ Clicks record   │───▶│ SessionValidator │───▶│getRecordingSession()│
│ link            │    │                  │    │                 │
│                 │    │ ❌ Overwrites    │◄───│ ✅ Returns      │
│ Sees generic    │◄───│ server message  │    │ contextual msg  │
│ message         │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘

CURRENT FLOW: Server truth → Client override → User confusion
TARGET FLOW:  Server truth → Client passthrough → User clarity
```

### Glossary
- **getRecordingSession**: Love Retold Firebase function that validates sessions and returns user-friendly messages
- **SessionValidator**: UIAPP React component that handles session validation UI
- **functions.js**: UIAPP service layer that calls Firebase functions
- **Status Values**: 
  - `valid` = ready for recording
  - `removed` = prompt deleted by account owner  
  - `expired` = session past 365-day limit
  - `completed` = recording already exists
- **getEnhancedSessionStatus**: UIAPP function that duplicates server logic (to be removed)

---

## 3. Decision Matrix (Authoritative)

| Condition | Source of Truth | Decision/Outcome | UX Message | Owner |
|-----------|-----------------|------------------|------------|--------|
| Valid session | Server status='valid' + session data | Show recording interface | "Ready to record your memory" | Love Retold |
| Deleted prompt | Server status='removed' + message | Block recording, show deletion message | Server's exact message | Love Retold |
| Expired session | Server status='expired' + message | Block recording, show expiration message | Server's exact message (365 days) | Love Retold |
| Already recorded | Server status='completed' + message | Block recording, show completion message | Server's exact message | Love Retold |
| Network error | Client catch block | Show connection error | "Unable to validate session. Check connection." | UIAPP |
| Invalid sessionId | Server validation | Show invalid link error | Server's exact message | Love Retold |
| Unknown status | Server status not in known set | Show generic error | "Unknown session status. Please try again." | UIAPP |

**Decision Rule**: Always prefer server-provided messages over client-generated messages. Client only generates messages for client-side errors (network, parsing).

---

## 4. API & Data Contract (Authoritative)

### Request Format
```typescript
// Firebase httpsCallable request
const request = { sessionId: string };
```

### Response Format
```typescript
// Success responses
interface ValidationResponse {
  status: 'valid' | 'removed' | 'expired' | 'completed';
  message?: string;  // Always present for error states
  session?: {        // Only present when status='valid'
    sessionId: string;
    promptText: string;
    askerName: string;
    storytellerName: string;
    coupleNames: string;
    maxDuration: number;
    allowAudio: boolean;
    allowVideo: boolean;
  };
}
```

### Field Semantics
- **status**: Required, enum, server-determined
- **message**: Required for error states, server-generated, user-ready
- **session**: Required only when status='valid', contains recording metadata

### Example Payloads
```typescript
// Deleted prompt response
{
  status: 'removed',
  message: 'This question has been removed by the account owner'
}

// Expired session response  
{
  status: 'expired',
  message: 'This recording link has expired'
}

// Valid session response
{
  status: 'valid',
  session: {
    sessionId: 'abc123-prompt456-user789',
    promptText: 'What was your favorite childhood memory?',
    askerName: 'Sarah',
    storytellerName: 'John',
    maxDuration: 900,
    allowAudio: true,
    allowVideo: true
  }
}
```

---

## 5. Detailed Change List

### 5.1 Client/UI Changes

**Components to Modify**:
- `src/services/firebase/functions.js` - Response processing logic
- No changes to `SessionValidator.jsx` (already handles correctly)

**State Transitions**:
- Remove client-side status→message mapping
- Pass server messages directly to UI layer
- Maintain same loading/error/success states

**Copy Text Changes**:
- Remove hardcoded error messages from functions.js
- Trust server-provided messages (no i18n changes needed)

### 5.2 Server/Functions Changes
**No server changes required** - Love Retold system works correctly.

### 5.3 Data/Firestore Changes  
**No data changes required** - schema and rules remain unchanged.

### 5.4 Config/DevOps Changes
**Documentation Updates**:
- Update Firebase project references from `loveretold-testproject` to `love-retold-webapp`
- Update integration documentation to reflect correct API contract

---

## 6. Work Breakdown Structure

| Task ID | Description | Owner | Est. (h) | Prereqs | Deliverable |
|---------|-------------|-------|----------|---------|-------------|
| ERR-001 | Remove message override logic in functions.js | Frontend Dev | 2 | None | Modified validateSession function |
| ERR-002 | Delete getEnhancedSessionStatus function | Frontend Dev | 1 | ERR-001 | Cleaned functions.js file |
| ERR-003 | Update documentation project references | Dev/Tech Writer | 1 | None | Updated .md files |
| ERR-004 | Test deleted prompt scenario | QA/Dev | 2 | ERR-001, ERR-002 | Test validation report |
| ERR-005 | Test expired session scenario | QA/Dev | 1 | ERR-001, ERR-002 | Test validation report |
| ERR-006 | Test completed recording scenario | QA/Dev | 1 | ERR-001, ERR-002 | Test validation report |
| ERR-007 | Regression testing | QA/Dev | 2 | ERR-004-006 | Full test suite results |
| ERR-008 | Code review and deployment | Tech Lead | 1 | ERR-007 | Production deployment |

**Definition of Done (Per Task)**:
- Code changes implemented and tested locally
- No lint/typecheck errors
- Unit tests pass (if applicable)
- Manual validation completed
- Code reviewed and approved
- Documentation updated

---

## 7. Step-by-Step Implementation Guide

### Phase 1: Remove Message Override Logic

**Step 1**: Locate the problematic code
```bash
# Navigate to project
cd UIAPP/src/services/firebase

# Find the override logic
grep -n "getEnhancedSessionStatus" functions.js
# Should show usage around line 66-83
```

**Step 2**: Modify validateSession function response processing
```typescript
// In functions.js, around line 66-83, replace the return statement:
// OLD (remove this):
const statusObj = this.getEnhancedSessionStatus(data.status, data.message);
return {
  status: data.status || 'unknown',
  message: data.message || 'Unknown status',
  isValid: data.status === 'valid',
  // ... rest stays same
};

// NEW (implement this):
return {
  status: data.status || 'unknown', 
  message: data.message || 'Session validation failed',
  isValid: data.status === 'valid',
  sessionData: data.session ? {
    questionText: data.session.promptText || data.session.questionText,
    storytellerName: data.session.storytellerName,
    askerName: data.session.askerName,
    createdAt: data.session.createdAt,
    expiresAt: data.session.expiresAt,
  } : null,
  session: data.session || null
};
```

**Step 3**: Delete redundant function
```typescript
// In functions.js, remove entire function (lines ~173-272):
// DELETE: getEnhancedSessionStatus(status, customMessage = '') { ... }
// DELETE: getSessionStatusMessage(status, customMessage = '') { ... }
// DELETE: canRecord(status) { ... }
// DELETE: getStatusCategory(status) { ... }
// DELETE: isErrorStatus(status) { ... }
// DELETE: isCompletedStatus(status) { ... }
// DELETE: isProgressStatus(status) { ... }
```

**Step 4**: Validate changes
```bash
# Check for syntax errors
npm run lint

# Check TypeScript
npm run typecheck  

# Build project
npm run build

# Test locally
npm start
```

### Phase 2: Documentation Updates

**Step 5**: Update project references
```bash
# Find and replace in documentation
grep -r "loveretold-testproject" docs/
# Replace all instances with "love-retold-webapp"
```

### Phase 3: Testing & Validation

**Step 6**: Test error scenarios
1. **Deleted Prompt Test**:
   - Coordinate with Love Retold team to create/delete a test prompt
   - Access recording URL for deleted prompt
   - Verify message shows "This question has been removed by the account owner"

2. **Expired Session Test**:
   - Use old sessionId (coordinate with Love Retold for test data)
   - Verify message shows "This recording link has expired"

3. **Valid Session Test**:
   - Use fresh sessionId
   - Verify recording interface loads normally

**Step 7**: Final validation
```bash
# Run full test suite
npm test

# Run linting
npm run lint

# Build production
npm run build

# Manual smoke tests
npm start
# Test each error scenario
```

### Guardrails (DO/DON'T)

**DO**:
- ✅ Always use `data.message` from server for error states
- ✅ Preserve all existing session data structure  
- ✅ Keep same UI error display logic in SessionValidator
- ✅ Test against real Love Retold system
- ✅ Run lint/typecheck before committing

**DON'T**:
- ❌ Don't modify SessionValidator.jsx (already correct)
- ❌ Don't change server-side Love Retold functions
- ❌ Don't modify error UI styling/layout
- ❌ Don't add new error states or business logic
- ❌ Don't skip testing with real deleted/expired sessions

---

## 8. Risks, Mitigations, Open Questions

| Risk | Impact | Likelihood | Mitigation | Owner |
|------|---------|------------|------------|--------|
| Server messages change format | High | Low | Validate with Love Retold team before deploy | Dev Team |
| Regression in session validation | High | Medium | Comprehensive testing of all scenarios | QA |
| Missing edge case handling | Medium | Medium | Test with variety of session states | Dev Team |
| Documentation out of sync | Low | High | Update all references to correct project | Tech Writer |

**Key Assumptions**:
- **TBD**: Love Retold team confirms no upcoming changes to getRecordingSession response format
- **TBD**: Test session IDs available for each error scenario
- **Confirmed**: Server handles all business logic correctly (per Love Retold analysis)

**Open Questions**:
- **TBD**: Coordinate with Love Retold for test data access
- **TBD**: Confirm deployment timing doesn't conflict with Love Retold releases

---

## 9. Appendix

### Copy Deck (User-Facing Messages)
**All messages now sourced from server - no client copy changes needed**

Current server messages (confirmed):
- Deleted prompt: "This question has been removed by the account owner"
- Expired session: "This recording link has expired" 
- Already recorded: "This memory has been recorded"
- Client fallback: "Session validation failed" (network errors only)

### Dependencies & Versions
- No version changes required
- Firebase Functions SDK: maintain current version
- React: maintain current version

### Internal References
- Original analysis document: Error Handling Root Cause Analysis
- Love Retold architecture review: Recording Session Deletion Workflow
- Firebase project: love-retold-webapp (not loveretold-testproject)
- Key files: 
  - `UIAPP/src/services/firebase/functions.js`
  - `UIAPP/src/components/SessionValidator.jsx`
  - `docs/INTEGRATION_BOUNDARIES.md`

### Validation Commands Reference
```bash
# Development workflow
npm run lint              # Check code style
npm run typecheck        # TypeScript validation  
npm run build           # Production build test
npm start               # Local development server
npm test                # Run test suite

# Deployment validation
firebase deploy --only functions  # If server changes needed (none expected)
firebase hosting:channel:deploy preview  # Test deployment
```

---

**Implementation Ready**: This plan provides complete context and step-by-step guidance for a junior developer to implement the error handling fixes without prior system knowledge.