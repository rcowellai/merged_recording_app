/**
 * nameUtils.js
 * ------------
 * Utility functions for name processing and initial extraction
 */

/**
 * Extract first and last initials from a full name
 * @param {string} fullName - Full name (e.g., "Test Asker")
 * @returns {string} Two initials (e.g., "TA")
 *
 * Examples:
 * - "Test Asker" → "TA"
 * - "John" → "J"
 * - "Mary Jane Watson" → "MW" (first and last)
 * - "" → "?"
 * - null/undefined → "?"
 */
export function extractInitials(fullName) {
  // Handle null, undefined, or empty string
  if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
    return '?';
  }

  // Split name by spaces and filter out empty strings
  const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);

  if (nameParts.length === 0) {
    return '?';
  }

  // Single name: return first initial
  if (nameParts.length === 1) {
    return nameParts[0][0].toUpperCase();
  }

  // Multiple names: return first and last initials
  const firstInitial = nameParts[0][0].toUpperCase();
  const lastInitial = nameParts[nameParts.length - 1][0].toUpperCase();

  return `${firstInitial}${lastInitial}`;
}
