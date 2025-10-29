/**
 * FirebaseErrorBoundary.jsx
 * -------------------------
 * Firebase-Specific Error Boundary with Automatic Fallback
 *
 * PURPOSE:
 * React Error Boundary specialized for Firebase service failures, providing
 * graceful degradation to localStorage when Firebase becomes unavailable.
 *
 * RESPONSIBILITIES:
 * - Catch Firebase-specific errors (Firestore, Storage, Functions, Auth)
 * - Prevent Firebase failures from crashing the application
 * - Provide 3-tier error recovery system:
 *   1. Retry (up to 3 attempts) for transient errors
 *   2. Fallback mode → Switch to localStorage when Firebase unavailable
 *   3. Reset → Clear error state and retry connection
 * - Map and log errors via C08 firebaseErrorHandler
 * - Display user-friendly error UI with action buttons
 * - Auto-activate fallback mode after max retries
 *
 * USED BY:
 * - AppContent.jsx (wraps Firebase-dependent recording components)
 * - Demo page: /demo/error/firebase (for testing)
 *
 * ERROR RECOVERY FLOW:
 * 1. Firebase Error Occurs
 * 2. FirebaseErrorBoundary catches it
 * 3. Maps error via firebaseErrorHandler (type, retryable, message)
 * 4. If retryable → Show "Try Again" button (max 3 attempts)
 * 5. If max retries exceeded → Enable fallback mode (localStorage)
 * 6. Render children with fallbackMode=true prop
 *
 * FALLBACK MODE:
 * - Automatically enabled after 3 failed retry attempts
 * - Manually activated via "Continue Offline" button
 * - Switches storage from Firebase to localStorage
 * - Children components receive fallbackMode and firebaseDisabled props
 *
 * EXPORTS:
 * - FirebaseErrorBoundary (component): Error boundary wrapper
 * - withFirebaseErrorBoundary (HOC): Higher-order component wrapper
 * - useFirebaseFallback (hook): Hook to check/control fallback mode
 *
 * DEVELOPMENT FEATURES:
 * - Detailed error diagnostics in development mode
 * - Error type and retryable status display
 * - Original error message and stack trace
 * - Component name tracking for debugging
 *
 * INTEGRATION:
 * - C08 firebaseErrorHandler for error mapping and logging
 * - Inline styles (no CSS dependencies) for portability
 * - Focus regain detection for reconnection attempts
 */

import React, { Component } from 'react';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';
import ProductionErrorScreen from './ProductionErrorScreen';
import DevelopmentErrorScreen from './DevelopmentErrorScreen';
import { generateErrorId, logErrorToBackend, buildErrorPayload, getSessionId } from '../utils/errorUtils';

/**
 * Firebase Error Boundary Component
 * Catches errors in Firebase services and provides recovery options
 */
export class FirebaseErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      fallbackMode: false
    };

    this.maxRetries = 3;
  }
  
  /**
   * Catch errors during rendering, in lifecycle methods, and in constructors
   */
  static getDerivedStateFromError(error) {
    // Update state to show error UI
    return {
      hasError: true,
      error: error
    };
  }
  
  /**
   * Log error details and update state with error info
   */
  componentDidCatch(error, errorInfo) {
    // Generate unique error ID
    const errorId = generateErrorId('FB');

    // Map and log the error using C08 error handler
    const mappedError = firebaseErrorHandler.mapError(error, 'error-boundary');

    firebaseErrorHandler.log('error', 'Error boundary caught Firebase error', {
      error: mappedError,
      errorInfo,
      errorId,
      component: this.props.component || 'unknown'
    }, {
      service: 'firebase-error-boundary',
      operation: 'error-catch'
    });

    // Log to console with error ID
    console.error(`[${errorId}] FirebaseErrorBoundary caught error:`, mappedError);

    // Build error payload for logging
    const errorPayload = buildErrorPayload({
      errorId,
      error: mappedError,
      errorInfo,
      errorBoundary: 'FirebaseErrorBoundary',
      sessionId: getSessionId()
    });

    // Add Firebase-specific context
    errorPayload.firebaseError = {
      type: mappedError.type,
      retryable: mappedError.retryable,
      originalCode: mappedError.originalError?.code
    };

    // Log to backend (async, non-blocking)
    logErrorToBackend(errorPayload).catch(e => {
      console.error('Failed to log error to backend:', e);
    });

    this.setState({
      error: mappedError,
      errorInfo: errorInfo,
      errorId
    });

    // Check if we should enable fallback mode
    this.checkFallbackMode(mappedError);
  }
  
  /**
   * Check if persistent Firebase failures should trigger fallback mode
   */
  checkFallbackMode = (error) => {
    const { retryCount } = this.state;
    
    // Enable fallback mode if:
    // 1. We've exceeded max retries
    // 2. Error is non-retryable and Firebase-related
    // 3. Firebase is disabled
    if (
      retryCount >= this.maxRetries ||
      (error && !error.retryable && this.isFirebaseError(error)) ||
      !firebaseErrorHandler.isEnabled()
    ) {
      firebaseErrorHandler.log('info', 'Enabling fallback mode due to persistent Firebase errors', {
        retryCount,
        error: error?.type,
        firebaseEnabled: firebaseErrorHandler.isEnabled()
      }, {
        service: 'firebase-error-boundary',
        operation: 'fallback-mode'
      });
      
      this.setState({ fallbackMode: true });
    }
  };
  
  /**
   * Check if error is Firebase-related
   */
  isFirebaseError = (error) => {
    if (!error) return false;
    
    // Check error message or stack for Firebase indicators
    const errorString = (error.message || '').toLowerCase();
    const stackString = (error.stack || '').toLowerCase();
    
    const firebaseIndicators = [
      'firebase',
      'firestore',
      'storage',
      'functions',
      'auth/',
      'storage/',
      'firestore/',
      'functions/'
    ];
    
    return firebaseIndicators.some(indicator => 
      errorString.includes(indicator) || stackString.includes(indicator)
    );
  };
  
  /**
   * Handle retry attempt
   */
  handleRetry = () => {
    const { retryCount } = this.state;
    
    firebaseErrorHandler.log('info', `Retrying after error (attempt ${retryCount + 1}/${this.maxRetries})`, null, {
      service: 'firebase-error-boundary',
      operation: 'retry'
    });
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };
  
  /**
   * Handle fallback mode activation
   */
  handleFallback = () => {
    firebaseErrorHandler.log('info', 'User manually activated fallback mode', null, {
      service: 'firebase-error-boundary',
      operation: 'manual-fallback'
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      fallbackMode: true
    });
  };
  
  /**
   * Reset error boundary state
   */
  handleReset = () => {
    firebaseErrorHandler.log('info', 'Error boundary reset', null, {
      service: 'firebase-error-boundary',
      operation: 'reset'
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      fallbackMode: false
    });
  };
  
  /**
   * Render error UI or children
   */
  render() {
    const { hasError, error, retryCount, fallbackMode, errorId } = this.state;
    const { children } = this.props;

    // Pass fallback mode to children via context or props
    if (fallbackMode && !hasError) {
      return React.cloneElement(children, {
        fallbackMode: true,
        firebaseDisabled: true
      });
    }

    // Show error UI if there's an error
    if (hasError) {
      const canRetry = retryCount < this.maxRetries && error?.retryable !== false;

      // Development: Show detailed error screen
      if (process.env.NODE_ENV === 'development') {
        return (
          <DevelopmentErrorScreen
            error={error}
            errorInfo={this.state.errorInfo}
            errorId={errorId}
            errorType="Firebase"
            onRetry={canRetry ? this.handleRetry : null}
          />
        );
      }

      // Production: Show generic user-friendly error screen
      return (
        <ProductionErrorScreen
          errorId={errorId}
          onRetry={canRetry ? this.handleRetry : null}
          onGoHome={() => window.location.href = '/'}
          showRetry={canRetry}
        />
      );
    }

    // Render children normally
    return children;
  }
}

