/**
 * Love Retold SESSION_ID Parser
 * Format: {random}-{promptId}-{userId}-{storytellerId}-{timestamp}
 * Example: abc7d9f-firstdat-user123a-uncle456-1736604000
 */

/**
 * Parse Love Retold SESSION_ID into components
 * @param {string} sessionId - Session ID in Love Retold format
 * @returns {Object} Parsed components
 */
export function parseSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('SESSION_ID is required and must be a string');
  }
  
  const parts = sessionId.split('-');
  if (parts.length !== 5) {
    throw new Error('Invalid session ID format. Expected: {random}-{promptId}-{userId}-{storytellerId}-{timestamp}');
  }
  
  const [randomPrefix, promptId, userId, storytellerId, timestampStr] = parts;
  
  // Validate components
  if (!randomPrefix || !promptId || !userId || !storytellerId || !timestampStr) {
    throw new Error('All session ID components must be non-empty');
  }
  
  const timestamp = parseInt(timestampStr);
  if (isNaN(timestamp) || timestamp <= 0) {
    throw new Error('Invalid timestamp in session ID');
  }
  
  return {
    randomPrefix,     // "a7b8c9d"
    promptId,         // "firstdat" (truncated)
    userId,           // "user123a" (truncated) 
    storytellerId,    // "uncle456" (truncated)
    timestamp         // 1736604000
  };
}

/**
 * Validate Love Retold SESSION_ID format
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean} True if valid format
 */
export function validateSessionId(sessionId) {
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
    
    return true;
  } catch (error) {
    console.warn('SESSION_ID validation failed:', error.message);
    return false;
  }
}

/**
 * Extract SESSION_ID from URL parameters
 * @param {string} url - URL to parse (defaults to current location)
 * @returns {string|null} Session ID if found, null otherwise
 */
export function extractSessionIdFromUrl(url = window.location.href) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('session');
  } catch (error) {
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