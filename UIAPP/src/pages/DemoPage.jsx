/**
 * DemoPage.jsx
 * ------------
 * Demonstration page showcasing the new UI enhancement features:
 * 1. Central Token System
 * 2. Modern Modal System
 * 3. Layout Flexibility System
 */

import React from 'react';
import NiceModal from '@ebay/nice-modal-react';
import { useTokens } from '../theme/TokenProvider';
import { useLayout, Container, FlexBox, Card, ButtonRow } from '../components/layout';
import ModernConfirmModal from '../components/modals/ModernConfirmModal';

const DemoPage = () => {
  const { tokens, updateTokens } = useTokens();
  const { updateScreenStyles, responsive } = useLayout();

  // Demo: Token System - Change theme colors
  const handleChangeTheme = () => {
    updateTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        accent: {
          bg: '#6366f1', // Indigo
          text: '#ffffff'
        },
        primary: {
          bg: '#f8fafc', // Slate 50
          text: '#1e293b'  // Slate 800
        }
      }
    }));
  };

  // Demo: Modern Modal System
  const handleShowModal = async (variant = 'info') => {
    try {
      const result = await NiceModal.show(ModernConfirmModal, {
        title: "Modern Modal Demo",
        message: `This is a modern ${variant} modal with improved UX, accessibility, and animations.`,
        confirmText: "Awesome!",
        cancelText: "Close",
        variant
      });
      
      if (result) {
        console.log('User confirmed the modal!');
      }
    } catch (error) {
      console.log('Modal was cancelled or closed');
    }
  };

  // Demo: Layout System - Customize screen layout
  const handleCustomizeLayout = () => {
    updateScreenStyles('demo', {
      'max-width': '900px',
      'flex-gap': '32px',
      'card-padding': '32px',
      'button-justify': 'center'
    });
  };

  const handleResetLayout = () => {
    updateScreenStyles('demo', {
      'max-width': '600px',
      'flex-gap': '24px',
      'card-padding': '24px',
      'button-justify': 'space-between'
    });
  };

  return (
    <Container 
      screenId="demo"
      maxWidth={responsive('100%', '600px')}
      padding="32px 16px"
      centerContent
    >
      <FlexBox screenId="demo" gap="32px" align="center">
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2rem',
            fontFamily: tokens.fonts.primary,
            fontWeight: tokens.fonts.weights.semibold,
            color: tokens.colors.primary.text,
            margin: '0 0 12px 0'
          }}>
            🎨 UI Enhancement Demo
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: tokens.colors.textGray,
            margin: '0 0 32px 0',
            lineHeight: 1.5
          }}>
            Demonstrating the new Token System, Modern Modals, and Layout Flexibility
          </p>
        </div>

        {/* Feature 1: Token System */}
        <Card screenId="demo" hover>
          <h3 style={{ 
            fontSize: '1.3rem',
            fontWeight: tokens.fonts.weights.medium,
            color: tokens.colors.card.text,
            margin: '0 0 16px 0'
          }}>
            🎯 Central Token System
          </h3>
          <p style={{ 
            color: tokens.colors.textGray,
            margin: '0 0 20px 0',
            lineHeight: 1.4
          }}>
            Real-time theme customization with centralized design tokens. Changes apply instantly across the entire app.
          </p>
          
          <FlexBox direction="row" gap="12px" justify="center">
            <button
              onClick={handleChangeTheme}
              style={{
                padding: '10px 20px',
                backgroundColor: tokens.colors.accent.bg,
                color: tokens.colors.accent.text,
                border: 'none',
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: tokens.fonts.weights.medium
              }}
            >
              Change Theme
            </button>
            
            <button
              onClick={() => window.open('/admin/tokens', '_blank')}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: tokens.colors.secondary.text,
                border: `1px solid ${tokens.colors.secondary.bg}`,
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: tokens.fonts.weights.medium
              }}
            >
              Open Token Editor
            </button>
          </FlexBox>
        </Card>

        {/* Feature 2: Modern Modal System */}
        <Card screenId="demo" hover>
          <h3 style={{ 
            fontSize: '1.3rem',
            fontWeight: tokens.fonts.weights.medium,
            color: tokens.colors.card.text,
            margin: '0 0 16px 0'
          }}>
            ✨ Modern Modal System
          </h3>
          <p style={{ 
            color: tokens.colors.textGray,
            margin: '0 0 20px 0',
            lineHeight: 1.4
          }}>
            Promise-based modals with modern UI patterns, animations, and accessibility features.
          </p>
          
          <FlexBox direction="row" gap="12px" justify="center" wrap="wrap">
            <button
              onClick={() => handleShowModal('info')}
              style={{
                padding: '8px 16px',
                backgroundColor: tokens.colors.accent.bg,
                color: tokens.colors.accent.text,
                border: 'none',
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Info Modal
            </button>
            
            <button
              onClick={() => handleShowModal('warning')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#fbbf24',
                color: '#ffffff',
                border: 'none',
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Warning Modal
            </button>
            
            <button
              onClick={() => handleShowModal('danger')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Danger Modal
            </button>
          </FlexBox>
        </Card>

        {/* Feature 3: Layout System */}
        <Card screenId="demo" hover>
          <h3 style={{ 
            fontSize: '1.3rem',
            fontWeight: tokens.fonts.weights.medium,
            color: tokens.colors.card.text,
            margin: '0 0 16px 0'
          }}>
            📐 Layout Flexibility System
          </h3>
          <p style={{ 
            color: tokens.colors.textGray,
            margin: '0 0 20px 0',
            lineHeight: 1.4
          }}>
            Screen-specific layout customization without affecting other components. 
            Watch the layout change when you click these buttons!
          </p>
          
          <ButtonRow screenId="demo" variant="split">
            <button
              onClick={handleCustomizeLayout}
              style={{
                padding: '10px 20px',
                backgroundColor: tokens.colors.accent.bg,
                color: tokens.colors.accent.text,
                border: 'none',
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: tokens.fonts.weights.medium
              }}
            >
              Customize Layout
            </button>
            
            <button
              onClick={handleResetLayout}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: tokens.colors.secondary.text,
                border: `1px solid ${tokens.colors.secondary.bg}`,
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: tokens.fonts.weights.medium
              }}
            >
              Reset Layout
            </button>
          </ButtonRow>
        </Card>

        {/* Navigation */}
        <Card screenId="demo" background={tokens.colors.secondary.bg}>
          <h3 style={{ 
            fontSize: '1.1rem',
            fontWeight: tokens.fonts.weights.medium,
            color: tokens.colors.secondary.text,
            margin: '0 0 16px 0',
            textAlign: 'center'
          }}>
            🚀 Ready to Use
          </h3>
          <p style={{ 
            color: tokens.colors.secondary.text,
            margin: '0 0 20px 0',
            lineHeight: 1.4,
            textAlign: 'center',
            fontSize: '0.95rem'
          }}>
            All three enhancement systems are now integrated and ready to use throughout your app!
          </p>
          
          <FlexBox direction="row" gap="12px" justify="center">
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '10px 20px',
                backgroundColor: tokens.colors.accent.bg,
                color: tokens.colors.accent.text,
                border: 'none',
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: tokens.fonts.weights.medium
              }}
            >
              Back to Main App
            </button>
            
            <button
              onClick={() => window.open('/admin/tokens', '_blank')}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: tokens.colors.secondary.text,
                border: `1px solid ${tokens.colors.secondary.text}`,
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: tokens.fonts.weights.medium
              }}
            >
              Token Admin
            </button>
          </FlexBox>
        </Card>

      </FlexBox>
    </Container>
  );
};

export default DemoPage;