/**
 * Higher-order component to wrap components with Firebase Error Boundary
 */
export function withFirebaseErrorBoundary(WrappedComponent, componentName) {
  const WithErrorBoundary = (props) => (
    <FirebaseErrorBoundary component={componentName}>
      <WrappedComponent {...props} />
    </FirebaseErrorBoundary>
  );
  
  WithErrorBoundary.displayName = `withFirebaseErrorBoundary(${componentName || WrappedComponent.name})`;
  
  return WithErrorBoundary;
}

/**
 * Hook to check if we're in fallback mode
 */
export function useFirebaseFallback() {
  const [fallbackMode, setFallbackMode] = React.useState(!firebaseErrorHandler.isEnabled());
  
  React.useEffect(() => {
    // Listen for Firebase availability changes
    const checkFirebase = () => {
      const isEnabled = firebaseErrorHandler.isEnabled();
      if (!isEnabled && !fallbackMode) {
        firebaseErrorHandler.log('info', 'Firebase disabled, enabling fallback mode', null, {
          service: 'firebase-fallback-hook',
          operation: 'auto-fallback'
        });
        setFallbackMode(true);
      }
    };
    
    checkFirebase();
    
    // Re-check when window regains focus (in case network/config changed)
    window.addEventListener('focus', checkFirebase);
    
    return () => {
      window.removeEventListener('focus', checkFirebase);
    };
  }, [fallbackMode]);
  
  return {
    fallbackMode,
    enableFallback: () => setFallbackMode(true),
    disableFallback: () => setFallbackMode(false),
    firebaseEnabled: firebaseErrorHandler.isEnabled()
  };
}

/**
 * Styles for error boundary UI (inline to avoid CSS dependencies)
 */
const errorBoundaryStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '20px',
    backgroundColor: '#fff',
    border: '1px solid #e1e5e9',
    borderRadius: '8px',
    margin: '20px 0'
  },
  
  content: {
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%'
  },
  
  icon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  
  title: {
    color: '#1a202c',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    lineHeight: '1.3'
  },
  
  message: {
    color: '#4a5568',
    fontSize: '16px',
    margin: '0 0 24px 0',
    lineHeight: '1.5'
  },
  
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  
  primaryButton: {
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#2c5aa0'
    }
  },
  
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    color: '#2d3748',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  
  tertiaryButton: {
    backgroundColor: 'transparent',
    color: '#4a5568',
    border: '1px solid #cbd5e0',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  
  helpText: {
    color: '#718096',
    fontSize: '14px',
    margin: '16px 0 0 0',
    lineHeight: '1.4'
  },
  
  details: {
    marginTop: '20px',
    textAlign: 'left',
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '12px'
  },
  
  summary: {
    cursor: 'pointer',
    fontWeight: '500',
    color: '#4a5568',
    fontSize: '14px'
  },
  
  errorDetails: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#2d3748'
  },
  
  stack: {
    backgroundColor: '#1a202c',
    color: '#e2e8f0',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
    marginTop: '8px'
  }
};

export default FirebaseErrorBoundary;