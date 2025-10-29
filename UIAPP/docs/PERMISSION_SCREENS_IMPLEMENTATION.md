# Permission Request Screens Implementation Guide

## Executive Summary

### Current Flow
Users select audio or video mode → App automatically requests permission via browser prompt → User sees AudioTest/VideoTest screen with loading state → Permission granted/denied → User proceeds or retries.

**Problem:** Users are immediately confronted with browser permission prompts without context about why permissions are needed.

### Desired Flow
Users select audio or video mode → **New permission request screen explains why permission is needed** → User clicks button to grant permission → Browser prompt appears → Permission granted → User proceeds to AudioTest/VideoTest screen.

**Key Improvement:** Permission screens are only shown if user hasn't already granted permission (smart detection).

### Outcome
- **Better UX:** Users understand why permission is needed before browser prompt
- **Smart Detection:** Returning users with granted permissions skip permission screens entirely
- **Cross-Browser:** Works seamlessly on Chrome, Firefox, Safari, and Edge
- **Privacy-First:** Camera/microphone indicators only active when user expects it

### Technical Approach
1. **Hybrid Permission Detection:** Use `navigator.permissions.query()` API (Chrome, Firefox, Edge) with fallback to `enumerateDevices()` label detection (Safari)
2. **New State Management:** Add `audioAccessCompleted` and `videoAccessCompleted` flags to track permission flow
3. **New Screen Components:** Create dedicated AudioAccess.jsx and VideoAccess.jsx screens
4. **Flow Refactor:** Move from auto-request (useEffect) to manual button-triggered permission requests
5. **Navigation Updates:** Update back button logic to handle new screens in flow

---

## Implementation Guide

This guide walks through implementation step-by-step in the correct order to avoid breaking existing functionality.

---

## Phase 1: State Management Foundation

### Step 1.1: Update appReducer.js - Add New State Flags

**File:** `src/reducers/appReducer.js`

**Location:** Line 14 (in APP_ACTIONS object)

**Add new action types:**
```javascript
export const APP_ACTIONS = {
  // Navigation actions
  SET_SHOW_WELCOME: 'SET_SHOW_WELCOME',
  SET_HAS_READ_PROMPT: 'SET_HAS_READ_PROMPT',
  SET_AUDIO_ACCESS_COMPLETED: 'SET_AUDIO_ACCESS_COMPLETED',  // ADD THIS
  SET_VIDEO_ACCESS_COMPLETED: 'SET_VIDEO_ACCESS_COMPLETED',  // ADD THIS
  SET_AUDIO_TEST_COMPLETED: 'SET_AUDIO_TEST_COMPLETED',
  SET_VIDEO_TEST_COMPLETED: 'SET_VIDEO_TEST_COMPLETED',
  // ... rest of actions
};
```

**Location:** Line 44 (in initialAppState object)

**Add new state properties:**
```javascript
export const initialAppState = {
  // Navigation states (from App.js lines 62-65)
  showWelcome: true,
  hasReadPrompt: false,
  audioAccessCompleted: false,  // ADD THIS - Track if permission screen completed
  videoAccessCompleted: false,  // ADD THIS - Track if permission screen completed
  audioTestCompleted: false,    // Existing
  videoTestCompleted: false,    // Existing
  submitStage: false,
  // ... rest of state
};
```

**Location:** Line 73 (in appReducer switch statement, after SET_HAS_READ_PROMPT case)

**Add new reducer cases:**
```javascript
case APP_ACTIONS.SET_AUDIO_ACCESS_COMPLETED:
  return { ...state, audioAccessCompleted: action.payload };

case APP_ACTIONS.SET_VIDEO_ACCESS_COMPLETED:
  return { ...state, videoAccessCompleted: action.payload };
```

**Why:** These flags track whether the user has completed the permission request screens, enabling proper flow control and navigation.

---

### Step 1.2: Update navigationHandlers.js - Add Start Over Support

**File:** `src/utils/navigationHandlers.js`

**Location:** Line 44 (in handleStartOverConfirm function, after SET_HAS_READ_PROMPT)

