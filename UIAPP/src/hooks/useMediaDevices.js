/**
 * useMediaDevices.js
 * ------------------
 * Generic hook for managing media device enumeration and selection.
 * Supports audio input, video input, and audio output devices.
 *
 * Features:
 * - Auto-enumerates when permission granted (mediaStream exists)
 * - Listens for devicechange events (hotplug detection)
 * - Persists selection to localStorage
 * - Handles empty labels (before permission)
 * - Sets intelligent default (first non-communications device)
 *
 * @param {string} deviceType - 'audioinput' | 'videoinput' | 'audiooutput'
 * @param {MediaStream} mediaStream - Current MediaStream (triggers enumeration)
 * @returns {Object} - { devices, selectedDeviceId, selectDevice, isEnumerating, refreshDevices }
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Filter out Windows virtual device aliases to prevent duplicates in UI.
 * Windows creates "Default" and "Communications" aliases that map to physical devices.
 *
 * @param {MediaDeviceInfo[]} devices - Array of devices from enumerateDevices()
 * @returns {MediaDeviceInfo[]} - Filtered array with only physical devices
 */
function filterVirtualDevices(devices) {
  return devices.filter(device => {
    const label = device.label.toLowerCase();

    // Remove Windows virtual aliases
    // These start with "default -" or "communications -"
    if (label.startsWith('default -') || label.startsWith('communications -')) {
      return false;
    }

    return true;
  });
}

/**
 * Clean device labels by removing technical identifiers.
 * Removes USB vendor/product IDs like "(047f:02ee)" and other technical suffixes.
 *
 * @param {string} label - Original device label from MediaDeviceInfo
 * @returns {string} - Cleaned label with only human-friendly name
 */
function cleanDeviceLabel(label) {
  // Remove USB vendor/product IDs like "(047f:02ee)"
  // Pattern: parentheses containing 4 hex digits, colon, 4 hex digits
  let cleaned = label.replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)\s*$/, '');

  // Remove other common technical suffixes in parentheses at the end
  // But preserve meaningful info like "Built-in" or manufacturer names
  // Only remove if it looks like a technical ID (numbers, short codes)
  cleaned = cleaned.replace(/\s*\([0-9a-fA-F-]+\)\s*$/, '');

  return cleaned.trim();
}

function useMediaDevices(deviceType, mediaStream) {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isEnumerating, setIsEnumerating] = useState(false);

  // Enumerate devices when mediaStream exists (permission granted)
  // FIXED: Race condition and infinite loop issues resolved
  const enumerateDevices = useCallback(async () => {
    if (!mediaStream) return;

    try {
      setIsEnumerating(true);
      const allDevices = await navigator.mediaDevices.enumerateDevices();

      // Filter by device type (audioinput, videoinput, audiooutput)
      const typeFiltered = allDevices.filter(d => d.kind === deviceType);

      // Filter out Windows virtual aliases (Default/Communications)
      const virtualFiltered = filterVirtualDevices(typeFiltered);

      // Clean device labels (remove technical IDs while preserving original deviceId)
      const filtered = virtualFiltered.map(device => ({
        ...device,
        label: cleanDeviceLabel(device.label),
        // Preserve original properties
        deviceId: device.deviceId,
        kind: device.kind,
        groupId: device.groupId
      }));

      setDevices(filtered);

      // Check localStorage for saved preference (runs AFTER enumeration)
      const storageKey = `preferred-${deviceType}`;
      const savedDeviceId = localStorage.getItem(storageKey);

      if (savedDeviceId && filtered.some(d => d.deviceId === savedDeviceId)) {
        // Saved preference always takes priority
        setSelectedDeviceId(savedDeviceId);
      } else {
        // Use functional update to avoid stale closure and infinite loop
        setSelectedDeviceId(current => {
          // Keep current device if still available (handles device changes)
          if (current && filtered.some(d => d.deviceId === current)) {
            return current;
          }
          // Set default device on initialization
          if (filtered.length > 0) {
            const defaultDevice = filtered.find(d =>
              !d.label.toLowerCase().includes('communications')
            ) || filtered[0];
            return defaultDevice.deviceId;
          }
          return null;
        });
      }
    } catch (error) {
      console.error(`Failed to enumerate ${deviceType} devices:`, error);
    } finally {
      setIsEnumerating(false);
    }
  }, [mediaStream, deviceType]); // selectedDeviceId removed to prevent infinite loop

  // Enumerate on mount and when stream changes
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  // Listen for device changes (plug/unplug)
  useEffect(() => {
    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  // Save device preference
  const selectDevice = useCallback((deviceId) => {
    setSelectedDeviceId(deviceId);
    const storageKey = `preferred-${deviceType}`;
    localStorage.setItem(storageKey, deviceId);
  }, [deviceType]);

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    isEnumerating,
    refreshDevices: enumerateDevices
  };
}

export default useMediaDevices;
