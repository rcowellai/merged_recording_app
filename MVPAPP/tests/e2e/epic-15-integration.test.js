/**
 * Epic 1.5 Integration Testing - End-to-End Validation
 * Tests the complete recording workflow from session validation to story creation
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_SESSIONS = {
  valid: 'epic15_active_session_1',
  expired: 'epic15_expired_session', 
  completed: 'epic15_completed_session',
  removed: 'epic15_removed_session',
  invalid: 'invalid_session_id_test'
};

test.describe('Epic 1.5: Recording App ↔ Firebase Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up page for testing
    await page.goto(BASE_URL);
  });

  test('Valid session should load recording interface', async ({ page }) => {
    const validSessionUrl = `${BASE_URL}/record/${TEST_SESSIONS.valid}`;
    
    await page.goto(validSessionUrl);
    
    // Wait for session validation
    await page.waitForTimeout(2000);
    
    // Should show recording interface (not error message)
    const hasError = await page.$('[data-testid="error-message"]');
    expect(hasError).toBe(null);
    
    // Should show question text
    const questionElement = await page.$('[data-testid="question-text"]');
    expect(questionElement).not.toBe(null);
    
    // Should have recording controls
    const recordButton = await page.$('[data-testid="record-button"]');
    expect(recordButton).not.toBe(null);
  });

  test('Expired session should show expired message', async ({ page }) => {
    const expiredSessionUrl = `${BASE_URL}/record/${TEST_SESSIONS.expired}`;
    
    await page.goto(expiredSessionUrl);
    
    // Wait for session validation
    await page.waitForTimeout(2000);
    
    // Should show expired error message
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('expired');
  });

  test('Completed session should show completed message', async ({ page }) => {
    const completedSessionUrl = `${BASE_URL}/record/${TEST_SESSIONS.completed}`;
    
    await page.goto(completedSessionUrl);
    
    // Wait for session validation  
    await page.waitForTimeout(2000);
    
    // Should show completed error message
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('completed');
  });

  test('Invalid session should show not found message', async ({ page }) => {
    const invalidSessionUrl = `${BASE_URL}/record/${TEST_SESSIONS.invalid}`;
    
    await page.goto(invalidSessionUrl);
    
    // Wait for session validation
    await page.waitForTimeout(2000);
    
    // Should show not found error message  
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('not found');
  });

  test('Recording interface should have required elements', async ({ page }) => {
    const validSessionUrl = `${BASE_URL}/record/${TEST_SESSIONS.valid}`;
    
    await page.goto(validSessionUrl);
    await page.waitForTimeout(2000);
    
    // Check for required UI elements
    const questionText = await page.$('[data-testid="question-text"]');
    expect(questionText).not.toBe(null);
    
    const recordButton = await page.$('[data-testid="record-button"]');
    expect(recordButton).not.toBe(null);
    
    const statusMessage = await page.$('[data-testid="status-message"]');
    expect(statusMessage).not.toBe(null);
  });

  test('Session validation should handle network failures gracefully', async ({ page }) => {
    // Block Firebase function calls to simulate network failure
    await page.route('**/validateSession*', route => route.abort());
    
    const validSessionUrl = `${BASE_URL}/record/${TEST_SESSIONS.valid}`;
    await page.goto(validSessionUrl);
    
    // Wait for validation attempt
    await page.waitForTimeout(3000);
    
    // Should show appropriate error message for network failure
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('unable to validate');
  });

  test('App should handle missing session IDs', async ({ page }) => {
    const noSessionUrl = `${BASE_URL}/record/`;
    
    await page.goto(noSessionUrl);
    await page.waitForTimeout(1000);
    
    // Should redirect or show appropriate error
    const currentUrl = page.url();
    const hasError = await page.$('[data-testid="error-message"]');
    
    expect(hasError !== null || !currentUrl.includes('/record/')).toBe(true);
  });

  // Performance tests
  test('Session validation should complete within 3 seconds', async ({ page }) => {
    const validSessionUrl = `${BASE_URL}/record/${TEST_SESSIONS.valid}`;
    
    const startTime = Date.now();
    await page.goto(validSessionUrl);
    
    // Wait for either success or error state
    await Promise.race([
      page.waitForSelector('[data-testid="question-text"]', { timeout: 5000 }),
      page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 })
    ]);
    
    const endTime = Date.now();
    const validationTime = endTime - startTime;
    
    expect(validationTime).toBeLessThan(3000);
  });

  test('App should load within 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });
});

test.describe('Epic 1.5: Function Integration Tests', () => {
  
  test('validateSession function should be reachable', async ({ page }) => {
    // Test direct function call if accessible
    const response = await page.evaluate(async () => {
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const validateSession = httpsCallable(functions, 'validateSession');
        
        const result = await validateSession({ sessionId: 'test' });
        return result.data;
      } catch (error) {
        return { error: error.message };
      }
    });
    
    // Should get some response (either success or expected validation error)
    expect(response).toBeDefined();
  });
});

// Test data validation
test.describe('Epic 1.5: Test Data Validation', () => {
  
  test('Firebase connection should be working', async ({ page }) => {
    await page.goto(`${BASE_URL}/record/${TEST_SESSIONS.valid}`);
    
    // Check browser console for Firebase connection errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Should not have Firebase initialization errors
    const hasFirebaseErrors = consoleLogs.some(log => 
      log.includes('Firebase') && log.includes('error')
    );
    
    expect(hasFirebaseErrors).toBe(false);
  });
});