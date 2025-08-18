/**
 * TokenAdmin.jsx
 * --------------
 * Admin interface for managing design tokens.
 * Allows real-time editing of fonts, colors, spacing, and other design properties.
 */

import React, { useState } from 'react';
import { useTokens } from '../theme/TokenProvider';

const TokenAdmin = () => {
  const { tokens, updateTokens, resetTokens, exportTokens, importTokens } = useTokens();
  const [activeTab, setActiveTab] = useState('colors');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null);

  // Handle color updates
  const updateColor = (category, property, value) => {
    updateTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [category]: {
          ...prev.colors[category],
          [property]: value
        }
      }
    }));
  };

  // Handle direct color property updates (for single color properties)
  const updateDirectColor = (property, value) => {
    updateTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [property]: value
      }
    }));
  };

  // Handle font updates
  const updateFont = (property, value) => {
    if (property === 'primary') {
      updateTokens(prev => ({
        ...prev,
        fonts: {
          ...prev.fonts,
          primary: value
        }
      }));
    } else {
      updateTokens(prev => ({
        ...prev,
        fonts: {
          ...prev.fonts,
          weights: {
            ...prev.fonts.weights,
            [property]: parseInt(value)
          }
        }
      }));
    }
  };

  // Handle spacing updates
  const updateSpacing = (size, value) => {
    updateTokens(prev => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [size]: value
      }
    }));
  };

  // Handle layout updates
  const updateLayout = (property, value) => {
    updateTokens(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [property]: value
      }
    }));
  };

  // Handle import
  const handleImport = () => {
    const result = importTokens(importText);
    setImportResult(result);
    if (result.success) {
      setImportText('');
      setTimeout(() => setImportResult(null), 3000);
    }
  };

  // Tab navigation
  const tabs = [
    { id: 'colors', label: 'Colors' },
    { id: 'fonts', label: 'Typography' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'layout', label: 'Layout' },
    { id: 'import-export', label: 'Import/Export' }
  ];

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '24px', 
      fontFamily: tokens.fonts.primary 
    }}>
      <h1 style={{ 
        fontSize: '2rem', 
        fontWeight: tokens.fonts.weights.semibold,
        color: tokens.colors.primary.text,
        marginBottom: '8px'
      }}>
        Design Token Manager
      </h1>
      <p style={{ 
        color: tokens.colors.textGray, 
        marginBottom: '32px',
        fontSize: '1rem'
      }}>
        Customize fonts, colors, spacing and layout. Changes apply immediately across the entire app.
      </p>

      {/* Tab Navigation */}
      <div style={{ 
        borderBottom: `1px solid ${tokens.colors.secondary.bg}`,
        marginBottom: '24px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              marginRight: '8px',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${tokens.colors.accent.bg}` : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? tokens.colors.accent.bg : tokens.colors.textGray,
              fontWeight: activeTab === tab.id ? tokens.fonts.weights.medium : tokens.fonts.weights.normal,
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', color: tokens.colors.primary.text }}>
            Color Palette
          </h2>
          
          {/* Primary Colors */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Primary (Page Background)</h3>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Background</label>
                <input
                  type="color"
                  value={tokens.colors.primary.bg}
                  onChange={(e) => updateColor('primary', 'bg', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
                <input
                  type="text"
                  value={tokens.colors.primary.bg}
                  onChange={(e) => updateColor('primary', 'bg', e.target.value)}
                  style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Text</label>
                <input
                  type="color"
                  value={tokens.colors.primary.text}
                  onChange={(e) => updateColor('primary', 'text', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
                <input
                  type="text"
                  value={tokens.colors.primary.text}
                  onChange={(e) => updateColor('primary', 'text', e.target.value)}
                  style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>
          </div>

          {/* Secondary Colors */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Secondary (Button Colors)</h3>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Background</label>
                <input
                  type="color"
                  value={tokens.colors.secondary.bg}
                  onChange={(e) => updateColor('secondary', 'bg', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
                <input
                  type="text"
                  value={tokens.colors.secondary.bg}
                  onChange={(e) => updateColor('secondary', 'bg', e.target.value)}
                  style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Text</label>
                <input
                  type="color"
                  value={tokens.colors.secondary.text}
                  onChange={(e) => updateColor('secondary', 'text', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
                <input
                  type="text"
                  value={tokens.colors.secondary.text}
                  onChange={(e) => updateColor('secondary', 'text', e.target.value)}
                  style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>
          </div>

          {/* Accent Colors */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Accent (Primary Buttons)</h3>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Background</label>
                <input
                  type="color"
                  value={tokens.colors.accent.bg}
                  onChange={(e) => updateColor('accent', 'bg', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
                <input
                  type="text"
                  value={tokens.colors.accent.bg}
                  onChange={(e) => updateColor('accent', 'bg', e.target.value)}
                  style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Text</label>
                <input
                  type="color"
                  value={tokens.colors.accent.text}
                  onChange={(e) => updateColor('accent', 'text', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
                <input
                  type="text"
                  value={tokens.colors.accent.text}
                  onChange={(e) => updateColor('accent', 'text', e.target.value)}
                  style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>
          </div>

          {/* Card Colors */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Prompt Card</h3>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Background</label>
                <input
                  type="color"
                  value={tokens.colors.card.bg}
                  onChange={(e) => updateColor('card', 'bg', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
                <input
                  type="text"
                  value={tokens.colors.card.bg}
                  onChange={(e) => updateColor('card', 'bg', e.target.value)}
                  style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Text</label>
                <input
                  type="color"
                  value={tokens.colors.card.text}
                  onChange={(e) => updateColor('card', 'text', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
                <input
                  type="text"
                  value={tokens.colors.card.text}
                  onChange={(e) => updateColor('card', 'text', e.target.value)}
                  style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>
          </div>

          {/* Special Colors */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Special Colors</h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Recording Red</label>
                <input
                  type="color"
                  value={tokens.colors.recording}
                  onChange={(e) => updateDirectColor('recording', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Inactive Gray</label>
                <input
                  type="color"
                  value={tokens.colors.inactive}
                  onChange={(e) => updateDirectColor('inactive', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Text Gray</label>
                <input
                  type="color"
                  value={tokens.colors.textGray}
                  onChange={(e) => updateDirectColor('textGray', e.target.value)}
                  style={{ width: '50px', height: '30px' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'fonts' && (
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', color: tokens.colors.primary.text }}>
            Typography
          </h2>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: tokens.fonts.weights.medium }}>
              Primary Font Family
            </label>
            <input
              type="text"
              value={tokens.fonts.primary}
              onChange={(e) => updateFont('primary', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: tokens.layout.borderRadius,
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              placeholder="e.g., 'Inter', 'Roboto', sans-serif"
            />
            <small style={{ color: tokens.colors.textGray, fontSize: '0.875rem' }}>
              Use web-safe fonts or ensure fonts are loaded
            </small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Normal Weight</label>
              <input
                type="range"
                min="100"
                max="900"
                step="100"
                value={tokens.fonts.weights.normal}
                onChange={(e) => updateFont('normal', e.target.value)}
                style={{ width: '100%' }}
              />
              <span>{tokens.fonts.weights.normal}</span>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Medium Weight</label>
              <input
                type="range"
                min="100"
                max="900"
                step="100"
                value={tokens.fonts.weights.medium}
                onChange={(e) => updateFont('medium', e.target.value)}
                style={{ width: '100%' }}
              />
              <span>{tokens.fonts.weights.medium}</span>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Semibold Weight</label>
              <input
                type="range"
                min="100"
                max="900"
                step="100"
                value={tokens.fonts.weights.semibold}
                onChange={(e) => updateFont('semibold', e.target.value)}
                style={{ width: '100%' }}
              />
              <span>{tokens.fonts.weights.semibold}</span>
            </div>
          </div>

          <div style={{ 
            marginTop: '32px', 
            padding: '24px', 
            backgroundColor: tokens.colors.card.bg,
            borderRadius: tokens.layout.cardBorderRadius,
            boxShadow: tokens.shadows.card
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontFamily: tokens.fonts.primary }}>Typography Preview</h3>
            <div style={{ fontFamily: tokens.fonts.primary, fontWeight: tokens.fonts.weights.normal, fontSize: '1rem', marginBottom: '8px' }}>
              Normal text: The quick brown fox jumps over the lazy dog
            </div>
            <div style={{ fontFamily: tokens.fonts.primary, fontWeight: tokens.fonts.weights.medium, fontSize: '1.1rem', marginBottom: '8px' }}>
              Medium text: The quick brown fox jumps over the lazy dog
            </div>
            <div style={{ fontFamily: tokens.fonts.primary, fontWeight: tokens.fonts.weights.semibold, fontSize: '1.3rem' }}>
              Semibold text: The quick brown fox jumps over the lazy dog
            </div>
          </div>
        </div>
      )}

      {/* Spacing Tab */}
      {activeTab === 'spacing' && (
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', color: tokens.colors.primary.text }}>
            Spacing System
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {Object.entries(tokens.spacing).map(([size, value]) => (
              <div key={size}>
                <label style={{ display: 'block', marginBottom: '8px', textTransform: 'capitalize' }}>
                  {size} ({value})
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateSpacing(size, e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
                <div style={{ 
                  marginTop: '8px', 
                  height: '20px', 
                  backgroundColor: tokens.colors.accent.bg,
                  width: value
                }}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === 'layout' && (
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', color: tokens.colors.primary.text }}>
            Layout Properties
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Max Width</label>
              <input
                type="text"
                value={tokens.layout.maxWidth}
                onChange={(e) => updateLayout('maxWidth', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Container Padding</label>
              <input
                type="text"
                value={tokens.layout.containerPadding}
                onChange={(e) => updateLayout('containerPadding', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Border Radius</label>
              <input
                type="text"
                value={tokens.layout.borderRadius}
                onChange={(e) => updateLayout('borderRadius', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Card Border Radius</label>
              <input
                type="text"
                value={tokens.layout.cardBorderRadius}
                onChange={(e) => updateLayout('cardBorderRadius', e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Tab */}
      {activeTab === 'import-export' && (
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', color: tokens.colors.primary.text }}>
            Import/Export Tokens
          </h2>
          
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Export Current Tokens</h3>
            <button
              onClick={() => navigator.clipboard.writeText(exportTokens())}
              style={{
                padding: '12px 24px',
                backgroundColor: tokens.colors.accent.bg,
                color: tokens.colors.accent.text,
                border: 'none',
                borderRadius: tokens.layout.borderRadius,
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Copy to Clipboard
            </button>
          </div>
          
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Import Tokens</h3>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste token JSON here..."
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                borderRadius: tokens.layout.borderRadius,
                border: '1px solid #ccc',
                fontFamily: 'monospace',
                fontSize: '0.9rem'
              }}
            />
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: importText.trim() ? tokens.colors.accent.bg : '#ccc',
                  color: tokens.colors.accent.text,
                  border: 'none',
                  borderRadius: tokens.layout.borderRadius,
                  cursor: importText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '1rem'
                }}
              >
                Import Tokens
              </button>
              {importResult && (
                <div style={{ 
                  padding: '12px',
                  borderRadius: tokens.layout.borderRadius,
                  backgroundColor: importResult.success ? '#d4edda' : '#f8d7da',
                  color: importResult.success ? '#155724' : '#721c24'
                }}>
                  {importResult.success ? 'Import successful!' : `Import failed: ${importResult.error}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Button */}
      <div style={{ 
        marginTop: '48px', 
        paddingTop: '24px', 
        borderTop: `1px solid ${tokens.colors.secondary.bg}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Reset to Defaults</h3>
          <p style={{ margin: 0, color: tokens.colors.textGray, fontSize: '0.9rem' }}>
            This will restore all design tokens to their original values.
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to reset all design tokens to defaults? This cannot be undone.')) {
              resetTokens();
            }
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: tokens.colors.recording,
            color: 'white',
            border: 'none',
            borderRadius: tokens.layout.borderRadius,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Reset All
        </button>
      </div>
    </div>
  );
};

export default TokenAdmin;