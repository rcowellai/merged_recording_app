/**
 * PromptCard.jsx
 * -------------
 * Displays the main question or prompt text on a stylized
 * "card." Ensures consistent branding and layout for
 * the prompt itself.
 */

import React from 'react';
import { useTokens } from '../theme/TokenProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';

function PromptCard({ sessionData, customBackgroundColor, customQuestionColor }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  // Extract the prompt text and storyteller name from session data
  // Handle both formats: sessionData.sessionData and sessionData.session
  const promptText = sessionData?.sessionData?.questionText ||
                     sessionData?.session?.promptText ||
                     sessionData?.promptText;

  // Use the new askerName field from Love Retold (deployed Jan 20, 2025)
  // Falls back to storytellerName for legacy sessions, then 'Unknown'
  const askerName = sessionData?.sessionData?.askerName ||
                    sessionData?.session?.askerName ||
                    sessionData?.askerName ||
                    sessionData?.sessionData?.storytellerName ||
                    sessionData?.session?.storytellerName ||
                    sessionData?.storytellerName ||
                    'Unknown';

  // If no prompt text is available, show error state
  // This should not happen if validation is working correctly
  if (!promptText) {
    return (
      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '500px',
        margin: '0 auto',
        boxSizing: 'border-box',
        backgroundColor: tokens.colors.background.light,
        maxHeight: '100%',
        minHeight: '300px',
        borderRadius: tokens.borderRadius.xl,
        boxShadow: tokens.shadows.lg,
        padding: tokens.spacing[1],
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: `${tokens.spacing[4]} ${tokens.spacing[4]}`
        }}>
          <div style={{
            fontSize: isMobile ? tokens.fontSize['2xl'] : tokens.fontSize['2xl'],
            fontWeight: isMobile ? tokens.fontWeight.normal : tokens.fontWeight.normal,
            lineHeight: isMobile ? 1.4 : 1.4,
            margin: 0,
            padding: 0,
            color: tokens.colors.status.error,
            textAlign: 'center'
          }}>
            Unable to load prompt details
          </div>
          <div style={{
            fontSize: isMobile ? tokens.fontSize.lg : tokens.fontSize.lg,
            fontWeight: isMobile ? tokens.fontWeight.normal : tokens.fontWeight.normal,
            lineHeight: isMobile ? 1.2 : 1.2,
            marginBottom: tokens.spacing[5],
            color: tokens.colors.onboarding.fontColor,
            textAlign: 'center'
          }}>
            Please refresh the page or contact support
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: isMobile ? '100%' : '500px',
      margin: '0 auto',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Decorative Quote Icon */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '40px',
        height: '40px',
        background: tokens.colors.neutral.DEFAULT,
        border: `1px solid ${tokens.colors.border.neutral}`,
        borderRadius: tokens.borderRadius.full,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tokens.colors.clay.DEFAULT,
        boxShadow: '0 4px 12px rgba(44, 47, 72, 0.08)',
        zIndex: 10
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
        </svg>
      </div>

      {/* Main Card */}
      <div style={{
        backgroundColor: customBackgroundColor || tokens.colors.background.light,
        maxHeight: '100%',
        minHeight: '300px',
        borderRadius: tokens.borderRadius.lg,
        boxShadow: '0 20px 40px -10px rgba(44, 47, 72, 0.1)',
        padding: tokens.spacing[1],
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.02)'
      }}>
        <div style={{
          padding: `${tokens.spacing[6]} ${tokens.spacing[8]} ${tokens.spacing[4]} ${tokens.spacing[8]}`
        }}>
          {/* Subheading => "{Name} asked" - Pill-shaped styled */}
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: tokens.colors.neutral.DEFAULT,
            borderRadius: tokens.borderRadius.full,
            marginBottom: tokens.spacing[6]
          }}>
            <span style={{
              fontSize: tokens.fontSize.xs,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: tokens.colors.onboarding.fontColor,
              fontWeight: tokens.fontWeight.semibold
            }}>
              Question from <span style={{
                color: tokens.colors.primary.DEFAULT,
                fontWeight: tokens.fontWeight.bold
              }}>{askerName}</span>
            </span>
          </div>

          {/* Main question => heading */}
          <div style={{
            fontFamily: tokens.fonts.secondary,
            fontSize: isMobile ? tokens.fontSize['2xl'] : tokens.fontSize['2xl'],
            fontWeight: tokens.fontWeight.medium,
            lineHeight: 1.3,
            margin: 0,
            padding: 0,
            color: customQuestionColor || '#2A2A2A'
          }}>
            {promptText}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromptCard;
