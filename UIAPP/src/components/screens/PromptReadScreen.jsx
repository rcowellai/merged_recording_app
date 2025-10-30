/**
 * PromptReadScreen.jsx
 * --------------------
 * First screen in recording flow - displays prompt with Continue button.
 * User reads the prompt before choosing audio or video mode.
 *
 * Returns standard screen format:
 * - timer: null
 * - content: PromptCard with session data
 * - actions: Continue button
 */

import React from 'react';
import { FaArrowRight } from 'react-icons/fa';
import PromptCard from '../PromptCard';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint';

/**
 * PromptReadScreenContent - Inner component that safely uses hooks
 */
function PromptReadScreenContent({ sessionData }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  return (
    <div style={{
      paddingTop: isMobile ? tokens.spacing[12] : 0,
      display: isMobile ? 'block' : 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      flex: isMobile ? 'none' : 1,
      // DEBUG: PromptReadScreenContent wrapper
      border: '3px solid blue'
    }}>
      <PromptCard sessionData={sessionData} />
    </div>
  );
}

function PromptReadScreen({ sessionData, onContinue, onBack }) {
  return {
    bannerContent: 'Your prompt',
    content: <PromptReadScreenContent sessionData={sessionData} />,
    actions: (
      <Button onClick={onContinue}>
        Next step <FaArrowRight style={{ marginLeft: '12px' }} />
      </Button>
    ),
    onBack
  };
}

export default PromptReadScreen;
