/**
 * appReducer.js
 * -------------
 * Central state management for App component using useReducer.
 * Replaces multiple useState calls while preserving exact timing and behavior.
 */

// Action types
export const APP_ACTIONS = {
  // Navigation actions
  SET_SUBMIT_STAGE: 'SET_SUBMIT_STAGE',
  SET_SHOW_START_OVER_CONFIRM: 'SET_SHOW_START_OVER_CONFIRM',
  SET_SHOW_CONFETTI: 'SET_SHOW_CONFETTI',
  SET_DOC_ID: 'SET_DOC_ID',
  
  // Upload actions  
  SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
  SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION',
  
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
  submitStage: false,
  showStartOverConfirm: false,
  showConfetti: false,
  docId: null,
  
  // Upload states (from App.js lines 67-68)
  uploadInProgress: false,
  uploadFraction: 0,
  
  // Media player states (from App.js lines 72-74)
  isPlaying: false,
  currentTime: 0,
  duration: 0
};

// Reducer function
export const appReducer = (state, action) => {
  switch (action.type) {
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