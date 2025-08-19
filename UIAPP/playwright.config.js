// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * C09 Playwright E2E Testing Configuration
 * ========================================
 * 
 * Cross-browser testing configuration for UIAPP recording flow.
 * Tests both localStorage and Firebase modes with emulators.
 * 
 * Usage:
 * - npm run test:e2e:local        # Run all tests headless
 * - npm run test:e2e:headed       # Run tests with browser UI
 * - npm run test:e2e:debug        # Debug mode with devtools
 * 
 * Setup:
 * 1. Start Firebase emulators: npm run emulate
 * 2. Start app in emulator mode: npm run start:emulator-mode
 * 3. Run E2E tests: npm run test:e2e:local
 */

export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Disabled for Firebase emulator tests
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['html', { open: 'never', outputFolder: 'test-results/e2e-report' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Timeout for each action (click, fill, etc.) */
    actionTimeout: 10000,
    
    /* Timeout for navigation (page.goto, etc.) */
    navigationTimeout: 30000,
  },

  /* Global setup for Firebase emulators */
  globalSetup: require.resolve('./e2e/global-setup.js'),
  globalTeardown: require.resolve('./e2e/global-teardown.js'),

  /* Configure projects for major browsers */
  projects: [
    /* Desktop Browsers */
    {
      name: 'chromium-localStorage',
      use: { 
        ...devices['Desktop Chrome'],
        // localStorage mode testing
        baseURL: 'http://localhost:3000?mode=localStorage',
      },
      testMatch: '**/*localStorage*.test.js'
    },
    
    {
      name: 'chromium-firebase',
      use: { 
        ...devices['Desktop Chrome'],
        // Firebase emulator mode testing
        baseURL: 'http://localhost:3000?sessionId=test-session-e2e&mode=firebase',
      },
      testMatch: '**/*firebase*.test.js'
    },

    {
      name: 'firefox-localStorage',
      use: { 
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:3000?mode=localStorage',
      },
      testMatch: '**/*localStorage*.test.js'
    },

    {
      name: 'webkit-localStorage',
      use: { 
        ...devices['Desktop Safari'],
        baseURL: 'http://localhost:3000?mode=localStorage',
      },
      testMatch: '**/*localStorage*.test.js'
    },

    /* Mobile Testing */
    {
      name: 'Mobile Chrome-localStorage',
      use: { 
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:3000?mode=localStorage',
      },
      testMatch: '**/*mobile*.test.js'
    },

    {
      name: 'Mobile Safari-localStorage',
      use: { 
        ...devices['iPhone 12'],
        baseURL: 'http://localhost:3000?mode=localStorage',
      },
      testMatch: '**/*mobile*.test.js'
    },
  ],

  /* Test timeout */
  timeout: 60000,

  /* Global test setup */
  globalTimeout: 300000, // 5 minutes for all tests

  /* Expect timeout for assertions */
  expect: {
    timeout: 10000
  },
  
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
  
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run start:emulator-mode',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        REACT_APP_USE_FIREBASE: 'true',
        REACT_APP_USE_EMULATOR: 'true',
        REACT_APP_TEST_MODE: 'true'
      }
    }
  ],
});