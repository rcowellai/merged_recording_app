/**
 * C09 E2E Test: Recording Flow (localStorage Mode)
 * ===============================================
 * 
 * End-to-end tests for the recording flow using localStorage backend.
 * Tests the complete user journey from landing to recording completion.
 */

import { test, expect } from '@playwright/test';

test.describe('Recording Flow - localStorage Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app in localStorage mode
    await page.goto('/?mode=localStorage');
    
    // Wait for the app to load
    await expect(page.locator('text=Choose your recording mode')).toBeVisible({ timeout: 10000 });
  });

  test('should display recording mode selection on load', async ({ page }) => {
    // Check that audio and video buttons are visible
    await expect(page.locator('button:has-text("Audio")')).toBeVisible();
    await expect(page.locator('button:has-text("Video")')).toBeVisible();
    
    // Check for prompt card
    await expect(page.locator('text=Tell us a story')).toBeVisible();
  });

  test('should handle audio recording flow', async ({ page }) => {
    // Grant microphone permissions (simulated in test environment)
    await page.context().grantPermissions(['microphone']);
    
    // Click Audio button
    await page.click('button:has-text("Audio")');
    
    // Should show recording interface
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
    
    // Click Start recording
    await page.click('button:has-text("Start recording")');
    
    // Should show countdown
    await expect(page.locator('text=3')).toBeVisible({ timeout: 2000 });
    
    // Wait for recording to start (after countdown)
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Click Pause
    await page.click('button:has-text("Pause")');
    
    // Should show Resume and Done buttons
    await expect(page.locator('button:has-text("Resume")')).toBeVisible();
    await expect(page.locator('button:has-text("Done")')).toBeVisible();
    
    // Click Done to finish recording
    await page.click('button:has-text("Done")');
    
    // Should show review interface
    await expect(page.locator('text=Review your recording')).toBeVisible({ timeout: 5000 });
    
    // Should show Upload button
    await expect(page.locator('button:has-text("Upload")')).toBeVisible();
  });

  test('should handle video recording flow', async ({ page }) => {
    // Grant camera and microphone permissions
    await page.context().grantPermissions(['camera', 'microphone']);
    
    // Click Video button
    await page.click('button:has-text("Video")');
    
    // Should show recording interface with video preview
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
    
    // Click Start recording
    await page.click('button:has-text("Start recording")');
    
    // Wait for countdown and recording to start
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Let it record for a moment
    await page.waitForTimeout(2000);
    
    // Click Pause
    await page.click('button:has-text("Pause")');
    
    // Click Done
    await page.click('button:has-text("Done")');
    
    // Should show review interface with video player
    await expect(page.locator('text=Review your recording')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Upload")')).toBeVisible();
  });

  test('should handle recording timer and max duration', async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
    
    // Start audio recording
    await page.click('button:has-text("Audio")');
    await page.click('button:has-text("Start recording")');
    
    // Wait for recording to start
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Check that timer is visible and updating
    const timer = page.locator('[data-testid="recording-timer"], .recording-bar, text=/0:0[0-9]|0:[12][0-9]|0:30/');
    await expect(timer.first()).toBeVisible();
    
    // Wait a few seconds and check timer progresses
    await page.waitForTimeout(3000);
    
    // Timer should show some progress (though we won't wait 30 seconds in test)
    const timerText = await timer.first().textContent();
    expect(timerText).toMatch(/0:0[3-9]|0:[12][0-9]|0:30/);
  });

  test('should handle upload flow', async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
    
    // Complete a short recording
    await page.click('button:has-text("Audio")');
    await page.click('button:has-text("Start recording")');
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    
    // Wait a moment then stop
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Pause")');
    await page.click('button:has-text("Done")');
    
    // Upload the recording
    await expect(page.locator('button:has-text("Upload")')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Upload")');
    
    // Should show upload progress
    await expect(page.locator('text=Uploading', 'text=Upload complete', '[data-testid="progress-overlay"]')).toBeVisible({ timeout: 10000 });
    
    // Should eventually show success screen or confetti
    await expect(page.locator('text=Success', 'text=Thank you', '[data-testid="confetti"]')).toBeVisible({ timeout: 15000 });
  });

  test('should handle start over functionality', async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
    
    // Start and complete a recording
    await page.click('button:has-text("Audio")');
    await page.click('button:has-text("Start recording")');
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Pause")');
    await page.click('button:has-text("Done")');
    
    // Click Start Over
    await expect(page.locator('button:has-text("Start Over")')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Start Over")');
    
    // Should show confirmation dialog
    await expect(page.locator('text=Start over?', 'text=Are you sure?')).toBeVisible();
    
    // Confirm start over
    await page.click('button:has-text("Yes"), button:has-text("Confirm"), button:has-text("Start Over")');
    
    // Should return to mode selection
    await expect(page.locator('button:has-text("Audio")')).toBeVisible();
    await expect(page.locator('button:has-text("Video")')).toBeVisible();
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that interface adapts
    await expect(page.locator('button:has-text("Audio")')).toBeVisible();
    await expect(page.locator('button:has-text("Video")')).toBeVisible();
    
    // Start recording flow
    await page.context().grantPermissions(['microphone']);
    await page.click('button:has-text("Audio")');
    
    // Check mobile layout
    await expect(page.locator('button:has-text("Start recording")')).toBeVisible({ timeout: 5000 });
  });
});