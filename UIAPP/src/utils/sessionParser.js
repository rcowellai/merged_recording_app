/**
 * Love Retold SESSION_ID Parser
 * Format: {random}-{promptId}-{userId}-{storytellerId}-{timestamp}
 * Example: j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545
 * 
 * Copied from MVPAPP to handle real session URLs properly
 */

import debugLogger from './debugLogger.js';

/**
 * Parse Love Retold SESSION_ID into components
 * @param {string} sessionId - Session ID in Love Retold format
 * @returns {Object} Parsed components
 */
export function parseSessionId(sessionId) {
  debugLogger.log('info', 'sessionParser', 'Parsing session ID', { sessionId });
  
  if (!sessionId || typeof sessionId !== 'string') {
    debugLogger.log('error', 'sessionParser', 'Invalid session ID - not a string', { sessionId, type: typeof sessionId });
    throw new Error('SESSION_ID is required and must be a string');
  }
  
  const parts = sessionId.split('-');
  debugLogger.log('info', 'sessionParser', 'Session ID split into parts', { parts, partsCount: parts.length });
  if (parts.length !== 5) {
    debugLogger.log('error', 'sessionParser', 'Invalid session ID format - wrong parts count', { 
      sessionId, 
      parts, 
      expected: 5, 
      actual: parts.length 
    });
    throw new Error('Invalid session ID format. Expected: {random}-{promptId}-{userId}-{storytellerId}-{timestamp}');
  }
  
  const [randomPrefix, promptId, userId, storytellerId, timestampStr] = parts;
  
  debugLogger.log('info', 'sessionParser', 'Extracted session components', {
    randomPrefix, promptId, userId, storytellerId, timestampStr
  });
  
  // Validate components
  if (!randomPrefix || !promptId || !userId || !storytellerId || !timestampStr) {
    debugLogger.log('error', 'sessionParser', 'Empty session components', {
      randomPrefix: !!randomPrefix,
      promptId: !!promptId,
      userId: !!userId,
      storytellerId: !!storytellerId,
      timestampStr: !!timestampStr
    });
    throw new Error('All session ID components must be non-empty');
  }
  
  const timestamp = parseInt(timestampStr);
  debugLogger.log('info', 'sessionParser', 'Parsed timestamp', { timestampStr, timestamp, isValid: !isNaN(timestamp) && timestamp > 0 });
  
  if (isNaN(timestamp) || timestamp <= 0) {
    debugLogger.log('error', 'sessionParser', 'Invalid timestamp', { timestampStr, timestamp });
    throw new Error('Invalid timestamp in session ID');
  }
  
  const result = {
    randomPrefix,     // "j4e19zc"
    promptId,         // "firstspa" (truncated)
    userId,           // "myCtZuIW" (truncated) 
    storytellerId,    // "myCtZuIW" (truncated)
    timestamp         // 1755603545
  };
  
  debugLogger.log('info', 'sessionParser', 'Successfully parsed session ID', { sessionId, result });
  return result;
}

/**
 * Validate Love Retold SESSION_ID format
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean} True if valid format
 */
export function validateSessionId(sessionId) {
  debugLogger.log('info', 'sessionParser', 'Validating session ID', { sessionId });
  
  try {
    const parsed = parseSessionId(sessionId);
    
    // Additional validation checks
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 365 * 24 * 60 * 60; // 365 days in seconds
    
    // Check if timestamp is not too old (365 days)
    if (currentTime - parsed.timestamp > maxAge) {
      return false;
    }
    
    // Check if timestamp is not in future (allow 1 hour tolerance)
    if (parsed.timestamp > currentTime + 3600) {
      return false;
    }
    
    debugLogger.log('info', 'sessionParser', 'Session ID validation successful', { sessionId });
    return true;
  } catch (error) {
    debugLogger.log('error', 'sessionParser', 'Session ID validation failed', { sessionId, error: error.message }, error);
    console.warn('SESSION_ID validation failed:', error.message);
    return false;
  }
}

/**
 * Extract SESSION_ID from URL parameters or path
 * @param {string} url - URL to parse (defaults to current location)
 * @returns {string|null} Session ID if found, null otherwise
 */
export function extractSessionIdFromUrl(url = window.location.href) {
  debugLogger.log('info', 'sessionParser', 'Extracting session ID from URL', { url });
  
  try {
    const urlObj = new URL(url);
    
    // First try query parameters
    const querySessionId = urlObj.searchParams.get('sessionId') || 
                          urlObj.searchParams.get('session_id') || 
                          urlObj.searchParams.get('session');
    debugLogger.log('info', 'sessionParser', 'Checked query parameters', { querySessionId });
    if (querySessionId) {
      debugLogger.log('info', 'sessionParser', 'Found session ID in query parameters', { querySessionId });
      return querySessionId;
    }
    
    // Then try path parameters (Love Retold style)
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    debugLogger.log('info', 'sessionParser', 'Checked path parameters', { pathParts });
    
    if (pathParts.length > 0) {
      const pathSessionId = pathParts[pathParts.length - 1];
      const looksLikeSessionId = pathSessionId.includes('-') && pathSessionId.split('-').length === 5;
      debugLogger.log('info', 'sessionParser', 'Checked last path part', { 
        pathSessionId, 
        looksLikeSessionId,
        hasDashes: pathSessionId.includes('-'),
        dashParts: pathSessionId.split('-').length
      });
      
      // Validate it looks like a session ID (has dashes and timestamp)
      if (looksLikeSessionId) {
        debugLogger.log('info', 'sessionParser', 'Found session ID in path', { pathSessionId });
        return pathSessionId;
      }
    }
    
    debugLogger.log('info', 'sessionParser', 'No session ID found in URL');
    return null;
  } catch (error) {
    debugLogger.log('error', 'sessionParser', 'Failed to parse URL', { url }, error);
    console.error('Failed to parse URL:', error);
    return null;
  }
}

/**
 * Get session age in days
 * @param {Object} sessionComponents - Parsed session components
 * @returns {number} Age in days
 */
export function getSessionAge(sessionComponents) {
  const currentTime = Math.floor(Date.now() / 1000);
  const ageSeconds = currentTime - sessionComponents.timestamp;
  return Math.floor(ageSeconds / (24 * 60 * 60));
}

/**
 * Generate Love Retold storage paths for session
 * @param {Object} sessionComponents - Parsed session components
 * @param {string} sessionId - Full session ID
 * @returns {Object} Storage path templates
 */
export function generateStoragePaths(sessionComponents, sessionId) {
  const { userId } = sessionComponents;
  
  return {
    chunksFolder: `users/${userId}/recordings/${sessionId}/chunks/`,
    chunkPath: (chunkIndex) => `users/${userId}/recordings/${sessionId}/chunks/chunk-${chunkIndex}`,
    finalPath: (extension) => `users/${userId}/recordings/${sessionId}/final/recording.${extension}`,
    thumbnailPath: `users/${userId}/recordings/${sessionId}/thumbnail.jpg`
  };
}