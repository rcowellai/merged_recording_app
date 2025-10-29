/**
 * VideoDeviceSettings.jsx
 * ------------------------
 * Settings icon component for video device management.
 * Parallel to AudioDeviceSettings for camera selection.
 *
 * Props:
 * - mediaStream: Current MediaStream for device enumeration
 * - onSwitchDevice: Callback when user selects a different device
 * - onOpenSettings: Callback to trigger parent drawer
 */

import React from 'react';
import { MdSettings } from 'react-icons/md';
import useMediaDevices from '../../hooks/useMediaDevices';

function VideoDeviceSettings({ mediaStream, onSwitchDevice, onOpenSettings }) {

  // Use generic hook for video devices
  const { devices, selectedDeviceId, selectDevice } = useMediaDevices('videoinput', mediaStream);

  const handleCogClick = () => {
    // Trigger parent drawer with device data and callbacks
    onOpenSettings?.({
      devices: devices,
      selectedDeviceId: selectedDeviceId,
      deviceType: 'videoinput',
      onSelectDevice: (deviceId) => {
        selectDevice(deviceId); // Update hook state + localStorage
        onSwitchDevice?.(deviceId); // Trigger parent stream switch (optional chaining for safety)
      }
    });
  };

  return (
    <MdSettings
      size={32}
      color="rgba(44, 47, 72, 0.85)"
      style={{ cursor: 'pointer' }}
      onClick={handleCogClick}
    />
  );
}

export default VideoDeviceSettings;
