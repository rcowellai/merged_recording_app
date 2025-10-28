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

function PromptReadScreen({ sessionData, onContinue, onBack }) {
  const { tokens } = useTokens();

  return {
    bannerContent: 'Your prompt',
    content: (
      <div style={{ paddingTop: tokens.spacing[12] }}>
        <PromptCard sessionData={sessionData} />
      </div>
    ),
    actions: (
      <Button onClick={onContinue}>
        Next step <FaArrowRight style={{ marginLeft: '12px' }} />
      </Button>
    ),
    onBack
  };
}

export default PromptReadScreen;
