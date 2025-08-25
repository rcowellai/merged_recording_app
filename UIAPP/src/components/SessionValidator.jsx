import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { parseSessionId, validateSessionId } from '../utils/sessionParser.js';
import { validateSession } from '../services/firebase';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';
import debugLogger from '../utils/debugLogger.js';
import { doc, getDoc } from 'firebase/firestore'; // UID-FIX-SLICE-A: Import Firestore
import { db } from '../services/firebase'; // UID-FIX-SLICE-A: Import db

// Import the existing App component to render when session is valid
import AppContent from './AppContent.jsx';

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

  useEffect(() => {
    const loadSession = async () => {
      debugLogger.log('info', 'SessionValidator', 'Starting session loading', {
        sessionId,
        currentUrl: window.location.href,
        propSessionComponents: !!propSessionComponents
      });
      
      if (!sessionId) {
        debugLogger.log('error', 'SessionValidator', 'No session ID provided');
        setError('No session ID provided in URL path');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Parse session components if not provided (from URL parameter)
        if (!propSessionComponents && sessionId) {
          debugLogger.log('info', 'SessionValidator', 'Parsing session components from URL', { sessionId });
          try {
            debugLogger.log('info', 'SessionValidator', 'Validating session ID format', { sessionId });
            if (!validateSessionId(sessionId)) {
              debugLogger.log('error', 'SessionValidator', 'Invalid session ID format', { sessionId });
              setError('Invalid recording link format. This recording link appears to be corrupted or expired.');
              setLoading(false);
              return;
            }
            const parsedComponents = parseSessionId(sessionId);
            debugLogger.log('info', 'SessionValidator', 'Session ID parsed successfully', { 
              sessionId, 
              parsedComponents 
            });
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
            setError(`Invalid recording link: ${parseError.message}`);
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

        // Check if session validation returned an error status
        if (!data.isValid) {
          // Handle business rule errors with exact messages from Love Retold
          debugLogger.log('info', 'SessionValidator', 'Session validation failed', { 
            sessionId,
            status: data.status,
            message: data.message
          });
          setError(data.message || 'Session validation failed');
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
        setError(`Session validation failed: ${mappedError.message}`);
        setLoading(false);
        
        firebaseErrorHandler.log('error', 'Session validation failed', mappedError, {
          service: 'session-validator',
          operation: 'validation-error',
          sessionId
        });
      }
    };

    loadSession();
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
    debugLogger.log('error', 'SessionValidator', 'Rendering error state', { error });
    return (
      <div className="app-container">
        <div className="error-container">
          <h2>Recording Session Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary"
            >
              Try Again
            </button>
            <a 
              href="https://loveretold.com" 
              className="btn btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Love Retold
            </a>
          </div>
        </div>
      </div>
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