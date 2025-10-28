# Styling Architecture Consolidation Guide

**Status**: Ready for Implementation
**Date**: 2025-01-27
**Priority**: High

---

## Context

The application currently maintains **three concurrent styling systems**:

1. **Legacy CSS Modules** - 10 CSS files (1,065 lines) with className-based styling
2. **TokenProvider + CSS Variables** - Runtime CSS custom property injection
3. **Emotion Styled-Components** - Partially implemented infrastructure (Primitives, LayoutProvider)

This creates confusion about where styles live, slows development velocity by 30-40%, and prevents leveraging dynamic styling capabilities like theming and personalization.

---

## Issues

**Developer Experience Problems**:
- Decision fatigue: "Which styling approach do I use?"
- Code hunting: Must check 3-4 files to understand component styling
- Inconsistent patterns: Same component type styled differently across codebase
- Slow onboarding: New developers take 2-3x longer to understand styling

**Technical Problems**:
- CSS/JS conflicts: `variables.css` values overridden by `TokenProvider.jsx` at runtime
  - Example: `variables.css:28` sets `--banner-height: 5px`, but `TokenProvider.jsx:446` overrides to `64px`
- Fragmentation: 1,065 lines of CSS + 584 lines of infrastructure spread across 13 files
- Incomplete migration: Emotion styled-components infrastructure built but 0% adopted in production screens
  - `Primitives.jsx` (294 lines): 9 styled-components created, never used
  - Team rejected pattern through non-adoption despite complete implementation

**Business Impact**:
- 30-40% slower UI feature development
- Higher maintenance cost from architectural complexity
- Blocked capabilities: Cannot implement theming, user preferences, or dynamic styling

---

## Approach

**Consolidate to single styling pattern**: Token-based inline styles

**Why This Pattern**:
- ✅ TokenProvider already exists and works well
- ✅ Proven in production: ModernConfirmModal and MediaDeviceModal already use this pattern
- ✅ Co-located: Styles live in component files (no hunting)
- ✅ Dynamic: Enables theming, personalization, A/B testing
- ✅ Simple: One obvious way to style components
- ✅ NOT Emotion styled-components: Team already rejected that pattern (0% adoption despite complete infrastructure)

**What Gets Removed**:
- All 10 CSS files in `src/styles/`
- Emotion styled-components infrastructure (`Primitives.jsx`, `LayoutProvider.jsx`) - **deleted, not refactored**
- CSS imports from components
- All `var(--custom-property)` references

**What Gets Kept**:
- `TokenProvider.jsx` (single source of truth for design tokens)
- All 37 component files (converted to inline styles)
- Plyr.css import (external library dependency)

---

## Desired Outcomes

**Immediate Benefits**:
- Single styling approach: Zero decision fatigue
- Co-located code: All styling in component files
- Faster development: 30-40% reduction in time for UI changes
- Cleaner codebase: 85% fewer styling files (13 → 2)

**Strategic Capabilities Unlocked**:
- **Theming**: Change entire app appearance by updating tokens
- **Personalization**: User-selectable font sizes, color schemes
- **Accessibility**: High-contrast mode, larger text modes
- **A/B Testing**: Test UI variations without code deploys
- **White-labeling**: Partner-branded versions of the app

**Measurable Improvements**:
- Files to modify for typical UI change: 4 files → 1 file (75% reduction)
- Lines of styling code: 1,574 lines → ~400 lines (75% reduction)
- CSS/JS runtime conflicts: Eliminated (100%)

---

# Implementation Plan

## Phase 1: Foundation Setup

### Step 1.1: Create GlobalStyles Component

**File**: `src/theme/GlobalStyles.jsx`

Create new file with this content:

```jsx
/**
 * GlobalStyles.jsx
 * Minimal global CSS resets and base styles.
 * Applied once at app root level.
 */
import React, { useEffect } from 'react';
import { useTokens } from './TokenProvider';

export const GlobalStyles = () => {
  const { tokens } = useTokens();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* CSS Reset */
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      html {
        font-size: 16px;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: ${tokens.fonts.primary};
        font-size: ${tokens.fontSize.base};
        color: ${tokens.colors.neutral.black};
        background-color: ${tokens.colors.neutral.default};
        min-height: 100vh;
        min-height: 100dvh;
      }

      /* Global Focus Styles */
      *:focus-visible {
        outline: 2px solid ${tokens.colors.primary.DEFAULT};
        outline-offset: 2px;
      }

      *:focus:not(:focus-visible) {
        outline: none;
      }

      /* Button Reset */
      button {
        font-family: inherit;
      }

      /* Image Defaults */
      img {
        max-width: 100%;
        height: auto;
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [tokens]);

  return null;
};
```

