/**
 * AppErrorBoundary.jsx
 * --------------------
 * Top-Level Application Error Boundary
 *
 * PURPOSE:
 * React Error Boundary that catches ALL unhandled JavaScript errors in the component
 * tree, preventing the white screen of death and providing graceful error recovery.
 *
 * RESPONSIBILITIES:
 * - Catch uncaught errors from any component in the React tree
 * - Prevent complete application crashes
 * - Display user-friendly error UI with recovery options
 * - Log detailed error information for debugging
 * - Provide error details (stack traces, component stacks) in development mode
 *
 * USED BY:
 * - index.js (wraps entire application at root level)
 * - Demo page: /demo/error/app-crash (for testing)
 *
 * SCOPE:
 * GLOBAL - Wraps the entire application including:
 * - TokenProvider
 * - NiceModal.Provider
 * - BrowserRouter and all routes
 * - All child components
 *
 * ERROR RECOVERY OPTIONS:
 * - "Reload Page" button → window.location.reload()
 * - "Go Home" button → Navigate to root route (/)
 *
 * DEVELOPMENT FEATURES:
 * - Collapsible error stack trace
 * - Component stack trace visualization
 * - Current URL display
 * - Debug message reference (🐛 prefixed console logs)
 *
 * INTEGRATION:
 * - Uses debugLogger for structured error logging
 * - Logs via componentDidCatch lifecycle method
 * - Preserves error info in component state
 */

import React from 'react';
import debugLogger from '../utils/debugLogger.js';
import ProductionErrorScreen from './ProductionErrorScreen';
import DevelopmentErrorScreen from './DevelopmentErrorScreen';
import { generateErrorId, logErrorToBackend, buildErrorPayload, getSessionId } from '../utils/errorUtils';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorId: null };
    debugLogger.componentMounted('AppErrorBoundary');
  }

  static getDerivedStateFromError(error) {
    debugLogger.log('error', 'AppErrorBoundary', 'getDerivedStateFromError called', { error: error.message }, error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID
    const errorId = generateErrorId('APP');

    // Log using existing debugLogger
    debugLogger.componentError('AppErrorBoundary', error, {
      errorInfo,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorId
    });

    // Log to console with error ID
    console.error(`[${errorId}] AppErrorBoundary caught error:`, error);
    console.error(`[${errorId}] Error Info:`, errorInfo);
    console.error(`[${errorId}] Component Stack:`, errorInfo.componentStack);

    // Build error payload for logging
    const errorPayload = buildErrorPayload({
      errorId,
      error,
      errorInfo,
      errorBoundary: 'AppErrorBoundary',
      sessionId: getSessionId()
    });

    // Log to backend (async, non-blocking)
    logErrorToBackend(errorPayload).catch(e => {
      console.error('Failed to log error to backend:', e);
    });

    // Update state with error details and ID
    this.setState({
      error,
      errorInfo,
      errorId
    });
  }

  render() {
    if (this.state.hasError) {
      debugLogger.log('error', 'AppErrorBoundary', 'Rendering error fallback UI', {
        errorId: this.state.errorId,
        environment: process.env.NODE_ENV
      });

      // Development: Show detailed error screen with stack traces
      if (process.env.NODE_ENV === 'development') {
        return (
          <DevelopmentErrorScreen
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            errorId={this.state.errorId}
            errorType="App"
          />
        );
      }

      // Production: Show generic user-friendly error screen
      return (
        <ProductionErrorScreen
          errorId={this.state.errorId}
          onRetry={() => window.location.reload()}
          onGoHome={() => window.location.href = '/'}
          showRetry={true}
        />
      );
    }

    debugLogger.log('info', 'AppErrorBoundary', 'Rendering children - no errors');
    return this.props.children;
  }
}

export default AppErrorBoundary;