/**
 * PromptCard.jsx
 * -------------
 * Displays the main question or prompt text on a stylized
 * "card." Ensures consistent branding and layout for 
 * the prompt itself.
 */

import React from 'react';

function PromptCard() {
  return (
    <div className="card-container">
      <div className="card-content">
        {/* Subheading => "Jake asked" */}
        <div className="subheading">Robbie asked</div>

        {/* Main question => heading */}
        <div className="heading">
          How was your first date?
          Where did you go and how did the date unfold?
        </div>
      </div>
    </div>
  );
}

export default PromptCard;