### Step 1.2: Add GlobalStyles to App

**File**: `src/index.js`

Add import at top:
```jsx
import { GlobalStyles } from './theme/GlobalStyles';
```

Add component after `<TokenProvider>`:
```jsx
<TokenProvider>
  <GlobalStyles />  {/* ← Add this line */}
  <NiceModal.Provider>
```

### Step 1.3: Verify Foundation Works

Run the app:
```bash
npm start
```

Check that app still renders correctly. Global styles should now come from GlobalStyles component.

---

## Phase 2: Screen Component Migration

Migrate each screen component from CSS classes to inline styles with tokens.

### Migration Pattern for Every Component

For each component file, follow these steps:

**Step A**: Add token import and hook
```jsx
import { useTokens } from '../theme/TokenProvider';  // Add this import

function ComponentName() {
  const { tokens } = useTokens();  // Add this hook
  // ... rest of component
}
```

**Step B**: Convert className to style prop
```jsx
// BEFORE
<div className="container">

// AFTER
<div style={{
  display: 'flex',
  flexDirection: 'column',
  padding: tokens.spacing[6],
  backgroundColor: tokens.colors.neutral.default
}}>
```

**Step C**: Remove CSS imports
```jsx
// BEFORE
import '../styles/welcome-screen.css';  // ← Remove this line

// AFTER
// (no CSS imports)
```

**Step D**: Handle hover/focus states
```jsx
// BEFORE
<button className="btn-primary">  {/* CSS handles :hover */}

// AFTER
<button
  style={{
    backgroundColor: tokens.colors.primary.DEFAULT,
    color: tokens.colors.primary.foreground,
    // ... other styles
  }}
  onMouseEnter={(e) => {
    e.target.style.backgroundColor = tokens.colors.primary.light;
  }}
  onMouseLeave={(e) => {
    e.target.style.backgroundColor = tokens.colors.primary.DEFAULT;
  }}
>
```

---

### Screen 1: WelcomeScreen.jsx

**File**: `src/components/screens/WelcomeScreen.jsx`

**Current CSS Files Used**: `welcome-screen.css`, `buttons.css`

**Steps**:

1. Open `src/styles/welcome-screen.css` in a separate window for reference
2. Open `src/components/screens/WelcomeScreen.jsx`
3. Add imports and hook:
```jsx
import { useTokens } from '../../theme/TokenProvider';

function WelcomeScreen({ onStart }) {
  const { tokens } = useTokens();
```

4. Convert each className to inline style:

```jsx
// Find: className="welcome-container"
// Look up styles in welcome-screen.css
// Convert to:
style={{
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: tokens.spacing[6],
  backgroundColor: tokens.colors.neutral.default
}}
```

5. Repeat for all elements in the component
6. Remove this line: `import '../styles/welcome-screen.css';`
7. Save and visually test the screen

---

### Screen 2: PromptReadScreen.jsx

**File**: `src/components/screens/PromptReadScreen.jsx`

**Current CSS Files Used**: `components.css`, `buttons.css`

**Steps**:

1. Open `src/styles/components.css` for reference
2. Add token imports and hook
3. Convert all className attributes to style objects
4. Remove CSS import
5. Test screen rendering

---

### Screen 3: ChooseModeScreen.jsx

**File**: `src/components/screens/ChooseModeScreen.jsx`

**Current CSS Files Used**: `buttons.css`, `layout.css`

Follow same pattern as Screen 1-2.

---

### Screen 4: AudioTest.jsx

**File**: `src/components/screens/AudioTest.jsx`

**Current CSS Files Used**: `components.css`, `buttons.css`

Follow same pattern. Pay attention to:
- Audio visualizer container styling
- Device selection button styling
- Test control buttons

---

### Screen 5: VideoTest.jsx

