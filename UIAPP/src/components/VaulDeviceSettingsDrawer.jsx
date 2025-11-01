/**
 * VaulDeviceSettingsDrawer.jsx
 * -----------------------------
 * Device settings drawer using Vaul (bottom sheet).
 * Supports both single-device and dual-device (audio + video) selection modes.
 *
 * Design Specifications:
 * - Slides up from bottom (no drag-to-dismiss)
 * - Close X button in top-right
 * - Copy text above device list
 * - Auto-closes after device selection (with error handling)
 * - Scrollable device list if needed
 * - Mobile responsive height adjustment
 * - Dual-device mode: Shows "Select Microphone" and "Select Camera" sections
 */

import React from 'react';
import { Drawer } from 'vaul';
import PropTypes from 'prop-types';
import { FaMicrophone, FaVideo } from 'react-icons/fa';
import { useTokens } from '../theme/TokenProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';

function VaulDeviceSettingsDrawer({
  open,
  onOpenChange,
  // Single-device mode props (backward compatibility)
  devices = [],
  selectedDeviceId,
  onSelectDevice,
  deviceType = 'audioinput',
  // Dual-device mode props (audio + video)
  audioDevices,
  videoDevices,
  selectedAudioId,
  selectedVideoId,
  onSelectAudioDevice,
  onSelectVideoDevice,
}) {
  const { tokens } = useTokens();
  const { isMobile, isTablet } = useBreakpoint();

  // Determine if we need centering wrapper (desktop only)
  // Mobile/Tablet: Direct positioning to avoid transform conflicts and edge artifacts
  // Desktop: Centered with transform for proper positioning
  const needsCentering = !isMobile && !isTablet;

  // Detect dual-device mode
  const isDualMode = audioDevices !== undefined && videoDevices !== undefined;

  // Single-device mode: Determine icon based on device type
  const DeviceIcon = deviceType === 'audioinput' ? FaMicrophone : FaVideo;

  // Single-device mode: Copy text based on device type
  const copyText = deviceType === 'audioinput'
    ? "Let's make sure you can be heard properly."
    : "Let's make sure your camera is working properly.";

  const handleClose = () => {
    onOpenChange(false);
  };

  // Single-device mode handler
  const handleDeviceSelect = async (deviceId) => {
    // Optimization: Don't switch if same device
    if (deviceId === selectedDeviceId) {
      handleClose();
      return;
    }

    try {
      await onSelectDevice(deviceId);
      handleClose(); // Only close on success
    } catch (error) {
      console.error('Device switch failed:', error);
      // Keep drawer open on error - user can try another device
    }
  };

  // Dual-device mode: Audio device handler
  const handleAudioDeviceSelect = async (deviceId) => {
    if (deviceId === selectedAudioId) {
      handleClose();
      return;
    }

    try {
      await onSelectAudioDevice(deviceId);
      handleClose();
    } catch (error) {
      console.error('Audio device switch failed:', error);
    }
  };

  // Dual-device mode: Video device handler
  const handleVideoDeviceSelect = async (deviceId) => {
    if (deviceId === selectedVideoId) {
      handleClose();
      return;
    }

    try {
      await onSelectVideoDevice(deviceId);
      handleClose();
    } catch (error) {
      console.error('Video device switch failed:', error);
    }
  };

  // Helper function to render device section (used in both desktop and mobile)
  const renderDeviceSection = (title, devices, selectedId, onSelect, IconComponent) => (
    <div key={title || 'single-device'} style={{ marginBottom: title ? tokens.spacing[4] : 0 }}>
      {/* Section Header - Only shown when title provided (dual-device mode) */}
      {title && (
        <div style={{
          fontSize: tokens.fontSize.base,
          fontWeight: tokens.fontWeight.semibold,
          color: tokens.colors.primary.DEFAULT,
          marginBottom: tokens.spacing[3],
          paddingLeft: tokens.spacing[1],
        }}>
          {title}
        </div>
      )}

      {/* Empty State */}
      {devices.length === 0 ? (
        <div style={{
          padding: tokens.spacing[4],
          textAlign: 'center',
          color: tokens.colors.neutral.gray['01'],
          fontSize: tokens.fontSize.sm,
        }}>
          No devices found. Please check your connections.
        </div>
      ) : (
        /* Device List */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing[2]
        }}>
          {devices.map((device) => {
            const isSelected = device.deviceId === selectedId;
            const displayLabel = device.label || `Device ${devices.indexOf(device) + 1}`;

            return (
              <button
                key={device.deviceId}
                onClick={() => onSelect(device.deviceId)}
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[3],
                  padding: tokens.spacing[3],
                  borderRadius: tokens.borderRadius.md,
                  backgroundColor: isSelected
                    ? tokens.colors.button.leftHandButton
                    : 'transparent',
                  border: isSelected
                    ? `1px solid ${tokens.colors.onboarding.fontColor}`
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = tokens.colors.button.leftHandButton;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {/* Icon */}
                <IconComponent
                  size={20}
                  color={isSelected ? tokens.colors.primary.DEFAULT : tokens.colors.neutral.gray['01']}
                />

                {/* Label */}
                <div style={{
                  flex: 1,
                  fontSize: tokens.fontSize.base,
                  color: isSelected ? tokens.colors.primary.DEFAULT : tokens.colors.neutral.black,
                  fontWeight: isSelected ? tokens.fontWeight.medium : tokens.fontWeight.normal,
                }}>
                  {displayLabel}
                </div>

                {/* Checkmark */}
                {isSelected && (
                  <div style={{
                    fontSize: tokens.fontSize.xl,
                    color: tokens.colors.primary.DEFAULT,
                  }}>
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      dismissible={false}  // Disable drag-to-dismiss gestures
      shouldScaleBackground={false}  // Cleaner animation without background scaling
    >
      <Drawer.Portal>
        {/* Overlay / Backdrop */}
        <Drawer.Overlay
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: tokens.zIndex.drawerBackdrop, // Vaul drawer backdrop (Layer 8)
          }}
        />

        {needsCentering ? (
          /* Desktop: Centering Wrapper - Handles horizontal centering with transform */
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '768px',
              width: '100%',
              zIndex: tokens.zIndex.drawerContent, // Vaul drawer content (Layer 8)
            }}
          >
            {/* Drawer Content - Vaul animates this independently */}
            <Drawer.Content
              style={{
                position: 'relative',
                maxHeight: '85vh',
                backgroundColor: tokens.colors.neutral.DEFAULT,
                borderRadius: '16px 16px 0 0',
                fontFamily: tokens.fonts.primary,
                outline: 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              aria-labelledby="drawer-title"
              aria-describedby="drawer-description"
            >
          {/* Header with Title and Close Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 4px 24px',
            }}
          >
            {/* Left-aligned title */}
            <Drawer.Title
              id="drawer-title"
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: tokens.colors.primary.DEFAULT,
                margin: 0,
                lineHeight: 1,
                textAlign: 'left',
              }}
            >
              Recording Settings
            </Drawer.Title>

            {/* Right side with close button - borderless X */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: 'auto',
                  height: 'auto',
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: tokens.colors.primary.DEFAULT,
                  lineHeight: 1,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Copy Text - Only shown in single-device mode */}
          {!isDualMode && (
            <div
              style={{
                padding: '4px 24px 16px',
              }}
            >
              <Drawer.Description
                id="drawer-description"
                style={{
                  fontSize: 'clamp(15px, 4vw, 17px)',
                  fontWeight: '400',
                  lineHeight: '1.5',
                  color: tokens.colors.primary.DEFAULT,
                  margin: '0',
                  textAlign: 'left',
                }}
              >
                {copyText}
              </Drawer.Description>
            </div>
          )}

          {/* Device List Container */}
          <div
            style={{
              flex: '1',
              overflowY: 'auto',
              padding: '0 24px 24px',
            }}
          >
            {isDualMode ? (
              /* Dual-device mode: Audio and Video sections */
              <>
                {renderDeviceSection(
                  'Select Microphone',
                  audioDevices,
                  selectedAudioId,
                  handleAudioDeviceSelect,
                  FaMicrophone
                )}
                {renderDeviceSection(
                  'Select Camera',
                  videoDevices,
                  selectedVideoId,
                  handleVideoDeviceSelect,
                  FaVideo
                )}
              </>
            ) : (
              /* Single-device mode: Original device list */
              renderDeviceSection(
                null, // No header in single mode
                devices,
                selectedDeviceId,
                handleDeviceSelect,
                DeviceIcon
              )
            )}
          </div>
        </Drawer.Content>
          </div>
        ) : (
          /* Mobile/Tablet: Direct positioning - No wrapper to avoid transform conflicts */
          <Drawer.Content
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: '768px',
              margin: '0 auto',
              maxHeight: '85vh',
              backgroundColor: tokens.colors.neutral.DEFAULT,
              borderRadius: '16px 16px 0 0',
              fontFamily: tokens.fonts.primary,
              outline: 'none',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: tokens.zIndex.drawerContent, // Vaul drawer content (Layer 8)
            }}
            aria-labelledby="drawer-title"
            aria-describedby="drawer-description"
          >
          {/* Header with Title and Close Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 4px 24px',
            }}
          >
            {/* Left-aligned title */}
            <Drawer.Title
              id="drawer-title"
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: tokens.colors.primary.DEFAULT,
                margin: 0,
                lineHeight: 1,
                textAlign: 'left',
              }}
            >
              Recording Settings
            </Drawer.Title>

            {/* Right side with close button - borderless X */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: 'auto',
                  height: 'auto',
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: tokens.colors.primary.DEFAULT,
                  lineHeight: 1,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Copy Text - Only shown in single-device mode */}
          {!isDualMode && (
            <div
              style={{
                padding: '4px 24px 16px',
              }}
            >
              <Drawer.Description
                id="drawer-description"
                style={{
                  fontSize: 'clamp(15px, 4vw, 17px)',
                  fontWeight: '400',
                  lineHeight: '1.5',
                  color: tokens.colors.primary.DEFAULT,
                  margin: '0',
                  textAlign: 'left',
                }}
              >
                {copyText}
              </Drawer.Description>
            </div>
          )}

          {/* Device List Container */}
          <div
            style={{
              flex: '1',
              overflowY: 'auto',
              padding: '0 24px 24px',
            }}
          >
            {isDualMode ? (
              /* Dual-device mode: Audio and Video sections */
              <>
                {renderDeviceSection(
                  'Select Microphone',
                  audioDevices,
                  selectedAudioId,
                  handleAudioDeviceSelect,
                  FaMicrophone
                )}
                {renderDeviceSection(
                  'Select Camera',
                  videoDevices,
                  selectedVideoId,
                  handleVideoDeviceSelect,
                  FaVideo
                )}
              </>
            ) : (
              /* Single-device mode: Original device list */
              renderDeviceSection(
                null, // No header in single mode
                devices,
                selectedDeviceId,
                handleDeviceSelect,
                DeviceIcon
              )
            )}
          </div>
        </Drawer.Content>
        )}
      </Drawer.Portal>
    </Drawer.Root>
  );
}

VaulDeviceSettingsDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  // Single-device mode props
  devices: PropTypes.array,
  selectedDeviceId: PropTypes.string,
  onSelectDevice: PropTypes.func,
  deviceType: PropTypes.oneOf(['audioinput', 'videoinput']),
  // Dual-device mode props
  audioDevices: PropTypes.array,
  videoDevices: PropTypes.array,
  selectedAudioId: PropTypes.string,
  selectedVideoId: PropTypes.string,
  onSelectAudioDevice: PropTypes.func,
  onSelectVideoDevice: PropTypes.func,
};

export default VaulDeviceSettingsDrawer;
