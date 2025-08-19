/**
 * 🧪 Firebase Error Boundary Tests (C08)
 * ========================================
 * 
 * Comprehensive test suite for React Error Boundary that catches
 * Firebase service failures and provides graceful fallback UI.
 * 
 * Test Coverage:
 * - Error catching and state management
 * - Retry functionality with limits
 * - Fallback mode activation
 * - User-friendly error UI rendering
 * - Integration with centralized error handler
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FirebaseErrorBoundary, { 
  withFirebaseErrorBoundary, 
  useFirebaseFallback 
} from '../components/FirebaseErrorBoundary';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';

// Mock the firebaseErrorHandler
jest.mock('../utils/firebaseErrorHandler', () => ({
  firebaseErrorHandler: {
    mapError: jest.fn(),
    log: jest.fn(),
    isEnabled: jest.fn()
  }
}));

// Test component that throws errors
const ThrowingComponent = ({ shouldThrow, errorType }) => {
  if (shouldThrow) {
    const error = new Error('Test error');
    if (errorType) {
      error.code = errorType;
    }
    throw error;
  }
  return <div>Component working fine</div>;
};

// Test component that accepts fallback props
const FallbackAwareComponent = ({ fallbackMode, firebaseDisabled }) => (
  <div>
    <span>Component loaded</span>
    {fallbackMode && <span>In fallback mode</span>}
    {firebaseDisabled && <span>Firebase disabled</span>}
  </div>
);

describe('FirebaseErrorBoundary', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console.error to avoid test output noise
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default mock implementations
    firebaseErrorHandler.mapError.mockReturnValue({
      type: 'NETWORK_ERROR',
      message: 'Test error message',
      retryable: true,
      originalError: { message: 'Original error', stack: 'stack trace' }
    });
    
    firebaseErrorHandler.isEnabled.mockReturnValue(true);
  });
  
  afterEach(() => {
    console.error.mockRestore();
  });

  describe('Error Catching', () => {
    test('renders children when no error occurs', () => {
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText('Component working fine')).toBeInTheDocument();
    });
    
    test('catches and displays error UI when component throws', () => {
      render(
        <FirebaseErrorBoundary component="Test Component">
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText('Test Component Temporarily Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
    
    test('uses default component name when not provided', () => {
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText('Firebase Service Temporarily Unavailable')).toBeInTheDocument();
    });
    
    test('calls firebaseErrorHandler.mapError when error occurs', () => {
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(firebaseErrorHandler.mapError).toHaveBeenCalledWith(
        expect.any(Error),
        'error-boundary'
      );
    });
    
    test('logs error details with firebaseErrorHandler.log', () => {
      render(
        <FirebaseErrorBoundary component="Test Component">
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(firebaseErrorHandler.log).toHaveBeenCalledWith(
        'error',
        'Error boundary caught Firebase error',
        expect.any(Object),
        expect.objectContaining({
          service: 'firebase-error-boundary',
          operation: 'error-catch'
        })
      );
    });
  });

  describe('Retry Functionality', () => {
    test('shows retry button for retryable errors', () => {
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true
      });
      
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText(/Try Again \(1\/3\)/)).toBeInTheDocument();
    });
    
    test('does not show retry button for non-retryable errors', () => {
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        retryable: false
      });
      
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();
    });
    
    test('increments retry count when retry button clicked', () => {
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true
      });
      
      const { rerender } = render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      // Click retry button
      fireEvent.click(screen.getByText(/Try Again \(1\/3\)/));
      
      // Re-render with working component
      rerender(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText('Component working fine')).toBeInTheDocument();
    });
    
    test('disables retry after max attempts', () => {
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true
      });
      
      const { rerender } = render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      // Simulate 3 retries
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText(/Try Again/));
        rerender(
          <FirebaseErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </FirebaseErrorBoundary>
        );
      }
      
      // After 3 retries, retry button should be disabled
      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();
    });
  });

  describe('Fallback Mode', () => {
    test('activates fallback mode after max retries', () => {
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true
      });
      
      const { rerender } = render(
        <FirebaseErrorBoundary>
          <FallbackAwareComponent />
        </FirebaseErrorBoundary>
      );
      
      // Simulate error
      rerender(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      // Click fallback button
      fireEvent.click(screen.getByText('Continue Offline'));
      
      // Should render children with fallback props
      rerender(
        <FirebaseErrorBoundary>
          <FallbackAwareComponent />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText('In fallback mode')).toBeInTheDocument();
      expect(screen.getByText('Firebase disabled')).toBeInTheDocument();
    });
    
    test('activates fallback mode for non-retryable Firebase errors', () => {
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        retryable: false
      });
      
      const { rerender } = render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="storage/quota-exceeded" />
        </FirebaseErrorBoundary>
      );
      
      // Click fallback button
      fireEvent.click(screen.getByText('Continue Offline'));
      
      expect(firebaseErrorHandler.log).toHaveBeenCalledWith(
        'info',
        'User manually activated fallback mode',
        null,
        expect.objectContaining({
          service: 'firebase-error-boundary',
          operation: 'manual-fallback'
        })
      );
    });
    
    test('activates fallback mode when Firebase is disabled', () => {
      firebaseErrorHandler.isEnabled.mockReturnValue(false);
      
      const { rerender } = render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      // Should automatically activate fallback mode
      fireEvent.click(screen.getByText('Continue Offline'));
      
      rerender(
        <FirebaseErrorBoundary>
          <FallbackAwareComponent />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText('Firebase disabled')).toBeInTheDocument();
    });
  });

  describe('UI Components', () => {
    test('shows appropriate help text for retryable errors', () => {
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true
      });
      
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText(/We're experiencing connection issues/)).toBeInTheDocument();
    });
    
    test('shows appropriate help text for non-retryable errors', () => {
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        retryable: false
      });
      
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText(/You can continue working offline/)).toBeInTheDocument();
    });
    
    test('shows developer info in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      firebaseErrorHandler.mapError.mockReturnValue({
        type: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true,
        originalError: {
          message: 'Original error message',
          stack: 'Error stack trace'
        }
      });
      
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText('Developer Info')).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
    
    test('hides developer info in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.queryByText('Developer Info')).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
    
    test('reset button clears error state', () => {
      const { rerender } = render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      // Click reset button
      fireEvent.click(screen.getByText('Reset'));
      
      // Re-render with working component
      rerender(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </FirebaseErrorBoundary>
      );
      
      expect(screen.getByText('Component working fine')).toBeInTheDocument();
    });
  });

  describe('Higher-Order Component', () => {
    test('withFirebaseErrorBoundary wraps component correctly', () => {
      const WrappedComponent = withFirebaseErrorBoundary(
        () => <div>Wrapped component</div>,
        'Test Component'
      );
      
      render(<WrappedComponent />);
      
      expect(screen.getByText('Wrapped component')).toBeInTheDocument();
    });
    
    test('withFirebaseErrorBoundary catches errors in wrapped component', () => {
      const WrappedComponent = withFirebaseErrorBoundary(
        () => { throw new Error('Wrapped error'); },
        'Test Component'
      );
      
      render(<WrappedComponent />);
      
      expect(screen.getByText('Test Component Temporarily Unavailable')).toBeInTheDocument();
    });
  });

  describe('useFirebaseFallback Hook', () => {
    const TestHookComponent = () => {
      const { fallbackMode, enableFallback, firebaseEnabled } = useFirebaseFallback();
      
      return (
        <div>
          <span>Fallback: {fallbackMode ? 'enabled' : 'disabled'}</span>
          <span>Firebase: {firebaseEnabled ? 'enabled' : 'disabled'}</span>
          <button onClick={enableFallback}>Enable Fallback</button>
        </div>
      );
    };
    
    test('reflects Firebase enabled state', () => {
      firebaseErrorHandler.isEnabled.mockReturnValue(true);
      
      render(<TestHookComponent />);
      
      expect(screen.getByText('Firebase: enabled')).toBeInTheDocument();
      expect(screen.getByText('Fallback: disabled')).toBeInTheDocument();
    });
    
    test('enables fallback mode when Firebase is disabled', () => {
      firebaseErrorHandler.isEnabled.mockReturnValue(false);
      
      render(<TestHookComponent />);
      
      expect(screen.getByText('Firebase: disabled')).toBeInTheDocument();
      expect(screen.getByText('Fallback: enabled')).toBeInTheDocument();
    });
    
    test('allows manual fallback activation', () => {
      firebaseErrorHandler.isEnabled.mockReturnValue(true);
      
      render(<TestHookComponent />);
      
      fireEvent.click(screen.getByText('Enable Fallback'));
      
      expect(screen.getByText('Fallback: enabled')).toBeInTheDocument();
    });
  });

  describe('Error Detection', () => {
    test('identifies Firebase errors by error code', () => {
      const { rerender } = render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </FirebaseErrorBoundary>
      );
      
      // Simulate Firebase error
      rerender(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="storage/quota-exceeded" />
        </FirebaseErrorBoundary>
      );
      
      expect(firebaseErrorHandler.mapError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'storage/quota-exceeded' }),
        'error-boundary'
      );
    });
    
    test('identifies Firebase errors by error message', () => {
      const FirebaseMessageError = () => {
        const error = new Error('Firebase Storage quota exceeded');
        throw error;
      };
      
      render(
        <FirebaseErrorBoundary>
          <FirebaseMessageError />
        </FirebaseErrorBoundary>
      );
      
      expect(firebaseErrorHandler.mapError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('error UI is accessible', () => {
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      // Check for proper heading structure
      expect(screen.getByRole('heading')).toBeInTheDocument();
      
      // Check for actionable buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Buttons should be keyboard accessible
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled');
      });
    });
    
    test('buttons are keyboard navigable', () => {
      render(
        <FirebaseErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </FirebaseErrorBoundary>
      );
      
      const retryButton = screen.getByText(/Try Again/);
      
      // Focus should be possible
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);
    });
  });
});