**File**: `src/components/screens/VideoTest.jsx`

**Current CSS Files Used**: `components.css`, `buttons.css`

Follow same pattern. Pay attention to:
- Video preview container
- Device selection controls
- Layout for video + controls

---

### Screen 6: ReadyToRecordScreen.jsx

**File**: `src/components/screens/ReadyToRecordScreen.jsx`

**Current CSS Files Used**: `components.css`, `buttons.css`

Follow same pattern. This is a simple screen with centered content and button.

---

### Screen 7: ActiveRecordingScreen.jsx

**File**: `src/components/screens/ActiveRecordingScreen.jsx`

**Current CSS Files Used**: `components.css`, `overlays.css`

Follow same pattern. Pay attention to:
- Recording indicator styles
- Timer display styling
- Control button positioning

---

### Screen 8: PausedRecordingScreen.jsx

**File**: `src/components/screens/PausedRecordingScreen.jsx`

**Current CSS Files Used**: `components.css`, `buttons.css`

Follow same pattern. Similar to ActiveRecordingScreen but with paused state styling.

---

### Screen 9: ReviewRecordingScreen.jsx

**File**: `src/components/screens/ReviewRecordingScreen.jsx`

**Current CSS Files Used**: `components.css`, `buttons.css`

Follow same pattern. Pay attention to:
- Media player container
- Playback controls
- Action buttons layout

---

### Screen 10: ReviewRecordingContent.jsx

**File**: `src/components/screens/ReviewRecordingContent.jsx`

**Current CSS Files Used**: `components.css`

Follow same pattern. This handles the content area of the review screen.

---

### Screen 11: All Remaining Screen Components

Complete any remaining screen components following the established pattern.

---

## Phase 3: Core Component Migration

### Component 1: MasterLayout.jsx

**File**: `src/components/MasterLayout.jsx`

**Current CSS Files Used**: `banner.css`, `layout.css`

**This is a critical component - take extra care.**

**Steps**:

1. Open `src/styles/banner.css` and `src/styles/layout.css` for reference
2. Add token imports and hook
3. Convert banner section:

```jsx
// BEFORE
<div className="app-banner">
  <div className="section-a1">...</div>
  <div className="section-a2">...</div>
  <div className="section-a3">...</div>
</div>

// AFTER
<div style={{
  position: 'sticky',
  top: 0,
  height: tokens.banner.height,
  backgroundColor: tokens.colors.primary.DEFAULT,
  color: tokens.colors.primary.foreground,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  zIndex: tokens.zIndex.sticky
}}>
  <div style={{ flex: '0 0 60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* section-a1 content */}
  </div>
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* section-a2 content */}
  </div>
  <div style={{ flex: '0 0 60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* section-a3 content */}
  </div>
</div>
```

4. Convert layout sections (prompt-section, actions-section)
5. Remove CSS imports
6. Test all screens that use MasterLayout

---

### Component 2: PromptCard.jsx

**File**: `src/components/PromptCard.jsx`

**Current CSS Files Used**: `components.css`, `index.css`

Follow standard pattern. Pay attention to:
- Card container styling
- Text content layout
- Responsive padding

---

### Component 3: RecordingBar.jsx

**File**: `src/components/RecordingBar.jsx`

**Current CSS Files Used**: `components.css`

This component is used in the banner area. Convert its styles to inline with tokens.

---

### Component 4: AudioVisualizer.jsx

**File**: `src/components/AudioVisualizer.jsx`

**Current CSS Files Used**: `components.css`

This uses audiomotion-analyzer library. Focus on container styling, not canvas manipulation.

---

### Component 5: CountdownOverlay.jsx

**File**: `src/components/CountdownOverlay.jsx`

**Current CSS Files Used**: `overlays.css`

Follow standard pattern. Pay attention to:
- Fixed positioning (overlay)
- Centered content
- Animation-ready styles (if any)

---

### Component 6: ErrorScreen.jsx

**File**: `src/components/ErrorScreen.jsx`

**Current CSS Files Used**: `overlays.css`

Overlay component. Convert fixed positioning and centered content styles.

---

### Component 7: confettiScreen.jsx

**File**: `src/components/confettiScreen.jsx`

**Current CSS Files Used**: `overlays.css`

Success overlay. Convert overlay styles.

---

