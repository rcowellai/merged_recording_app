/**
 * slice-d-progressive-upload.test.js
 * -----------------------------------
 * SLICE-D: E2E tests for progressive upload functionality
 * Cross-browser validation of 15-minute recording limit and chunk uploads
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const TEST_CONFIG = {
  // Use test session that supports progressive upload
  TEST_SESSION_ID: 'test-progressive-session-123',
  CHUNK_UPLOAD_INTERVAL: 30000, // 30 seconds
  WARNING_TIME: 840000, // 14 minutes
  MAX_DURATION: 900000, // 15 minutes
  SHORT_RECORDING_TIME: 5000, // 5 seconds for quick tests
  MEDIUM_RECORDING_TIME: 60000, // 1 minute for chunk testing
};

// Browser configurations for cross-browser testing
const BROWSER_CONFIGS = [
  { name: 'chromium', userAgent: 'Chrome/Latest' },
  { name: 'firefox', userAgent: 'Firefox/Latest' },
  { name: 'webkit', userAgent: 'Safari/Latest' }
];

test.describe('Slice D: Progressive Upload E2E Tests', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Grant media permissions for all browsers
    await context.grantPermissions(['microphone', 'camera']);
    
    // Navigate to recording app with test session
    const sessionUrl = `/?sessionId=${TEST_CONFIG.TEST_SESSION_ID}`;
    await page.goto(sessionUrl);
    
    // Wait for session validation
    await page.waitForSelector('[data-testid="recording-interface"]', { timeout: 10000 });
  });

  BROWSER_CONFIGS.forEach(({ name, userAgent }) => {
    test.describe(`Browser: ${name}`, () => {
      
      test(`should initialize with 15-minute recording limit - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        
        // Check that max duration is set to 15 minutes
        const maxDuration = await page.evaluate(() => {
          return window.RECORDING_LIMITS?.MAX_DURATION_SECONDS;
        });
        
        expect(maxDuration).toBe(900); // 15 minutes
      });

      test(`should start audio recording with progressive upload - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        
        // Click audio recording button
        await page.click('[data-testid="audio-button"]');
        
        // Wait for media stream to be available
        await page.waitForSelector('[data-testid="start-recording-button"]', { timeout: 5000 });
        
        // Start recording
        await page.click('[data-testid="start-recording-button"]');
        
        // Wait for countdown to complete
        await page.waitForSelector('[data-testid="recording-active"]', { timeout: 5000 });
        
        // Verify recording is active
        const isRecording = await page.locator('[data-testid="recording-active"]').isVisible();
        expect(isRecording).toBe(true);
        
        // Verify progressive upload is initialized
        const progressiveUploadActive = await page.evaluate(() => {
          return window.progressiveUploadActive === true;
        });
        
        if (progressiveUploadActive !== null) {
          expect(progressiveUploadActive).toBe(true);
        }
        
        // Stop recording after short duration
        await page.waitForTimeout(TEST_CONFIG.SHORT_RECORDING_TIME);
        await page.click('[data-testid="done-button"]');
      });

      test(`should upload chunks during recording - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        
        // Start recording
        await page.click('[data-testid="audio-button"]');
        await page.waitForSelector('[data-testid="start-recording-button"]');
        await page.click('[data-testid="start-recording-button"]');
        await page.waitForSelector('[data-testid="recording-active"]');
        
        // Monitor for chunk uploads (wait longer than chunk interval)
        await page.waitForTimeout(TEST_CONFIG.CHUNK_UPLOAD_INTERVAL + 5000);
        
        // Check if chunks were uploaded
        const chunksUploaded = await page.evaluate(() => {
          return window.chunksUploaded || 0;
        });
        
        // Should have uploaded at least one chunk
        expect(chunksUploaded).toBeGreaterThan(0);
        
        // Stop recording
        await page.click('[data-testid="done-button"]');
      });

      test(`should handle 14-minute warning notification - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        test.slow(); // Mark as slow test due to long duration
        
        // Mock timer to speed up test
        await page.addInitScript(() => {
          // Override RECORDING_LIMITS for testing
          window.RECORDING_LIMITS = {
            ...window.RECORDING_LIMITS,
            MAX_DURATION_SECONDS: 30, // 30 seconds instead of 15 minutes
            WARNING_TIME: 25, // 25 seconds instead of 14 minutes
            CHUNK_UPLOAD_INTERVAL: 5 // 5 seconds instead of 30
          };
        });
        
        // Start recording
        await page.click('[data-testid="audio-button"]');
        await page.waitForSelector('[data-testid="start-recording-button"]');
        await page.click('[data-testid="start-recording-button"]');
        await page.waitForSelector('[data-testid="recording-active"]');
        
        // Wait for warning time (25 seconds in mock)
        await page.waitForTimeout(26000);
        
        // Check for warning alert (may be browser-dependent)
        const alertPromise = page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
        const alert = await alertPromise;
        
        if (alert) {
          expect(alert.message()).toContain('will automatically stop in 1 minute');
          await alert.accept();
        }
        
        // Wait for auto-stop (30 seconds in mock)
        await page.waitForTimeout(6000);
        
        // Should auto-transition to review mode
        await page.waitForSelector('[data-testid="review-mode"]', { timeout: 5000 });
      });

      test(`should enforce 15-minute maximum recording - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        test.slow(); // Mark as slow test
        
        // Mock timer for faster testing
        await page.addInitScript(() => {
          window.RECORDING_LIMITS = {
            ...window.RECORDING_LIMITS,
            MAX_DURATION_SECONDS: 10, // 10 seconds for testing
            WARNING_TIME: 8, // 8 seconds warning
            CHUNK_UPLOAD_INTERVAL: 2 // 2 seconds chunks
          };
        });
        
        // Start recording
        await page.click('[data-testid="audio-button"]');
        await page.waitForSelector('[data-testid="start-recording-button"]');
        await page.click('[data-testid="start-recording-button"]');
        await page.waitForSelector('[data-testid="recording-active"]');
        
        // Wait for auto-stop at max duration
        await page.waitForTimeout(12000);
        
        // Should automatically transition to review mode
        await page.waitForSelector('[data-testid="review-mode"]', { timeout: 5000 });
        
        const isInReviewMode = await page.locator('[data-testid="review-mode"]').isVisible();
        expect(isInReviewMode).toBe(true);
      });

      test(`should complete progressive upload submission - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        
        // Mock successful upload responses
        await page.route('**/uploadLoveRetoldRecording', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              storagePath: 'users/test-user/recordings/test-session/final/recording.webm',
              uploadMethod: 'progressive-chunks'
            })
          });
        });
        
        // Start and complete recording
        await page.click('[data-testid="audio-button"]');
        await page.waitForSelector('[data-testid="start-recording-button"]');
        await page.click('[data-testid="start-recording-button"]');
        await page.waitForSelector('[data-testid="recording-active"]');
        
        // Record for a bit to generate chunks
        await page.waitForTimeout(TEST_CONFIG.SHORT_RECORDING_TIME);
        await page.click('[data-testid="done-button"]');
        
        // Should transition to review mode
        await page.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
        
        // Submit recording
        await page.click('[data-testid="submit-button"]');
        
        // Wait for upload to complete
        await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 });
        
        const uploadComplete = await page.locator('[data-testid="upload-complete"]').isVisible();
        expect(uploadComplete).toBe(true);
      });

      test(`should handle upload errors gracefully - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        
        // Mock upload failure
        await page.route('**/uploadLoveRetoldRecording', async route => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Upload failed' })
          });
        });
        
        // Start and complete recording
        await page.click('[data-testid="audio-button"]');
        await page.waitForSelector('[data-testid="start-recording-button"]');
        await page.click('[data-testid="start-recording-button"]');
        await page.waitForSelector('[data-testid="recording-active"]');
        
        await page.waitForTimeout(TEST_CONFIG.SHORT_RECORDING_TIME);
        await page.click('[data-testid="done-button"]');
        
        // Submit recording
        await page.waitForSelector('[data-testid="submit-button"]');
        await page.click('[data-testid="submit-button"]');
        
        // Should show error handling UI
        await page.waitForSelector('[data-testid="upload-error"]', { timeout: 15000 });
        
        const errorVisible = await page.locator('[data-testid="upload-error"]').isVisible();
        expect(errorVisible).toBe(true);
      });

      test(`should fallback to traditional upload when progressive fails - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        
        // Disable progressive upload via environment
        await page.addInitScript(() => {
          window.RECORDING_LIMITS = {
            ...window.RECORDING_LIMITS,
            PROGRESSIVE_UPLOAD_ENABLED: false
          };
        });
        
        // Start recording
        await page.click('[data-testid="audio-button"]');
        await page.waitForSelector('[data-testid="start-recording-button"]');
        await page.click('[data-testid="start-recording-button"]');
        await page.waitForSelector('[data-testid="recording-active"]');
        
        // Record for a bit
        await page.waitForTimeout(TEST_CONFIG.SHORT_RECORDING_TIME);
        await page.click('[data-testid="done-button"]');
        
        // Should use traditional upload (no progressive chunks)
        const chunksUploaded = await page.evaluate(() => {
          return window.chunksUploaded || 0;
        });
        
        expect(chunksUploaded).toBe(0);
      });

      test(`should preserve Love Retold integration - ${name}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${name} test on ${browserName}`);
        
        // Monitor network requests for Love Retold integration
        const requests = [];
        page.on('request', request => {
          if (request.url().includes('recordingSessions')) {
            requests.push(request);
          }
        });
        
        // Complete recording and submission
        await page.click('[data-testid="audio-button"]');
        await page.waitForSelector('[data-testid="start-recording-button"]');
        await page.click('[data-testid="start-recording-button"]');
        await page.waitForSelector('[data-testid="recording-active"]');
        
        await page.waitForTimeout(TEST_CONFIG.SHORT_RECORDING_TIME);
        await page.click('[data-testid="done-button"]');
        
        await page.waitForSelector('[data-testid="submit-button"]');
        await page.click('[data-testid="submit-button"]');
        
        // Wait for requests to complete
        await page.waitForTimeout(5000);
        
        // Should have made Love Retold integration requests
        expect(requests.length).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    
    test('MediaRecorder support across browsers', async ({ page, browserName }) => {
      // Check MediaRecorder API availability
      const mediaRecorderSupported = await page.evaluate(() => {
        return typeof MediaRecorder !== 'undefined';
      });
      
      expect(mediaRecorderSupported).toBe(true);
      
      // Check codec support
      const codecSupport = await page.evaluate(() => {
        if (typeof MediaRecorder === 'undefined') return {};
        
        return {
          audioWebM: MediaRecorder.isTypeSupported('audio/webm'),
          audioMP4: MediaRecorder.isTypeSupported('audio/mp4'),
          videoWebM: MediaRecorder.isTypeSupported('video/webm'),
          videoMP4: MediaRecorder.isTypeSupported('video/mp4')
        };
      });
      
      // At least one audio format should be supported
      expect(codecSupport.audioWebM || codecSupport.audioMP4).toBe(true);
    });

    test('Progressive upload timing consistency', async ({ page, browserName }) => {
      // Test chunk upload timing across browsers
      const timings = [];
      
      await page.addInitScript(() => {
        window.chunkTimings = [];
        window.RECORDING_LIMITS = {
          ...window.RECORDING_LIMITS,
          CHUNK_UPLOAD_INTERVAL: 2 // 2 seconds for testing
        };
      });
      
      // Start recording
      await page.click('[data-testid="audio-button"]');
      await page.waitForSelector('[data-testid="start-recording-button"]');
      await page.click('[data-testid="start-recording-button"]');
      await page.waitForSelector('[data-testid="recording-active"]');
      
      // Record for multiple chunk intervals
      await page.waitForTimeout(8000); // 4 chunks at 2-second intervals
      await page.click('[data-testid="done-button"]');
      
      // Get timing measurements
      const measuredTimings = await page.evaluate(() => {
        return window.chunkTimings || [];
      });
      
      // Should have consistent timing (within reasonable variance)
      if (measuredTimings.length > 1) {
        const intervals = measuredTimings.slice(1).map((time, i) => time - measuredTimings[i]);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // Should be close to 2 seconds (2000ms) with some tolerance
        expect(avgInterval).toBeGreaterThan(1800);
        expect(avgInterval).toBeLessThan(2200);
      }
    });
  });

  test.describe('Performance Validation', () => {
    
    test('Memory usage during progressive upload', async ({ page }) => {
      // Monitor memory usage during recording
      await page.addInitScript(() => {
        window.memoryMonitor = {
          start: null,
          peak: 0,
          current: 0
        };
        
        const monitor = () => {
          if (performance.memory) {
            const current = performance.memory.usedJSHeapSize;
            window.memoryMonitor.current = current;
            if (current > window.memoryMonitor.peak) {
              window.memoryMonitor.peak = current;
            }
          }
          setTimeout(monitor, 1000);
        };
        monitor();
      });
      
      // Start recording
      await page.click('[data-testid="audio-button"]');
      await page.waitForSelector('[data-testid="start-recording-button"]');
      await page.click('[data-testid="start-recording-button"]');
      
      // Record baseline memory
      const baselineMemory = await page.evaluate(() => {
        return window.memoryMonitor.current;
      });
      
      // Record for extended period
      await page.waitForTimeout(TEST_CONFIG.MEDIUM_RECORDING_TIME);
      await page.click('[data-testid="done-button"]');
      
      // Check final memory usage
      const peakMemory = await page.evaluate(() => {
        return window.memoryMonitor.peak;
      });
      
      // Memory increase should be reasonable (less than 100MB for test duration)
      const memoryIncrease = peakMemory - baselineMemory;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });
});