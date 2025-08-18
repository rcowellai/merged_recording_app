# MVP UI Unification Implementation Specification

**Version:** 1.0.0  
**Date:** January 2025  
**Author:** Recording App Development Team  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Information Architecture & Navigation](#2-information-architecture--navigation)
3. [Design System](#3-design-system)
4. [Component Library](#4-component-library)
5. [Screen Templates & Acceptance Criteria](#5-screen-templates--acceptance-criteria)
6. [UX States](#6-ux-states)
7. [Accessibility Requirements](#7-accessibility-requirements)
8. [Routing & State Management](#8-routing--state-management)
9. [Data Contracts](#9-data-contracts)
10. [File Structure & Coding Conventions](#10-file-structure--coding-conventions)
11. [Analytics & Events](#11-analytics--events)
12. [Testing Plan](#12-testing-plan)
13. [Migration & Rollout Plan](#13-migration--rollout-plan)
14. [Open Questions](#14-open-questions)

---

## 1. Executive Summary

### 1.1 Overview
This specification defines the complete UI unification for the Love Retold Recording App, transforming it into a mobile-first, Instagram-like experience with consistent design patterns across all user flows.

### 1.2 Goals
- **Consistency**: Single design system across all screens
- **Mobile-First**: 430px container that scales proportionally
- **Simplicity**: No responsive breakpoints, just scaling
- **Performance**: Instant transitions, minimal overhead
- **Accessibility**: WCAG 2.1 AA compliance

### 1.3 Technical Stack
- **Frontend**: React 18.2.0
- **Routing**: React Router v6.30.1
- **Build Tool**: Vite 4.5.0
- **Styling**: CSS Custom Properties (no frameworks)
- **State**: React Context + useReducer
- **Audio Visualization**: WaveSurfer.js

### 1.4 Reference Screenshots
All UI designs are based on screenshots located in `/Information/`:
- IMG_7579.PNG - Initial Prompt Screen
- IMG_7580.PNG - Permission Request
- IMG_7581.PNG - Video Staging Screen
- IMG_7582.PNG - Countdown Screen
- IMG_7583.PNG - Paused State
- IMG_7584.PNG - Video Review Screen
- IMG_7585.PNG - Video Recording State
- IMG_7586.PNG - Confirmation Modal
- IMG_7587.PNG - Audio Staging Screen
- IMG_7588.PNG - Audio Recording State
- IMG_7589.PNG - Audio Review Screen

---

## 2. Information Architecture & Navigation

### 2.1 User Flow Diagram

```
[Session Link] 
    ↓
[1. Prompt Screen] → Mode Selection
    ↓
[2. Permission Request] → Browser Permissions
    ↓
[3. Staging Screen] → Ready State
    ↓
[4. Countdown] → 3-2-1
    ↓
[5. Recording Screen] → Active Capture
    ↓
[6. Paused Screen] ← → Resume/Done
    ↓
[7. Review Screen] → Playback
    ↓
[8. Upload Progress] → Submit
    ↓
[9. Success Screen] → Complete
```

### 2.2 Navigation Rules

| From Screen | User Action | To Screen | Conditions |
|------------|-------------|-----------|------------|
| Prompt | Select Mode | Permission Request | If permissions not granted |
| Prompt | Select Mode | Staging | If permissions already granted |
| Permission | Allow | Staging | Permission granted |
| Permission | Deny | Prompt | Show error message |
| Staging | Start Recording | Countdown | Always |
| Countdown | Auto-transition | Recording | After 3 seconds |
| Recording | Pause | Paused | While recording |
| Paused | Resume | Countdown | Always |
| Paused | Done | Review | If recording exists |
| Review | Start Over | Staging | With confirmation modal |
| Review | Submit | Upload Progress | Valid recording |
| Upload | Complete | Success | Upload successful |

### 2.3 URL Structure

```
/                           # Redirect to session or error
/session/:sessionId         # Main recording flow
/session/:sessionId/success # Completion screen
/error                      # Error states
```

---

## 3. Design System

### 3.1 Design Tokens

Create `recording-app/src/styles/design-tokens.css`:

```css
:root {
  /* Color Palette */
  --color-bg-primary: #f5f2ed;      /* Warm cream background */
  --color-bg-card: #ffffff;         /* White cards */
  --color-bg-overlay: rgba(0, 0, 0, 0.5); /* Modal backdrop */
  
  --color-primary: #2d3654;         /* Navy blue - primary actions */
  --color-primary-hover: #1f2844;   /* Darker navy for hover */
  --color-primary-disabled: #9ca3b7; /* Disabled primary */
  
  --color-secondary: #e8e4df;       /* Light gray - secondary actions */
  --color-secondary-hover: #d6d1c9; /* Darker gray for hover */
  --color-secondary-text: #1a1a1a;  /* Text on secondary buttons */
  
  --color-text-primary: #1a1a1a;    /* Near black - main text */
  --color-text-secondary: #6c757d;  /* Gray - metadata */
  --color-text-light: #9ca3af;      /* Light gray - hints */
  
  --color-recording: #ff0000;       /* Red - recording indicator */
  --color-success: #28a745;         /* Green - success states */
  --color-warning: #ffc107;         /* Yellow - warnings */
  --color-error: #dc3545;           /* Red - errors */
  
  /* Typography Scale */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 
                      'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
  --font-family-mono: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  
  --font-size-xs: 0.75rem;     /* 12px - timestamps, labels */
  --font-size-sm: 0.875rem;    /* 14px - secondary text */
  --font-size-base: 1rem;      /* 16px - body text */
  --font-size-lg: 1.125rem;    /* 18px - subtitles */
  --font-size-xl: 1.5rem;      /* 24px - headings */
  --font-size-2xl: 2rem;       /* 32px - large headings */
  --font-size-3xl: 3rem;       /* 48px - countdown numbers */
  
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-tight: 1.2;
  --line-height-base: 1.5;
  --line-height-loose: 1.75;
  
  /* Spacing System (8px base) */
  --spacing-2xs: 0.25rem;  /* 4px */
  --spacing-xs: 0.5rem;    /* 8px */
  --spacing-sm: 0.75rem;   /* 12px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */
  
  /* Layout Dimensions */
  --container-width: 430px;        /* Mobile-first container */
  --container-padding: 1rem;       /* Container side padding */
  --card-padding: 1.5rem;          /* Card internal padding */
  --card-radius: 16px;             /* Card border radius */
  --button-height: 56px;           /* Touch-friendly button height */
  --button-radius: 12px;           /* Button border radius */
  --input-height: 48px;            /* Input field height */
  --modal-radius: 16px;            /* Modal border radius */
  --video-radius: 12px;            /* Video preview radius */
  
  /* Z-Index Scale */
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
  
  /* Transitions */
  --transition-instant: 0ms;
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);
  --shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.2);
}

/* Dark mode support (future enhancement) */
@media (prefers-color-scheme: dark) {
  :root {
    /* Define dark mode tokens here when needed */
  }
}
```

### 3.2 Base Styles

Create `recording-app/src/styles/base.css`:

```css
/* CSS Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Focus Styles (Accessibility) */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove focus for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Typography Base */
h1, h2, h3, h4, h5, h6 {
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

p {
  margin-bottom: var(--spacing-md);
}

/* Links */
a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

a:hover {
  text-decoration: underline;
}

/* Images & Media */
img,
video {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Form Elements Reset */
button,
input,
select,
textarea {
  font-family: inherit;
  font-size: 100%;
  line-height: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

/* Utility Classes */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.text-center {
  text-align: center;
}

.mt-auto {
  margin-top: auto;
}
```

---

## 4. Component Library

### 4.1 Component Structure

```
recording-app/src/components/
├── ui/                      # Pure UI Components
│   ├── Button/
│   │   ├── Button.jsx
│   │   ├── Button.css
│   │   └── Button.test.jsx
│   ├── Card/
│   │   ├── Card.jsx
│   │   └── Card.css
│   ├── Container/
│   │   ├── Container.jsx
│   │   └── Container.css
│   ├── Modal/
│   │   ├── Modal.jsx
│   │   └── Modal.css
│   ├── Timer/
│   │   ├── Timer.jsx
│   │   └── Timer.css
│   ├── Countdown/
│   │   ├── Countdown.jsx
│   │   └── Countdown.css
│   ├── StatusBadge/
│   │   ├── StatusBadge.jsx
│   │   └── StatusBadge.css
│   ├── Spinner/
│   │   ├── Spinner.jsx
│   │   └── Spinner.css
│   └── index.js            # Barrel exports
│
├── features/                # Feature Components
│   ├── PromptDisplay/
│   ├── RecordingControls/
│   ├── VideoPreview/
│   ├── AudioWaveform/
│   ├── PlaybackControls/
│   └── UploadProgress/
│
└── screens/                 # Screen Components
    ├── PromptScreen.jsx
    ├── StagingScreen.jsx
    ├── CountdownScreen.jsx
    ├── RecordingScreen.jsx
    ├── PausedScreen.jsx
    ├── ReviewScreen.jsx
    └── SuccessScreen.jsx
```

### 4.2 Core UI Components

#### 4.2.1 Button Component

```jsx
// Button.jsx
import React from 'react';
import './Button.css';

export const Button = ({
  variant = 'primary',  // 'primary' | 'secondary' | 'ghost'
  size = 'large',       // 'large' | 'medium' | 'small'
  fullWidth = false,
  icon = null,
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  ariaLabel
}) => {
  const classNames = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full',
    disabled && 'btn--disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
    >
      {icon && <span className="btn__icon" aria-hidden="true">{icon}</span>}
      <span className="btn__text">{children}</span>
    </button>
  );
};
```

```css
/* Button.css */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  height: var(--button-height);
  padding: 0 var(--spacing-lg);
  border: none;
  border-radius: var(--button-radius);
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  text-align: center;
  cursor: pointer;
  transition: background-color var(--transition-fast),
              opacity var(--transition-fast);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Variants */
.btn--primary {
  background-color: var(--color-primary);
  color: white;
}

.btn--primary:active:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.btn--secondary {
  background-color: var(--color-secondary);
  color: var(--color-secondary-text);
}

.btn--secondary:active:not(:disabled) {
  background-color: var(--color-secondary-hover);
}

.btn--ghost {
  background-color: transparent;
  color: var(--color-text-primary);
  border: 2px solid var(--color-secondary);
}

/* Sizes */
.btn--large {
  height: var(--button-height);
  font-size: var(--font-size-base);
}

.btn--medium {
  height: 44px;
  font-size: var(--font-size-sm);
}

.btn--small {
  height: 36px;
  font-size: var(--font-size-sm);
  padding: 0 var(--spacing-md);
}

/* States */
.btn--full {
  width: 100%;
}

.btn--disabled,
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn__icon {
  display: flex;
  align-items: center;
  font-size: 1.25em;
}
```

#### 4.2.2 Container Component

```jsx
// Container.jsx
import React from 'react';
import './Container.css';

export const Container = ({ children, className = '' }) => {
  return (
    <div className={`container ${className}`}>
      {children}
    </div>
  );
};
```

```css
/* Container.css */
.container {
  width: 100%;
  max-width: var(--container-width);
  margin: 0 auto;
  padding: var(--container-padding);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Scale up on larger screens */
@media (min-width: 768px) {
  .container {
    transform: scale(1.1);
    transform-origin: top center;
  }
}

@media (min-width: 1024px) {
  .container {
    transform: scale(1.2);
  }
}

@media (min-width: 1440px) {
  .container {
    transform: scale(1.3);
  }
}
```

### 4.3 Feature Components

#### 4.3.1 PromptDisplay Component

```jsx
// PromptDisplay.jsx
import React from 'react';
import './PromptDisplay.css';

export const PromptDisplay = ({ 
  storyteller, 
  question, 
  variant = 'full' // 'full' | 'minimal'
}) => {
  return (
    <div className={`prompt-display prompt-display--${variant}`}>
      {storyteller && (
        <p className="prompt-display__storyteller">{storyteller} asked</p>
      )}
      <h2 className="prompt-display__question">{question}</h2>
    </div>
  );
};
```

#### 4.3.2 AudioWaveform Component

```jsx
// AudioWaveform.jsx
import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import './AudioWaveform.css';

export const AudioWaveform = ({ 
  audioUrl = null,
  isRecording = false,
  isStaging = false 
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);

  useEffect(() => {
    if (waveformRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: isRecording ? '#ff0000' : '#9ca3af',
        progressColor: '#2d3654',
        cursorColor: '#2d3654',
        barWidth: 3,
        barRadius: 3,
        responsive: true,
        height: 60,
        normalize: true,
        interact: !isRecording
      });

      if (audioUrl) {
        wavesurferRef.current.load(audioUrl);
      }

      return () => {
        wavesurferRef.current?.destroy();
      };
    }
  }, [audioUrl, isRecording]);

  return (
    <div className="audio-waveform">
      <div ref={waveformRef} className="audio-waveform__container" />
      {isStaging && (
        <div className="audio-waveform__staging-overlay">
          <span className="audio-waveform__line" />
        </div>
      )}
    </div>
  );
};
```

---

## 5. Screen Templates & Acceptance Criteria

### 5.1 Screen: Prompt (Initial)
**Reference**: IMG_7579.PNG

#### Acceptance Criteria:
- [ ] Display storyteller name as "{name} asked"
- [ ] Show prompt question in large, bold text
- [ ] Present Audio/Video mode selection buttons
- [ ] Show "Or choose a different prompt" link (if applicable)
- [ ] Buttons are full-width with proper spacing
- [ ] Video button is selected by default

#### Implementation:
```jsx
// PromptScreen.jsx
import React, { useState } from 'react';
import { Container, Card, Button } from '../ui';
import { PromptDisplay } from '../features';

export const PromptScreen = ({ sessionData, onModeSelect }) => {
  const [selectedMode, setSelectedMode] = useState('video');

  const handleContinue = () => {
    onModeSelect(selectedMode);
  };

  return (
    <Container>
      <Card>
        <PromptDisplay
          storyteller={sessionData.storytellerName}
          question={sessionData.promptText}
        />
        
        {sessionData.allowPromptChange && (
          <a href="#" className="prompt-link">
            Or choose a different prompt
          </a>
        )}
        
        <div className="mode-selection">
          <p className="mode-selection__label">Choose your recording mode</p>
          
          <div className="mode-selection__buttons">
            <Button
              variant={selectedMode === 'audio' ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => setSelectedMode('audio')}
              icon={<MicrophoneIcon />}
            >
              Audio
            </Button>
            
            <Button
              variant={selectedMode === 'video' ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => setSelectedMode('video')}
              icon={<VideoIcon />}
            >
              Video
            </Button>
          </div>
        </div>
      </Card>
    </Container>
  );
};
```

### 5.2 Screen: Staging
**Reference**: IMG_7581.PNG (video), IMG_7587.PNG (audio)

#### Acceptance Criteria:
- [ ] Show live video preview for video mode
- [ ] Show waveform with line through it for audio mode
- [ ] Display prompt question
- [ ] Show "Start recording" button
- [ ] Camera/microphone is active but not recording

### 5.3 Screen: Countdown
**Reference**: IMG_7582.PNG

#### Acceptance Criteria:
- [ ] Display large countdown number (3, 2, 1)
- [ ] Maintain grayed-out prompt in background
- [ ] Auto-transition to recording after countdown
- [ ] No user controls during countdown

### 5.4 Screen: Recording
**Reference**: IMG_7585.PNG (video), IMG_7588.PNG (audio)

#### Acceptance Criteria:
- [ ] Show recording timer (current/max duration)
- [ ] Display red "Rec" indicator
- [ ] Show live video preview (video mode)
- [ ] Show animated waveform (audio mode)
- [ ] Single "Pause" button
- [ ] Auto-stop at 15 minutes

### 5.5 Screen: Paused
**Reference**: IMG_7583.PNG

#### Acceptance Criteria:
- [ ] Show "Paused" status
- [ ] Display recording duration
- [ ] "Resume" button (left)
- [ ] "Done" button (right)
- [ ] Maintain context (prompt visible)

### 5.6 Screen: Review
**Reference**: IMG_7584.PNG (video), IMG_7589.PNG (audio)

#### Acceptance Criteria:
- [ ] Video/audio player with scrubber
- [ ] Playback speed controls (1x, 1.25x, 1.5x, 2x)
- [ ] "Start Over" button (secondary)
- [ ] "Submit" button (primary)
- [ ] Current time / total time display

---

## 6. UX States

### 6.1 Loading States

```jsx
// LoadingState.jsx
export const LoadingState = ({ message = 'Loading...' }) => (
  <Container>
    <div className="loading-state">
      <Spinner size="large" />
      <p className="loading-state__message">{message}</p>
    </div>
  </Container>
);
```

### 6.2 Empty States

```jsx
// EmptyState.jsx
export const EmptyState = ({ 
  title = 'No recording yet',
  message = 'Press the button below to start recording',
  action
}) => (
  <Card className="empty-state">
    <MicrophoneOffIcon className="empty-state__icon" />
    <h3 className="empty-state__title">{title}</h3>
    <p className="empty-state__message">{message}</p>
    {action}
  </Card>
);
```

### 6.3 Error States

```jsx
// ErrorState.jsx
export const ErrorState = ({ 
  title = 'Something went wrong',
  message,
  retry
}) => (
  <Container>
    <Card className="error-state">
      <AlertIcon className="error-state__icon" />
      <h3 className="error-state__title">{title}</h3>
      <p className="error-state__message">{message}</p>
      {retry && (
        <Button variant="primary" onClick={retry}>
          Try Again
        </Button>
      )}
    </Card>
  </Container>
);
```

### 6.4 State Mapping

| Condition | State Component | Message |
|-----------|----------------|---------|
| Session loading | LoadingState | "Loading your session..." |
| Invalid session | ErrorState | "This recording link is invalid or expired" |
| Permission denied | ErrorState | "Camera/microphone access is required" |
| Upload in progress | LoadingState | "Uploading your recording..." |
| Upload failed | ErrorState | "Upload failed. Please try again." |
| Network offline | ErrorState | "No internet connection" |

---

## 7. Accessibility Requirements

### 7.1 WCAG 2.1 AA Compliance

#### Color Contrast
- **Normal text**: 4.5:1 minimum contrast ratio
- **Large text**: 3:1 minimum contrast ratio
- **UI components**: 3:1 minimum contrast ratio

#### Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order
- Visible focus indicators
- Skip links for screen readers

#### Screen Reader Support
```jsx
// Accessibility attributes example
<button aria-label="Start recording video">
  <VideoIcon aria-hidden="true" />
  <span>Start recording</span>
</button>

// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  Recording: {duration} seconds
</div>

// Status announcements
<div role="status" aria-label="Recording status">
  {isRecording ? 'Recording in progress' : 'Ready to record'}
</div>
```

### 7.2 Mobile Accessibility
- Touch targets minimum 44x44px
- Sufficient spacing between interactive elements
- Gesture alternatives for all interactions
- Orientation support (portrait primary)

### 7.3 Media Accessibility
- Provide transcript option for recordings
- Visual indicators for audio-only mode
- Captions for instructional content

---

## 8. Routing & State Management

### 8.1 Routing Structure

```jsx
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RecordingProvider } from './contexts/RecordingContext';

function App() {
  return (
    <BrowserRouter>
      <RecordingProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/error" />} />
          <Route path="/session/:sessionId" element={<RecordingFlow />} />
          <Route path="/session/:sessionId/success" element={<SuccessScreen />} />
          <Route path="/error" element={<ErrorScreen />} />
        </Routes>
      </RecordingProvider>
    </BrowserRouter>
  );
}
```

### 8.2 State Management

```jsx
// contexts/RecordingContext.jsx
import React, { createContext, useReducer, useContext } from 'react';

const RecordingContext = createContext();

const initialState = {
  // Session data
  sessionId: null,
  sessionData: null,
  
  // UI state
  currentScreen: 'loading', // loading|prompt|staging|countdown|recording|paused|review|uploading|success
  recordingMode: null, // audio|video
  
  // Recording state
  stream: null,
  recorder: null,
  chunks: [],
  duration: 0,
  maxDuration: 900, // 15 minutes in seconds
  
  // Upload state
  isUploading: false,
  uploadProgress: 0,
  
  // Permissions
  permissionsGranted: false,
  
  // Error state
  error: null
};

function recordingReducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        sessionId: action.payload.id,
        sessionData: action.payload.data,
        currentScreen: 'prompt'
      };
      
    case 'SET_MODE':
      return {
        ...state,
        recordingMode: action.payload,
        currentScreen: state.permissionsGranted ? 'staging' : 'permissions'
      };
      
    case 'START_COUNTDOWN':
      return {
        ...state,
        currentScreen: 'countdown'
      };
      
    case 'START_RECORDING':
      return {
        ...state,
        currentScreen: 'recording',
        duration: 0
      };
      
    case 'PAUSE_RECORDING':
      return {
        ...state,
        currentScreen: 'paused'
      };
      
    case 'RESUME_RECORDING':
      return {
        ...state,
        currentScreen: 'countdown'
      };
      
    case 'STOP_RECORDING':
      return {
        ...state,
        currentScreen: 'review'
      };
      
    case 'START_UPLOAD':
      return {
        ...state,
        currentScreen: 'uploading',
        isUploading: true,
        uploadProgress: 0
      };
      
    case 'UPDATE_UPLOAD_PROGRESS':
      return {
        ...state,
        uploadProgress: action.payload
      };
      
    case 'UPLOAD_SUCCESS':
      return {
        ...state,
        currentScreen: 'success',
        isUploading: false,
        uploadProgress: 100
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        currentScreen: 'error'
      };
      
    default:
      return state;
  }
}

export function RecordingProvider({ children }) {
  const [state, dispatch] = useReducer(recordingReducer, initialState);
  
  return (
    <RecordingContext.Provider value={{ state, dispatch }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within RecordingProvider');
  }
  return context;
}
```

---

## 9. Data Contracts

### 9.1 Session Data Structure

```typescript
interface SessionData {
  sessionId: string;
  storytellerId: string;
  storytellerName: string;
  storytellerEmail: string;
  coupleId: string;
  coupleName: string;
  promptId: string;
  promptText: string;
  promptCategory: string;
  allowPromptChange: boolean;
  maxDuration: number; // seconds
  expiresAt: Timestamp;
  status: 'pending' | 'active' | 'completed' | 'expired';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 9.2 Recording Metadata

```typescript
interface RecordingMetadata {
  sessionId: string;
  recordingId: string;
  mode: 'audio' | 'video';
  duration: number; // seconds
  fileSize: number; // bytes
  mimeType: string;
  chunks: ChunkMetadata[];
  startedAt: Timestamp;
  completedAt: Timestamp;
  uploadedAt: Timestamp;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

interface ChunkMetadata {
  index: number;
  size: number;
  duration: number;
  uploadedAt: Timestamp;
  storageUrl: string;
}
```

### 9.3 API Endpoints

```typescript
// Session validation
GET /api/sessions/:sessionId
Response: SessionData

// Update session status
PUT /api/sessions/:sessionId/status
Body: { status: 'active' | 'completed' }

// Upload chunk
POST /api/recordings/:sessionId/chunks
Body: FormData { chunk: Blob, index: number, metadata: object }
Response: { chunkId: string, uploadUrl: string }

// Complete recording
POST /api/recordings/:sessionId/complete
Body: { recordingId: string, chunks: string[], metadata: object }
Response: { success: boolean, storyId: string }
```

---

## 10. File Structure & Coding Conventions

### 10.1 Complete File Structure

```
recording-app/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── features/        # Feature-specific components
│   │   └── screens/         # Full screen components
│   ├── contexts/
│   │   └── RecordingContext.jsx
│   ├── hooks/
│   │   ├── useMediaStream.js
│   │   ├── useRecorder.js
│   │   └── useUpload.js
│   ├── services/
│   │   ├── api.js           # API client
│   │   ├── firebase.js      # Firebase config
│   │   └── recording.js     # Recording logic
│   ├── styles/
│   │   ├── design-tokens.css
│   │   ├── base.css
│   │   ├── components.css
│   │   └── utilities.css
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── .eslintrc.json
├── .prettierrc
├── package.json
└── vite.config.js
```

### 10.2 Coding Conventions

#### Naming Conventions
```javascript
// Components: PascalCase
export const ButtonComponent = () => {};

// Files: Component files match component name
Button.jsx, Button.css, Button.test.jsx

// CSS classes: BEM methodology
.button {}
.button--primary {}
.button__icon {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_RECORDING_DURATION = 900;

// Functions/variables: camelCase
const handleButtonClick = () => {};
const isRecording = false;
```

#### Component Structure
```jsx
// Standard component template
import React from 'react';
import PropTypes from 'prop-types';
import './ComponentName.css';

export const ComponentName = ({ 
  prop1, 
  prop2 = 'default' 
}) => {
  // Hooks first
  const [state, setState] = useState();
  
  // Event handlers
  const handleEvent = () => {};
  
  // Render helpers
  const renderContent = () => {};
  
  // Main render
  return (
    <div className="component-name">
      {renderContent()}
    </div>
  );
};

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.string
};
```

#### ESLint Configuration
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "react/prop-types": "error",
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
    "no-unused-vars": "error",
    "no-console": "warn"
  }
}
```

---

## 11. Analytics & Events

### 11.1 Event Tracking

```javascript
// analytics.js
export const trackEvent = (category, action, label, value) => {
  // Google Analytics 4 or equivalent
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
};
```

### 11.2 Key Events to Track

| Event Category | Event Action | Event Label | When Triggered |
|---------------|--------------|-------------|----------------|
| session | view | session_id | Session page loaded |
| recording | mode_selected | audio/video | Mode selection |
| recording | started | mode | Recording started |
| recording | paused | duration | Recording paused |
| recording | resumed | duration | Recording resumed |
| recording | completed | duration | Recording stopped |
| recording | review_started | mode | Review screen shown |
| recording | submitted | duration | Submit clicked |
| upload | started | file_size | Upload began |
| upload | progress | percentage | Upload progress |
| upload | completed | duration | Upload success |
| upload | failed | error_type | Upload failed |
| error | displayed | error_type | Error shown |
| navigation | prompt_change | prompt_id | Different prompt selected |

### 11.3 Performance Metrics

```javascript
// Track Core Web Vitals
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(metric => trackEvent('Performance', 'CLS', metric.name, metric.value));
getFID(metric => trackEvent('Performance', 'FID', metric.name, metric.value));
getLCP(metric => trackEvent('Performance', 'LCP', metric.name, metric.value));
```

---

## 12. Testing Plan

### 12.1 Unit Tests

#### Component Testing
```javascript
// Button.test.jsx
import { render, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  test('renders with correct text', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeInTheDocument();
  });
  
  test('calls onClick handler', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <Button onClick={handleClick}>Click</Button>
    );
    fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('applies correct variant class', () => {
    const { container } = render(
      <Button variant="secondary">Button</Button>
    );
    expect(container.firstChild).toHaveClass('btn--secondary');
  });
});
```

### 12.2 Integration Tests

```javascript
// RecordingFlow.test.jsx
import { render, waitFor } from '@testing-library/react';
import { RecordingFlow } from './RecordingFlow';

describe('Recording Flow', () => {
  test('complete video recording flow', async () => {
    const { getByText, getByRole } = render(<RecordingFlow />);
    
    // Select video mode
    fireEvent.click(getByText('Video'));
    
    // Grant permissions
    await waitFor(() => {
      expect(getByText('Start recording')).toBeInTheDocument();
    });
    
    // Start recording
    fireEvent.click(getByText('Start recording'));
    
    // Wait for countdown
    await waitFor(() => {
      expect(getByText('Pause')).toBeInTheDocument();
    }, { timeout: 4000 });
    
    // Pause and complete
    fireEvent.click(getByText('Pause'));
    fireEvent.click(getByText('Done'));
    
    // Submit
    await waitFor(() => {
      expect(getByText('Submit')).toBeInTheDocument();
    });
  });
});
```

### 12.3 E2E Tests (Playwright)

```javascript
// e2e/recording.spec.js
import { test, expect } from '@playwright/test';

test.describe('Recording E2E', () => {
  test('complete recording journey', async ({ page }) => {
    // Navigate to session
    await page.goto('/session/test-session-id');
    
    // Select audio mode
    await page.click('button:has-text("Audio")');
    
    // Grant permissions
    await page.click('button:has-text("Allow")');
    
    // Start recording
    await page.click('button:has-text("Start recording")');
    
    // Wait for countdown
    await page.waitForTimeout(3000);
    
    // Verify recording state
    await expect(page.locator('.recording-indicator')).toBeVisible();
    
    // Complete recording
    await page.click('button:has-text("Pause")');
    await page.click('button:has-text("Done")');
    
    // Submit
    await page.click('button:has-text("Submit")');
    
    // Verify success
    await expect(page.locator('text=Successfully uploaded')).toBeVisible();
  });
});
```

### 12.4 Test Coverage Requirements

| Test Type | Coverage Target | Priority |
|-----------|----------------|----------|
| Unit Tests | 80% | High |
| Integration Tests | 60% | High |
| E2E Tests | Critical paths | High |
| Accessibility Tests | All components | High |
| Performance Tests | Core Web Vitals | Medium |
| Visual Regression | Key screens | Low |

---

## 13. Migration & Rollout Plan

### 13.1 Phase 1: Foundation (Week 1)
1. **Day 1-2**: Set up design system and base styles
2. **Day 3-4**: Build core UI components
3. **Day 5**: Create component documentation and tests

### 13.2 Phase 2: Implementation (Week 2)
1. **Day 1-2**: Implement screen components
2. **Day 3**: Set up routing and state management
3. **Day 4**: Integrate WaveSurfer.js for audio
4. **Day 5**: Connect to existing backend services

### 13.3 Phase 3: Polish (Week 3)
1. **Day 1-2**: Accessibility audit and fixes
2. **Day 3**: Performance optimization
3. **Day 4**: Cross-browser testing
4. **Day 5**: Final QA and bug fixes

### 13.4 Rollout Strategy

#### Canary Release (Week 4, Day 1)
- Deploy to 5% of users
- Monitor error rates and performance
- Collect user feedback

#### Progressive Rollout
- Day 2: 25% of users
- Day 3: 50% of users
- Day 4: 75% of users
- Day 5: 100% deployment

### 13.5 Rollback Plan
- Keep previous version available at `/v1/session/:sessionId`
- Monitor error rates with automatic rollback threshold
- Rollback triggers:
  - Error rate > 5%
  - Recording success rate < 85%
  - Page load time > 3 seconds

---

## 14. Open Questions

### 14.1 Product Questions
1. Should we support landscape orientation on mobile?
2. Do we need different max durations for audio vs video?
3. Should users be able to trim recordings before submitting?
4. Do we need to support multiple recording attempts per session?

### 14.2 Technical Questions
1. Should we implement Progressive Web App (PWA) features?
2. Do we need offline support for recordings?
3. Should we add WebRTC for better codec support?
4. Do we need real-time transcription for accessibility?

### 14.3 Design Questions
1. Should we add dark mode support?
2. Do we need custom icons or use an icon library?
3. Should the countdown be skippable for returning users?
4. Do we need animation between screen transitions?

### 14.4 Analytics Questions
1. What custom events does the business need?
2. Should we track detailed user interactions?
3. Do we need session replay tools?
4. What performance budget should we enforce?

---

## Appendices

### Appendix A: Browser Support Matrix

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Requires webkit prefixes |
| Edge | 90+ | Full support |
| Chrome Mobile | 90+ | Full support |
| Safari iOS | 14+ | MediaRecorder limitations |

### Appendix B: Performance Budget

| Metric | Target | Maximum |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | 2.5s |
| Largest Contentful Paint | < 2.5s | 4.0s |
| Time to Interactive | < 3.0s | 5.0s |
| Cumulative Layout Shift | < 0.1 | 0.25 |
| JavaScript Bundle Size | < 200KB | 300KB |
| CSS Size | < 50KB | 75KB |

### Appendix C: Security Considerations

1. **HTTPS Required**: MediaRecorder API requires secure context
2. **CSP Headers**: Implement Content Security Policy
3. **Input Validation**: Sanitize all user inputs
4. **File Upload Limits**: Enforce size and type restrictions
5. **Rate Limiting**: Prevent abuse of recording endpoints

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2025 | Development Team | Initial specification |

---

## Sign-off

This specification has been reviewed and approved by:

- [ ] Product Owner
- [ ] Technical Lead
- [ ] UX Designer
- [ ] QA Lead
- [ ] Development Team

**Ready for Implementation: ✅**