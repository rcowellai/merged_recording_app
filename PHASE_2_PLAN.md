# Phase 2 Implementation Plan: MasterLayout Refactor

## Document Information

**Project**: Love Retold Recording Web Application
**Phase**: 2 - MasterLayout Component Extraction
**Date**: January 2025
**Estimated Time**: 6-8 hours
**Difficulty**: Intermediate
**Prerequisites**: Completed Phase 1 (responsive primitives created, debug borders removed)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Understanding the Current Code](#understanding-the-current-code)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Testing & Validation](#testing--validation)
6. [Troubleshooting](#troubleshooting)
7. [Success Criteria](#success-criteria)

---

## Overview

### What Are We Doing?

We're breaking down a large, complex component (MasterLayout.jsx) into smaller, focused components. Think of it like organizing a messy toolbox - instead of having all tools thrown together in one big box, we're creating separate compartments for different types of tools.

### Why Are We Doing This?

**Current Problem**:
- MasterLayout.jsx is 423 lines long (should be <200 lines)
- It handles 6 different responsibilities (should be 1)
- It's hard to understand, modify, and test
- Changes risk breaking unrelated features

**Expected Benefits**:
- **Code Size**: Reduce from 423 → ~180 lines (57% smaller)
- **Maintainability**: 50-60% faster to add new features
- **Bug Fixes**: 60-70% faster to debug issues
- **Testing**: Can test components independently
- **Clarity**: Clear purpose for each component

### What Will We Create?

We will extract 3 new components from MasterLayout:

1. **LayoutHeader** - Handles the top navigation bar (Section A)
2. **ContentRouter** - Decides where content should appear (mobile vs desktop)
3. **TabletDesktopSubheader** - Handles the secondary header on larger screens (Section B1)

---

## Prerequisites & Setup

### Required Knowledge

Before starting, you should understand:

- ✅ React functional components
- ✅ React hooks (useState, useEffect)
- ✅ Props and prop destructuring
- ✅ Conditional rendering (`condition ? true : false`)
- ✅ Inline styles in React
- ✅ Responsive design concepts (mobile, tablet, desktop)

### Tools You'll Need

- Code editor (VS Code recommended)
- Terminal/Command prompt
- Git (for version control)
- Chrome DevTools (for testing)

### Before You Start

1. **Ensure Phase 1 is complete**:
   ```bash
   # Check that Phase 1 files exist
   ls UIAPP/src/hooks/useResponsiveLayout.js
   ls UIAPP/src/components/ui/AspectRatioContainer.jsx
   ls UIAPP/src/components/ui/ScrollContainer.jsx
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b phase-2-masterlayout-refactor
   ```

3. **Backup current MasterLayout**:
   ```bash
   cp UIAPP/src/components/MasterLayout.jsx UIAPP/src/components/MasterLayout.backup.jsx
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

---

## Understanding the Current Code

### MasterLayout Structure

The current MasterLayout has 3 main sections:

```
┌─────────────────────────────────────┐
│  SECTION A: Header (70-75px)       │  ← We'll extract this
│  - Back button | Content | Icon    │
├─────────────────────────────────────┤
│                                     │
│  SECTION B: Main Content (flex)    │  ← We'll simplify this
│  - Tablet/Desktop has B1 + B2      │
│  - Mobile has single section       │
│                                     │
├─────────────────────────────────────┤
│  SECTION C: Actions (100-150px)    │  ← This stays simple
│  - Bottom buttons                  │
└─────────────────────────────────────┘
```

### Current Complexity Breakdown

| Lines | What It Does | Will Become |
|-------|-------------|-------------|
| 47-76 | Welcome screen background injection | Stays in MasterLayout |
| 78-109 | Content routing logic (A2/B1B) | → ContentRouter |
| 145-253 | Section A header rendering | → LayoutHeader |
| 307-364 | Section B1 subheader (tablet/desktop) | → TabletDesktopSubheader |
| Rest | Main layout structure | Simplified MasterLayout |

### Key Concepts to Understand

#### 1. Responsive Breakpoints

The app uses 3 breakpoints:
- **Mobile**: < 768px (phones)
- **Tablet**: 768px - 1023px (tablets)
- **Desktop**: ≥ 1024px (computers)

#### 2. Section A Behavior

**Mobile**: Split into 3 parts (A1 | A2 | A3)
- A1: Back button (45px)
- A2: Content (flex grows)
- A3: Icon slot (45px)

**Tablet/Desktop**: Single unified section
- Logo on the left
- Content shows in Section B1B instead

#### 3. Special Screen States

The app has special styling for:
- **Welcome screen**: Transparent background on mobile
- **Recording screens**: Dark background

---

## Step-by-Step Implementation

### Step 2.1: Create LayoutHeader Component (2-3 hours)

#### What This Component Does

LayoutHeader handles the top navigation bar (Section A). It's responsible for:
- Rendering the back button
- Displaying banner content or logo
- Showing an icon in the top-right
- Handling mobile vs tablet/desktop layouts
- Managing sticky positioning

#### File to Create

**Path**: `UIAPP/src/components/layout/LayoutHeader.jsx`

#### Implementation Steps

**Step 2.1.1: Create the directory**

```bash
mkdir -p UIAPP/src/components/layout
```

**Step 2.1.2: Create the component file**

Create `UIAPP/src/components/layout/LayoutHeader.jsx` with this structure:

```javascript
/**
 * LayoutHeader.jsx
 * ----------------
 * Top navigation header component for all screens.
 * Handles mobile (A1|A2|A3) and desktop (unified) layouts.
 *
 * Mobile Layout:
 * - A1: Back button (45px)
 * - A2: Content/logo (flex)
 * - A3: Icon slot (45px)
 *
 * Desktop Layout:
 * - Unified section with left-aligned logo
 * - Banner content moves to Section B1B instead
 */

import React from 'react';
import PropTypes from 'prop-types';
import { MdChevronLeft } from 'react-icons/md';
import { useTokens } from '../../theme/TokenProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import Logo from '../../Assets/Logo.png';
import DarkLogo from '../../Assets/dark_logo.png';

function LayoutHeader({
  showBackButton = true,
  onBack = null,
  bannerContent = null,
  iconA3 = null,
  isWelcomeScreen = false,
  isActiveRecordingScreen = false,
  isPausedRecordingScreen = false,
  bannerStyle = null
}) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      left: 0,
      width: '100%',
      // Responsive height: 70px mobile, 75px tablet/desktop
      height: isMobile ? '70px' : '75px',
      minHeight: isMobile ? '70px' : '75px',
      maxHeight: isMobile ? '70px' : '75px',
      // Mobile welcome screen: transparent header to show background image
      // Other screens: standard header backgrounds
      backgroundColor: (isMobile && isWelcomeScreen)
        ? 'transparent'
        : (bannerContent ? tokens.colors.neutral.default : tokens.colors.background.light),
      color: tokens.colors.primary.DEFAULT,
      zIndex: tokens.zIndex.header,
      display: 'flex',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'center',
      boxSizing: 'border-box',
      padding: 0,
      fontWeight: tokens.fontWeight.medium,
      fontSize: tokens.fontSize.base,
      ...(bannerStyle || {})
    }}>
      {isMobile ? (
        // Mobile: A1, A2, A3 subdivided structure
        <>
          {/* A1 - Back Button (45px) */}
          <div style={{
            flex: '0 0 45px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}>
            {showBackButton && onBack && (
              <MdChevronLeft
                size={32}
                color={tokens.colors.primary.DEFAULT}
                onClick={onBack}
                style={{ cursor: 'pointer' }}
              />
            )}
          </div>

          {/* A2 - Flexible Content (flex-grow) */}
          <div style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box',
            color: tokens.colors.primary.DEFAULT,
            fontWeight: tokens.fontWeight.normal,
            fontSize: tokens.fontSize['2xl'] // Mobile: 24px
          }}>
            {bannerContent}
          </div>

          {/* A3 - Icon Slot (45px) */}
          <div style={{
            flex: '0 0 45px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}>
            {iconA3}
          </div>
        </>
      ) : (
        // Tablet/Desktop: Unified Section A with logo (left-aligned)
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: tokens.spacing[4],
          boxSizing: 'border-box'
        }}>
          <img
            src={isWelcomeScreen || isActiveRecordingScreen || isPausedRecordingScreen ? Logo : DarkLogo}
            alt="Love Retold"
            style={{
              height: '30px',
              width: 'auto',
              objectFit: 'contain',
              paddingLeft: tokens.spacing[6]
            }}
          />
        </div>
      )}
    </div>
  );
}

