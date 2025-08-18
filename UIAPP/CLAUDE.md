# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

**Build & Development:**
```bash
npm start                    # Start development server
npm run build               # Production build
npm run analyze             # Bundle analysis with webpack-bundle-analyzer
npm run test                # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
npm run test:ci             # Run tests once with coverage (CI mode)
```

**Code Quality:**
```bash
npm run lint                # Run ESLint on src directory
npm run lint:fix            # Run ESLint with auto-fix
npm run predeploy           # Run tests and build (pre-deployment checks)
```

**Testing Individual Components:**
```bash
npm test -- --testNamePattern="ComponentName"
npm test -- src/components/RecordingFlow.test.js
```

## Architecture Overview

### Core Application Structure

**State Management Architecture:**
- Uses `useReducer` pattern for central app state management via `src/reducers/appReducer.js`
- Recording flow managed by custom hook `useRecordingFlow` with render prop pattern
- Key state: `submitStage`, `uploadInProgress`, `showConfetti`, media player state

**Recording Flow Architecture:**
1. **Permission & Setup** (`useRecordingFlow.js`) - Handles getUserMedia for audio/video
2. **Recording State** - Uses MediaRecorder API with 30-second limit and pause/resume
3. **Auto-transition** - Automatically transitions to review mode at max duration
4. **Review & Upload** - Shows Plyr media player for playback, handles blob upload

**Component Hierarchy:**
```
App.js (main container)
├── RecordingFlow (render prop for recording state)
├── PromptCard (recording instructions)
├── RecordingBar (timer during recording)
├── VideoPreview/AudioRecorder (live preview)
├── PlyrMediaPlayer (playback in review mode)
├── RadixStartOverDialog (confirmation modal)
└── ConfettiScreen (success state)
```

### Key Configuration System

All constants centralized in `src/config/index.js`:
- `RECORDING_LIMITS` - 30s max duration, timer intervals
- `SUPPORTED_FORMATS` - MediaRecorder format preferences
- `COLORS`, `LAYOUT` - UI constants
- `SERVICE_CONFIG` - Storage and API configuration

### Storage Service Layer

**Local Storage Implementation** (`src/services/localRecordingService.js`):
- Stores recordings in browser localStorage with blob URLs
- Simulates upload progress for smooth UX
- Structured error handling with error classification
- Admin page fetches and filters stored recordings

### Component Patterns

**Custom Hooks:**
- `useRecordingFlow` - Encapsulates entire recording lifecycle
- `useCountdown` - Reusable 3-2-1-BEGIN countdown logic

**Render Props:**
- `RecordingFlow` provides recording state to App.js via children function
- Enables clean separation of recording logic from UI rendering

**Error Handling:**
- Structured error system in `utils/errors.js`
- Error classification (UPLOAD_ERRORS, STORAGE_ERRORS)
- Graceful degradation for media permissions and storage failures

### Navigation & Routing

**Pages:**
- `/` - Main recording interface (App.js)
- `/admin` - Admin panel for filtering recordings by date/type
- `/view/:docId` - Individual recording playback
- `/demo` - Demo/test page
- `/tokens` - Token administration

**Navigation Handlers:**
- Extracted to `utils/navigationHandlers.js` for reusability
- Handles start over flow, stage transitions, dialog management

### Media Handling

**Recording Formats:**
- Video: Prefers `video/mp4;codecs=h264`, falls back to `video/webm`
- Audio: Prefers `audio/mp4;codecs=aac`, falls back to `audio/webm`
- Format detection via `MediaRecorder.isTypeSupported()`

**Media Player:**
- Uses Plyr.js for consistent playback experience
- Handles both audio and video with same component (`PlyrMediaPlayer`)
- Preserves actual MIME type from MediaRecorder for proper playback

### Development Notes

**Component Extraction Strategy:**
- Large components broken into focused, single-responsibility components
- State management consolidated using useReducer pattern
- Utility functions extracted to separate modules

**Preservation Patterns:**
- UI behavior preserved exactly during refactoring
- Original logic timing and state transitions maintained
- Error handling patterns consistent throughout application

**Environment Configuration:**
- Uses `REACT_APP_STORAGE_TYPE` to switch between storage implementations
- Debug mode enabled in development environment
- Local storage used by default with simulated network delays