**Add state resets:**
```javascript
const handleStartOverConfirm = () => {
  resetRecordingState();

  dispatch({ type: APP_ACTIONS.SET_HAS_READ_PROMPT, payload: false });
  dispatch({ type: APP_ACTIONS.SET_AUDIO_ACCESS_COMPLETED, payload: false });  // ADD THIS
  dispatch({ type: APP_ACTIONS.SET_VIDEO_ACCESS_COMPLETED, payload: false });  // ADD THIS
  dispatch({ type: APP_ACTIONS.SET_AUDIO_TEST_COMPLETED, payload: false });
  dispatch({ type: APP_ACTIONS.SET_VIDEO_TEST_COMPLETED, payload: false });
  // ... rest of resets
};
```

**Location:** Line 64 (in handleStartOverYes function, after SET_HAS_READ_PROMPT)

**Add same state resets:**
```javascript
const handleStartOverYes = () => {
  resetRecordingState();

  dispatch({ type: APP_ACTIONS.SET_SHOW_START_OVER_CONFIRM, payload: false });
  dispatch({ type: APP_ACTIONS.SET_HAS_READ_PROMPT, payload: false });
  dispatch({ type: APP_ACTIONS.SET_AUDIO_ACCESS_COMPLETED, payload: false });  // ADD THIS
  dispatch({ type: APP_ACTIONS.SET_VIDEO_ACCESS_COMPLETED, payload: false });  // ADD THIS
  dispatch({ type: APP_ACTIONS.SET_AUDIO_TEST_COMPLETED, payload: false });
  // ... rest of resets
};
```

**Why:** Ensures "Start Over" button properly resets permission screens, allowing users to go through full flow again.

---

## Phase 2: Permission Detection Utility

### Step 2.1: Create Permission Utility Module

**File:** `src/utils/permissionUtils.js` (NEW FILE)

**Create this new file with the following content:**

```javascript
/**
 * permissionUtils.js
 * ------------------
 * Cross-browser permission detection utilities for camera and microphone.
 * Uses hybrid approach: Permissions API (Chrome, Firefox, Edge) with
 * enumerateDevices fallback (Safari).
 */

/**
 * Check if camera or microphone permission is already granted
 * Works across all browsers including Safari
 *
 * @param {string} type - 'camera' or 'microphone'
 * @returns {Promise<boolean>} - true if permission granted, false otherwise
 */
export async function hasMediaPermission(type) {
  const permissionName = type === 'camera' ? 'camera' : 'microphone';
  const deviceKind = type === 'camera' ? 'videoinput' : 'audioinput';

  // Method 1: Try Permissions API (Chrome, Firefox, Edge)
  try {
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      const result = await navigator.permissions.query({ name: permissionName });

      if (result.state === 'granted') {
        console.log(`[Permission] ${type} granted via Permissions API`);
        return true;
      }

      if (result.state === 'denied') {
        console.log(`[Permission] ${type} denied via Permissions API`);
        return false;
      }

      // state === 'prompt' - fall through to Method 2
    }
  } catch (error) {
    // Safari or permission query not supported - fall through
    console.log(`[Permission] Permissions API not available, using enumerateDevices fallback`);
  }

  // Method 2: enumerateDevices label detection (Safari + all browsers fallback)
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const relevantDevices = devices.filter(d => d.kind === deviceKind);

    // If ANY device has a label, permission was granted
    // Safari returns empty labels ("") when permission not granted
    const hasLabel = relevantDevices.some(d => d.label && d.label !== '');

    if (hasLabel) {
      console.log(`[Permission] ${type} granted via enumerateDevices (Safari mode)`);
      return true;
    }

    console.log(`[Permission] ${type} not granted (empty labels)`);
    return false;
  } catch (error) {
    console.error(`[Permission] enumerateDevices failed:`, error);
    return false;
  }
}

/**
 * Check both camera and microphone permissions for video mode
 * Video mode requires BOTH permissions
 *
 * @returns {Promise<boolean>} - true if both permissions granted
 */
export async function hasVideoPermissions() {
  const [camera, microphone] = await Promise.all([
    hasMediaPermission('camera'),
    hasMediaPermission('microphone')
  ]);

  return camera && microphone;
}
```

