/**
 * appReducer.js
 * -------------
 * Central state management for App component using useReducer.
 * Replaces multiple useState calls while preserving exact timing and behavior.
 */

// Action types
export const APP_ACTIONS = {
  // Navigation actions
  SET_SHOW_WELCOME: 'SET_SHOW_WELCOME',
  SET_HAS_READ_PROMPT: 'SET_HAS_READ_PROMPT',
  SET_AUDIO_PERMISSION_GRANTED: 'SET_AUDIO_PERMISSION_GRANTED',
  SET_VIDEO_PERMISSION_GRANTED: 'SET_VIDEO_PERMISSION_GRANTED',
  SET_AUDIO_TEST_COMPLETED: 'SET_AUDIO_TEST_COMPLETED',
  SET_VIDEO_TEST_COMPLETED: 'SET_VIDEO_TEST_COMPLETED',
  SET_SUBMIT_STAGE: 'SET_SUBMIT_STAGE',
  SET_SHOW_START_OVER_CONFIRM: 'SET_SHOW_START_OVER_CONFIRM',
  SET_SHOW_CONFETTI: 'SET_SHOW_CONFETTI',
  SET_DOC_ID: 'SET_DOC_ID',
  
  // Upload actions  
  SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
  SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION',
  
  // Error actions
  SET_SHOW_ERROR: 'SET_SHOW_ERROR',
  SET_ERROR_MESSAGE: 'SET_ERROR_MESSAGE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Media player actions
  SET_IS_PLAYING: 'SET_IS_PLAYING',
  SET_CURRENT_TIME: 'SET_CURRENT_TIME',
  SET_DURATION: 'SET_DURATION',
  
  // Reset actions
  RESET_TO_INITIAL: 'RESET_TO_INITIAL'
};

// Initial state - matches the existing useState defaults exactly
export const initialAppState = {
  // Navigation states (from App.js lines 62-65)
  showWelcome: true, // Start with welcome screen visible
  hasReadPrompt: false, // Track if user has read the prompt
  audioPermissionGranted: false, // Track if microphone permission granted
  videoPermissionGranted: false, // Track if camera permission granted
  audioTestCompleted: false, // Track if user completed audio test screen
  videoTestCompleted: false, // Track if user completed video test screen
  submitStage: false,
  showStartOverConfirm: false,
  showConfetti: false,
  docId: null,
  
  // Upload states (from App.js lines 67-68)
  uploadInProgress: false,
  uploadFraction: 0,
  
  // Error states
  showError: false,
  errorMessage: null,
  
  // Media player states (from App.js lines 72-74)
  isPlaying: false,
  currentTime: 0,
  duration: 0
};

// Reducer function
export const appReducer = (state, action) => {
  switch (action.type) {
    case APP_ACTIONS.SET_SHOW_WELCOME:
      return { ...state, showWelcome: action.payload };

    case APP_ACTIONS.SET_HAS_READ_PROMPT:
      return { ...state, hasReadPrompt: action.payload };

    case APP_ACTIONS.SET_AUDIO_PERMISSION_GRANTED:
      return { ...state, audioPermissionGranted: action.payload };

    case APP_ACTIONS.SET_VIDEO_PERMISSION_GRANTED:
      return { ...state, videoPermissionGranted: action.payload };

    case APP_ACTIONS.SET_AUDIO_TEST_COMPLETED:
      return { ...state, audioTestCompleted: action.payload };

    case APP_ACTIONS.SET_VIDEO_TEST_COMPLETED:
      return { ...state, videoTestCompleted: action.payload };

    case APP_ACTIONS.SET_SUBMIT_STAGE:
      return { ...state, submitStage: action.payload };

    case APP_ACTIONS.SET_SHOW_START_OVER_CONFIRM:
      return { ...state, showStartOverConfirm: action.payload };
      
    case APP_ACTIONS.SET_SHOW_CONFETTI:
      return { ...state, showConfetti: action.payload };
      
    case APP_ACTIONS.SET_DOC_ID:
      return { ...state, docId: action.payload };
      
    case APP_ACTIONS.SET_UPLOAD_IN_PROGRESS:
      return { ...state, uploadInProgress: action.payload };
      
    case APP_ACTIONS.SET_UPLOAD_FRACTION:
      return { ...state, uploadFraction: action.payload };
      
    case APP_ACTIONS.SET_SHOW_ERROR:
      return { ...state, showError: action.payload };
      
    case APP_ACTIONS.SET_ERROR_MESSAGE:
      return { ...state, errorMessage: action.payload };
      
    case APP_ACTIONS.CLEAR_ERROR:
      return { ...state, showError: false, errorMessage: null };
      
    case APP_ACTIONS.SET_IS_PLAYING:
      return { ...state, isPlaying: action.payload };
      
    case APP_ACTIONS.SET_CURRENT_TIME:
      return { ...state, currentTime: action.payload };
      
    case APP_ACTIONS.SET_DURATION:
      return { ...state, duration: action.payload };
      
    case APP_ACTIONS.RESET_TO_INITIAL:
      // Reset all states to initial (used in start over flow)
      return {
        ...initialAppState,
        // Preserve any states that shouldn't reset
        docId: state.docId
      };
      
    default:
      return state;
  }
};