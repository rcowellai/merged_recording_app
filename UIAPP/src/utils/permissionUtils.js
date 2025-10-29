/**
 * permissionUtils.js
 * ------------------
 * Cross-browser permission detection utilities for camera and microphone.
 * Uses hybrid approach: Permissions API (Chrome, Firefox, Edge) with
 * enumerateDevices fallback (Safari).
 *
 * IMPROVEMENT: Enhanced false positive mitigation for enumerateDevices fallback
 */

/**
 * Check if camera or microphone permission is already granted
 * Works across all browsers including Safari
 *
 * @param {string} type - 'camera' or 'microphone'
 * @returns {Promise<boolean>} - true if permission granted, false otherwise
 */
export async function hasMediaPermission(type) {
  const permissionName = type === 'camera' ? 'camera' : 'microphone';
  const deviceKind = type === 'camera' ? 'videoinput' : 'audioinput';

  // Method 1: Try Permissions API (Chrome, Firefox, Edge)
  try {
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      const result = await navigator.permissions.query({ name: permissionName });

      if (result.state === 'granted') {
        console.log(`[Permission] ${type} granted via Permissions API`);
        return true; // HIGH CONFIDENCE
      }

      if (result.state === 'denied') {
        console.log(`[Permission] ${type} denied via Permissions API`);
        return false; // HIGH CONFIDENCE
      }

      // state === 'prompt' - fall through to Method 2 for confirmation
    }
  } catch (error) {
    // Safari or permission query not supported - fall through
    console.log(`[Permission] Permissions API not available, using enumerateDevices fallback`);
  }

  // Method 2: enumerateDevices with STRICT validation to reduce false positives
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const relevantDevices = devices.filter(d => d.kind === deviceKind);

    // STRICTER CHECK: Require MULTIPLE devices with labels OR one with specific label
    const devicesWithLabels = relevantDevices.filter(d => d.label && d.label !== '');

    // FALSE POSITIVE MITIGATION:
    // - Require at least 2 devices with labels OR
    // - 1 device with label that's NOT just "Default" or "Communications"
    // This reduces false positives where browsers return generic labels without permission
    const hasReliableLabel = devicesWithLabels.length >= 2 ||
      (devicesWithLabels.length === 1 &&
       !devicesWithLabels[0].label.match(/^(Default|Communications)$/i));

    if (hasReliableLabel) {
      console.log(`[Permission] ${type} likely granted via enumerateDevices (Safari mode)`);
      return true; // MEDIUM CONFIDENCE
    }

    console.log(`[Permission] ${type} not granted (no reliable labels)`);
    return false; // CONSERVATIVE: Assume not granted
  } catch (error) {
    console.error(`[Permission] enumerateDevices failed:`, error);
    return false; // SAFE: Assume not granted on error
  }
}

/**
 * Check both camera and microphone permissions for video mode
 * Video mode requires BOTH permissions
 *
 * @returns {Promise<boolean>} - true if both permissions granted
 */
export async function hasVideoPermissions() {
  const [camera, microphone] = await Promise.all([
    hasMediaPermission('camera'),
    hasMediaPermission('microphone')
  ]);

  return camera && microphone;
}
