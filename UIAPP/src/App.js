/**
 * App.jsx
 * -------
 * Main app component for Love Retold Recording App
 * Now integrated with index.js router - no nested BrowserRouter
 */

import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import SessionValidator from './components/SessionValidator.jsx';
import { extractSessionIdFromUrl } from './utils/sessionParser.js';
import debugLogger from './utils/debugLogger.js';

function App() {
  debugLogger.componentMounted('App');
  const { sessionId } = useParams();
  const location = useLocation();
  
  debugLogger.log('info', 'App', 'App initializing', {
    currentUrl: window.location.href,
    userAgent: navigator.userAgent,
    sessionIdFromParams: sessionId,
    pathname: location.pathname
  });
  
  // Log route changes
  useEffect(() => {
    debugLogger.log('info', 'ROUTER', 'Route changed', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      fullUrl: window.location.href,
      sessionIdFromParams: sessionId
    });
  }, [location, sessionId]);

  // If we have a sessionId from path params, use SessionValidator
  if (sessionId) {
    debugLogger.log('info', 'App', 'Session ID found in path params, using SessionValidator', { sessionId });
    return <SessionValidator />;
  }

  // Check for query parameters
  const querySessionId = extractSessionIdFromUrl();
  debugLogger.log('info', 'App', 'Checking query parameters', { querySessionId });
  
  if (querySessionId) {
    debugLogger.log('info', 'App', 'Session ID found in query params, redirecting', { querySessionId });
    // Redirect to path-based URL
    window.location.href = `/${querySessionId}`;
    return null;
  }

  // No session found, show info page
  debugLogger.log('info', 'App', 'No session found, showing info page');
  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">Love Retold Recording</h1>
        <p>Audio & Video Memory Capture</p>
      </div>
      
      <div className="app-navigation">
        <div className="nav-section">
          <h3>Recording</h3>
          <p>To record a memory, you need a valid recording link from Love Retold.</p>
          <a 
            href="https://loveretold.com" 
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Love Retold
          </a>
        </div>
        
        <div className="nav-section">
          <h3>Test Recording</h3>
          <p>Test the recording interface with a sample session.</p>
          <a 
            href="/?sessionId=test-session-123" 
            className="btn btn-secondary"
          >
            Test Recording
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;