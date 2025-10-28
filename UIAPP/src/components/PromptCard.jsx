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
        margin: 0,
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
            fontSize: isMobile ? tokens.fontSize.xl : tokens.fontSize.xl,
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
            fontSize: isMobile ? tokens.fontSize.base : tokens.fontSize.base,
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
      margin: 0,
      boxSizing: 'border-box',
      backgroundColor: customBackgroundColor || tokens.colors.background.light,
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
        {/* Subheading => "{Name} asked" */}
        <div style={{
          fontSize: isMobile ? tokens.fontSize.base : tokens.fontSize.base,
          fontWeight: isMobile ? tokens.fontWeight.medium : tokens.fontWeight.normal,
          lineHeight: isMobile ? 1.2 : 1.2,
          marginBottom: tokens.spacing[5],
          color: tokens.colors.onboarding.fontColor
        }}>
          {askerName} asked
        </div>

        {/* Main question => heading */}
        <div style={{
          fontSize: isMobile ? tokens.fontSize.lg : tokens.fontSize.xl,
          fontWeight: isMobile ? tokens.fontWeight.normal : tokens.fontWeight.normal,
          lineHeight: isMobile ? 1.4 : 1.4,
          margin: 0,
          padding: 0,
          color: customQuestionColor || tokens.colors.primary.DEFAULT
        }}>
          {promptText}
        </div>
      </div>
    </div>
  );
}

export default PromptCard;
