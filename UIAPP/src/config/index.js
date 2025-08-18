/**
 * config/index.js
 * ---------------
 * Centralized configuration for the Recording App.
 * Replaces scattered magic numbers with named constants while preserving exact values.
 */

// Recording limits and timing
export const RECORDING_LIMITS = {
  // 30-second recording limit (was hardcoded in 8+ places)
  MAX_DURATION_SECONDS: 30,
  
  // Countdown sequence for recording start/resume
  COUNTDOWN_STEPS: [3, 2, 1, 'BEGIN'],
  
  // Recording timer interval (milliseconds)
  TIMER_INTERVAL_MS: 1000
};

// Supported media formats (preserves existing format priority)
export const SUPPORTED_FORMATS = {
  video: [
    'video/mp4;codecs=h264',
    'video/webm;codecs=vp8,opus'
  ],
  audio: [
    'audio/mp4;codecs=aac', 
    'audio/webm;codecs=opus'
  ]
};


// Canvas dimensions for AudioRecorder component
export const CANVAS = {
  WIDTH: 80,
  HEIGHT: 80,
  CENTER_Y: 40,
  OFFSET_X: 16,
  WAVE_WIDTH: 48,
  WAVE_HEIGHT: 48,
  SENSITIVITY_FACTOR: 1.3
};

// Color constants used throughout the app
export const COLORS = {
  BACKGROUND_SECONDARY: '#E4E2D8',
  RECORDING_RED: '#B3261E',
  INACTIVE_GRAY: '#999999',
  PRIMARY_DARK: '#2C2F48',
  PRIMARY_LIGHT: '#F5F4F0',
  TEXT_GRAY: '#666'
};

// Layout constants for UI positioning and sizing
export const LAYOUT = {
  MAX_WIDTH: '480px',
  RECORDING_BAR_PADDING: '0 16px',
  Z_INDEX_RECORDING_BAR: 999,
  RECORDING_BAR_TOP_OFFSET: '15px',
  MARGIN_TOP_SMALL: '10px',
  MARGIN_TOP_MEDIUM: '30px',
  MARGIN_BOTTOM_MEDIUM: '40px',
  MARGIN_BOTTOM_SMALL: '10px',
  QR_CODE_SIZE: 80,
  RECORD_ICON_SIZE: 16
};

// Time formatting constants
export const TIME_FORMAT = {
  SECONDS_PER_MINUTE: 60,
  ZERO_PADDING_THRESHOLD: 10,
  DEFAULT_TIME_DISPLAY: '0:00'
};

// Audio analysis constants
export const AUDIO_ANALYSIS = {
  FFT_SIZE: 256,
  DATA_TYPE: Uint8Array,
  NORMALIZATION_FACTOR: 128.0,
  CENTERING_OFFSET: 1.0
};


// Environment configuration
export const ENV_CONFIG = {
  STORAGE_TYPE: process.env.REACT_APP_STORAGE_TYPE || 'local',
  API_BASE_URL: process.env.REACT_APP_API_URL || '',
  DEBUG_MODE: process.env.NODE_ENV === 'development'
};

// Service configuration
export const SERVICE_CONFIG = {
  // Local storage service settings
  LOCAL_STORAGE: {
    RECORDINGS_KEY: 'local_recordings',
    BLOB_STORAGE_KEY: 'local_blobs',
    UPLOAD_PROGRESS_INTERVAL_MS: 200,
    FETCH_DELAY_MS: 300 // Simulated network delay
  }
};