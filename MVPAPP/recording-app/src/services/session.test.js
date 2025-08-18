/**
 * Comprehensive Test Suite for Enhanced Session Status Handling
 * Tests all edge cases, defensive handling, and rich status objects
 */

// Mock console methods to avoid test noise
const originalConsole = { ...console };
beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

// Mock window.gtag for analytics
const mockGtag = jest.fn();
Object.defineProperty(window, 'gtag', {
  value: mockGtag,
  writable: true
});

import {
  getEnhancedSessionStatus,
  getSessionStatusMessage,
  canRecord,
  getStatusCategory,
  isErrorStatus,
  isCompletedStatus,
  isProgressStatus
} from './session.js';

describe('Enhanced Session Status Handling', () => {
  describe('getEnhancedSessionStatus', () => {
    describe('Defensive Handling - Null/Undefined/Invalid Inputs', () => {
      test('handles null status gracefully', () => {
        const result = getEnhancedSessionStatus(null);
        
        expect(result.status).toBe('unknown');
        expect(result.category).toBe('unknown');
        expect(result.canRecord).toBe(false);
        expect(result.message).toContain('unknown');
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Null/undefined status received')
        );
      });

      test('handles undefined status gracefully', () => {
        const result = getEnhancedSessionStatus(undefined);
        
        expect(result.status).toBe('unknown');
        expect(result.category).toBe('unknown');
        expect(result.canRecord).toBe(false);
        expect(result.message).toContain('unknown');
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Null/undefined status received')
        );
      });

      test('handles non-string status gracefully', () => {
        const testCases = [123, {}, [], true, Symbol('test')];
        
        testCases.forEach(status => {
          const result = getEnhancedSessionStatus(status);
          
          expect(result.status).toBe('unknown');
          expect(result.category).toBe('unknown');
          expect(result.canRecord).toBe(false);
          expect(result.message).toContain('unknown');
          expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Non-string status received'),
            expect.anything(),
            status,
            expect.stringContaining('treating as unknown')
          );
        });
      });

      test('handles empty string status', () => {
        const result = getEnhancedSessionStatus('');
        
        expect(result.status).toBe('unknown');
        expect(result.category).toBe('unknown');
        expect(result.canRecord).toBe(false);
      });

      test('handles whitespace-only status', () => {
        const result = getEnhancedSessionStatus('   ');
        
        expect(result.status).toBe('unknown');
        expect(result.category).toBe('unknown');
        expect(result.canRecord).toBe(false);
      });
    });

    describe('Status Normalization', () => {
      test('normalizes mixed case statuses', () => {
        const testCases = [
          { input: 'ACTIVE', expected: 'active' },
          { input: 'Active', expected: 'active' },
          { input: 'aCtIvE', expected: 'active' },
          { input: 'COMPLETED', expected: 'completed' },
          { input: 'Error', expected: 'error' }
        ];

        testCases.forEach(({ input, expected }) => {
          const result = getEnhancedSessionStatus(input);
          expect(result.status).toBe(expected);
        });
      });

      test('trims whitespace from statuses', () => {
        const testCases = [
          '  active  ',
          '\\tactive\\n',
          ' completed ',
          '\\r\\nerror\\t'
        ];

        testCases.forEach(input => {
          const result = getEnhancedSessionStatus(input);
          expect(['active', 'completed', 'error']).toContain(result.status);
        });
      });
    });

    describe('Ready States', () => {
      test('handles active status correctly', () => {
        const result = getEnhancedSessionStatus('active');
        
        expect(result.status).toBe('active');
        expect(result.category).toBe('ready');
        expect(result.canRecord).toBe(true);
        expect(result.message).toBe('Ready to record your memory');
      });

      test('handles pending status correctly', () => {
        const result = getEnhancedSessionStatus('pending');
        
        expect(result.status).toBe('pending');
        expect(result.category).toBe('ready');
        expect(result.canRecord).toBe(true);
        expect(result.message).toBe('Ready to record your memory');
      });
    });

    describe('Completed States', () => {
      test('handles completed status correctly', () => {
        const result = getEnhancedSessionStatus('completed');
        
        expect(result.status).toBe('completed');
        expect(result.category).toBe('completed');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('This memory has already been recorded');
      });
    });

    describe('Progress States', () => {
      test('handles processing status correctly', () => {
        const result = getEnhancedSessionStatus('processing');
        
        expect(result.status).toBe('processing');
        expect(result.category).toBe('progress');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('Your recording is being processed');
      });

      test('handles recording status correctly', () => {
        const result = getEnhancedSessionStatus('recording');
        
        expect(result.status).toBe('recording');
        expect(result.category).toBe('progress');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('Recording is currently in progress');
      });

      test('handles uploading status correctly', () => {
        const result = getEnhancedSessionStatus('uploading');
        
        expect(result.status).toBe('uploading');
        expect(result.category).toBe('progress');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('Your recording is being uploaded');
      });
    });

    describe('Error States', () => {
      test('handles expired status correctly', () => {
        const result = getEnhancedSessionStatus('expired');
        
        expect(result.status).toBe('expired');
        expect(result.category).toBe('error');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('This recording link has expired (links are valid for 7 days)');
      });

      test('handles removed status correctly', () => {
        const result = getEnhancedSessionStatus('removed');
        
        expect(result.status).toBe('removed');
        expect(result.category).toBe('error');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('This question has been removed by the account owner');
      });

      test('handles failed status correctly', () => {
        const result = getEnhancedSessionStatus('failed');
        
        expect(result.status).toBe('failed');
        expect(result.category).toBe('error');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('Recording failed. Please try again.');
      });

      test('handles invalid status correctly', () => {
        const result = getEnhancedSessionStatus('invalid');
        
        expect(result.status).toBe('invalid');
        expect(result.category).toBe('error');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('Invalid recording session. Please check your link.');
      });

      test('handles error status with custom message', () => {
        const customMessage = 'Custom error message';
        const result = getEnhancedSessionStatus('error', customMessage);
        
        expect(result.status).toBe('error');
        expect(result.category).toBe('error');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe(customMessage);
      });

      test('handles error status with fallback message', () => {
        const result = getEnhancedSessionStatus('error');
        
        expect(result.status).toBe('error');
        expect(result.category).toBe('error');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('Unable to load recording session');
      });
    });

    describe('Unknown Status Handling', () => {
      test('handles unknown status correctly', () => {
        const result = getEnhancedSessionStatus('unknown');
        
        expect(result.status).toBe('unknown');
        expect(result.category).toBe('unknown');
        expect(result.canRecord).toBe(false);
        expect(result.message).toBe('Session status unknown. Please refresh and try again.');
      });

      test('logs and handles unexpected status gracefully', () => {
        const unexpectedStatus = 'totally_unexpected_status';
        const result = getEnhancedSessionStatus(unexpectedStatus);
        
        expect(result.status).toBe('unknown');
        expect(result.category).toBe('unknown');
        expect(result.canRecord).toBe(false);
        expect(result.message).toContain('Unexpected session state');
        expect(result.message).toContain(unexpectedStatus);
        
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Unknown session status encountered'),
          unexpectedStatus,
          expect.stringContaining('normalized'),
          unexpectedStatus,
          expect.stringContaining('logging for monitoring')
        );
        
        expect(mockGtag).toHaveBeenCalledWith('event', 'unknown_session_status', {
          custom_parameter: unexpectedStatus,
          event_category: 'session_validation'
        });
      });

      test('handles analytics unavailable gracefully', () => {
        // Temporarily remove gtag
        const originalGtag = window.gtag;
        delete window.gtag;
        
        const result = getEnhancedSessionStatus('totally_unexpected_status');
        expect(result.status).toBe('unknown');
        
        // Restore gtag
        window.gtag = originalGtag;
      });
    });
  });

  describe('Legacy Compatibility Functions', () => {
    test('getSessionStatusMessage maintains backward compatibility', () => {
      const testCases = [
        { status: 'active', expected: 'Ready to record your memory' },
        { status: 'pending', expected: 'Ready to record your memory' },
        { status: 'completed', expected: 'This memory has already been recorded' },
        { status: 'expired', expected: 'This recording link has expired (links are valid for 7 days)' },
        { status: 'error', customMessage: 'Custom error', expected: 'Custom error' }
      ];

      testCases.forEach(({ status, customMessage = '', expected }) => {
        const result = getSessionStatusMessage(status, customMessage);
        expect(result).toBe(expected);
      });
    });

    test('canRecord maintains backward compatibility', () => {
      const recordableStatuses = ['active', 'pending'];
      const nonRecordableStatuses = ['completed', 'expired', 'removed', 'error', 'failed', 'invalid', 'unknown'];

      recordableStatuses.forEach(status => {
        expect(canRecord(status)).toBe(true);
      });

      nonRecordableStatuses.forEach(status => {
        expect(canRecord(status)).toBe(false);
      });
    });
  });

  describe('Helper Functions', () => {
    test('getStatusCategory returns correct categories', () => {
      const testCases = [
        { status: 'active', expected: 'ready' },
        { status: 'pending', expected: 'ready' },
        { status: 'completed', expected: 'completed' },
        { status: 'processing', expected: 'progress' },
        { status: 'recording', expected: 'progress' },
        { status: 'uploading', expected: 'progress' },
        { status: 'expired', expected: 'error' },
        { status: 'removed', expected: 'error' },
        { status: 'failed', expected: 'error' },
        { status: 'invalid', expected: 'error' },
        { status: 'error', expected: 'error' },
        { status: 'unknown', expected: 'unknown' },
        { status: null, expected: 'unknown' },
        { status: 'unexpected', expected: 'unknown' }
      ];

      testCases.forEach(({ status, expected }) => {
        expect(getStatusCategory(status)).toBe(expected);
      });
    });

    test('isErrorStatus correctly identifies error states', () => {
      const errorStatuses = ['expired', 'removed', 'failed', 'invalid', 'error', 'unknown', null, 'unexpected'];
      const nonErrorStatuses = ['active', 'pending', 'completed', 'processing', 'recording', 'uploading'];

      errorStatuses.forEach(status => {
        expect(isErrorStatus(status)).toBe(true);
      });

      nonErrorStatuses.forEach(status => {
        expect(isErrorStatus(status)).toBe(false);
      });
    });

    test('isCompletedStatus correctly identifies completed states', () => {
      const completedStatuses = ['completed'];
      const nonCompletedStatuses = ['active', 'pending', 'processing', 'recording', 'uploading', 'expired', 'removed', 'failed', 'invalid', 'error', 'unknown'];

      completedStatuses.forEach(status => {
        expect(isCompletedStatus(status)).toBe(true);
      });

      nonCompletedStatuses.forEach(status => {
        expect(isCompletedStatus(status)).toBe(false);
      });
    });

    test('isProgressStatus correctly identifies progress states', () => {
      const progressStatuses = ['processing', 'recording', 'uploading'];
      const nonProgressStatuses = ['active', 'pending', 'completed', 'expired', 'removed', 'failed', 'invalid', 'error', 'unknown'];

      progressStatuses.forEach(status => {
        expect(isProgressStatus(status)).toBe(true);
      });

      nonProgressStatuses.forEach(status => {
        expect(isProgressStatus(status)).toBe(false);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    test('performs well with valid statuses', () => {
      const startTime = performance.now();
      
      // Test 1000 status evaluations
      for (let i = 0; i < 1000; i++) {
        getEnhancedSessionStatus('active');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 evaluations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    test('handles rapid successive calls', () => {
      const statuses = ['active', 'pending', 'completed', 'error', null, 'unexpected'];
      
      const results = statuses.map(status => getEnhancedSessionStatus(status));
      
      expect(results).toHaveLength(6);
      expect(results.every(result => result && typeof result === 'object')).toBe(true);
      expect(results.every(result => 
        typeof result.message === 'string' &&
        typeof result.canRecord === 'boolean' &&
        typeof result.category === 'string' &&
        typeof result.status === 'string'
      )).toBe(true);
    });

    test('memory usage remains stable', () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Create many status objects
      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push(getEnhancedSessionStatus('active'));
      }
      
      // Clear references
      results.length = 0;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Memory growth should be minimal (less than 1MB)
      if (performance.memory) {
        expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024);
      }
    });
  });
});

describe('Integration Tests', () => {
  test('comprehensive status flow simulation', () => {
    // Simulate a complete session lifecycle
    const lifecycle = [
      'pending',    // Initially pending
      'active',     // Becomes active
      'recording',  // Recording starts
      'uploading',  // Upload begins
      'processing', // Server processing
      'completed'   // Finally completed
    ];

    const results = lifecycle.map(status => ({
      status,
      result: getEnhancedSessionStatus(status)
    }));

    // Verify each stage
    expect(results[0].result.canRecord).toBe(true);  // pending
    expect(results[1].result.canRecord).toBe(true);  // active
    expect(results[2].result.canRecord).toBe(false); // recording
    expect(results[3].result.canRecord).toBe(false); // uploading
    expect(results[4].result.canRecord).toBe(false); // processing
    expect(results[5].result.canRecord).toBe(false); // completed

    // Verify categories progress correctly
    expect(results[0].result.category).toBe('ready');     // pending
    expect(results[1].result.category).toBe('ready');     // active
    expect(results[2].result.category).toBe('progress');  // recording
    expect(results[3].result.category).toBe('progress');  // uploading
    expect(results[4].result.category).toBe('progress');  // processing
    expect(results[5].result.category).toBe('completed'); // completed
  });

  test('error recovery scenarios', () => {
    const errorScenarios = [
      { status: 'failed', recovery: 'active' },
      { status: 'error', recovery: 'pending' },
      { status: null, recovery: 'active' },
      { status: 'unexpected', recovery: 'active' }
    ];

    errorScenarios.forEach(({ status, recovery }) => {
      const errorResult = getEnhancedSessionStatus(status);
      expect(errorResult.canRecord).toBe(false);
      
      const recoveryResult = getEnhancedSessionStatus(recovery);
      expect(recoveryResult.canRecord).toBe(true);
    });
  });
});