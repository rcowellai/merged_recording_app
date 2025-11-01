/**
 * zIndexRegistry.js
 * -----------------
 * Centralized z-index management system for consistent UI layering.
 *
 * Architecture:
 * - 10 layers (0-9) with 1000-point ranges each
 * - Layer 0 (0-999): Base content
 * - Layer 1 (1000-1999): Interactive elements
 * - Layer 2 (2000-2999): Elevated content
 * - Layer 3 (3000-3999): Sticky navigation
 * - Layer 4 (4000-4999): Floating UI
 * - Layer 5 (5000-5999): In-context overlays
 * - Layer 6 (6000-6999): Modals
 * - Layer 7 (7000-7999): Full-screen overlays
 * - Layer 8 (8000-8999): Drawers
 * - Layer 9 (9000-9999): System dialogs
 *
 * Visual Stacking Order (Bottom → Top):
 * ┌─────────────────────────────────────────────────────────┐
 * │  Layer 9: Dialogs & System Alerts      (9000-9999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 8: Drawers (Vaul)                (8000-8999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 7: Full-Screen Overlays         (7000-7999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 6: Modals & Popovers             (6000-6999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 5: In-Context Overlays          (5000-5999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 4: Floating UI Elements         (4000-4999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 3: Sticky Navigation            (3000-3999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 2: Elevated Content             (2000-2999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 1: Base Interactive Elements    (1000-1999)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 0: Base Content                 (0-999)         │
 * └─────────────────────────────────────────────────────────┘
 *
 * Usage:
 * ```javascript
 * import { getZIndex } from './theme/zIndexRegistry';
 *
 * const overlayStyle = {
 *   zIndex: getZIndex('countdownOverlay')
 * };
 * ```
 *
 * Or via TokenProvider:
 * ```javascript
 * import { useTokens } from './theme/TokenProvider';
 *
 * const { tokens } = useTokens();
 * const overlayStyle = {
 *   zIndex: tokens.zIndex.countdownOverlay
 * };
 * ```
 */

export const Z_INDEX_LAYERS = {
  // ============================================================
  // Layer 0: Base Content (0-999)
  // ============================================================
  base: 0,                    // Default content layer
  content: 100,               // Standard content
  audioRecorder: 200,         // Audio recorder component
  confetti: 500,              // Confetti background layer

  // ============================================================
  // Layer 1: Base Interactive Elements (1000-1999)
  // ============================================================
  interactive: 1000,          // Buttons, form controls, inputs

  // ============================================================
  // Layer 2: Elevated Content (2000-2999)
  // ============================================================
  elevated: 2000,             // Cards, panels, elevated sections

  // ============================================================
  // Layer 3: Sticky Navigation (3000-3999)
  // ============================================================
  header: 3000,               // MasterLayout sticky header
  recordingBar: 3100,         // Recording status bar (appears in header)

  // ============================================================
  // Layer 4: Floating UI Elements (4000-4999)
  // ============================================================
  dropdown: 4000,             // Dropdown menus, select options
  tooltip: 4500,              // Tooltips, hints

  // ============================================================
  // Layer 5: In-Context Overlays (5000-5999)
  // ============================================================
  pausedOverlay: 5000,        // Paused recording overlay
  plyrControls: 5100,         // Plyr media player controls

  // ============================================================
  // Layer 6: Modals & Popovers (6000-6999)
  // ============================================================
  modal: 6000,                // Standard modals, dialogs
  popover: 6500,              // Popovers above modals

  // ============================================================
  // Layer 7: Full-Screen Overlays (7000-7999)
  // ============================================================
  countdownOverlay: 7000,     // Countdown overlay (3-2-1)
  progressOverlay: 7100,      // Upload progress overlay

  // ============================================================
  // Layer 8: Drawers (8000-8999)
  // ============================================================
  drawerBackdrop: 8000,       // Vaul drawer backdrop/overlay
  drawerContent: 8100,        // Vaul drawer content (above backdrop)

  // ============================================================
  // Layer 9: System Dialogs & Alerts (9000-9999)
  // ============================================================
  systemDialog: 9000,         // Critical system dialogs
  toast: 9500,                // Toast notifications (highest layer)
};

/**
 * Get z-index value for a specific layer with validation.
 *
 * @param {string} layer - Layer name from Z_INDEX_LAYERS
 * @returns {number} Z-index value
 * @throws {Error} If layer name is invalid
 *
 * @example
 * getZIndex('header') // Returns 3000
 * getZIndex('invalid') // Throws error with helpful message
 */
export function getZIndex(layer) {
  if (!(layer in Z_INDEX_LAYERS)) {
    const validLayers = Object.keys(Z_INDEX_LAYERS).join(', ');
    throw new Error(
      `Invalid z-index layer: "${layer}". Valid layers: ${validLayers}`
    );
  }
  return Z_INDEX_LAYERS[layer];
}

/**
 * Get all available layer names for documentation/debugging.
 *
 * @returns {string[]} Array of valid layer names
 *
 * @example
 * getAvailableLayers()
 * // Returns: ['base', 'content', 'audioRecorder', 'confetti', ...]
 */
export function getAvailableLayers() {
  return Object.keys(Z_INDEX_LAYERS);
}

/**
 * Validate if a layer name exists in the registry.
 *
 * @param {string} layer - Layer name to validate
 * @returns {boolean} True if layer exists
 *
 * @example
 * isValidLayer('header') // Returns true
 * isValidLayer('invalid') // Returns false
 */
export function isValidLayer(layer) {
  return layer in Z_INDEX_LAYERS;
}

export default Z_INDEX_LAYERS;
