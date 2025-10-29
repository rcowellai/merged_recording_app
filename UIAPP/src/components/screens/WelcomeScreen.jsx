/**
 * WelcomeScreen.jsx
 * -----------------
 * First screen users see when landing on the recording app.
 * Contains animated welcome message and continue button.
 *
 * Desktop/Tablet: Primary blue background (#2C2F48) fills page-container
 * Mobile: Background image (Auth_Image.png) fills page-container
 *
 * Renders:
 * - WelcomeMessage: Animated "Welcome {Name}," + "It's time to share another memory"
 * - Continue button: Advances to mode selection screen
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTokens } from '../../theme/TokenProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Button } from '../ui';

/**
 * WelcomeMessage Component
 * Displays animated typewriter-style welcome text
 */
function WelcomeMessage({ sessionData }) {
  const { tokens } = useTokens();

  // Extract askerName using same logic as PromptCard
  const askerName = sessionData?.sessionData?.askerName ||
                    sessionData?.session?.askerName ||
                    sessionData?.askerName ||
                    sessionData?.sessionData?.storytellerName ||
                    sessionData?.session?.storytellerName ||
                    sessionData?.storytellerName ||
                    'Unknown';

  // All words to display (split into array)
  const line1Words = useMemo(() => ['Welcome', `${askerName},`], [askerName]);
  const line2Words = useMemo(() => ["It's", 'time', 'to', 'share', 'another', 'memory.'], []);

  const [displayedWords, setDisplayedWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const allWords = useMemo(() => [...line1Words, ...line2Words], [line1Words, line2Words]);
  const line1Length = line1Words.length;

  useEffect(() => {
    // Typewriter effect - show one word at a time
    if (currentWordIndex < allWords.length) {
      // Add 1s pause after line 1 completes (after first 2 words)
      const isAfterLine1 = currentWordIndex === line1Length;
      const delay = isAfterLine1 ? 1000 : 200; // 1000ms pause after line 1, otherwise 200ms

      const timer = setTimeout(() => {
        setDisplayedWords(prev => [...prev, allWords[currentWordIndex]]);
        setCurrentWordIndex(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [currentWordIndex, allWords, line1Length]);

  // Split displayed words into two lines
  const line2Display = displayedWords.slice(line1Length).join(' ');

  // Inline keyframe animation via style tag
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes wordFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      textAlign: 'left',
      flex: 1,
      padding: tokens.spacing[5],
      color: tokens.colors.primary.foreground,
      marginTop: tokens.spacing[12]
    }}>
      <div style={{
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.normal,
        lineHeight: 1.4,
        marginBottom: tokens.spacing[4],
        minHeight: '1.4em',
        width: '100%'
      }}>
        {displayedWords.slice(0, line1Length).map((word, index) => (
          <React.Fragment key={`word-${index}`}>
            <span style={{
              display: 'inline-block',
              animation: 'wordFadeIn 0.5s ease-in forwards'
            }}>{word}</span>
            {index < line1Length - 1 && ' '}
          </React.Fragment>
        ))}
      </div>
      {line2Display && (
        <div style={{
          fontSize: tokens.fontSize.xl,
          fontWeight: tokens.fontWeight.normal,
          lineHeight: 1.4,
          marginBottom: tokens.spacing[2],
          minHeight: '1.4em',
          width: '100%'
        }}>
          {displayedWords.slice(line1Length).map((word, index) => (
            <React.Fragment key={`word-${line1Length + index}`}>
              <span style={{
                display: 'inline-block',
                animation: 'wordFadeIn 0.5s ease-in forwards'
              }}>{word}</span>
              {index < line2Words.length - 1 && ' '}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * WelcomeScreen Component
 * Main welcome screen container with message and button
 *
 * Returns standard screen format:
 * - timer: null (welcome screen has no timer)
 * - content: Animated welcome message
 * - actions: Continue button (transparent with white border for mobile background image)
 */
function WelcomeScreen({ sessionData, onContinue }) {
  const { tokens } = useTokens();

  return {
    timer: null,
    content: <WelcomeMessage sessionData={sessionData} />,
    actions: (
      <Button
        onClick={onContinue}
        style={{
          backgroundColor: 'transparent',
          border: `0.5px solid ${tokens.colors.neutral.gray['01']}`,
          color: tokens.colors.primary.foreground
        }}
      >
        Continue
      </Button>
    ),
    showBackButton: false
  };
}

export default WelcomeScreen;
