/**
 * Test Setup for Individual Test Files
 * Provides common utilities and configuration for Firebase integration tests
 */

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { getStorage, connectStorageEmulator } = require('firebase/storage');

// Global test configuration
global.TEST_CONFIG = {
  projectId: 'love-retold-backend-test',
  emulatorConfig: {
    auth: { host: 'localhost', port: 9099 },
    firestore: { host: 'localhost', port: 8080 },
    storage: { host: 'localhost', port: 9199 },
    functions: { host: 'localhost', port: 5001 }
  },
  testUsers: {
    user1: {
      uid: 'test-user-1',
      email: 'john.doe@example.com',
      displayName: 'John Doe'
    },
    user2: {
      uid: 'test-user-2', 
      email: 'jane.smith@example.com',
      displayName: 'Jane Smith'
    },
    anonymous: {
      uid: null, // Will be set during anonymous auth
      provider: 'anonymous'
    }
  },
  testData: {
    validSessionId: 'session_valid_test_123',
    expiredSessionId: 'session_expired_test_456',
    invalidSessionId: 'session_invalid_test_789'
  },
  performanceThresholds: {
    queryResponseTime: 200, // 200ms max for queries
    indexHitRatio: 0.95,    // 95% index usage required
    uploadTimeout: 30000    // 30 seconds for file uploads
  },
  securityTestCases: {
    unauthorizedAccess: [
      'user accessing other user data',
      'anonymous user accessing user data',
      'expired session access',
      'invalid session access'
    ],
    validAccess: [
      'user accessing own data',
      'anonymous user with valid session',
      'admin system operations'
    ]
  }
};