**Why:** This utility provides cross-browser permission detection that works on Safari (which doesn't support Permissions API) by using device label detection as fallback.

---

## Phase 3: Create New Screen Components

### Step 3.1: Create AudioAccess.jsx

**File:** `src/components/screens/AudioAccess.jsx` (NEW FILE)

**Create this new file:**

```javascript
/**
 * AudioAccess.jsx
 * ---------------
 * Permission request screen for microphone access.
 * Shown before AudioTest screen when microphone permission not yet granted.
 * Provides context to user about why permission is needed.
 *
 * Flow:
 * 1. User sees explanation of why microphone access is needed
 * 2. User clicks "Turn on microphone" button
 * 3. Button triggers browser permission prompt via getUserMedia
 * 4. On success: navigate to AudioTest screen
 * 5. On failure: show error (TBD - stub for now)
 *
 * Props:
 * - onPermissionGranted: Handler called when permission successfully granted
 * - onPermissionDenied: Handler called when permission denied
 * - onBack: Handler for back navigation
 *
 * Returns standard screen format:
 * - bannerContent: "Microphone access" header
 * - content: Icon and explanation text
 * - actions: "Turn on microphone" button
 */

import React, { useState } from 'react';
import { FaMicrophoneAlt } from 'react-icons/fa';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function AudioAccess({ onPermissionGranted, onPermissionDenied, onBack }) {
  const { tokens } = useTokens();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleTurnOnMicrophone = async () => {
    setIsRequesting(true);

    try {
      // Request microphone permission via getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      console.log('[AudioAccess] Microphone permission GRANTED');

      // Permission granted - call success handler with stream
      onPermissionGranted(stream);
    } catch (error) {
      console.error('[AudioAccess] Microphone permission DENIED or ERROR');
      console.error('[AudioAccess] Error details:', {
        name: error.name,
        message: error.message
      });

      // Permission denied - call error handler
      onPermissionDenied(error);
    } finally {
      setIsRequesting(false);
    }
  };

  return {
    bannerContent: 'Microphone access',
    content: (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: tokens.spacing[12]
        }}>
          {/* Microphone Icon */}
          <FaMicrophoneAlt size={85} color="rgba(44, 47, 72, 0.85)" />

          {/* Explanation Text */}
          <div style={{
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: `0 0 ${tokens.spacing[4]} 0`,
              lineHeight: '1.5'
            }}>
              Please allow microphone access on your device
            </p>
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: 0,
              lineHeight: '1.5'
            }}>
              To record your stories, we need temporary access to your microphone.
            </p>
          </div>
        </div>
      </div>
    ),
    actions: (
      <Button
        onClick={handleTurnOnMicrophone}
        disabled={isRequesting}
      >
        {isRequesting ? 'Requesting access...' : 'Turn on microphone'}
      </Button>
    ),
    onBack
  };
}

export default AudioAccess;
```

**Why:** This screen provides context before browser permission prompt, improving user experience and permission grant rates.

---

### Step 3.2: Create VideoAccess.jsx

**File:** `src/components/screens/VideoAccess.jsx` (NEW FILE)

**Create this new file:**

```javascript
/**
 * VideoAccess.jsx
 * ---------------
 * Permission request screen for camera access.
 * Shown before VideoTest screen when camera permission not yet granted.
 * Provides context to user about why permission is needed.
 *
 * Flow:
 * 1. User sees explanation of why camera access is needed
 * 2. User clicks "Turn on camera" button
 * 3. Button triggers browser permission prompt via getUserMedia
 * 4. On success: navigate to VideoTest screen
 * 5. On failure: show error (TBD - stub for now)
 *
 * Props:
 * - onPermissionGranted: Handler called when permission successfully granted
 * - onPermissionDenied: Handler called when permission denied
 * - onBack: Handler for back navigation
 *
 * Returns standard screen format:
 * - bannerContent: "Camera access" header
 * - content: Icon and explanation text
 * - actions: "Turn on camera" button
 */

import React, { useState } from 'react';
import { FaVideo } from 'react-icons/fa';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function VideoAccess({ onPermissionGranted, onPermissionDenied, onBack }) {
  const { tokens } = useTokens();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleTurnOnCamera = async () => {
    setIsRequesting(true);

    try {
      // Request camera AND microphone permission via getUserMedia
      // Video mode requires both
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      console.log('[VideoAccess] Camera permission GRANTED');

      // Permission granted - call success handler with stream
      onPermissionGranted(stream);
    } catch (error) {
      console.error('[VideoAccess] Camera permission DENIED or ERROR');
      console.error('[VideoAccess] Error details:', {
        name: error.name,
        message: error.message
      });

      // Permission denied - call error handler
      onPermissionDenied(error);
    } finally {
      setIsRequesting(false);
    }
  };

  return {
    bannerContent: 'Camera access',
    content: (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: tokens.spacing[12]
        }}>
          {/* Camera Icon */}
          <FaVideo size={85} color="rgba(44, 47, 72, 0.85)" />

          {/* Explanation Text */}
          <div style={{
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: `0 0 ${tokens.spacing[4]} 0`,
              lineHeight: '1.5'
            }}>
              Please allow camera access on your device
            </p>
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: 0,
              lineHeight: '1.5'
            }}>
              To record your stories, we need temporary access to your camera.
            </p>
          </div>
        </div>
      </div>
    ),
    actions: (
      <Button
        onClick={handleTurnOnCamera}
        disabled={isRequesting}
      >
        {isRequesting ? 'Requesting access...' : 'Turn on camera'}
      </Button>
    ),
    onBack
  };
}

export default VideoAccess;
```

**Why:** Identical pattern to AudioAccess but for video mode. Requests both camera AND microphone permissions (video mode requirement).

---

## Phase 4: Flow Integration

### Step 4.1: Update AppContent.jsx - Import New Components

**File:** `src/components/AppContent.jsx`

**Location:** Line 72 (in screen component imports section, after ChooseModeScreen)

**Add imports:**
```javascript
import ChooseModeScreen from './screens/ChooseModeScreen';
import AudioAccess from './screens/AudioAccess';  // ADD THIS
import VideoAccess from './screens/VideoAccess';  // ADD THIS
import AudioTest from './screens/AudioTest';
```

**Location:** Line 36 (after debugLogger import)

**Add permission utility import:**
```javascript
import debugLogger from '../utils/debugLogger.js';
import { hasMediaPermission, hasVideoPermissions } from '../utils/permissionUtils';  // ADD THIS
```

**Why:** Makes new screens and utilities available in AppContent.

---

### Step 4.2: Remove Old Auto-Request Permission Logic

**File:** `src/components/AppContent.jsx`

**Location:** Lines 143-149

**DELETE these state declarations:**
```javascript
// DELETE THESE LINES:
// Audio permission state tracking
const [audioPermissionState, setAudioPermissionState] = useState('idle');
const audioRequestInProgressRef = useRef(false);

// Video permission state tracking
const [videoPermissionState, setVideoPermissionState] = useState('idle');
const videoRequestInProgressRef = useRef(false);
```

**Location:** Lines 172-377

**DELETE entire auto-request useEffect blocks:**
- Delete "Auto-request microphone permission" useEffect (lines 172-216)
- Delete "Watch mediaStream to detect successful permission grant" useEffect (lines 218-233)
- Delete "Reset permission state when navigating away" useEffect (lines 235-249)
- Delete "Show permission error drawer when audio permission denied" useEffect (lines 251-273)
- Delete "Auto-request camera permission" useEffect (lines 275-319)
- Delete "Watch mediaStream to detect successful video permission grant" useEffect (lines 321-337)
- Delete "Reset video permission state when navigating away" useEffect (lines 339-353)
- Delete "Show permission error drawer when video permission denied" useEffect (lines 355-377)

**Why:** These auto-request useEffects are replaced by manual button-triggered requests in AudioAccess/VideoAccess screens.

---

### Step 4.3: Update AppContent.jsx - Modify ChooseModeScreen Handlers

**File:** `src/components/AppContent.jsx`

**Location:** Find the ChooseModeScreen rendering section (around line 576)

**REPLACE the current ChooseModeScreen call with this:**

```javascript
if (appState.hasReadPrompt && !mediaStream && captureMode == null) {
  return ChooseModeScreen({
    onAudioClick: async () => {
      debugLogger.log('info', 'AppContent', 'Audio mode selected, checking permission');

      // Check if microphone permission already granted
      const hasPermission = await hasMediaPermission('microphone');

      if (hasPermission) {
        // Permission already granted - skip AudioAccess screen
        console.log('[AppContent] Microphone permission already granted, skipping AudioAccess');
        dispatch({ type: APP_ACTIONS.SET_AUDIO_ACCESS_COMPLETED, payload: true });

        // Request stream directly
        try {
          await handleAudioClick();
        } catch (error) {
          console.error('[AppContent] Failed to get audio stream:', error);
          // TODO: Handle error - show error screen/drawer
        }
      } else {
        // Permission not granted - show AudioAccess screen
        console.log('[AppContent] Microphone permission not granted, showing AudioAccess');
        setCaptureMode('audio');
        // audioAccessCompleted stays false - AudioAccess screen will set it
      }
    },
    onVideoClick: async () => {
      debugLogger.log('info', 'AppContent', 'Video mode selected, checking permissions');

      // Check if camera AND microphone permissions already granted
      const hasPermissions = await hasVideoPermissions();

      if (hasPermissions) {
        // Permissions already granted - skip VideoAccess screen
        console.log('[AppContent] Camera permissions already granted, skipping VideoAccess');
        dispatch({ type: APP_ACTIONS.SET_VIDEO_ACCESS_COMPLETED, payload: true });

        // Request stream directly
        try {
          await handleVideoClick();
        } catch (error) {
          console.error('[AppContent] Failed to get video stream:', error);
          // TODO: Handle error - show error screen/drawer
        }
      } else {
        // Permissions not granted - show VideoAccess screen
        console.log('[AppContent] Camera permissions not granted, showing VideoAccess');
        setCaptureMode('video');
        // videoAccessCompleted stays false - VideoAccess screen will set it
      }
    },
    onBack: navigationHandlers.handleBack
  });
}
```

**Why:** Adds smart permission detection before showing permission screens. Users with existing permissions skip directly to test screens.

---

### Step 4.4: Update AppContent.jsx - Add AudioAccess Screen Routing

**File:** `src/components/AppContent.jsx`

**Location:** Find where AudioTest is rendered (around line 586)

**ADD this NEW section BEFORE the AudioTest section:**

```javascript
// AudioAccess screen - shown when audio mode selected but permission not yet granted
// Only shows if audioAccessCompleted is false
if (captureMode === 'audio' && !appState.audioAccessCompleted) {
  return AudioAccess({
    onPermissionGranted: (stream) => {
      debugLogger.log('info', 'AppContent', 'Microphone permission granted on AudioAccess');

      // Set the stream in recording flow state
      setMediaStream(stream);

      // Mark permission screen as completed
      dispatch({ type: APP_ACTIONS.SET_AUDIO_ACCESS_COMPLETED, payload: true });

      // User will now see AudioTest screen on next render
    },
    onPermissionDenied: (error) => {
      debugLogger.log('error', 'AppContent', 'Microphone permission denied on AudioAccess', { error });

      // TODO: Show error screen or drawer
      // For now, user can click "Try Again" or use back button
      alert('Microphone permission was denied. Please grant permission to continue.');
    },
    onBack: navigationHandlers.handleBack
  });
}

// AudioTest screen - shown after audio mode selected AND permission granted
// Shows device test UI with visualizer
if (captureMode === 'audio' && appState.audioAccessCompleted && !appState.audioTestCompleted) {
  return AudioTest({
    mediaStream: mediaStream,
    permissionState: mediaStream ? 'granted' : 'requesting',  // Simplified - we know it's granted here
    onContinue: () => {
      debugLogger.log('info', 'AppContent', 'Audio test completed, proceeding to ready screen');
      dispatch({ type: APP_ACTIONS.SET_AUDIO_TEST_COMPLETED, payload: true });
    },
    onRetry: () => {
      // If retry needed, go back to AudioAccess
      debugLogger.log('info', 'AppContent', 'Retrying audio permission from AudioTest');
      dispatch({ type: APP_ACTIONS.SET_AUDIO_ACCESS_COMPLETED, payload: false });
    },
    onSwitchDevice: handleSwitchAudioDevice,
    onOpenSettings: handleOpenDeviceSettings,
    onBack: navigationHandlers.handleBack
  });
}
```

**Why:** Adds routing logic to show AudioAccess screen before AudioTest when permission not yet granted.

---

### Step 4.5: Update AppContent.jsx - Add VideoAccess Screen Routing

**File:** `src/components/AppContent.jsx`

**Location:** Find where VideoTest is rendered (around line 610)

**REPLACE the VideoTest section with this:**

```javascript
// VideoAccess screen - shown when video mode selected but permission not yet granted
// Only shows if videoAccessCompleted is false
if (captureMode === 'video' && !appState.videoAccessCompleted) {
  return VideoAccess({
    onPermissionGranted: (stream) => {
      debugLogger.log('info', 'AppContent', 'Camera permission granted on VideoAccess');

      // Set the stream in recording flow state
      setMediaStream(stream);

      // Mark permission screen as completed
      dispatch({ type: APP_ACTIONS.SET_VIDEO_ACCESS_COMPLETED, payload: true });

      // User will now see VideoTest screen on next render
    },
    onPermissionDenied: (error) => {
      debugLogger.log('error', 'AppContent', 'Camera permission denied on VideoAccess', { error });

      // TODO: Show error screen or drawer
      // For now, user can click "Try Again" or use back button
      alert('Camera permission was denied. Please grant permission to continue.');
    },
    onBack: navigationHandlers.handleBack
  });
}

// VideoTest screen - shown after video mode selected AND permission granted
// Shows device test UI with video preview
if (captureMode === 'video' && appState.videoAccessCompleted && !appState.videoTestCompleted) {
  return VideoTest({
    mediaStream: mediaStream,
    permissionState: mediaStream ? 'granted' : 'requesting',  // Simplified - we know it's granted here
    videoRef: videoRef,
    onContinue: () => {
      debugLogger.log('info', 'AppContent', 'Video test completed, proceeding to ready screen');
      dispatch({ type: APP_ACTIONS.SET_VIDEO_TEST_COMPLETED, payload: true });
    },
    onRetry: () => {
      // If retry needed, go back to VideoAccess
      debugLogger.log('info', 'AppContent', 'Retrying camera permission from VideoTest');
      dispatch({ type: APP_ACTIONS.SET_VIDEO_ACCESS_COMPLETED, payload: false });
    },
    onSwitchDevice: handleSwitchVideoDevice,
    onOpenSettings: handleOpenDeviceSettings,
    onBack: navigationHandlers.handleBack
  });
}
```

**Why:** Adds routing logic to show VideoAccess screen before VideoTest when permission not yet granted.

---

## Phase 5: Back Navigation Updates

### Step 5.1: Update navigationHandlers.js - Add AudioAccess/VideoAccess Navigation

**File:** `src/utils/navigationHandlers.js`

**Location:** Line 125 (in handleBack function, BEFORE the existing AudioTest/VideoTest logic)

**ADD these new priority cases:**

```javascript
// PRIORITY 5: AudioTest → AudioAccess (if came from AudioAccess screen)
// Condition: captureMode === 'audio' && !audioTestCompleted && audioAccessCompleted
if (captureMode === 'audio' && !appState.audioTestCompleted && appState.audioAccessCompleted) {
  dispatch({ type: APP_ACTIONS.SET_AUDIO_ACCESS_COMPLETED, payload: false });
  // This will show AudioAccess screen on next render
  return;
}

// PRIORITY 6: VideoTest → VideoAccess (if came from VideoAccess screen)
// Condition: captureMode === 'video' && !videoTestCompleted && videoAccessCompleted
if (captureMode === 'video' && !appState.videoTestCompleted && appState.videoAccessCompleted) {
  dispatch({ type: APP_ACTIONS.SET_VIDEO_ACCESS_COMPLETED, payload: false });
  // This will show VideoAccess screen on next render
  return;
}

// PRIORITY 7: AudioAccess → ChooseModeScreen
// Condition: captureMode === 'audio' && !audioAccessCompleted
if (captureMode === 'audio' && !appState.audioAccessCompleted) {
  setCaptureMode(null); // Clears captureMode, shows ChooseModeScreen
  // mediaStream cleanup handled by useRecordingFlow useEffect
  return;
}

// PRIORITY 8: VideoAccess → ChooseModeScreen
// Condition: captureMode === 'video' && !videoAccessCompleted
if (captureMode === 'video' && !appState.videoAccessCompleted) {
  setCaptureMode(null); // Clears captureMode, shows ChooseModeScreen
  // mediaStream cleanup handled by useRecordingFlow useEffect
  return;
}

// EXISTING PRIORITY 5: AudioTest OR VideoTest → ChooseModeScreen (now PRIORITY 9)
// This case now only handles the scenario where permission was already granted
// and user went directly to test screen (skipped Access screen)
// Condition: (captureMode === 'audio' && !audioTestCompleted) OR (captureMode === 'video' && !videoTestCompleted)
if (captureMode === 'audio' && !appState.audioTestCompleted) {
  setCaptureMode(null); // Clears captureMode, shows ChooseModeScreen
  return;
}
if (captureMode === 'video' && !appState.videoTestCompleted) {
  setCaptureMode(null); // Clears captureMode, shows ChooseModeScreen
  return;
}
```

**Important Notes:**
- These new cases MUST be added BEFORE the existing AudioTest/VideoTest → ChooseModeScreen logic
- The priority order is critical for correct navigation behavior
- Each case handles a specific navigation scenario

**Why:** Enables proper back button behavior through the new permission screens.

---

## Phase 6: Cleanup and Documentation

### Step 6.1: Remove Unused VaulPermissionErrorDrawer (Optional)

**Note:** This step is OPTIONAL. The existing drawer can coexist with new screens.

**File:** `src/components/AppContent.jsx`

**If you want to remove the drawer:**
1. Find `VaulPermissionErrorDrawer` import (line 61)
2. Find drawer state declarations (lines 136-138)
3. Find drawer rendering (near the bottom of component)
4. Delete all related code

**Why:** The new permission screens handle errors inline, making the drawer redundant. However, keeping it won't break anything.

---

### Step 6.2: Update Component Documentation

**File:** `src/components/screens/AudioTest.jsx`

**Location:** Lines 6-13 (component header comment)

**UPDATE the Flow section:**

```javascript
/**
 * AudioTest.jsx
 * --------------
 * Audio test screen shown after user grants microphone permission.
 * Displays audio visualizer to test microphone input.
 *
 * Flow:
 * 1. User grants permission on AudioAccess screen
 * 2. AudioTest screen loads with mediaStream already provided
 * 3. Visualizer activates automatically with live microphone input
 * 4. User clicks Continue to proceed to ReadyToRecordScreen
 * 5. If issues occur, user can click gear icon for device settings
 *
 * Props:
 * - mediaStream: MediaStream object (always provided, permission already granted)
 * - permissionState: 'granted' (always, since permission granted on AudioAccess)
 * - onContinue: Handler when user clicks Continue
 * - onRetry: Handler to return to AudioAccess screen
 * - onSwitchDevice: Handler for device switching
 * - onOpenSettings: Handler to open device settings drawer
 * - onBack: Handler for back navigation
 */
```

**File:** `src/components/screens/VideoTest.jsx`

**Location:** Lines 6-13 (component header comment)

**UPDATE the Flow section:**

```javascript
/**
 * VideoTest.jsx
 * --------------
 * Video test screen shown after user grants camera permission.
 * Displays live video preview to test camera input.
 *
 * Flow:
 * 1. User grants permission on VideoAccess screen
 * 2. VideoTest screen loads with mediaStream already provided
 * 3. Video preview activates automatically with live camera feed
 * 4. User clicks Continue to proceed to ReadyToRecordScreen
 * 5. If issues occur, user can click gear icon for device settings
 *
 * Props:
 * - mediaStream: MediaStream object (always provided, permission already granted)
 * - permissionState: 'granted' (always, since permission granted on VideoAccess)
 * - videoRef: React ref for video element (managed by parent)
 * - onContinue: Handler when user clicks Continue
 * - onRetry: Handler to return to VideoAccess screen
 * - onSwitchDevice: Handler for device switching
 * - onOpenSettings: Handler to open device settings drawer
 * - onBack: Handler for back navigation
 */
```

**Why:** Documentation now accurately reflects the new flow where permission is granted before reaching test screens.

---

## Implementation Complete! 🎉

### Final Flow

```
WelcomeScreen
  ↓
PromptReadScreen
  ↓
ChooseModeScreen
  ↓ (user clicks Audio/Video)
  ↓ [Permission Check]
  ↓
  ├─ Already Granted → Skip to AudioTest/VideoTest
  │
  └─ Not Granted → AudioAccess/VideoAccess
                     ↓
                   (user clicks "Turn on...")
                     ↓
                   [Browser Permission Prompt]
                     ↓
                   ├─ Granted → AudioTest/VideoTest
                   └─ Denied → Error (alert for now, TODO: error screen)
```

### Key Features Delivered

✅ Smart permission detection (Chrome, Firefox, Safari, Edge)
✅ Contextual permission request screens
✅ Automatic screen skipping for returning users
✅ Proper back navigation through all screens
✅ Start Over functionality includes new screens
✅ Privacy-first: camera/mic only active when expected
✅ Cross-browser compatible
✅ Clean state management
✅ Consistent styling with existing screens

### TODO Items for Future Work

- **Error Handling:** Replace `alert()` with dedicated error screen (currently stubbed)
- **Permission Revocation:** Handle mid-session permission revocation gracefully
- **Testing:** Add unit tests for permission detection utility
- **Analytics:** Track permission grant/deny rates for UX optimization

---

## Troubleshooting Guide

### Issue: Permission screens always show even when permission granted

**Check:**
1. Is `hasMediaPermission()` being called correctly in ChooseModeScreen handlers?
2. Are you testing on Safari? Check browser console for enumerateDevices output
3. Clear browser permissions and test fresh (simulate first-time user)

### Issue: Back button goes to wrong screen

**Check:**
1. Verify priority order in `navigationHandlers.js` handleBack() function
2. Check that new priority cases were added BEFORE existing cases
3. Console.log `audioAccessCompleted` and `videoAccessCompleted` values

### Issue: "Start Over" doesn't reset properly

**Check:**
1. Verify new state resets added to `handleStartOverConfirm()` and `handleStartOverYes()`
2. Check that `audioAccessCompleted` and `videoAccessCompleted` are reset to `false`

### Issue: AudioTest/VideoTest shows but no stream

**Check:**
1. Verify `onPermissionGranted` callback in AudioAccess/VideoAccess calls `setMediaStream(stream)`
2. Check that `audioAccessCompleted`/`videoAccessCompleted` is set to `true` after permission granted
3. Look for errors in browser console during getUserMedia call

---

## Developer Notes

### State Management Flow

```
audioAccessCompleted = false  → User hasn't seen AudioAccess screen
audioAccessCompleted = true   → User completed AudioAccess screen

audioTestCompleted = false    → User hasn't completed AudioTest
audioTestCompleted = true     → User completed AudioTest (ready to record)
```

### Permission Detection Behavior

**Chrome/Firefox/Edge:**
- Uses `navigator.permissions.query()` - instant, reliable
- Returns 'granted', 'denied', or 'prompt'

**Safari:**
- Falls back to `enumerateDevices()` label detection
- Empty labels = no permission
- Populated labels = permission granted
- May show permission screen on first load even if previously granted (Safari session behavior)

### MediaStream Cleanup

Existing `useRecordingFlow.js` useEffect handles cleanup when `captureMode` is set to `null`. No additional cleanup needed in navigation handlers - just set `captureMode` to `null` and cleanup happens automatically.

---

**Document Version:** 1.0
**Last Updated:** 2025-01-29
**Author:** Claude Code Documentation System
