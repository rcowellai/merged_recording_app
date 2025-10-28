/**
 * ModernConfirmModal.jsx
 * ----------------------
 * Modern confirmation modal using Nice Modal React.
 * Replaces the old ConfirmOverlay with better UX and accessibility.
 */

import React, { useCallback } from 'react';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { useTokens } from '../../theme/TokenProvider';

const ModernConfirmModal = NiceModal.create(({ 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?", 
  confirmText = "Yes",
  cancelText = "No",
  variant = "warning" // warning, danger, info
}) => {
  const modal = useModal();
  const { tokens } = useTokens();

  // Handle confirm action - use useCallback to prevent recreation
  const handleConfirm = useCallback(() => {
    modal.resolve(true);
    modal.hide();
  }, [modal]);

  // Handle cancel action - use useCallback to prevent recreation
  const handleCancel = useCallback(() => {
    modal.resolve(false);
    modal.hide();
  }, [modal]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }, [handleCancel]);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    
    if (modal.visible) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [modal.visible, handleCancel]);

  // Auto-remove modal when it's hidden - only after it was visible first
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

  // Variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: '#dc3545',
          confirmBg: '#dc3545',
          confirmText: '#ffffff'
        };
      case 'info':
        return {
          iconColor: tokens.colors.accent.DEFAULT,
          confirmBg: tokens.colors.accent.DEFAULT,
          confirmText: tokens.colors.accent.foreground
        };
      default: // warning
        return {
          iconColor: '#ffc107',
          confirmBg: tokens.colors.accent.DEFAULT,
          confirmText: tokens.colors.accent.foreground
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <div
      className="modern-modal-overlay"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        padding: '20px',
        animation: modal.visible ? 'modalFadeIn 0.2s ease-out' : 'modalFadeOut 0.2s ease-in'
      }}
    >
      <div
        className="modern-modal-content"
        style={{
          backgroundColor: tokens.colors.background.light,
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          maxWidth: '400px',
          width: '100%',
          padding: '32px 24px 24px',
          textAlign: 'center',
          animation: modal.visible ? 'modalSlideIn 0.3s ease-out' : 'modalSlideOut 0.2s ease-in',
          fontFamily: tokens.fonts.primary
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: `${variantStyles.iconColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '28px',
            color: variantStyles.iconColor
          }}
        >
          {variant === 'danger' ? '⚠️' : variant === 'info' ? 'ℹ️' : '❓'}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.colors.neutral.black,
            margin: '0 0 12px 0',
            lineHeight: 1.3
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: '1rem',
            color: tokens.colors.neutral.gray['01'],
            lineHeight: 1.5,
            margin: '0 0 32px 0'
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: '12px 24px',
              border: `1px solid ${tokens.colors.button.leftHandButton}`,
              borderRadius: tokens.borderRadius.lg,
              backgroundColor: 'transparent',
              color: tokens.colors.neutral.gray['03'],
              fontSize: '1rem',
              fontWeight: tokens.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '90px'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = tokens.colors.button.leftHandButton;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
            autoFocus
          >
            {cancelText}
          </button>
          
          <button
            onClick={handleConfirm}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: tokens.layout.borderRadius,
              backgroundColor: variantStyles.confirmBg,
              color: variantStyles.confirmText,
              fontSize: '1rem',
              fontWeight: tokens.fonts.weights.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '90px'
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = '0.9';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes modalSlideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes modalSlideOut {
          from { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
});

export default ModernConfirmModal;