LayoutHeader.propTypes = {
  showBackButton: PropTypes.bool,
  onBack: PropTypes.func,
  bannerContent: PropTypes.node,
  iconA3: PropTypes.node,
  isWelcomeScreen: PropTypes.bool,
  isActiveRecordingScreen: PropTypes.bool,
  isPausedRecordingScreen: PropTypes.bool,
  bannerStyle: PropTypes.object
};

export default LayoutHeader;
```

**Step 2.1.3: Update MasterLayout to use LayoutHeader**

Open `UIAPP/src/components/MasterLayout.jsx` and make these changes:

1. **Add the import** (after line 18):

```javascript
import LayoutHeader from './layout/LayoutHeader';
```

2. **Find the Section A rendering** (around lines 145-253)

Look for this comment:
```javascript
{/* ========================================
    # SECTION A (HEADER)
    ========================================
```

3. **Replace the entire Section A div** with:

```javascript
{/* ========================================
    # SECTION A (HEADER)
    ========================================
    Single banner with flexible A2 content
*/}
{showBanner && (
  <LayoutHeader
    showBackButton={showBackButton}
    onBack={onBack}
    bannerContent={renderA2Content()}
    iconA3={iconA3}
    isWelcomeScreen={isWelcomeScreen}
    isActiveRecordingScreen={isActiveRecordingScreen}
    isPausedRecordingScreen={isPausedRecordingScreen}
    bannerStyle={bannerStyle}
  />
)}
```

**Step 2.1.4: Test the changes**

1. Save all files
2. Check the browser - the app should look identical
3. Test these scenarios:

| Screen | What to Check |
|--------|---------------|
| Welcome (mobile) | Logo appears in center |
| Welcome (desktop) | Logo appears on left |
| Recording screens | Banner content shows correctly |
| All screens | Back button works |
| All screens | Top-right icon (gear) appears when present |

**Step 2.1.5: Commit your changes**

```bash
git add UIAPP/src/components/layout/LayoutHeader.jsx
git add UIAPP/src/components/MasterLayout.jsx
git commit -m "feat(phase-2): extract LayoutHeader component from MasterLayout"
```

**Checkpoint**: MasterLayout should now be ~314 lines (down from 423).

---

### Step 2.2: Create ContentRouter Utility (1-2 hours)

#### What This Component Does

ContentRouter decides where banner content should appear:
- **Mobile**: Content goes in Section A2 (header)
- **Tablet/Desktop**: Content goes in Section B1B (subheader)

It also handles the special case where the welcome screen shows a logo instead of banner content.

#### File to Create

**Path**: `UIAPP/src/components/layout/ContentRouter.jsx`

#### Implementation Steps

**Step 2.2.1: Create the utility file**

Create `UIAPP/src/components/layout/ContentRouter.jsx`:

```javascript
/**
 * ContentRouter.jsx
 * -----------------
 * Utility that determines where banner content should appear
 * based on screen size and screen type.
 *
 * Logic:
 * - Mobile: Content in Section A2 (header)
 * - Tablet/Desktop: Content in Section B1B (subheader)
 * - Welcome screen (mobile): Logo in A2
 * - Welcome screen (desktop): No content in B1B
 */

