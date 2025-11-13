import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { parseSessionId, validateSessionId } from '../utils/sessionParser.js';
import { validateSession, validateRecordingSessionDirect } from '../services/firebase';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';
import debugLogger from '../utils/debugLogger.js';
import { ENV_CONFIG } from '../config'; // Import environment configuration

// Import the existing App component to render when session is valid
import AppContent from './AppContent.jsx';
import SessionErrorScreen from './SessionErrorScreen.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

const SessionValidator = ({ sessionId: propSessionId, sessionComponents: propSessionComponents }) => {
  const { sessionId: paramSessionId } = useParams();
  const sessionId = propSessionId || paramSessionId; // Support both prop and URL parameter
  
  debugLogger.componentMounted('SessionValidator', { 
    propSessionId, 
    paramSessionId, 
    finalSessionId: sessionId,
    propSessionComponents: propSessionComponents ? 'provided' : 'not provided'
  });
  const [sessionData, setSessionData] = useState(null);
  const [sessionComponents, setSessionComponents] = useState(propSessionComponents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('invalid'); // 'invalid', 'expired', or 'network'

  useEffect(() => {
    // RACE-CONDITION-FIX: Track component mount status to prevent setState on unmounted component
    let isMounted = true;

    const loadSession = async () => {
      debugLogger.log('info', 'SessionValidator', 'Starting session loading', {
        sessionId,
        currentUrl: window.location.href,
        propSessionComponents: !!propSessionComponents,
        sessionValidationEnabled: ENV_CONFIG.SESSION_VALIDATION_ENABLED
      });

      if (!sessionId) {
        debugLogger.log('error', 'SessionValidator', 'No session ID provided');
        // RACE-CONDITION-FIX: Check mount status before setState
        if (!isMounted) return;
        setError('No session ID provided in URL path');
        setErrorType('invalid');
        setLoading(false);
        return;
      }

      try {
        // RACE-CONDITION-FIX: Check mount status before setState
        if (!isMounted) return;
        setLoading(true);

        // DEVELOPMENT MODE: Bypass session validation for testing
        if (!ENV_CONFIG.SESSION_VALIDATION_ENABLED) {
          debugLogger.log('info', 'SessionValidator', '🎭 DEVELOPMENT MODE: Bypassing session validation', {
            sessionId,
            reason: 'REACT_APP_SESSION_VALIDATION_ENABLED=false'
          });

          // Create mock session data for development testing
          const mockSessionData = {
            status: 'valid',
            message: 'Development mode - session validation bypassed',
            isValid: true,
            sessionData: {
              questionText: 'What was the most memorable adventure from your childhood and what made it so special? Please describe what happened, where you were, and who was with you.',
              storytellerName: 'Test Storyteller',
              askerName: 'Test Asker',
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            session: {
              promptText: 'What was the most memorable adventure from your childhood and what made it so special? Please describe what happened, where you were, and who was with you.',
              storytellerName: 'Test Storyteller',
              askerName: 'Test Asker',
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            fullUserId: 'test-user-id-12345678901234567890',
            isDevelopmentMode: true
          };

          // Create mock session components
          const mockComponents = {
            randomPrefix: 'testdev',
            promptId: 'testprompt',
            userId: 'testuser',
            storytellerId: 'teststory',
            timestamp: Math.floor(Date.now() / 1000)
          };

          // RACE-CONDITION-FIX: Check mount status before setState
          if (!isMounted) return;
          setSessionData(mockSessionData);
          setSessionComponents(mockComponents);
          setError(null);
          setLoading(false);

          return;
        }

        // Parse session components if not provided (from URL parameter)
        if (!propSessionComponents && sessionId) {
          debugLogger.log('info', 'SessionValidator', 'Parsing session components from URL', { sessionId });
          try {
            debugLogger.log('info', 'SessionValidator', 'Validating session ID format', { sessionId });
            if (!validateSessionId(sessionId)) {
              debugLogger.log('error', 'SessionValidator', 'Invalid session ID format', { sessionId });
              // RACE-CONDITION-FIX: Check mount status before setState
              if (!isMounted) return;
              setError('Invalid recording link format. This recording link appears to be corrupted or expired.');
              setErrorType('invalid');
              setLoading(false);
              return;
            }
            const parsedComponents = parseSessionId(sessionId);
            debugLogger.log('info', 'SessionValidator', 'Session ID parsed successfully', {
              sessionId,
              parsedComponents
            });
            // RACE-CONDITION-FIX: Check mount status before setState
            if (!isMounted) return;
            setSessionComponents(parsedComponents);
            firebaseErrorHandler.log('info', 'Session components parsed from URL', {
              userId: parsedComponents.userId,
              promptId: parsedComponents.promptId,
              storytellerId: parsedComponents.storytellerId
            }, {
              service: 'session-validator',
              operation: 'parse-session'
            });
          } catch (parseError) {
            debugLogger.componentError('SessionValidator', parseError, {
              sessionId,
              operation: 'parse-session-id'
            });
            console.error('Session parsing error:', parseError);
            // RACE-CONDITION-FIX: Check mount status before setState
            if (!isMounted) return;
            setError(`Invalid recording link: ${parseError.message}`);
            setErrorType('invalid');
            setLoading(false);
            return;
          }
        }

        // PRIMARY: Direct Firestore query
        debugLogger.log('info', 'SessionValidator', 'Starting session validation', { sessionId });

        let data = await validateRecordingSessionDirect(sessionId);
        debugLogger.log('info', 'SessionValidator', 'Primary validation response', {
          sessionId,
          status: data.status,
          isValid: data.isValid,
          method: data.method
        });

        // FALLBACK: Cloud Function (if direct query failed)
        if (data.fallbackRequired) {
          debugLogger.log('warn', 'SessionValidator', 'Using Cloud Function fallback', {
            sessionId,
            primaryError: data.message
          });

          try {
            const fallbackData = await validateSession(sessionId);
            data = { ...fallbackData, method: 'cloud-function-fallback' };

            debugLogger.log('info', 'SessionValidator', 'Fallback successful', {
              sessionId,
              status: data.status
            });
          } catch (fallbackError) {
            debugLogger.log('error', 'SessionValidator', 'Both validation methods failed', {
              sessionId,
              primaryError: data.message,
              fallbackError: fallbackError.message
            });
            // Keep original error from direct validation
          }
        }

        // Check mount status
        if (!isMounted) {
          return;
        }

        // Handle validation failure
        if (!data.isValid) {
          debugLogger.log('info', 'SessionValidator', 'Validation failed', {
            sessionId,
            status: data.status,
            message: data.message
          });

          const errorType = data.status === 'not_found' ? 'invalid' :
                           data.status === 'expired' ? 'expired' :
                           'network';

          setError(data.message || 'Session validation failed');
          setErrorType(errorType);
          setLoading(false);
          return;
        }

        // Success - session data complete
        debugLogger.log('info', 'SessionValidator', 'Validation successful', {
          sessionId,
          hasFullUserId: !!data.fullUserId,
          method: data.method
        });

        setSessionData(data);
        setLoading(false);

        firebaseErrorHandler.log('info', 'Session validation successful', {
          sessionId,
          status: data?.status
        }, {
          service: 'session-validator',
          operation: 'validation-success'
        });

      } catch (validationError) {
        debugLogger.componentError('SessionValidator', validationError, {
          sessionId,
          operation: 'firebase-validation'
        });
        const mappedError = firebaseErrorHandler.mapError(validationError, 'session-validation');
        // RACE-CONDITION-FIX: Check mount status before setState
        if (!isMounted) return;
        setError(`Session validation failed: ${mappedError.message}`);
        setErrorType('network');
        setLoading(false);

        firebaseErrorHandler.log('error', 'Session validation failed', mappedError, {
          service: 'session-validator',
          operation: 'validation-error',
          sessionId
        });
      }
    };

    loadSession();

    // RACE-CONDITION-FIX: Cleanup function to prevent setState on unmounted component
    return () => {
      isMounted = false;
    };
    // RACE-CONDITION-FIX: Removed sessionComponents?.userId to prevent dependency loop
    // sessionComponents is derived state (set at line 129), not an input dependency
    // Including it causes double-execution: effect runs → setSessionComponents → userId changes → effect re-runs
    // This intentionally ignores the ESLint warning - the dependency would cause a race condition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, propSessionComponents]);

  // Loading state
  if (loading) {
    debugLogger.log('info', 'SessionValidator', 'Rendering loading state');
    return (
      <LoadingSpinner
        message="Validating recording session..."
        size="large"
        centered={true}
      />
    );
  }

  // Error state
  if (error) {
    debugLogger.log('error', 'SessionValidator', 'Rendering error state', { error, errorType });
    return (
      <SessionErrorScreen
        errorType={errorType}
        onRetry={() => window.location.reload()}
        onGoHome={() => window.location.href = 'https://loveretold.com'}
      />
    );
  }

  // Success state - render the recording interface
  debugLogger.log('info', 'SessionValidator', 'Rendering success state - loading AppContent', {
    sessionId,
    hasSessionData: !!sessionData,
    hasSessionComponents: !!sessionComponents
  });
  return (
    <AppContent 
      sessionId={sessionId}
      sessionData={sessionData}
      sessionComponents={sessionComponents}
    />
  );
};

export default SessionValidator;