// Global test utilities
global.TestUtils = {
  /**
   * Initialize Firebase app for testing
   */
  async initializeTestApp(auth = null) {
    const testEnv = await initializeTestEnvironment({
      projectId: global.TEST_CONFIG.projectId,
      auth: auth
    });
    
    return testEnv.authenticatedContext(auth?.uid || null);
  },

  /**
   * Create test user context
   */
  async createUserContext(userKey = 'user1') {
    const user = global.TEST_CONFIG.testUsers[userKey];
    return this.initializeTestApp(user);
  },

  /**
   * Create anonymous user context
   */
  async createAnonymousContext() {
    return this.initializeTestApp(null);
  },

  /**
   * Measure query performance
   */
  async measureQueryPerformance(queryFn) {
    const startTime = Date.now();
    const result = await queryFn();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      result,
      duration,
      withinThreshold: duration <= global.TEST_CONFIG.performanceThresholds.queryResponseTime
    };
  },

  /**
   * Generate test recording session
   */
  generateTestSession(userId, status = 'active') {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    return {
      promptId: `prompt_${userId}_${Date.now()}`,
      userId: userId,
      status: status,
      createdAt: now,
      expiresAt: status === 'expired' ? new Date(now.getTime() - 1000) : expiresAt
    };
  },

  /**
   * Generate test prompt data
   */
  generateTestPrompt(userId) {
    return {
      userId: userId,
      question: 'Test question for integration testing',
      status: 'waiting',
      scheduledDate: new Date(),
      createdAt: new Date(),
      uniqueUrl: `https://test.app/record/${global.TEST_CONFIG.testData.validSessionId}`,
      sessionId: global.TEST_CONFIG.testData.validSessionId
    };
  },

  /**
   * Generate test story data
   */
  generateTestStory(userId, promptId) {
    return {
      userId: userId,
      originalPromptId: promptId,
      question: 'Test question for story',
      audioUrl: 'gs://test-bucket/test-audio.wav',
      videoUrl: null,
      transcript: 'This is a test transcript for integration testing.',
      duration: 120,
      recordedAt: new Date(),
      createdAt: new Date(),
      metadata: {
        transcriptionConfidence: 0.95,
        fileSize: 1024000,
        processingTime: 15
      }
    };
  },

  /**
   * Wait for async operations with timeout
   */
  async waitFor(conditionFn, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms timeout`);
  },

  /**
   * Assert security rule violation
   */
  async assertSecurityRuleViolation(operationFn, expectedErrorCode = 'permission-denied') {
    try {
      await operationFn();
      throw new Error('Expected security rule violation, but operation succeeded');
    } catch (error) {
      if (error.code === expectedErrorCode) {
        return; // Expected error
      }
      throw new Error(`Expected error code '${expectedErrorCode}', got '${error.code}': ${error.message}`);
    }
  },

  /**
   * Assert performance threshold
   */
  assertPerformanceThreshold(duration, operation) {
    const threshold = global.TEST_CONFIG.performanceThresholds.queryResponseTime;
    if (duration > threshold) {
      throw new Error(`Performance threshold exceeded for ${operation}: ${duration}ms > ${threshold}ms`);
    }
  },

  /**
   * Clean up test data
   */
  async cleanupTestData(context) {
    try {
      const db = context.firestore();
      
      // Delete test documents
      const collections = ['users', 'prompts', 'recordingSessions', 'stories'];
      
      for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName).get();
        const batch = db.batch();
        
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        if (snapshot.docs.length > 0) {
          await batch.commit();
        }
      }
    } catch (error) {
      console.warn('Warning: Could not clean up test data:', error.message);
    }
  }
};

// Global test assertions
global.TestAssertions = {
  /**
   * Assert hard validation gate passes
   */
  assertValidationGate(testResults, gateName) {
    if (!testResults || typeof testResults.passed !== 'boolean') {
      throw new Error(`Invalid test results format for validation gate: ${gateName}`);
    }
    
    if (!testResults.passed) {
      const errors = testResults.errors || ['Unknown validation failure'];
      throw new Error(`HARD VALIDATION GATE FAILED: ${gateName}\nErrors: ${errors.join(', ')}`);
    }
  },

  /**
   * Assert security compliance
   */
  assertSecurityCompliance(testResults) {
    const requiredChecks = [
      'user_data_isolation',
      'anonymous_session_validation', 
      'file_access_control',
      'rate_limiting'
    ];
    
    for (const check of requiredChecks) {
      if (!testResults[check] || !testResults[check].passed) {
        throw new Error(`SECURITY COMPLIANCE FAILURE: ${check} did not pass`);
      }
    }
  },

  /**
   * Assert performance compliance
   */
  assertPerformanceCompliance(performanceResults) {
    const { queryResponseTime, indexHitRatio } = global.TEST_CONFIG.performanceThresholds;
    
    if (performanceResults.averageQueryTime > queryResponseTime) {
      throw new Error(`PERFORMANCE FAILURE: Average query time ${performanceResults.averageQueryTime}ms exceeds threshold ${queryResponseTime}ms`);
    }
    
    if (performanceResults.indexHitRatio < indexHitRatio) {
      throw new Error(`PERFORMANCE FAILURE: Index hit ratio ${performanceResults.indexHitRatio} below threshold ${indexHitRatio}`);
    }
  }
};

// Setup Jest environment
beforeAll(async () => {
  // Ensure we're running against emulator
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
});

// Cleanup after each test
afterEach(async () => {
  // Clean up any test data that might affect other tests
  // Individual tests should handle their own cleanup
});

// Global error handler for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection in test:', reason);
  console.error('Promise:', promise);
});

console.log('🧪 Test environment initialized');
console.log(`📡 Project ID: ${global.TEST_CONFIG.projectId}`);
console.log(`⚡ Performance thresholds: ${JSON.stringify(global.TEST_CONFIG.performanceThresholds)}`);
console.log(`🔒 Security test cases: ${global.TEST_CONFIG.securityTestCases.unauthorizedAccess.length} unauthorized + ${global.TEST_CONFIG.securityTestCases.validAccess.length} authorized`);