import React from 'react';
import Logo from '../../Assets/Logo.png';

/**
 * Custom hook to route content to appropriate location
 *
 * @param {Object} params
 * @param {ReactNode} params.bannerContent - The content to display
 * @param {boolean} params.isWelcomeScreen - Whether this is the welcome screen
 * @param {boolean} params.isMobile - Whether viewport is mobile
 * @param {boolean} params.isTablet - Whether viewport is tablet
 * @param {boolean} params.isDesktop - Whether viewport is desktop
 *
 * @returns {Object} { mobileContent, desktopContent }
 */
export function useContentRouter({
  bannerContent,
  isWelcomeScreen,
  isMobile,
  isTablet,
  isDesktop
}) {
  // Determine content for SECTION A2 (mobile header)
  const mobileContent = React.useMemo(() => {
    if (isMobile && isWelcomeScreen) {
      // Welcome screen on mobile: Show logo in A2
      return (
        <img
          src={Logo}
          alt="Love Retold"
          style={{
            height: '30px',
            width: 'auto',
            objectFit: 'contain'
          }}
        />
      );
    }
    // All other mobile screens: Show bannerContent in A2
    return isMobile ? bannerContent : null;
  }, [isMobile, isWelcomeScreen, bannerContent]);

  // Determine content for SECTION B1B (tablet/desktop subheader)
  const desktopContent = React.useMemo(() => {
    // Welcome screen on tablet/desktop: Don't show banner in B1B
    if ((isTablet || isDesktop) && isWelcomeScreen) {
      return null;
    }
    // All other tablet/desktop screens: Show bannerContent in B1B
    return (isTablet || isDesktop) ? bannerContent : null;
  }, [isTablet, isDesktop, isWelcomeScreen, bannerContent]);

  return {
    mobileContent,
    desktopContent
  };
}

