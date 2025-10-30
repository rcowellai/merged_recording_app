/**
 * VaulDeviceSettingsDrawer.jsx
 * -----------------------------
 * Device settings drawer using Vaul (bottom sheet).
 * Supports both audio and video device selection.
 *
 * Design Specifications:
 * - Slides up from bottom (no drag-to-dismiss)
 * - Close X button in top-right
 * - Copy text above device list
 * - Auto-closes after device selection (with error handling)
 * - Scrollable device list if needed
 * - Mobile responsive height adjustment
 */

import React from 'react';
import { Drawer } from 'vaul';
import PropTypes from 'prop-types';
import { FaMicrophone, FaVideo } from 'react-icons/fa';
import { useTokens } from '../theme/TokenProvider';

function VaulDeviceSettingsDrawer({
  open,
  onOpenChange,
  devices = [],
  selectedDeviceId,
  onSelectDevice,
  deviceType = 'audioinput'
}) {
  const { tokens } = useTokens();

  // Mobile detection for responsive height adjustment (future enhancement)
  // const [isMobile, setIsMobile] = useState(false);
  // useEffect(() => {
  //   const checkScreenSize = () => {
  //     setIsMobile(window.innerWidth <= 480);
  //   };
  //   checkScreenSize();
  //   window.addEventListener('resize', checkScreenSize);
  //   return () => window.removeEventListener('resize', checkScreenSize);
  // }, []);

  // Determine icon based on device type
  const DeviceIcon = deviceType === 'audioinput' ? FaMicrophone : FaVideo;

  // Copy text based on device type
  const copyText = deviceType === 'audioinput'
    ? "Let's make sure you can be heard properly."
    : "Let's make sure your camera is working properly.";

  const handleClose = () => {
    onOpenChange(false);
  };

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
            zIndex: 10000,
          }}
        />

        {/* Centering Wrapper - Handles horizontal centering without transform conflicts */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '768px',
            width: '100%',
            zIndex: 10001,
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

          {/* Copy Text */}
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

          {/* Device List Container */}
          <div
            style={{
              flex: '1',
              overflowY: 'auto',
              padding: '0 24px 24px',
            }}
          >
            {/* Empty State */}
            {devices.length === 0 ? (
              <div style={{
                padding: tokens.spacing[4],
                textAlign: 'center',
                color: tokens.colors.neutral.gray['01'],
                fontSize: tokens.fontSize.base,
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
                  const isSelected = device.deviceId === selectedDeviceId;
                  const displayLabel = device.label || `Device ${devices.indexOf(device) + 1}`;

                  return (
                    <button
                      key={device.deviceId}
                      onClick={() => handleDeviceSelect(device.deviceId)}
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
                      <DeviceIcon
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
        </Drawer.Content>
        </div>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

VaulDeviceSettingsDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  devices: PropTypes.array.isRequired,
  selectedDeviceId: PropTypes.string,
  onSelectDevice: PropTypes.func.isRequired,
  deviceType: PropTypes.oneOf(['audioinput', 'videoinput']).isRequired,
};

export default VaulDeviceSettingsDrawer;
