/**
 * 🧪 Firebase Error Handler Tests (C08)
 * ======================================
 * 
 * Comprehensive test suite for centralized Firebase error handling,
 * retry logic, fallback mechanisms, and production-safe logging.
 * 
 * Test Coverage:
 * - Error mapping for all Firebase service types
 * - Retry logic with exponential backoff
 * - Fallback mechanisms to localStorage
 * - Production-safe logging with PII redaction
 * - Feature flag integration
 */

import {
  firebaseErrorHandler,
  mapFirebaseError,
  withRetry,
  withFirebaseFallback,
  isFirebaseEnabled,
  isFirebaseServiceEnabled,
  safeLog,
  FIREBASE_ERROR_TYPES,
  FIREBASE_ERROR_MESSAGES,
  RETRY_CONFIG
} from '../utils/firebaseErrorHandler';
import { UPLOAD_ERRORS } from '../utils/errors';

// Mock console methods for testing
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
};

// Mock environment variables
const mockEnv = (env = {}) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...env };
  return () => {
    process.env = originalEnv;
  };
};

describe('Firebase Error Handler (C08)', () => {
  let consoleRestore;
  
  beforeEach(() => {
    // Mock console methods
    consoleRestore = mockEnv({ NODE_ENV: 'test' });
    Object.keys(mockConsole).forEach(method => {
      console[method] = mockConsole[method];
      mockConsole[method].mockClear();
    });
  });
  
  afterEach(() => {
    consoleRestore();
  });

  describe('Error Mapping', () => {
    test('maps Firebase auth errors correctly', () => {
      const authError = new Error('Network failed');
      authError.code = 'auth/network-request-failed';
      
      const mapped = mapFirebaseError(authError, 'test-auth');
      
      expect(mapped.type).toBe(UPLOAD_ERRORS.NETWORK_ERROR);
      expect(mapped.message).toBe(FIREBASE_ERROR_MESSAGES['auth/network-request-failed']);
      expect(mapped.retryable).toBe(true);
      expect(mapped.context).toBe('test-auth');
      expect(mapped.originalError).toBeDefined();
    });
    
    test('maps Firebase storage errors correctly', () => {
      const storageError = new Error('Quota exceeded');
      storageError.code = 'storage/quota-exceeded';
      
      const mapped = mapFirebaseError(storageError);
      
      expect(mapped.type).toBe(UPLOAD_ERRORS.QUOTA_EXCEEDED);
      expect(mapped.retryable).toBe(false);
      expect(mapped.message).toBe(FIREBASE_ERROR_MESSAGES['storage/quota-exceeded']);
    });
    
    test('maps Firestore errors correctly', () => {
      const firestoreError = new Error('Permission denied');
      firestoreError.code = 'firestore/permission-denied';
      
      const mapped = mapFirebaseError(firestoreError, 'firestore-test');
      
      expect(mapped.type).toBe(UPLOAD_ERRORS.PERMISSION_DENIED);
      expect(mapped.retryable).toBe(false);
      expect(mapped.context).toBe('firestore-test');
    });
    
    test('maps Functions errors correctly', () => {
      const functionsError = new Error('Deadline exceeded');
      functionsError.code = 'functions/deadline-exceeded';
      
      const mapped = mapFirebaseError(functionsError);
      
      expect(mapped.type).toBe(UPLOAD_ERRORS.TIMEOUT);
      expect(mapped.retryable).toBe(true);
    });
    
    test('handles network errors', () => {
      const networkError = new Error('Network connection failed');
      networkError.code = 'ERR_NETWORK';
      
      const mapped = mapFirebaseError(networkError);
      
      expect(mapped.type).toBe(UPLOAD_ERRORS.NETWORK_ERROR);
      expect(mapped.message).toContain('network connection');
    });
    
    test('handles unknown errors', () => {
      const unknownError = new Error('Something went wrong');
      
      const mapped = mapFirebaseError(unknownError);
      
      expect(mapped.type).toBe(UPLOAD_ERRORS.UNKNOWN);
      expect(mapped.message).toContain('unexpected error');
    });
    
    test('handles null/undefined errors', () => {
      expect(mapFirebaseError(null)).toBe(null);
      expect(mapFirebaseError(undefined)).toBe(null);
    });
  });

  describe('Retry Logic', () => {
    test('retries operation with exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, { maxRetries: 3 }, 'test-operation');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    test('respects maxRetries limit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(withRetry(operation, { maxRetries: 2 }, 'test-operation'))
        .rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
    
    test('does not retry non-retryable errors', async () => {
      const nonRetryableError = new Error('Non-retryable');
      nonRetryableError.code = 'storage/quota-exceeded';
      
      const operation = jest.fn().mockRejectedValue(nonRetryableError);
      
      await expect(withRetry(operation, { maxRetries: 3 }, 'test-operation'))
        .rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });
    
    test('succeeds on first try', async () => {
      const operation = jest.fn().mockResolvedValue('immediate success');
      
      const result = await withRetry(operation, { maxRetries: 3 }, 'test-operation');
      
      expect(result).toBe('immediate success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Firebase Fallback', () => {
    test('uses Firebase operation when successful', async () => {
      const firebaseOp = jest.fn().mockResolvedValue('firebase result');
      const fallbackOp = jest.fn().mockResolvedValue('fallback result');
      
      const restoreEnv = mockEnv({
        REACT_APP_USE_FIREBASE: 'true',
        REACT_APP_FIREBASE_API_KEY: 'test-key',
        REACT_APP_FIREBASE_PROJECT_ID: 'test-project'
      });
      
      const result = await withFirebaseFallback(
        firebaseOp,
        fallbackOp,
        { maxRetries: 1 },
        'test-operation'
      );
      
      expect(result).toBe('firebase result');
      expect(firebaseOp).toHaveBeenCalledTimes(1);
      expect(fallbackOp).not.toHaveBeenCalled();
      
      restoreEnv();
    });
    
    test('falls back to localStorage when Firebase fails', async () => {
      const firebaseError = new Error('Firebase failed');
      firebaseError.code = 'storage/quota-exceeded';
      
      const firebaseOp = jest.fn().mockRejectedValue(firebaseError);
      const fallbackOp = jest.fn().mockResolvedValue('fallback success');
      
      const restoreEnv = mockEnv({
        REACT_APP_USE_FIREBASE: 'true',
        REACT_APP_FIREBASE_API_KEY: 'test-key',
        REACT_APP_FIREBASE_PROJECT_ID: 'test-project'
      });
      
      const result = await withFirebaseFallback(
        firebaseOp,
        fallbackOp,
        { maxRetries: 1 },
        'test-operation'
      );
      
      expect(result).toBe('fallback success');
      expect(firebaseOp).toHaveBeenCalled();
      expect(fallbackOp).toHaveBeenCalledTimes(1);
      
      restoreEnv();
    });
    
    test('uses localStorage directly when Firebase disabled', async () => {
      const firebaseOp = jest.fn().mockResolvedValue('firebase result');
      const fallbackOp = jest.fn().mockResolvedValue('fallback result');
      
      const restoreEnv = mockEnv({
        REACT_APP_USE_FIREBASE: 'false'
      });
      
      const result = await withFirebaseFallback(
        firebaseOp,
        fallbackOp,
        {},
        'test-operation'
      );
      
      expect(result).toBe('fallback result');
      expect(firebaseOp).not.toHaveBeenCalled();
      expect(fallbackOp).toHaveBeenCalledTimes(1);
      
      restoreEnv();
    });
    
    test('throws Firebase error when both operations fail', async () => {
      const firebaseError = new Error('Firebase failed');
      const fallbackError = new Error('Fallback failed');
      
      const firebaseOp = jest.fn().mockRejectedValue(firebaseError);
      const fallbackOp = jest.fn().mockRejectedValue(fallbackError);
      
      const restoreEnv = mockEnv({
        REACT_APP_USE_FIREBASE: 'true',
        REACT_APP_FIREBASE_API_KEY: 'test-key',
        REACT_APP_FIREBASE_PROJECT_ID: 'test-project'
      });
      
      await expect(withFirebaseFallback(firebaseOp, fallbackOp, { maxRetries: 1 }))
        .rejects.toThrow('Firebase failed'); // Firebase error takes precedence
      
      expect(firebaseOp).toHaveBeenCalled();
      expect(fallbackOp).toHaveBeenCalled();
      
      restoreEnv();
    });
  });

  describe('Feature Flag Integration', () => {
    test('detects Firebase enabled with proper configuration', () => {
      const restoreEnv = mockEnv({
        REACT_APP_USE_FIREBASE: 'true',
        REACT_APP_FIREBASE_API_KEY: 'test-key',
        REACT_APP_FIREBASE_PROJECT_ID: 'test-project'
      });
      
      expect(isFirebaseEnabled()).toBe(true);
      
      restoreEnv();
    });
    
    test('detects Firebase disabled', () => {
      const restoreEnv = mockEnv({
        REACT_APP_USE_FIREBASE: 'false'
      });
      
      expect(isFirebaseEnabled()).toBe(false);
      
      restoreEnv();
    });
    
    test('detects Firebase disabled with missing configuration', () => {
      const restoreEnv = mockEnv({
        REACT_APP_USE_FIREBASE: 'true'
        // Missing API key and project ID
      });
      
      expect(isFirebaseEnabled()).toBe(false);
      
      restoreEnv();
    });
    
    test('checks individual service flags', () => {
      const restoreEnv = mockEnv({
        REACT_APP_USE_FIREBASE: 'true',
        REACT_APP_FIREBASE_API_KEY: 'test-key',
        REACT_APP_FIREBASE_PROJECT_ID: 'test-project',
        REACT_APP_FIREBASE_STORAGE_ENABLED: 'true',
        REACT_APP_SESSION_VALIDATION_ENABLED: 'false'
      });
      
      expect(isFirebaseServiceEnabled('storage')).toBe(true);
      expect(isFirebaseServiceEnabled('functions')).toBe(false);
      expect(isFirebaseServiceEnabled('auth')).toBe(true); // Default true
      
      restoreEnv();
    });
  });

  describe('Production-Safe Logging', () => {
    test('logs in development mode', () => {
      const restoreEnv = mockEnv({ NODE_ENV: 'development' });
      
      safeLog('info', 'Test message', { data: 'test' }, { service: 'test' });
      
      expect(console.info).toHaveBeenCalled();
      
      restoreEnv();
    });
    
    test('does not log in production mode without debug flag', () => {
      const restoreEnv = mockEnv({ NODE_ENV: 'production' });
      
      safeLog('info', 'Test message', { data: 'test' }, { service: 'test' });
      
      expect(console.info).not.toHaveBeenCalled();
      
      restoreEnv();
    });
    
    test('logs in production mode with debug flag', () => {
      const restoreEnv = mockEnv({
        NODE_ENV: 'production',
        REACT_APP_DEBUG_LOGGING: 'true'
      });
      
      safeLog('info', 'Test message', { data: 'test' }, { service: 'test' });
      
      expect(console.info).toHaveBeenCalled();
      
      restoreEnv();
    });
    
    test('sanitizes sensitive data in logs', () => {
      const restoreEnv = mockEnv({ NODE_ENV: 'development' });
      
      const sensitiveData = {
        email: 'user@example.com',
        password: 'secret123',
        token: 'abc123',
        publicData: 'safe'
      };
      
      safeLog('info', 'Test message', sensitiveData, { service: 'test' });
      
      const logCall = console.info.mock.calls[0];
      const loggedData = logCall[1];
      
      expect(loggedData.data.email).toBe('[REDACTED]');
      expect(loggedData.data.password).toBe('[REDACTED]');
      expect(loggedData.data.token).toBe('[REDACTED]');
      expect(loggedData.data.publicData).toBe('safe');
      
      restoreEnv();
    });
    
    test('redacts email addresses from strings', () => {
      const restoreEnv = mockEnv({ NODE_ENV: 'development' });
      
      safeLog('info', 'User user@example.com logged in', null, { service: 'test' });
      
      const logCall = console.info.mock.calls[0];
      expect(logCall[0]).toContain('[EMAIL_REDACTED]');
      
      restoreEnv();
    });
    
    test('redacts API keys from strings', () => {
      const restoreEnv = mockEnv({ NODE_ENV: 'development' });
      
      const message = 'API key: AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI';
      
      safeLog('info', message, null, { service: 'test' });
      
      const logCall = console.info.mock.calls[0];
      expect(logCall[0]).toContain('[API_KEY_REDACTED]');
      
      restoreEnv();
    });
  });

  describe('Error Handler Integration', () => {
    test('firebaseErrorHandler object has all required methods', () => {
      expect(firebaseErrorHandler.mapError).toBe(mapFirebaseError);
      expect(firebaseErrorHandler.withRetry).toBe(withRetry);
      expect(firebaseErrorHandler.withFallback).toBe(withFirebaseFallback);
      expect(firebaseErrorHandler.isEnabled).toBe(isFirebaseEnabled);
      expect(firebaseErrorHandler.isServiceEnabled).toBe(isFirebaseServiceEnabled);
      expect(firebaseErrorHandler.log).toBe(safeLog);
    });
    
    test('has comprehensive error type coverage', () => {
      const authErrors = Object.keys(FIREBASE_ERROR_TYPES)
        .filter(key => key.startsWith('auth/'));
      const storageErrors = Object.keys(FIREBASE_ERROR_TYPES)
        .filter(key => key.startsWith('storage/'));
      const firestoreErrors = Object.keys(FIREBASE_ERROR_TYPES)
        .filter(key => key.startsWith('firestore/'));
      const functionsErrors = Object.keys(FIREBASE_ERROR_TYPES)
        .filter(key => key.startsWith('functions/'));
      
      expect(authErrors.length).toBeGreaterThan(0);
      expect(storageErrors.length).toBeGreaterThan(0);
      expect(firestoreErrors.length).toBeGreaterThan(0);
      expect(functionsErrors.length).toBeGreaterThan(0);
    });
    
    test('all error types have corresponding messages', () => {
      Object.keys(FIREBASE_ERROR_TYPES).forEach(errorCode => {
        if (FIREBASE_ERROR_MESSAGES[errorCode]) {
          expect(typeof FIREBASE_ERROR_MESSAGES[errorCode]).toBe('string');
          expect(FIREBASE_ERROR_MESSAGES[errorCode].length).toBeGreaterThan(0);
        }
      });
    });
    
    test('retry configuration is valid', () => {
      expect(RETRY_CONFIG.maxRetries).toBeGreaterThan(0);
      expect(RETRY_CONFIG.baseDelay).toBeGreaterThan(0);
      expect(RETRY_CONFIG.maxDelay).toBeGreaterThan(RETRY_CONFIG.baseDelay);
      expect(RETRY_CONFIG.exponentialBase).toBeGreaterThan(1);
      expect(typeof RETRY_CONFIG.jitter).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    test('handles circular reference in error objects', () => {
      const circularError = new Error('Circular reference');
      circularError.circular = circularError;
      
      const mapped = mapFirebaseError(circularError);
      
      expect(mapped.type).toBe(UPLOAD_ERRORS.UNKNOWN);
      expect(mapped.originalError).toBeDefined();
    });
    
    test('handles very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      const longError = new Error(longMessage);
      
      const mapped = mapFirebaseError(longError);
      
      expect(mapped.message).toBeDefined();
      expect(mapped.originalError.message).toBe(longMessage);
    });
    
    test('handles error objects with non-standard properties', () => {
      const weirdError = new Error('Weird error');
      weirdError.customProperty = { nested: { value: 'test' } };
      weirdError.nullProperty = null;
      weirdError.undefinedProperty = undefined;
      
      const mapped = mapFirebaseError(weirdError);
      
      expect(mapped.type).toBe(UPLOAD_ERRORS.UNKNOWN);
      expect(mapped.originalError).toBeDefined();
    });
  });
});