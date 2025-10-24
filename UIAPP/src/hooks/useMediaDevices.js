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
      const filtered = allDevices.filter(d => d.kind === deviceType);

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
      console.log('Device change detected, re-enumerating...');
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
