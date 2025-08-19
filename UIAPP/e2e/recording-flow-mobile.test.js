/**
 * C09 E2E Test: Mobile Recording Flow
 * ==================================
 * 
 * Mobile-specific E2E tests for responsive design and touch interactions.
 * Tests both localStorage and Firebase modes on mobile viewports.
 */

import { test, expect } from '@playwright/test';

test.describe('Mobile Recording Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should display correctly on mobile viewport - localStorage', async ({ page }) => {
    await page.goto('/?mode=localStorage');
    
    // Check mobile layout
    await expect(page.locator('button:has-text("Audio")')).toBeVisible();
    await expect(page.locator('button:has-text("Video")')).toBeVisible();
    
    // Check that buttons are properly sized for touch
    const audioButton = page.locator('button:has-text("Audio")');
    const buttonBox = await audioButton.boundingBox();
    expect(buttonBox.width).toBeGreaterThan(44); // Minimum touch target size
    expect(buttonBox.height).toBeGreaterThan(44);
  });

  test('should handle touch interactions - localStorage', async ({ page }) => {
    await page.goto('/?mode=localStorage');
    await page.context().grantPermissions(['microphone']);
    
    // Tap audio button
    await page.tap('button:has-text("Audio")');
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
    
    // Tap start recording
    await page.tap('button:has-text("Start recording")');
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Tap pause
    await page.tap('button:has-text("Pause")');
    await expect(page.locator('button:has-text("Resume")')).toBeVisible();
    
    // Tap done
    await page.tap('button:has-text("Done")');
    await expect(page.locator('button:has-text("Upload")')).toBeVisible({ timeout: 5000 });
  });

  test('should display recording timer properly on mobile', async ({ page }) => {
    await page.goto('/?mode=localStorage');
    await page.context().grantPermissions(['microphone']);
    
    // Start recording
    await page.tap('button:has-text("Audio")');
    await page.tap('button:has-text("Start recording")');
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Check that recording bar is visible and properly positioned on mobile
    const recordingBar = page.locator('.recording-bar-container, [data-testid="recording-timer"]');
    await expect(recordingBar.first()).toBeVisible();
    
    // Check it doesn't overlap with other UI elements
    const recordingBarBox = await recordingBar.first().boundingBox();
    expect(recordingBarBox.y).toBeGreaterThan(0); // Not at the very top
    expect(recordingBarBox.y).toBeLessThan(200); // But still in header area
  });

  test('should handle video recording on mobile viewport', async ({ page }) => {
    await page.goto('/?mode=localStorage');
    await page.context().grantPermissions(['camera', 'microphone']);
    
    // Start video recording
    await page.tap('button:has-text("Video")');
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
    
    // Video preview should be appropriately sized for mobile
    const videoPreview = page.locator('video, .video-placeholder, .single-plus-left');
    if (await videoPreview.first().isVisible()) {
      const previewBox = await videoPreview.first().boundingBox();
      expect(previewBox.width).toBeLessThan(375); // Fits in mobile width
    }
  });

  test('should work on different mobile screen sizes', async ({ page }) => {
    const screenSizes = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 667, name: 'iPhone 8' },
      { width: 414, height: 896, name: 'iPhone XR' },
      { width: 360, height: 640, name: 'Android' }
    ];
    
    for (const size of screenSizes) {
      console.log(`Testing ${size.name} (${size.width}x${size.height})`);
      
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/?mode=localStorage');
      
      // Basic interface should be visible
      await expect(page.locator('button:has-text("Audio")')).toBeVisible();
      await expect(page.locator('button:has-text("Video")')).toBeVisible();
      
      // Start a quick recording flow
      await page.context().grantPermissions(['microphone']);
      await page.tap('button:has-text("Audio")');
      await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle mobile orientation changes', async ({ page }) => {
    await page.goto('/?mode=localStorage');
    
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('button:has-text("Audio")')).toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await expect(page.locator('button:has-text("Audio")')).toBeVisible();
    
    // Interface should still be usable
    await page.context().grantPermissions(['microphone']);
    await page.tap('button:has-text("Audio")');
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
  });

  test('should work with Firebase mode on mobile', async ({ page }) => {
    await page.goto('/?sessionId=test-session-mobile&mode=firebase');
    
    // Wait for Firebase initialization
    await expect(page.locator('button:has-text("Audio")')).toBeVisible({ timeout: 15000 });
    
    // Mobile Firebase flow should work the same
    await page.context().grantPermissions(['microphone']);
    await page.tap('button:has-text("Audio")');
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
    
    await page.tap('button:has-text("Start recording")');
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
  });

  test('should handle mobile-specific gestures and interactions', async ({ page }) => {
    await page.goto('/?mode=localStorage');
    await page.context().grantPermissions(['microphone']);
    
    // Start recording flow
    await page.tap('button:has-text("Audio")');
    await page.tap('button:has-text("Start recording")');
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Test double-tap doesn't interfere
    await page.dblclick('button:has-text("Pause")');
    await expect(page.locator('button:has-text("Resume")')).toBeVisible();
    
    // Test that UI responds appropriately to touches
    await page.tap('button:has-text("Done")');
    await expect(page.locator('button:has-text("Upload")')).toBeVisible({ timeout: 5000 });
  });

  test('should display error messages appropriately on mobile', async ({ page }) => {
    // Test Firebase error on mobile
    await page.goto('/?sessionId=invalid-session&mode=firebase');
    
    // Error messages should be readable on mobile
    const errorElement = page.locator('text=error, text=invalid, text=expired').first();
    if (await errorElement.isVisible({ timeout: 10000 })) {
      const errorBox = await errorElement.boundingBox();
      expect(errorBox.width).toBeLessThan(375); // Fits in mobile width
      expect(errorBox.height).toBeGreaterThan(0);
    }
  });

  test('should handle mobile browser differences', async ({ page, browserName }) => {
    // iOS Safari vs Chrome vs Firefox mobile handling
    console.log(`Testing mobile in ${browserName}`);
    
    await page.goto('/?mode=localStorage');
    
    // Basic functionality should work across mobile browsers
    await expect(page.locator('button:has-text("Audio")')).toBeVisible();
    
    // Media permissions might behave differently
    await page.context().grantPermissions(['microphone']);
    await page.tap('button:has-text("Audio")');
    
    // Should work regardless of mobile browser
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
  });
});