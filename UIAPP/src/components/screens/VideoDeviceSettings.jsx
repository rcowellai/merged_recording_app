/**
 * VideoDeviceSettings.jsx
 * ------------------------
 * Settings icon component for video and audio device management.
 * Manages both camera and microphone selection for video recordings.
 *
 * Props:
 * - mediaStream: Current MediaStream for device enumeration
 * - onSwitchDevice: Callback when user selects a different device (deviceId, deviceType)
 * - onOpenSettings: Callback to trigger parent drawer with both audio and video devices
 */

import React from 'react';
import { MdSettings } from 'react-icons/md';
import useMediaDevices from '../../hooks/useMediaDevices';
import { useTokens } from '../../theme/TokenProvider';

function VideoDeviceSettings({ mediaStream, onSwitchDevice, onOpenSettings }) {
  const { tokens } = useTokens();

  // Use generic hooks for both audio and video devices
  const { devices: audioDevices, selectedDeviceId: selectedAudioId, selectDevice: selectAudioDevice } = useMediaDevices('audioinput', mediaStream);
  const { devices: videoDevices, selectedDeviceId: selectedVideoId, selectDevice: selectVideoDevice } = useMediaDevices('videoinput', mediaStream);

  const handleCogClick = () => {
    // Trigger parent drawer with both audio and video device data
    onOpenSettings?.({
      audioDevices: audioDevices,
      videoDevices: videoDevices,
      selectedAudioId: selectedAudioId,
      selectedVideoId: selectedVideoId,
      onSelectAudioDevice: (deviceId) => {
        selectAudioDevice(deviceId); // Update hook state + localStorage
        onSwitchDevice?.(deviceId, 'audioinput'); // Trigger parent stream switch with device type
      },
      onSelectVideoDevice: (deviceId) => {
        selectVideoDevice(deviceId); // Update hook state + localStorage
        onSwitchDevice?.(deviceId, 'videoinput'); // Trigger parent stream switch with device type
      }
    });
  };

  return (
    <MdSettings
      size={20}
      color="rgba(44, 47, 72, 0.85)"
      style={{ cursor: 'pointer' }}
      onClick={handleCogClick}
    />
  );
}

export default VideoDeviceSettings;