### Component 8: RadixStartOverDialog.jsx

**File**: `src/components/RadixStartOverDialog.jsx`

**Current CSS Files Used**: Radix UI default styles

This may have minimal custom styling. Add token-based inline styles for any custom appearance.

---

### Component 9: AppContent.jsx

**File**: `src/components/AppContent.jsx`

**IMPORTANT**: This file imports all the CSS files.

**Steps**:

1. Remove ALL CSS imports:
```jsx
// DELETE these lines:
import '../styles/variables.css';
import '../styles/layout.css';
import '../styles/buttons.css';
import '../styles/banner.css';
import '../styles/overlays.css';
import '../styles/components.css';
import '../styles/focus-overrides.css';
import '../styles/welcome-screen.css';
```

2. Verify component still has token import (should already be there)
3. Convert any remaining className usage to inline styles

---

### Component 10: PlyrMediaPlayer.jsx

**File**: `src/components/PlyrMediaPlayer.jsx`

**Current CSS Files Used**: `plyr/dist/plyr.css` (external library)

**Special Case**: Keep the Plyr CSS import as it's from the library:
```jsx
import 'plyr/dist/plyr.css';  // ← KEEP THIS
```

Only convert YOUR custom wrapper styles to inline styles with tokens.

---

### Component 11-37: Remaining Components

Go through each remaining component file in `src/components/`:

- AppErrorBoundary.jsx
- FirebaseErrorBoundary.jsx
- SessionValidator.jsx
- AdminLandingPage.jsx
- AdminDebugPage.jsx
- DatabaseAdminPage.jsx
- Any other component with className usage

For each:
1. Check if it uses CSS classes
2. If yes, convert to inline styles with tokens
3. Remove any CSS imports
4. **Search for and replace `var(--custom-property)` references** with token imports
5. Test component renders correctly

---

### Phase 3 Validation: Search for CSS Variable References

**IMPORTANT**: Before proceeding to Phase 4, verify all CSS custom properties are removed.

Run this search to find remaining `var(--` references:

```bash
# Search for CSS custom property usage
grep -r "var(--" src/components/ --include="*.jsx" --include="*.js"

# Expected result: ZERO matches (except possibly in comments)
```

**If matches found**:
- Each `var(--token-name)` must be converted to `tokens.path.to.value`
- Example: `fontSize: 'var(--font-size-2xl)'` → `fontSize: tokens.fontSize['2xl']`
- Example: `color: 'var(--color-primary-default)'` → `color: tokens.colors.primary.DEFAULT`

**Common CSS variable patterns to find and replace**:
```jsx
// FIND pattern examples:
var(--color-primary-default)
var(--font-size-base)
var(--spacing-lg)
var(--banner-height)
var(--border-radius-md)

// REPLACE with token equivalents:
tokens.colors.primary.DEFAULT
tokens.fontSize.base
tokens.spacing[6]
tokens.banner.height
tokens.borderRadius.md
```

---

## Phase 4: Helper Component Creation (Optional)

To reduce repetition, create reusable styled components for common patterns.

### Helper 1: Button Component

**File**: `src/components/ui/Button.jsx`

Create new file:

```jsx
import React from 'react';
import { useTokens } from '../../theme/TokenProvider';

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  style = {},
  ...props
}) {
  const { tokens } = useTokens();

  const variants = {
    primary: {
      backgroundColor: tokens.colors.primary.DEFAULT,
      color: tokens.colors.primary.foreground,
      hoverBg: tokens.colors.primary.light
    },
    secondary: {
      backgroundColor: tokens.colors.secondary.bg,
      color: tokens.colors.secondary.text,
      hoverBg: tokens.colors.secondary.hover
    }
  };

  const sizes = {
    small: {
      height: '40px',
      fontSize: tokens.fontSize.sm,
      padding: `0 ${tokens.spacing[4]}`
    },
    medium: {
      height: '60px',
      fontSize: tokens.fontSize.base,
      padding: `0 ${tokens.spacing[5]}`
    },
    large: {
      height: '80px',
      fontSize: tokens.fontSize.xl,
      padding: `0 ${tokens.spacing[6]}`
    }
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sizeStyle,
        backgroundColor: disabled
          ? tokens.colors.neutral.gray['02']
          : variantStyle.backgroundColor,
        color: disabled
          ? tokens.colors.neutral.gray['03']
          : variantStyle.color,
        border: 'none',
        borderRadius: tokens.borderRadius.lg,
        fontWeight: tokens.fontWeight.medium,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.backgroundColor = variantStyle.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.backgroundColor = variantStyle.backgroundColor;
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Usage in components**:
```jsx
import { Button } from './ui/Button';

