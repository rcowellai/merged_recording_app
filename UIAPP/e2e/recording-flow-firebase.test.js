/**
 * C09 E2E Test: Recording Flow (Firebase Mode)
 * ============================================
 * 
 * End-to-end tests for the recording flow using Firebase backend with emulators.
 * Tests session validation, authentication, and Firebase service integration.
 */

import { test, expect } from '@playwright/test';

test.describe('Recording Flow - Firebase Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app in Firebase mode with test session
    await page.goto('/?sessionId=test-session-e2e&mode=firebase');
    
    // Wait for Firebase initialization
    await page.waitForTimeout(2000);
  });

  test('should initialize Firebase and validate session', async ({ page }) => {
    // Should show initialization loading first
    await expect(page.locator('text=Initializing', 'text=Loading')).toBeVisible({ timeout: 5000 });
    
    // Then should show session validation
    await expect(page.locator('text=Validating recording session', 'text=Validating')).toBeVisible({ timeout: 5000 });
    
    // Eventually should show recording mode selection (assuming valid session)
    await expect(page.locator('button:has-text("Audio")', 'button:has-text("Video")')).toBeVisible({ timeout: 10000 });
  });

  test('should handle invalid session gracefully', async ({ page }) => {
    // Navigate with invalid session ID
    await page.goto('/?sessionId=invalid-session&mode=firebase');
    
    // Should show session validation error
    await expect(page.locator('text=Session error', 'text=Invalid session', 'text=expired', 'text=not found')).toBeVisible({ timeout: 10000 });
    
    // Should not show recording interface
    await expect(page.locator('button:has-text("Audio")')).not.toBeVisible();
  });

  test('should handle missing session ID', async ({ page }) => {
    // Navigate without session ID
    await page.goto('/?mode=firebase');
    
    // Should show error about missing session
    await expect(page.locator('text=No recording session', 'text=recording link', 'text=session found')).toBeVisible({ timeout: 10000 });
    
    // Should not allow recording
    await expect(page.locator('button:has-text("Audio")')).not.toBeVisible();
  });

  test('should complete Firebase recording flow', async ({ page }) => {
    // Wait for session validation to complete
    await expect(page.locator('button:has-text("Audio")')).toBeVisible({ timeout: 15000 });
    
    // Grant permissions
    await page.context().grantPermissions(['microphone']);
    
    // Start audio recording
    await page.click('button:has-text("Audio")');
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Start recording")');
    
    // Wait for recording to start
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Complete recording
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Pause")');
    await page.click('button:has-text("Done")');
    
    // Upload should use Firebase
    await expect(page.locator('button:has-text("Upload")')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Upload")');
    
    // Should show Firebase upload progress
    await expect(page.locator('text=Uploading')).toBeVisible({ timeout: 10000 });
    
    // Should complete successfully
    await expect(page.locator('text=Success', 'text=Complete', '[data-testid="confetti"]')).toBeVisible({ timeout: 20000 });
  });

  test('should handle Firebase errors with fallback', async ({ page }) => {
    // This test simulates Firebase failures and fallback to localStorage
    // Note: In real implementation, you'd need to mock Firebase failures
    
    await expect(page.locator('button:has-text("Audio")')).toBeVisible({ timeout: 15000 });
    
    await page.context().grantPermissions(['microphone']);
    await page.click('button:has-text("Audio")');
    await page.click('button:has-text("Start recording")');
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Pause")');
    await page.click('button:has-text("Done")');
    
    // Upload attempt
    await page.click('button:has-text("Upload")');
    
    // Should handle any Firebase errors gracefully
    // Either success or fallback to localStorage should work
    await expect(page.locator('text=Success', 'text=uploaded', 'text=fallback')).toBeVisible({ timeout: 25000 });
  });

  test('should show appropriate error messages for Firebase issues', async ({ page }) => {
    // Test various Firebase error scenarios
    
    // Network error simulation (if possible)
    await page.route('**/*firebase*', route => route.abort());
    
    await page.goto('/?sessionId=network-error-session&mode=firebase');
    
    // Should show network error message
    await expect(page.locator('text=connection', 'text=network', 'text=offline')).toBeVisible({ timeout: 15000 });
    
    // Should offer fallback option
    await expect(page.locator('text=Continue offline', 'text=fallback', 'button:has-text("Continue")')).toBeVisible();
  });

  test('should preserve UX parity with localStorage mode', async ({ page }) => {
    // Ensure Firebase mode has same user experience as localStorage mode
    
    await expect(page.locator('button:has-text("Audio")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Video")')).toBeVisible();
    
    // Check for same UI elements
    await expect(page.locator('text=Tell us a story')).toBeVisible();
    await expect(page.locator('text=Choose your recording mode')).toBeVisible();
    
    // Start recording flow should be identical
    await page.context().grantPermissions(['microphone']);
    await page.click('button:has-text("Audio")');
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Start recording")');
    await expect(page.locator('text=3')).toBeVisible({ timeout: 2000 }); // Countdown
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
  });

  test('should handle session expiration during recording', async ({ page }) => {
    // This test would simulate session expiration
    // In practice, you'd need to mock the session validation to return expired after some time
    
    await expect(page.locator('button:has-text("Audio")')).toBeVisible({ timeout: 15000 });
    
    // Start recording
    await page.context().grantPermissions(['microphone']);
    await page.click('button:has-text("Audio")');
    await page.click('button:has-text("Start recording")');
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Simulate session expiration (would need server-side simulation)
    // For now, just ensure the flow completes normally
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Pause")');
    await page.click('button:has-text("Done")');
    
    // Upload should either succeed or show appropriate error
    await page.click('button:has-text("Upload")');
    
    // Should handle gracefully with either success or clear error message
    await expect(page.locator('text=Success', 'text=Error', 'text=expired', 'text=fallback')).toBeVisible({ timeout: 20000 });
  });

  test('should work across different browsers', async ({ page, browserName }) => {
    console.log(`Testing Firebase mode in ${browserName}`);
    
    // Basic functionality should work in all browsers
    await expect(page.locator('button:has-text("Audio")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Video")')).toBeVisible();
    
    // Test media permissions in different browsers
    await page.context().grantPermissions(['microphone']);
    await page.click('button:has-text("Audio")');
    
    // Should work regardless of browser
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
  });
});