export default useContentRouter;
```

**Step 2.2.2: Update MasterLayout to use ContentRouter**

Open `UIAPP/src/components/MasterLayout.jsx`:

1. **Add the import** (after the LayoutHeader import):

```javascript
import { useContentRouter } from './layout/ContentRouter';
```

2. **Replace the renderA2Content and renderB1BContent functions** (lines 78-109)

Find these two functions:
```javascript
// Determine content for SECTION A2
const renderA2Content = () => {
  // ... existing code ...
};

// Determine content for SECTION B1B
const renderB1BContent = () => {
  // ... existing code ...
};
```

Replace them with:

```javascript
// Route content to appropriate location based on screen size
const { mobileContent, desktopContent } = useContentRouter({
  bannerContent,
  isWelcomeScreen,
  isMobile,
  isTablet,
  isDesktop
});
```

3. **Update LayoutHeader call** to use mobileContent:

```javascript
<LayoutHeader
  showBackButton={showBackButton}
  onBack={onBack}
  bannerContent={mobileContent}  // Changed from renderA2Content()
  iconA3={iconA3}
  isWelcomeScreen={isWelcomeScreen}
  isActiveRecordingScreen={isActiveRecordingScreen}
  isPausedRecordingScreen={isPausedRecordingScreen}
  bannerStyle={bannerStyle}
/>
```

4. **Find Section B1B** (around line 370) and update it:

Look for:
```javascript
{renderB1BContent()}
```

Replace with:
```javascript
{desktopContent}
```

**Step 2.2.3: Test the changes**

1. Save all files
2. Check the browser - everything should still look the same
3. Test content routing:

| Screen | Viewport | Where Content Should Appear |
|--------|----------|----------------------------|
| Welcome | Mobile | Logo in header (A2) |
| Welcome | Desktop | Logo in header only (not B1B) |
| Recording | Mobile | Banner text in header (A2) |
| Recording | Desktop | Banner text in subheader (B1B) |

**Step 2.2.4: Commit your changes**

```bash
git add UIAPP/src/components/layout/ContentRouter.jsx
git add UIAPP/src/components/MasterLayout.jsx
git commit -m "feat(phase-2): extract ContentRouter utility for content placement logic"
```

**Checkpoint**: MasterLayout should now be ~282 lines (down from 314).

---

### Step 2.3: Create TabletDesktopSubheader Component (2-3 hours)

#### What This Component Does

TabletDesktopSubheader renders Section B1 on tablet and desktop screens. It's the secondary header that appears below the main LayoutHeader and contains:
- B1A: Back button (45px)
- B1B: Banner content (flex)
- B1C: Icon slot (45px)

This component **only renders on tablet and desktop** - it doesn't appear on mobile.

#### File to Create

**Path**: `UIAPP/src/components/layout/TabletDesktopSubheader.jsx`

#### Implementation Steps

**Step 2.3.1: Create the component file**

Create `UIAPP/src/components/layout/TabletDesktopSubheader.jsx`:

```javascript
/**
 * TabletDesktopSubheader.jsx
 * ---------------------------
 * Secondary header section (B1) for tablet and desktop layouts.
 * Appears below the main LayoutHeader on larger screens.
 *
 * Layout: B1A (back button) | B1B (content) | B1C (icon)
 *
 * Important: This component should NOT render on mobile.
 * The parent component should handle the conditional rendering.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { MdChevronLeft } from 'react-icons/md';
import { useTokens } from '../../theme/TokenProvider';

function TabletDesktopSubheader({
  showBackButton = true,
  onBack = null,
  content = null,
  iconA3 = null
}) {
  const { tokens } = useTokens();

  return (
    <div style={{
      flex: '0 0 70px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxSizing: 'border-box'
    }}>
      {/* B1A - Left slot (45px) - Back button */}
      <div style={{
        flex: '0 0 45px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}>
        {showBackButton && onBack && (
          <MdChevronLeft
            size={38}
            color={tokens.colors.primary.DEFAULT}
            onClick={onBack}
            style={{ cursor: 'pointer' }}
          />
        )}
      </div>

      {/* B1B - Center flexible content */}
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        boxSizing: 'border-box',
        color: tokens.colors.primary.DEFAULT,
        fontWeight: tokens.fontWeight.normal,
        fontSize: tokens.fontSize['2xl'] // 24px - matches mobile Section A2
      }}>
        {content}
      </div>

      {/* B1C - Right slot (45px) - Icon */}
      <div style={{
        flex: '0 0 45px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}>
        <div style={{ transform: 'scale(1.2)' }}>
          {iconA3}
        </div>
      </div>
    </div>
  );
}

