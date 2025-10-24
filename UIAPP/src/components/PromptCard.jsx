/**
 * PromptCard.jsx
 * -------------
 * Displays the main question or prompt text on a stylized
 * "card." Ensures consistent branding and layout for
 * the prompt itself.
 */

import React from 'react';

function PromptCard({ sessionData }) {
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
      <div className="card-container">
        <div className="card-content">
          <div className="heading" style={{ color: 'var(--color-status-error)', textAlign: 'center' }}>
            Unable to load prompt details
          </div>
          <div className="subheading" style={{ textAlign: 'center' }}>
            Please refresh the page or contact support
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card-container">
      <div className="card-content">
        {/* Subheading => "{Name} asked" */}
        <div className="subheading">{askerName} asked</div>

        {/* Main question => heading */}
        <div className="heading">
          {promptText}
        </div>
      </div>
    </div>
  );
}

export default PromptCard;
