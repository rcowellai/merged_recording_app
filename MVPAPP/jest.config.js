/**
 * Jest Configuration for Firebase Integration Testing
 * QA-focused testing with parallel delegation and strict validation
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.integration.js'
  ],
  
  // Setup and teardown
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test-setup.js'],
  
  // Parallel execution for file delegation
  maxWorkers: 5, // 5 parallel test workers for file delegation
  maxConcurrency: 10, // Max concurrent tests per worker
  
  // Test timeout for integration tests
  testTimeout: 30000, // 30 seconds for Firebase operations
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/tests/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'functions/src/**/*.js',
    'functions/src/**/*.ts',
    '!functions/src/**/*.test.js',
    '!functions/src/**/*.spec.js'
  ],
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Transform TypeScript if needed
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Test reporting
  reporters: ['default'],
  
  // Global variables for tests
  globals: {
    FIREBASE_PROJECT_ID: 'love-retold-backend-test',
    FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
    FIREBASE_FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
    FIREBASE_FUNCTIONS_EMULATOR_HOST: 'localhost:5001'
  },
  
  // Test environment variables
  testEnvironmentOptions: {
    FIREBASE_PROJECT_ID: 'love-retold-backend-test'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/dist/',
    '/build/'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'ts', 'json'],
  
  // Verbose output for QA analysis
  verbose: true,
  
  // Fail fast on first failure for strict validation
  bail: false, // Continue all tests to get full report
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Force exit to prevent hanging processes
  forceExit: true,
  
  // Detect open handles for cleanup verification
  detectOpenHandles: true,
  
  // Test result processor for custom validation
  testResultsProcessor: '<rootDir>/tests/processors/validation-processor.js'
};