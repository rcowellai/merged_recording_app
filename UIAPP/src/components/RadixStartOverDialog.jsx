/**
 * RadixStartOverDialog.jsx
 * ------------------------
 * Start Over confirmation dialog using Radix UI Dialog.
 * Replaces ConfirmOverlay and Nice Modal implementation while preserving exact behavior.
 */

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import PropTypes from 'prop-types';
import { useTokens } from '../theme/TokenProvider';
import DeleteConfirmation from '../Assets/Delete_confirmation.png';

function RadixStartOverDialog({ open, onOpenChange, onConfirm, onCancel }) {
  const { tokens } = useTokens();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(614px, calc(100vw - 32px))',
            minHeight: 'auto',
            maxHeight: 'calc(100vh - 64px)',
            maxWidth: 'min(614px, calc(100vw - 32px))',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 10001,
            fontFamily: tokens.fonts.primary,
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          aria-labelledby="dialog-title"
        >
          {/* Dialog Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              padding: '24px 24px 0 24px',
              marginBottom: '24px'
            }}
          >
            {/* Left spacer */}
            <div></div>
            
            {/* Centered title */}
            <Dialog.Title
              id="dialog-title"
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#2C2F48',
                margin: 0,
                lineHeight: 1,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              Start Over?
            </Dialog.Title>
            
            {/* Right side with close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Dialog.Close asChild>
                <button
                  type="button"
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: 'transparent',
                    border: '2px solid #E5E7EB',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#666',
                    lineHeight: 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#F3F4F6';
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = '#E5E7EB';
                  }}
                  aria-label="Close"
                  onClick={handleCancel}
                >
                  ×
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Dialog Content */}
          <div
            style={{
              padding: '0',
              flex: '1',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}
          >
            <div
              className="dialog-content-padding"
              style={{
                padding: 'min(32px, 5vw)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px'
              }}
            >
              {/* Delete Confirmation Illustration */}
              <img
                src={DeleteConfirmation}
                alt="Delete confirmation illustration"
                style={{
                  maxWidth: 'min(240px, 55vw)',
                  height: 'auto',
                  width: '100%',
                  display: 'block',
                  flexShrink: 0
                }}
              />

              {/* Confirmation Text */}
              <Dialog.Description
                style={{
                  fontSize: 'clamp(15px, 4vw, 17px)',
                  fontWeight: '400',
                  lineHeight: '1.5',
                  color: '#666666',
                  margin: '0',
                  textAlign: 'center',
                  padding: '0 16px',
                  maxWidth: '400px'
                }}
              >
                Are you sure you want to start over? This will discard your current recording.
              </Dialog.Description>
            </div>
          </div>

          {/* Dialog Footer */}
          <div
            className="dialog-footer"
            style={{
              marginTop: 'auto',
              padding: 'min(32px, 5vw)',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '16px',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              style={{
                height: '60px',
                padding: '0 32px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: tokens.colors.background.promptCard,
                color: tokens.colors.primary.DEFAULT,
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                minWidth: isMobile ? '100%' : 'auto',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = tokens.colors.border.neutral;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = tokens.colors.background.promptCard;
              }}
              autoFocus
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                height: '60px',
                padding: '0 32px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#2C2F48',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                minWidth: isMobile ? '100%' : 'auto',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1F2937';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#2C2F48';
              }}
            >
              Yes, Start Over
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

RadixStartOverDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default RadixStartOverDialog;