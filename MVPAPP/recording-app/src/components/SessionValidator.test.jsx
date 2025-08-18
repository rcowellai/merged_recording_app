/**
 * Integration Test Suite for SessionValidator with Enhanced Status Handling
 * Tests complete validation flow, error states, and UI integration
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import SessionValidator from './SessionValidator.jsx';

// Mock the session service
jest.mock('../services/session.js', () => ({
  validateSession: jest.fn(),
  getSessionStatusMessage: jest.fn(),
  getEnhancedSessionStatus: jest.fn(),
  canRecord: jest.fn(),
  getStatusCategory: jest.fn(),
  isErrorStatus: jest.fn()
}));

// Mock the session parser
jest.mock('../utils/sessionParser.js', () => ({
  parseSessionId: jest.fn(),
  validateSessionId: jest.fn()
}));

// Mock child components
jest.mock('./LoadingSpinner.jsx', () => {
  return function LoadingSpinner({ message }) {
    return <div data-testid=\"loading-spinner\">{message}</div>;
  };
});

jest.mock('./StatusMessage.jsx', () => {
  return function StatusMessage({ status, title, message, showDefaultActions }) {
    return (
      <div data-testid=\"status-message\" data-status={status}>
        {title && <h2>{title}</h2>}
        <p>{message}</p>
        {showDefaultActions && <span data-testid=\"default-actions-enabled\">Default Actions</span>}
      </div>
    );
  };
});

jest.mock('./EnhancedRecordingInterface.jsx', () => {
  return function EnhancedRecordingInterface({ sessionData }) {
    return <div data-testid=\"recording-interface\">Recording Interface: {sessionData.status}</div>;
  };
});

// Import mocked modules
import { 
  validateSession, 
  getSessionStatusMessage, 
  getEnhancedSessionStatus,
  canRecord, 
  getStatusCategory,
  isErrorStatus 
} from '../services/session.js';
import { parseSessionId, validateSessionId } from '../utils/sessionParser.js';

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true
});

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('SessionValidator Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReload.mockClear();
    
    // Default mock implementations
    validateSessionId.mockReturnValue(true);
    parseSessionId.mockReturnValue({
      userId: 'test-user',
      promptId: 'test-prompt',
      storytellerId: 'test-storyteller'
    });
    getSessionStatusMessage.mockImplementation((status, message) => message || `Status: ${status}`);
    getEnhancedSessionStatus.mockImplementation((status, message) => ({
      status: status || 'unknown',
      category: status === 'active' ? 'ready' : 'error',
      canRecord: status === 'active',
      message: message || `Enhanced: ${status}`
    }));
    canRecord.mockImplementation((status) => status === 'active' || status === 'pending');
    getStatusCategory.mockImplementation((status) => status === 'active' ? 'ready' : 'error');
    isErrorStatus.mockImplementation((status) => status === 'error' || status === 'failed');
  });

  describe('Loading State', () => {
    test('shows loading spinner during validation', () => {
      validateSession.mockReturnValue(new Promise(() => {})); // Never resolves
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Validating recording session...')).toBeInTheDocument();
    });
  });

  describe('Error States with Enhanced Status Handling', () => {
    test('handles validation errors with enhanced error detection', async () => {
      const errorMessage = 'Connection failed';
      validateSession.mockResolvedValue({
        status: 'error',
        message: errorMessage
      });
      isErrorStatus.mockReturnValue(true);
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('status-message')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('status-message')).toHaveAttribute('data-status', 'error');
      expect(screen.getByText('Session Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByTestId('default-actions-enabled')).toBeInTheDocument();
    });

    test('handles missing session ID', () => {
      renderWithRouter(<SessionValidator />);
      
      expect(screen.getByTestId('status-message')).toBeInTheDocument();
      expect(screen.getByText('No session ID provided')).toBeInTheDocument();
    });

    test('handles invalid session format', async () => {
      validateSessionId.mockReturnValue(false);
      
      renderWithRouter(<SessionValidator sessionId=\"invalid-format\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('status-message')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Invalid recording link format/)).toBeInTheDocument();
    });

    test('handles session parsing errors', async () => {
      validateSessionId.mockReturnValue(true);
      parseSessionId.mockImplementation(() => {
        throw new Error('Parse error');
      });
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('status-message')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Unable to process recording link/)).toBeInTheDocument();
    });

    test('handles no session data as invalid status', async () => {
      validateSession.mockResolvedValue(null);
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('status-message')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('status-message')).toHaveAttribute('data-status', 'invalid');
      expect(screen.getByText('Invalid Session')).toBeInTheDocument();
      expect(screen.getByText('No session data available')).toBeInTheDocument();
    });

    test('handles unexpected validation errors', async () => {
      validateSession.mockRejectedValue(new Error('Unexpected error'));
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('status-message')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Unable to validate session/)).toBeInTheDocument();
    });
  });

  describe('Active Session - Recording Interface', () => {
    test('shows recording interface for active sessions', async () => {
      validateSession.mockResolvedValue({
        status: 'active',
        message: 'Session is active'
      });
      canRecord.mockReturnValue(true);
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('recording-interface')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Recording Interface: active')).toBeInTheDocument();
      expect(screen.queryByTestId('status-message')).not.toBeInTheDocument();
    });

    test('shows recording interface for pending sessions', async () => {
      validateSession.mockResolvedValue({
        status: 'pending',
        message: 'Session is pending'
      });
      canRecord.mockReturnValue(true);
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('recording-interface')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Recording Interface: pending')).toBeInTheDocument();
    });
  });

  describe('Non-Recording States with Enhanced Status Integration', () => {
    const nonRecordingStates = [
      { 
        status: 'completed', 
        expectedTitle: 'Memory Recorded',
        canRecordValue: false,
        statusMessage: 'This memory has already been recorded'
      },
      { 
        status: 'expired', 
        expectedTitle: 'Link Expired',
        canRecordValue: false,
        statusMessage: 'This recording link has expired (links are valid for 7 days)'
      },
      { 
        status: 'removed', 
        expectedTitle: 'Question Removed',
        canRecordValue: false,
        statusMessage: 'This question has been removed by the account owner'
      },
      { 
        status: 'failed', 
        expectedTitle: 'Recording Failed',
        canRecordValue: false,
        statusMessage: 'Recording failed. Please try again.'
      },
      { 
        status: 'processing', 
        expectedTitle: 'Processing Recording',
        canRecordValue: false,
        statusMessage: 'Your recording is being processed'
      },
      { 
        status: 'unknown', 
        expectedTitle: 'Session Status Unknown',
        canRecordValue: false,
        statusMessage: 'Session status unknown. Please refresh and try again.'
      }
    ];

    nonRecordingStates.forEach(({ status, expectedTitle, canRecordValue, statusMessage }) => {
      test(`handles ${status} status with enhanced status integration`, async () => {
        validateSession.mockResolvedValue({
          status: status,
          message: statusMessage
        });
        canRecord.mockReturnValue(canRecordValue);
        getEnhancedSessionStatus.mockReturnValue({
          status: status,
          category: status === 'completed' ? 'completed' : status === 'processing' ? 'progress' : status === 'unknown' ? 'unknown' : 'error',
          canRecord: canRecordValue,
          message: statusMessage
        });
        
        renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
        
        await waitFor(() => {
          expect(screen.getByTestId('status-message')).toBeInTheDocument();
        });
        
        expect(screen.getByTestId('status-message')).toHaveAttribute('data-status', status);
        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        expect(screen.getByText(statusMessage)).toBeInTheDocument();
        expect(screen.getByTestId('default-actions-enabled')).toBeInTheDocument();
        expect(screen.queryByTestId('recording-interface')).not.toBeInTheDocument();
      });
    });
  });

  describe('Session Component Integration', () => {
    test('uses provided session components', async () => {
      const sessionComponents = {
        userId: 'prop-user',
        promptId: 'prop-prompt',
        storytellerId: 'prop-storyteller'
      };
      
      validateSession.mockResolvedValue({
        status: 'active',
        message: 'Session is active'
      });
      canRecord.mockReturnValue(true);
      
      renderWithRouter(
        <SessionValidator 
          sessionId=\"test-session-id\" 
          sessionComponents={sessionComponents}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('recording-interface')).toBeInTheDocument();
      });
      
      // parseSessionId should not have been called since components were provided
      expect(parseSessionId).not.toHaveBeenCalled();
    });

    test('parses session components from URL when not provided', async () => {
      validateSession.mockResolvedValue({
        status: 'active',
        message: 'Session is active'
      });
      canRecord.mockReturnValue(true);
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('recording-interface')).toBeInTheDocument();
      });
      
      expect(validateSessionId).toHaveBeenCalledWith('test-session-id');
      expect(parseSessionId).toHaveBeenCalledWith('test-session-id');
    });
  });

  describe('Custom Message Integration', () => {
    test('passes custom message from server to enhanced status', async () => {
      const customMessage = 'Server-specific error details';
      validateSession.mockResolvedValue({
        status: 'error',
        message: customMessage
      });
      canRecord.mockReturnValue(false);
      getEnhancedSessionStatus.mockReturnValue({
        status: 'error',
        category: 'error',
        canRecord: false,
        message: customMessage
      });
      
      renderWithRouter(<SessionValidator sessionId=\"test-session-id\" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('status-message')).toBeInTheDocument();
      });
      
      expect(getEnhancedSessionStatus).toHaveBeenCalledWith('error', customMessage);
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('URL Parameter Integration', () => {
    test('works with URL parameters using React Router', async () => {
      // This would be tested in a full E2E environment
      // For now, verify the component accepts sessionId prop correctly
      validateSession.mockResolvedValue({
        status: 'active',
        message: 'Session is active'
      });
      canRecord.mockReturnValue(true);
      
      renderWithRouter(<SessionValidator sessionId=\"url-param-session-id\" />);
      
      await waitFor(() => {
        expect(validateSession).toHaveBeenCalledWith('url-param-session-id');
      });
    });
  });
});

describe('SessionValidator Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Fast mock implementations for performance testing
    validateSessionId.mockReturnValue(true);
    parseSessionId.mockReturnValue({ userId: 'user', promptId: 'prompt', storytellerId: 'storyteller' });
    getEnhancedSessionStatus.mockImplementation((status) => ({
      status: status || 'unknown',
      category: 'ready',
      canRecord: true,
      message: `Status: ${status}`
    }));
    canRecord.mockReturnValue(true);
    isErrorStatus.mockReturnValue(false);
  });

  test('validates session quickly', async () => {
    validateSession.mockResolvedValue({
      status: 'active',
      message: 'Session is active'
    });
    
    const startTime = performance.now();
    
    renderWithRouter(<SessionValidator sessionId=\"performance-test-id\" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('recording-interface')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Validation should complete in under 100ms (excluding network time)
    // This is mainly testing the component logic performance
    expect(duration).toBeLessThan(1000); // Allow more time for test environment
  });

  test('handles rapid component mount/unmount', () => {
    validateSession.mockResolvedValue({
      status: 'active',
      message: 'Session is active'
    });
    
    const startTime = performance.now();
    
    // Mount and unmount 10 times rapidly
    for (let i = 0; i < 10; i++) {
      const { unmount } = renderWithRouter(<SessionValidator sessionId={`test-${i}`} />);
      unmount();
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should handle rapid mount/unmount cycles efficiently
    expect(duration).toBeLessThan(500);
  });
});