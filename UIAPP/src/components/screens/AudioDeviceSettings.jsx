/**
 * AudioDeviceSettings.jsx
 * ------------------------
 * Settings icon component for audio device management.
 * This is an actual React component that can use hooks.
 *
 * Extracted from AudioTest to fix React Hooks violation:
 * - AudioTest is a factory function that returns a config object
 * - Factory functions cannot use hooks
 * - This component properly uses hooks for device management
 *
 * Props:
 * - mediaStream: Current MediaStream for device enumeration
 * - onSwitchDevice: Callback when user selects a different device
 */

import React from 'react';
import { MdSettings } from 'react-icons/md';
import NiceModal from '@ebay/nice-modal-react';
import MediaDeviceModal from '../modals/MediaDeviceModal';
import { useTokens } from '../../theme/TokenProvider';
import useMediaDevices from '../../hooks/useMediaDevices';

function AudioDeviceSettings({ mediaStream, onSwitchDevice }) {
  const { tokens } = useTokens();

  // Use generic hook for audio devices - SAFE because this is a React component
  const { devices, selectedDeviceId, selectDevice } = useMediaDevices('audioinput', mediaStream);

  const handleCogClick = () => {
    NiceModal.show(MediaDeviceModal, {
      title: 'Select Microphone',
      devices: devices,
      selectedDeviceId: selectedDeviceId,
      deviceType: 'audioinput',
      onSelectDevice: (deviceId) => {
        selectDevice(deviceId); // Update hook state + localStorage
        onSwitchDevice?.(deviceId); // Trigger parent stream switch (optional chaining for safety)
      }
    });
  };

  return (
    <MdSettings
      size={32}
      color={tokens.colors.primary.DEFAULT}
      style={{ cursor: 'pointer' }}
      onClick={handleCogClick}
    />
  );
}

export default AudioDeviceSettings;
