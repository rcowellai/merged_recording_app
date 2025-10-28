/**
 * 🛡️ Firebase Error Boundary for UIAPP (C08)
 * =============================================
 * 
 * CONSOLIDATION OBJECTIVE:
 * React Error Boundary that catches Firebase service failures and prevents
 * application crashes, providing graceful fallback UI and automatic recovery.
 * 
 * KEY FEATURES:
 * - Catches Firebase service errors and JavaScript exceptions
 * - Prevents app crashes from Firebase integration failures  
 * - Provides user-friendly error UI with retry options
 * - Automatically falls back to localStorage on persistent failures
 * - Integrates with C08 error handler and logging system
 * - Maintains UIAPP UI patterns and styling
 * 
 * INTEGRATION POINTS:
 * - Wraps Firebase-dependent components (RecordingFlow, AdminPage, etc.)
 * - Uses C08 firebaseErrorHandler for error mapping and logging
 * - Integrates with existing UIAPP error display patterns
 * - Respects Firebase feature flags for fallback behavior
 */

import React, { Component } from 'react';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';

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
    // Map and log the error using C08 error handler
    const mappedError = firebaseErrorHandler.mapError(error, 'error-boundary');
    
    firebaseErrorHandler.log('error', 'Error boundary caught Firebase error', {
      error: mappedError,
      errorInfo,
      component: this.props.component || 'unknown'
    }, {
      service: 'firebase-error-boundary',
      operation: 'error-catch'
    });
    
    this.setState({
      error: mappedError,
      errorInfo: errorInfo
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
    const { hasError, error, retryCount, fallbackMode } = this.state;
    const { children, component = 'Firebase Service' } = this.props;
    
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
      
      return (
        <div className="firebase-error-boundary" style={errorBoundaryStyles.container}>
          <div style={errorBoundaryStyles.content}>
            {/* Error Icon */}
            <div style={errorBoundaryStyles.icon}>⚠️</div>
            
            {/* Error Message */}
            <h3 style={errorBoundaryStyles.title}>
              {component} Temporarily Unavailable
            </h3>
            
            <p style={errorBoundaryStyles.message}>
              {error?.message || 'An unexpected error occurred while connecting to our servers.'}
            </p>
            
            {/* Action Buttons */}
            <div style={errorBoundaryStyles.actions}>
              {canRetry && (
                <button 
                  onClick={this.handleRetry}
                  style={errorBoundaryStyles.primaryButton}
                >
                  Try Again ({retryCount + 1}/{this.maxRetries})
                </button>
              )}
              
              <button
                onClick={this.handleFallback}
                style={errorBoundaryStyles.secondaryButton}
              >
                Next step Offline
              </button>
              
              <button 
                onClick={this.handleReset}
                style={errorBoundaryStyles.tertiaryButton}
              >
                Reset
              </button>
            </div>
            
            {/* Help Text */}
            <p style={errorBoundaryStyles.helpText}>
              {canRetry ? (
                'We\'re experiencing connection issues. You can try again or continue working offline with limited functionality.'
              ) : (
                'You can continue working offline with limited functionality, or reset to try connecting again.'
              )}
            </p>
            
            {/* Developer Info (development only) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details style={errorBoundaryStyles.details}>
                <summary style={errorBoundaryStyles.summary}>Developer Info</summary>
                <div style={errorBoundaryStyles.errorDetails}>
                  <p><strong>Error Type:</strong> {error.type}</p>
                  <p><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</p>
                  <p><strong>Original Message:</strong> {error.originalError?.message}</p>
                  {error.originalError?.stack && (
                    <pre style={errorBoundaryStyles.stack}>
                      {error.originalError.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
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