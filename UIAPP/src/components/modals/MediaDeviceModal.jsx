/**
 * MediaDeviceModal.jsx
 * ---------------------
 * Reusable modal for selecting media input devices (audio/video).
 * Uses Nice Modal React for consistent modal management.
 *
 * Features:
 * - Generic design works for audioinput, videoinput, audiooutput
 * - Token-based styling with adaptive icons
 * - Keyboard accessible (ESC to close)
 * - Mobile responsive (90% width, max 500px)
 * - Hover states and transitions
 *
 * @param {string} title - Modal title (e.g., "Select Microphone")
 * @param {MediaDeviceInfo[]} devices - Available devices from useMediaDevices
 * @param {string} selectedDeviceId - Currently selected device ID
 * @param {string} deviceType - 'audioinput' | 'videoinput' | 'audiooutput'
 * @param {function} onSelectDevice - Callback when device selected
 */

import React, { useCallback } from 'react';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { FaMicrophone, FaVideo } from 'react-icons/fa';
import { useTokens } from '../../theme/TokenProvider';

const MediaDeviceModal = NiceModal.create(({
  title = "Select Device",
  devices = [],
  selectedDeviceId = null,
  deviceType = 'audioinput',
  onSelectDevice = null
}) => {
  const modal = useModal();
  const { tokens } = useTokens();

  // Icon based on device type
  const DeviceIcon = deviceType === 'audioinput' ? FaMicrophone : FaVideo;

  const handleSelect = useCallback((deviceId) => {
    if (onSelectDevice) {
      onSelectDevice(deviceId);
    }
    modal.hide();
  }, [modal, onSelectDevice]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      modal.hide();
    }
  }, [modal]);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.hide();
      }
    };

    if (modal.visible) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [modal.visible, modal]);

  // Auto-remove modal when it's hidden - prevents memory leaks
  React.useEffect(() => {
    if (!modal.visible && modal.id) {
      const timer = setTimeout(() => {
        try {
          modal.remove();
        } catch (error) {
          // Modal might already be removed, ignore error
          console.debug('Modal already removed:', error);
        }
      }, 300); // Wait for exit animation

      return () => clearTimeout(timer);
    }
  }, [modal.visible, modal.id, modal]);

  if (!modal.visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: tokens.colors.background.light,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing[6],
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <h2 style={{
          margin: `0 0 ${tokens.spacing[4]} 0`,
          fontSize: tokens.fontSize['2xl'],
          fontWeight: tokens.fontWeight.semibold,
          color: tokens.colors.neutral.black
        }}>
          {title}
        </h2>

        {/* Device List */}
        {devices.length === 0 ? (
          <div style={{
            padding: tokens.spacing[4],
            textAlign: 'center',
            color: tokens.colors.neutral.gray['01']
          }}>
            No devices found. Please check your connections.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
            {devices.map((device) => {
              const isSelected = device.deviceId === selectedDeviceId;
              const displayLabel = device.label || `Device ${devices.indexOf(device) + 1}`;

              return (
                <div
                  key={device.deviceId}
                  onClick={() => handleSelect(device.deviceId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing[3],
                    padding: tokens.spacing[3],
                    borderRadius: tokens.borderRadius.md,
                    backgroundColor: isSelected
                      ? tokens.colors.primary.DEFAULT + '20'
                      : 'transparent',
                    border: isSelected
                      ? `2px solid ${tokens.colors.primary.DEFAULT}`
                      : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = tokens.colors.background.gray;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Icon */}
                  <DeviceIcon
                    size={20}
                    color={isSelected ? tokens.colors.primary.DEFAULT : tokens.colors.neutral.gray['01']}
                  />

                  {/* Label */}
                  <div style={{
                    flex: 1,
                    fontSize: tokens.fontSize.base,
                    color: isSelected ? tokens.colors.primary.DEFAULT : tokens.colors.neutral.black,
                    fontWeight: isSelected ? tokens.fontWeight.medium : tokens.fontWeight.normal
                  }}>
                    {displayLabel}
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <div style={{
                      fontSize: tokens.fontSize.xl,
                      color: tokens.colors.primary.DEFAULT
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default MediaDeviceModal;
