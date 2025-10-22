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

import React, { useState, useEffect } from 'react';

/**
 * WelcomeMessage Component
 * Displays animated typewriter-style welcome text
 */
function WelcomeMessage({ sessionData }) {
  // Extract askerName using same logic as PromptCard
  const askerName = sessionData?.sessionData?.askerName ||
                    sessionData?.session?.askerName ||
                    sessionData?.askerName ||
                    sessionData?.sessionData?.storytellerName ||
                    sessionData?.session?.storytellerName ||
                    sessionData?.storytellerName ||
                    'Unknown';

  // All words to display (split into array)
  const line1Words = ['Welcome', `${askerName},`];
  const line2Words = ["It's", 'time', 'to', 'share', 'another', 'memory'];

  const [displayedWords, setDisplayedWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const allWords = [...line1Words, ...line2Words];
  const line1Length = line1Words.length;

  useEffect(() => {
    // Typewriter effect - show one word at a time
    if (currentWordIndex < allWords.length) {
      // Add 1s pause after line 1 completes (after first 2 words)
      const isAfterLine1 = currentWordIndex === line1Length;
      const delay = isAfterLine1 ? 1000 : 200; // 1000ms pause after line 1, otherwise 200ms

      // Debug logging to verify pause
      if (isAfterLine1) {
        console.log(`[WelcomeMessage] Pausing for ${delay}ms after line 1`);
      }

      const timer = setTimeout(() => {
        console.log(`[WelcomeMessage] Showing word ${currentWordIndex}: "${allWords[currentWordIndex]}"`);
        setDisplayedWords(prev => [...prev, allWords[currentWordIndex]]);
        setCurrentWordIndex(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [currentWordIndex, allWords, line1Length]);

  // Split displayed words into two lines
  const line1Display = displayedWords.slice(0, line1Length).join(' ');
  const line2Display = displayedWords.slice(line1Length).join(' ');

  return (
    <div className="welcome-message">
      <div className="welcome-line welcome-line-1">
        {displayedWords.slice(0, line1Length).map((word, index) => (
          <React.Fragment key={`word-${index}`}>
            <span className="welcome-word-fade">{word}</span>
            {index < line1Length - 1 && ' '}
          </React.Fragment>
        ))}
      </div>
      {line2Display && (
        <div className="welcome-line">
          {displayedWords.slice(line1Length).map((word, index) => (
            <React.Fragment key={`word-${line1Length + index}`}>
              <span className="welcome-word-fade">{word}</span>
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
 */
function WelcomeScreen({ sessionData, onContinue }) {
  return {
    message: <WelcomeMessage sessionData={sessionData} />,
    button: (
      <button
        type="button"
        className="single-button-full"
        onClick={onContinue}
      >
        Continue
      </button>
    )
  };
}

export default WelcomeScreen;
