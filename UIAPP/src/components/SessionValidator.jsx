import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { parseSessionId, validateSessionId } from '../utils/sessionParser.js';
import { validateSession } from '../services/firebase';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';
import debugLogger from '../utils/debugLogger.js';
import { doc, getDoc } from 'firebase/firestore'; // UID-FIX-SLICE-A: Import Firestore
import { db } from '../services/firebase'; // UID-FIX-SLICE-A: Import db
import { ENV_CONFIG } from '../config'; // Import environment configuration

// Import the existing App component to render when session is valid
import AppContent from './AppContent.jsx';
import SessionErrorScreen from './SessionErrorScreen.jsx';

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

          console.log('🎭 Development mode active - using mock session data');
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

        // Validate session with Firebase
        debugLogger.log('info', 'SessionValidator', 'Starting Firebase session validation', { sessionId });
        firebaseErrorHandler.log('info', 'Validating session with Firebase', { sessionId }, {
          service: 'session-validator',
          operation: 'validate-session'
        });

        const data = await validateSession(sessionId);
        debugLogger.log('info', 'SessionValidator', 'Firebase validation response received', {
          sessionId,
          status: data.status,
          message: data.message
        });

        // RACE-CONDITION-FIX: Check mount status before setState (after async operation)
        if (!isMounted) return;

        // Check if session validation returned an error status
        if (!data.isValid) {
          // Handle business rule errors with exact messages from Love Retold
          debugLogger.log('info', 'SessionValidator', 'Session validation failed', {
            sessionId,
            status: data.status,
            message: data.message
          });
          setError(data.message || 'Session validation failed');
          setErrorType('expired');
          setLoading(false);
          return;
        }

        // Session is valid - proceed with setup
        debugLogger.log('info', 'SessionValidator', 'Session validation successful', {
          sessionId,
          sessionData: data
        });

        // UID-FIX-SLICE-A: Fetch session document from Firestore to get full userId
        debugLogger.log('info', 'SessionValidator', 'Fetching session document for full userId', { sessionId });
        try {
          const sessionDoc = await getDoc(doc(db, 'recordingSessions', sessionId));

          // RACE-CONDITION-FIX: Check mount status before setState (after async operation)
          if (!isMounted) return;

          if (sessionDoc.exists()) {
            const sessionDocData = sessionDoc.data();
            debugLogger.log('info', 'SessionValidator', 'Session document retrieved', {
              sessionId,
              hasUserId: !!sessionDocData.userId,
              userIdLength: sessionDocData.userId?.length
            });

            // Add full userId to session data
            const enhancedData = {
              ...data,
              fullUserId: sessionDocData.userId, // UID-FIX-SLICE-A: Full 28-character userId
              sessionDocument: sessionDocData    // UID-FIX-SLICE-A: Complete session document
            };

            setSessionData(enhancedData);
            debugLogger.log('info', 'SessionValidator', 'Enhanced session data with full userId', {
              sessionId,
              fullUserId: sessionDocData.userId,
              truncatedUserId: sessionComponents?.userId
            });
          } else {
            debugLogger.log('error', 'SessionValidator', 'Session document not found', { sessionId });
            setSessionData(data); // Fallback to original data
          }
        } catch (firestoreError) {
          debugLogger.log('error', 'SessionValidator', 'Failed to fetch session document', {
            sessionId,
            error: firestoreError.message
          });
          // RACE-CONDITION-FIX: Check mount status before setState
          if (!isMounted) return;
          setSessionData(data); // Fallback to original data
        }

        setError(null);
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
      <div className="app-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-message">Validating recording session...</p>
        </div>
      </div>
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