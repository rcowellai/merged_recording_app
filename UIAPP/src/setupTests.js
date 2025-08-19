// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Add Web Streams polyfill for Firebase compatibility
import 'web-streams-polyfill/dist/polyfill';

// Add TextEncoder/TextDecoder for Firebase compatibility
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set up required Firebase environment variables for tests
process.env.REACT_APP_FIREBASE_API_KEY = 'test-api-key';
process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
process.env.REACT_APP_FIREBASE_PROJECT_ID = 'test-project';
process.env.REACT_APP_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.REACT_APP_FIREBASE_APP_ID = '1:123456789:web:abcdef123456';

// Add fetch polyfill
import 'whatwg-fetch';

// Mock additional globals for Firebase SDK
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: arr => require('crypto').randomFillSync(arr)
  }
});

// Mock location for tests
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'https:',
    hostname: 'localhost',
    port: '3000'
  },
  writable: true
});

// Suppress Firebase warnings in tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('Firebase')) return;
  if (args[0]?.includes?.('experimental')) return;
  originalConsoleWarn(...args);
};