TabletDesktopSubheader.propTypes = {
  showBackButton: PropTypes.bool,
  onBack: PropTypes.func,
  content: PropTypes.node,
  iconA3: PropTypes.node
};

export default TabletDesktopSubheader;
```

**Step 2.3.2: Update MasterLayout to use TabletDesktopSubheader**

Open `UIAPP/src/components/MasterLayout.jsx`:

1. **Add the import** (after ContentRouter import):

```javascript
import TabletDesktopSubheader from './layout/TabletDesktopSubheader';
```

2. **Find the tablet/desktop Section B layout** (around line 307)

Look for this structure:
```javascript
) : (
  // Tablet/Desktop: Split into B1 and B2
  <div style={{
    // ... Section B container styles ...
  }}>
    {/* B1 - Top Section (70px fixed) with A1/A2/A3 layout */}
    <div style={{
      flex: '0 0 70px',
      // ... many lines of B1 rendering ...
    }}>
      {/* B1A - Left slot */}
      {/* B1B - Center content */}
      {/* B1C - Right slot */}
    </div>

    {/* B2 - Main Content (flex grow) */}
    <div style={{
      // ... B2 styles ...
    }}>
```

3. **Replace the B1 div** with the TabletDesktopSubheader component:

```javascript
) : (
  // Tablet/Desktop: Split into B1 and B2
  <div style={{
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minHeight: '270px',
    overflow: 'visible',
    width: '100%',
    maxWidth: '550px',
    margin: '0 auto',
    boxSizing: 'border-box'
  }}>
    {/* B1 - Top Section (70px fixed) */}
    <TabletDesktopSubheader
      showBackButton={showBackButton}
      onBack={onBack}
      content={desktopContent}
      iconA3={iconA3}
    />

    {/* B2 - Main Content (flex grow) */}
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 auto',
      width: '100%',
      padding: tokens.spacing[4],
      boxSizing: 'border-box'
    }}>
      {content}
      {overlay}
    </div>
  </div>
)}
```

**Step 2.3.3: Test the changes**

1. Save all files
2. Refresh the browser
3. Test on different screen sizes:

| Viewport | What to Check |
|----------|---------------|
| Mobile (<768px) | B1 section should NOT appear |
| Tablet (768-1023px) | B1 section appears with back button, content, icon |
| Desktop (≥1024px) | B1 section appears with back button, content, icon |
| All sizes | Back button in B1 works correctly |
| All sizes | Icon in B1C appears correctly |

4. Test these specific screens on tablet/desktop:
   - Welcome screen (B1B should be empty - no content)
   - Audio Test (B1B should show "Sound test")
   - Video Test (B1B should show "Video test")
   - Recording screens (B1B should show recording state)

**Step 2.3.4: Commit your changes**

```bash
git add UIAPP/src/components/layout/TabletDesktopSubheader.jsx
git add UIAPP/src/components/MasterLayout.jsx
git commit -m "feat(phase-2): extract TabletDesktopSubheader component for B1 section"
```

**Checkpoint**: MasterLayout should now be ~224 lines (down from 282).

---

### Step 2.4: Final Simplification & Documentation (1-2 hours)

#### What We're Doing

Now that we've extracted the complex parts, we'll:
1. Review MasterLayout for any remaining complexity
2. Add comprehensive comments
3. Verify the code is clean and maintainable
4. Ensure we've met the <200 line target

#### Implementation Steps

**Step 2.4.1: Review current MasterLayout**

Open `UIAPP/src/components/MasterLayout.jsx` and check:

1. **Line count**: Run `wc -l UIAPP/src/components/MasterLayout.jsx`
   - Should be around 220-224 lines
   - Target is <200 lines

2. **Remaining responsibilities**:
   - ✅ Welcome screen background injection (necessary)
   - ✅ Main layout structure (necessary)
   - ✅ Component composition (necessary)
   - ❌ Any complex conditionals or logic (should be extracted)

**Step 2.4.2: Add documentation comments**

At the top of MasterLayout.jsx, update the header comment:

```javascript
/**
 * MasterLayout.jsx
 * ----------------
 * Master layout structure used across all recording screens.
 * Provides consistent 3-section layout with unified header.
 *
 * Structure:
 * - SECTION A: LayoutHeader component (70-75px fixed)
 * - SECTION B: Main content area (flex grows)
 *   - Mobile: Single section
 *   - Tablet/Desktop: TabletDesktopSubheader (B1) + Content (B2)
 * - SECTION C: Bottom actions area (100-150px fixed)
 *
 * Components Used:
 * - LayoutHeader: Top navigation with back button, content, and icon
 * - TabletDesktopSubheader: Secondary header on tablet/desktop
 * - ContentRouter: Utility to route content to correct location
 *
 * Special Handling:
 * - Welcome screen: Transparent background on mobile with background image
 * - Recording screens: Dark background color for active/paused states
 *
 * Phase 2 Refactor: Extracted from 423-line monolithic component
 * See: LayoutHeader.jsx, TabletDesktopSubheader.jsx, ContentRouter.jsx
 */