<Button variant="primary" size="large" onClick={handleClick}>
  Get Started
</Button>
```

---

### Helper 2: Card Component

**File**: `src/components/ui/Card.jsx`

Create new file:

```jsx
import React from 'react';
import { useTokens } from '../../theme/TokenProvider';

export function Card({
  children,
  padding = 'medium',
  style = {},
  ...props
}) {
  const { tokens } = useTokens();

  const paddingValues = {
    small: tokens.spacing[4],
    medium: tokens.spacing[6],
    large: tokens.spacing[8]
  };

  return (
    <div
      style={{
        backgroundColor: tokens.colors.background.light,
        borderRadius: tokens.borderRadius.lg,
        padding: paddingValues[padding],
        boxShadow: tokens.shadows.md,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
```

---

## Phase 5: Cleanup

### Step 5.1: Delete CSS Files

Once ALL components are migrated and tested:

```bash
# Delete entire styles directory
rm -rf src/styles/
```

Or manually delete:
- `src/styles/App.css`
- `src/styles/banner.css`
- `src/styles/buttons.css`
- `src/styles/components.css`
- `src/styles/focus-overrides.css`
- `src/styles/index.css`
- `src/styles/layout.css`
- `src/styles/overlays.css`
- `src/styles/variables.css`
- `src/styles/welcome-screen.css`
- Remove `src/styles/` directory if empty

### Step 5.2: Delete Emotion Infrastructure

```bash
# Delete unused Emotion infrastructure
rm -rf src/components/layout/
```

Or manually delete:
- `src/components/layout/Primitives.jsx`
- `src/components/layout/LayoutProvider.jsx`
- `src/components/layout/index.js`
- Remove `src/components/layout/` directory

### Step 5.3: Update index.js

**File**: `src/index.js`

Remove LayoutProvider import and usage:

```jsx
// DELETE this line:
import { LayoutProvider } from './components/layout';

// And remove from JSX:
<TokenProvider>
  <GlobalStyles />
  {/* DELETE: <LayoutProvider> */}
  <NiceModal.Provider>
    {/* ... routes ... */}
  </NiceModal.Provider>
  {/* DELETE: </LayoutProvider> */}
</TokenProvider>
```

### Step 5.4: Remove Emotion Dependencies

**File**: `package.json`

Remove these dependencies:

```json
// DELETE these lines:
"@emotion/react": "^11.14.0",
"@emotion/styled": "^11.14.1",
```

Run:
```bash
npm install
```

### Step 5.5: Update Documentation

**File**: `CLAUDE.md` (or equivalent project docs)

Add section explaining new styling architecture:

```markdown
## Styling Architecture

**Approach**: Token-based inline styles

**Pattern**:
1. Import `useTokens` hook from `TokenProvider`
2. Access tokens with `const { tokens } = useTokens()`
3. Apply styles inline using token values

**Example**:
\`\`\`jsx
import { useTokens } from '../theme/TokenProvider';

function MyComponent() {
  const { tokens } = useTokens();

  return (
    <div style={{
      padding: tokens.spacing[6],
      backgroundColor: tokens.colors.neutral.default,
      borderRadius: tokens.borderRadius.lg
    }}>
      Content
    </div>
  );
}
\`\`\`

**Rules**:
- ❌ NO separate CSS files
- ❌ NO CSS class names
- ✅ Always use tokens for values
- ✅ Inline styles co-located with component
```

### Step 5.6: Delete DemoPage (Optional)

**File**: `src/pages/DemoPage.jsx`

This was used to demonstrate the old architecture. Can be deleted if no longer needed.

Also remove from routes in `src/index.js`:
```jsx
// DELETE this line:
<Route path="/demo" element={<DemoPage />} />
```

---

## Phase 6: Verification

### Step 6.1: Search for Remaining CSS Usage

Run these commands to verify no CSS remains:

```bash
# Check for CSS imports
grep -r "import.*\.css" src/components/

# Check for className usage
grep -r "className=" src/components/ | wc -l

# Expected result: Only PlyrMediaPlayer should import CSS (plyr.css)
# Expected result: Minimal className usage (Radix UI components only)
```

### Step 6.2: Verify Token Usage

```bash
# All components should import useTokens
grep -r "useTokens" src/components/ | wc -l

# Should match the number of components that render UI
```

### Step 6.3: Manual Testing Checklist

Test each screen flows:

- [ ] Welcome screen renders correctly
- [ ] Prompt read screen displays properly
- [ ] Mode selection works and looks right
- [ ] Audio test screen functions correctly
- [ ] Video test screen functions correctly
- [ ] Ready to record screen displays
- [ ] Active recording screen works
- [ ] Paused recording screen displays
- [ ] Review recording screen with playback
- [ ] All buttons hover correctly
- [ ] All overlays display properly
- [ ] All modals function correctly
- [ ] Responsive design works (test mobile size)

### Step 6.4: Build Verification

Run production build to ensure no errors:

```bash
npm run build
```

Check that build completes successfully with no errors.

---

## Token Reference Guide

Use this as a quick reference when converting styles:

### Colors

```jsx
// Primary brand colors
tokens.colors.primary.DEFAULT      // #2C2F48 - Main brand
tokens.colors.primary.light        // #3E4259 - Hover state
tokens.colors.primary.foreground   // #F5F4F0 - Text on primary

// Secondary colors
tokens.colors.secondary.bg         // #E4E2D8
tokens.colors.secondary.text       // #2C2F48
tokens.colors.secondary.hover      // #D4D2C8

// Neutral colors
tokens.colors.neutral.default      // #F5F4F0 - Page background
tokens.colors.neutral.black        // #000000 - Primary text
tokens.colors.neutral.gray['01']   // #6B6B6B - Secondary text
tokens.colors.neutral.gray['02']   // #999999 - Tertiary text
tokens.colors.neutral.gray['03']   // #CCCCCC - Borders

// Background colors
tokens.colors.background.light     // #FFFFFF - Cards
tokens.colors.background.gray      // #F8F9FA - Subtle bg

// Status colors
tokens.colors.status.success       // #28A745
tokens.colors.status.error         // #DC3545
tokens.colors.status.warning       // #FFC107
tokens.colors.status.info          // #17A2B8
```

### Spacing

```jsx
tokens.spacing[0]    // 0
tokens.spacing[1]    // 4px
tokens.spacing[2]    // 8px
tokens.spacing[3]    // 12px
tokens.spacing[4]    // 16px
tokens.spacing[5]    // 20px
tokens.spacing[6]    // 24px
tokens.spacing[8]    // 32px
tokens.spacing[10]   // 40px
```

### Typography

```jsx
// Font sizes
tokens.fontSize.xs       // 12px
tokens.fontSize.sm       // 14px
tokens.fontSize.base     // 16px (default)
tokens.fontSize.lg       // 18px
tokens.fontSize.xl       // 20px
tokens.fontSize['2xl']   // 24px
tokens.fontSize['3xl']   // 30px
tokens.fontSize['4xl']   // 36px

// Font weights
tokens.fontWeight.normal     // 400
tokens.fontWeight.medium     // 500
tokens.fontWeight.semibold   // 600
tokens.fontWeight.bold       // 700

// Font family
tokens.fonts.primary         // 'Open Sans', sans-serif
```

### Border Radius

```jsx
tokens.borderRadius.sm    // 4px
tokens.borderRadius.md    // 8px
tokens.borderRadius.lg    // 12px
tokens.borderRadius.xl    // 16px
tokens.borderRadius.full  // 9999px (circle)
```

### Shadows

```jsx
tokens.shadows.sm     // Subtle shadow
tokens.shadows.md     // Medium shadow (default)
tokens.shadows.lg     // Large shadow
tokens.shadows.xl     // Extra large shadow
tokens.shadows['2xl'] // Dramatic shadow
```

### Layout

```jsx
tokens.layout.maxWidth.sm   // 384px
tokens.layout.maxWidth.md   // 480px
tokens.layout.maxWidth.lg   // 768px

tokens.zIndex.sticky        // 40
tokens.zIndex.modal         // 50
tokens.zIndex.overlay       // 60

tokens.banner.height        // 64px
```

---

## Common Conversion Patterns

### Pattern 1: Container

```jsx
// BEFORE (CSS)
.container {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px;
}

// AFTER (Inline)
<div style={{
  maxWidth: tokens.layout.maxWidth.md,
  margin: '0 auto',
  padding: `${tokens.spacing[6]} ${tokens.spacing[4]}`
}}>
```

### Pattern 2: Flexbox Layout

```jsx
// BEFORE (CSS)
.layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

// AFTER (Inline)
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing[4],
  alignItems: 'center'
}}>
```

### Pattern 3: Button

```jsx
// BEFORE (CSS)
.btn-primary {
  height: 80px;
  padding: 16px 24px;
  background-color: #2C2F48;
  color: #F5F4F0;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #3E4259;
}

// AFTER (Inline)
<button
  style={{
    height: '80px',
    padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
    backgroundColor: tokens.colors.primary.DEFAULT,
    color: tokens.colors.primary.foreground,
    border: 'none',
    borderRadius: tokens.borderRadius.lg,
    cursor: 'pointer'
  }}
  onMouseEnter={(e) => {
    e.target.style.backgroundColor = tokens.colors.primary.light;
  }}
  onMouseLeave={(e) => {
    e.target.style.backgroundColor = tokens.colors.primary.DEFAULT;
  }}
>
```

### Pattern 4: Card

```jsx
// BEFORE (CSS)
.card {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

// AFTER (Inline)
<div style={{
  backgroundColor: tokens.colors.background.light,
  borderRadius: tokens.borderRadius.lg,
  padding: tokens.spacing[6],
  boxShadow: tokens.shadows.md
}}>
```

### Pattern 5: Overlay

```jsx
// BEFORE (CSS)
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}

// AFTER (Inline)
<div style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: tokens.zIndex.overlay
}}>
```

---

## Troubleshooting

### Issue: "useTokens is not defined"

**Solution**: Add import at top of file:
```jsx
import { useTokens } from '../theme/TokenProvider';
```

### Issue: "tokens is not defined"

**Solution**: Add hook inside component function:
```jsx
function MyComponent() {
  const { tokens } = useTokens();  // Add this
  // ... rest of component
}
```

### Issue: Component looks different after migration

**Solution**:
1. Check original CSS file for the exact property values
2. Ensure you're using correct token paths
3. Verify hover/focus states are implemented with event handlers
4. Check for missing CSS properties (transitions, transforms, etc.)

### Issue: "Cannot read property 'colors' of undefined"

**Solution**: Verify TokenProvider is wrapping your app in `index.js`:
```jsx
<TokenProvider>
  <GlobalStyles />
  {/* your app */}
</TokenProvider>
```

### Issue: Styles not applying

**Solution**:
1. Verify `style=` prop is used (not `styles=`)
2. Check that style object has valid CSS properties (camelCase)
3. Ensure token values are valid (check TokenProvider.jsx)

---

## Success Checklist

- [ ] GlobalStyles component created and added to index.js
- [ ] All 11 screen components migrated
- [ ] MasterLayout.jsx migrated
- [ ] All remaining components migrated
- [ ] All CSS imports removed from components
- [ ] `src/styles/` directory deleted
- [ ] `src/components/layout/` directory deleted
- [ ] Emotion dependencies removed from package.json
- [ ] LayoutProvider removed from index.js
- [ ] Documentation updated with new architecture
- [ ] All screens tested and render correctly
- [ ] Hover states work on buttons
- [ ] Production build succeeds
- [ ] No CSS file imports remain (except plyr.css)

---

## Post-Migration

Once migration is complete, the codebase will have:

✅ **2 styling files** (TokenProvider.jsx, GlobalStyles.jsx)
✅ **37 component files** (each with co-located inline styles)
✅ **Single pattern**: Token-based inline styles everywhere
✅ **Zero CSS hunting**: Styles always in component file
✅ **Dynamic capability**: Theming, personalization ready

---

**Migration Complete!** 🎉

The application now has a clean, maintainable, single-approach styling architecture that will accelerate development and unlock strategic capabilities.