```

**Step 2.4.3: Simplify prop destructuring**

At the start of the component, group related props:

```javascript
function MasterLayout({
  // Content props
  content = null,
  actions = null,
  children = null,
  overlay = null,

  // Header props
  showBanner = true,
  bannerContent = null,
  showBackButton = true,
  onBack = null,
  iconA3 = null,
  bannerStyle = null,

  // State props
  className = ''
}) {
```

**Step 2.4.4: Add inline comments for clarity**

Add brief comments before each major section:

```javascript
// Determine screen states for conditional styling
const isWelcomeScreen = className.includes('welcome-state');
const isActiveRecordingScreen = className.includes('active-recording-state');
const isPausedRecordingScreen = className.includes('paused-recording-state');

// Route banner content to appropriate location (mobile A2 vs desktop B1B)
const { mobileContent, desktopContent } = useContentRouter({
  // ... props ...
});

// Welcome screen background injection (mobile only)
useEffect(() => {
  // ... existing code ...
}, [isWelcomeScreen]);
```

**Step 2.4.5: Verify final structure**

Your MasterLayout should now have this clean structure:

```javascript
// Imports (10-15 lines)

function MasterLayout({ props }) {
  // Hooks (5 lines)
  // State derivation (5 lines)
  // Content routing (5 lines)
  // Background injection effect (25 lines)

  return (
    // Page container (5 lines)
    //   LayoutHeader (8 lines)
    //   Content Container (5 lines)
    //     Section B - Mobile (8 lines)
    //     Section B - Tablet/Desktop (15 lines)
    //       TabletDesktopSubheader (8 lines)
    //       B2 Content (8 lines)
    //     Section C - Actions (10 lines)
    //   Children (2 lines)
    // Total render: ~80 lines
  );
}

// PropTypes (15 lines)
// Export (1 line)
```

**Step 2.4.6: Check final line count**

```bash
wc -l UIAPP/src/components/MasterLayout.jsx
```

**Expected result**: 180-200 lines

If you're over 200 lines, look for:
- Unnecessary blank lines
- Verbose comments that can be shortened
- Style objects that can be simplified

**Step 2.4.7: Final commit**

```bash
git add UIAPP/src/components/MasterLayout.jsx
git commit -m "docs(phase-2): add comprehensive documentation and finalize MasterLayout simplification"
```

---

## Testing & Validation

### Comprehensive Testing Checklist

After completing all 4 steps, test thoroughly:

#### 1. Visual Regression Testing

Open each screen and verify it looks correct:

- [ ] **WelcomeScreen**
  - [ ] Mobile: Background image visible, logo in center
  - [ ] Tablet: Logo top-left, no background image
  - [ ] Desktop: Logo top-left, no background image

- [ ] **ChooseModeScreen**
  - [ ] Mobile: "Choose recording mode" in header
  - [ ] Tablet/Desktop: "Choose recording mode" in B1B section

- [ ] **AudioAccess**
  - [ ] Header shows "Audio permission"
  - [ ] Back button works

- [ ] **AudioTest**
  - [ ] Mobile: "Sound test" in header
  - [ ] Tablet/Desktop: "Sound test" in B1B, gear icon in B1C
  - [ ] Visualizer displays correctly

- [ ] **VideoAccess**
  - [ ] Header shows "Camera permission"
  - [ ] Back button works

- [ ] **VideoTest**
  - [ ] Mobile: "Video test" in header
  - [ ] Tablet/Desktop: "Video test" in B1B, gear icon in B1C
  - [ ] Video preview displays correctly

- [ ] **ReadyToRecordScreen**
  - [ ] Header shows correct prompt state
  - [ ] Countdown displays

- [ ] **PromptReadScreen**
  - [ ] "Your prompt" shows in correct location
  - [ ] PromptCard displays correctly

- [ ] **ActiveRecordingScreen**
  - [ ] Dark background
  - [ ] RecordingBar shows in header/B1B
  - [ ] Recording timer visible

- [ ] **PausedRecordingScreen**
  - [ ] Dark background
  - [ ] "Paused" state visible

- [ ] **ReviewRecordingScreen**
  - [ ] "Review & submit" in correct location
  - [ ] Media player displays correctly
  - [ ] Video controls work (if video)

#### 2. Functionality Testing

Test all interactive elements:

- [ ] **Back button**
  - [ ] Works on mobile (Section A1)
  - [ ] Works on tablet/desktop (Section B1A)
  - [ ] Navigates to correct previous screen

- [ ] **Top-right icons**
  - [ ] Gear icon appears on Audio Test
  - [ ] Gear icon appears on Video Test
  - [ ] Icons are clickable and open settings

- [ ] **Action buttons**
  - [ ] Continue buttons work
  - [ ] Recording buttons work
  - [ ] Upload button works
  - [ ] Start Over button works

#### 3. Responsive Behavior Testing

Test at each breakpoint:

**Mobile (<768px)**:
- [ ] Single-column layout
- [ ] Content in Section A2
- [ ] No B1 section
- [ ] Actions at bottom

**Tablet (768-1023px)**:
- [ ] Centered 550px max-width container
- [ ] Logo in LayoutHeader
- [ ] Content in TabletDesktopSubheader (B1B)
- [ ] B1 section visible with back button and icon

**Desktop (≥1024px)**:
- [ ] Same as tablet behavior
- [ ] Verify all screens still centered

#### 4. Browser Compatibility Testing

Test in multiple browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### 5. Performance Testing

Check for any slowdowns:

- [ ] Page loads quickly
- [ ] No lag when resizing window
- [ ] Smooth transitions between screens
- [ ] No console errors

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: Import Errors

**Symptom**: `Cannot find module './layout/LayoutHeader'`

**Solution**:
1. Verify the file exists: `ls UIAPP/src/components/layout/LayoutHeader.jsx`
2. Check the import path is correct
3. Make sure you created the `layout` directory
4. Restart your dev server: `npm start`

#### Issue 2: Props Not Passing Correctly

**Symptom**: Back button doesn't work, or content doesn't appear

**Solution**:
1. Check you're passing all required props to each component
2. Verify prop names match exactly (case-sensitive)
3. Use React DevTools to inspect component props
4. Add console.logs to verify data flow:

```javascript
// In MasterLayout
console.log('Passing to LayoutHeader:', { mobileContent, showBackButton });

// In LayoutHeader
console.log('Received in LayoutHeader:', { bannerContent, showBackButton });
```

#### Issue 3: Layout Looks Different

**Symptom**: Spacing, colors, or positioning changed

**Solution**:
1. Compare your extracted component styles with original MasterLayout
2. Make sure you copied all inline styles exactly
3. Check that conditional logic is preserved (e.g., `isMobile ? 'value1' : 'value2'`)
4. Verify you're using the same tokens: `tokens.spacing[4]`, `tokens.colors.primary.DEFAULT`

#### Issue 4: B1 Section Appearing on Mobile

**Symptom**: Tablet/desktop subheader shows on mobile

**Solution**:
1. Verify the conditional rendering in MasterLayout:
```javascript
{isMobile ? (
  // Mobile layout
) : (
  // Tablet/Desktop layout with TabletDesktopSubheader
)}
```
2. Check `useBreakpoint()` is working correctly
3. Test by manually resizing the browser window

#### Issue 5: Welcome Screen Background Not Working

**Symptom**: Background image doesn't appear on mobile welcome screen

**Solution**:
1. Verify the `useEffect` for background injection is still in MasterLayout
2. Check `isWelcomeScreen` is being calculated correctly
3. Ensure `className` prop includes 'welcome-state'
4. Check the CSS injection is happening (inspect `<head>` in DevTools)

#### Issue 6: Content Not Routing Correctly

**Symptom**: Banner content appears in wrong location or doesn't appear at all

**Solution**:
1. Verify `useContentRouter` is being called correctly
2. Check you're passing `mobileContent` to LayoutHeader
3. Check you're passing `desktopContent` to TabletDesktopSubheader
4. Add debug logging to ContentRouter:

```javascript
console.log('ContentRouter:', {
  isMobile,
  isWelcomeScreen,
  mobileContent: !!mobileContent,
  desktopContent: !!desktopContent
});
```

### Getting Help

If you get stuck:

1. **Check the git history**: Compare your changes with the original code
2. **Use git diff**: See exactly what changed
   ```bash
   git diff UIAPP/src/components/MasterLayout.jsx
   ```
3. **Restore from backup**: If needed, restore the original
   ```bash
   cp UIAPP/src/components/MasterLayout.backup.jsx UIAPP/src/components/MasterLayout.jsx
   ```
4. **Review the original analysis**: Re-read RESPONSIVE_ARCHITECTURE_ANALYSIS.md
5. **Ask for help**: Provide specific error messages and what you've tried

---

## Success Criteria

### Phase 2 Complete When:

✅ **Code Metrics**:
- [ ] MasterLayout.jsx is <200 lines (target: ~180 lines)
- [ ] 3 new components created (LayoutHeader, ContentRouter, TabletDesktopSubheader)
- [ ] All imports working correctly
- [ ] No console errors

✅ **Visual Testing**:
- [ ] All 14 screens render identically to before
- [ ] No visual regressions
- [ ] Responsive behavior preserved
- [ ] Special states (welcome, recording) work correctly

✅ **Functionality Testing**:
- [ ] All back buttons work
- [ ] All icons clickable
- [ ] All action buttons functional
- [ ] Navigation flows correctly

✅ **Code Quality**:
- [ ] Each component has clear, single responsibility
- [ ] Props are well-defined with PropTypes
- [ ] Code is readable with helpful comments
- [ ] No duplicate code between components

✅ **Git Hygiene**:
- [ ] 4 clear commits (one per step)
- [ ] Descriptive commit messages
- [ ] All changes on feature branch
- [ ] Ready for code review/merge

### Measuring Success

Run these commands to verify metrics:

```bash
# Check line count
wc -l UIAPP/src/components/MasterLayout.jsx
# Expected: 180-200 lines

# Check new files exist
ls UIAPP/src/components/layout/
# Expected: LayoutHeader.jsx, ContentRouter.jsx, TabletDesktopSubheader.jsx

# Check no TypeScript/ESLint errors
npm run lint
# Expected: No errors related to your changes

# Verify git commits
git log --oneline -4
# Expected: 4 commits for Phase 2 steps
```

---

## Next Steps

After Phase 2 is complete and validated:

1. **Create a pull request** for code review
2. **Document any learnings** or difficulties encountered
3. **Update Phase 2 status** in project tracking
4. **Prepare for Phase 3**: Screen Standardization (14 screens to migrate)

Phase 3 will use the same extraction pattern you learned here, but applied to screen components to use the `useResponsiveLayout` hook created in Phase 1.

---

## Appendix

### File Structure Reference

```
UIAPP/src/
├── components/
│   ├── layout/                          ← NEW DIRECTORY
│   │   ├── LayoutHeader.jsx            ← Step 2.1
│   │   ├── ContentRouter.jsx           ← Step 2.2
│   │   └── TabletDesktopSubheader.jsx  ← Step 2.3
│   ├── MasterLayout.jsx                ← MODIFIED (423 → ~180 lines)
│   └── ... (other components)
├── hooks/
│   ├── useBreakpoint.js                ← Used by new components
│   └── useResponsiveLayout.js          ← Created in Phase 1
└── theme/
    └── TokenProvider.jsx               ← Used by new components
```

### Estimated Time Breakdown

| Step | Task | Time | Running Total |
|------|------|------|---------------|
| 2.1 | Create LayoutHeader | 2-3 hours | 2-3 hours |
| 2.2 | Create ContentRouter | 1-2 hours | 3-5 hours |
| 2.3 | Create TabletDesktopSubheader | 2-3 hours | 5-8 hours |
| 2.4 | Final simplification | 1-2 hours | 6-10 hours |
| **Total** | | **6-10 hours** | |

Note: Times include implementation, testing, and debugging.

### Key Takeaways

**What You Learned**:
1. ✅ How to extract components from monolithic code
2. ✅ How to design clean component APIs
3. ✅ How to preserve functionality during refactoring
4. ✅ How to test incremental changes
5. ✅ The Single Responsibility Principle in action

**Best Practices Applied**:
- Extract one component at a time
- Test after each change
- Commit frequently with clear messages
- Keep component props simple (5-8 props max)
- Document your code
- Preserve existing behavior

**Skills for Future Phases**:
- Phase 3 will use similar extraction patterns
- You'll apply these techniques to screen components
- The pattern: identify responsibility → extract → test → commit

---

## Document Metadata

**Version**: 1.0
**Last Updated**: January 2025
**Author**: Senior Frontend Developer
**Reviewed By**: Architecture Team
**Target Audience**: Junior/Mid-level React Developers
**Prerequisites**: Phase 1 Complete
**Related Documents**:
- RESPONSIVE_ARCHITECTURE_ANALYSIS.md
- Phase 1 Implementation Summary
- Phase 3 Planning (coming next)

---

**Good luck! Take your time, test thoroughly, and don't hesitate to ask questions. 🚀**
