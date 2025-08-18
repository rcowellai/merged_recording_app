/**
 * Global Test Setup for Firebase Integration Testing
 * Initializes Firebase emulator environment with test data
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Firebase emulator configuration
 */
const EMULATOR_CONFIG = {
  projectId: 'love-retold-backend-test',
  ports: {
    auth: 9099,
    firestore: 8080,
    functions: 5001,
    storage: 9199,
    ui: 4000
  },
  dataDir: path.join(__dirname, '../data/emulator-data'),
  rulesDir: path.join(__dirname, '../../')
};

/**
 * Setup Firebase emulator environment
 */
async function setupFirebaseEmulator() {
  console.log('🚀 Setting up Firebase emulator for integration testing...');
  
  try {
    // Ensure emulator data directory exists
    if (!fs.existsSync(EMULATOR_CONFIG.dataDir)) {
      fs.mkdirSync(EMULATOR_CONFIG.dataDir, { recursive: true });
    }
    
    // Kill any existing emulator processes
    try {
      execSync('firebase emulators:stop', { stdio: 'ignore' });
    } catch (error) {
      // Ignore errors if no emulator is running
    }
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start Firebase emulators with specific configuration
    const emulatorCommand = [
      'firebase emulators:start',
      '--project', EMULATOR_CONFIG.projectId,
      '--only', 'auth,firestore,storage,functions',
      '--export-on-exit', EMULATOR_CONFIG.dataDir,
      '--import', EMULATOR_CONFIG.dataDir
    ].join(' ');
    
    console.log('📡 Starting Firebase emulators...');
    console.log(`Command: ${emulatorCommand}`);
    
    // Start emulators in background
    const child = execSync(`${emulatorCommand} &`, {
      cwd: path.join(__dirname, '../../'),
      stdio: 'pipe',
      timeout: 30000 // 30 second timeout
    });
    
    // Wait for emulators to be ready
    await waitForEmulatorsReady();
    
    // Deploy security rules to emulator
    await deploySecurityRules();
    
    // Seed test data
    await seedTestData();
    
    console.log('✅ Firebase emulator setup complete');
    
  } catch (error) {
    console.error('❌ Failed to setup Firebase emulator:', error);
    throw error;
  }
}

/**
 * Wait for Firebase emulators to be ready
 */
async function waitForEmulatorsReady() {
  console.log('⏳ Waiting for emulators to be ready...');
  
  const maxRetries = 30; // 30 seconds total wait time
  const retryInterval = 1000; // 1 second between retries
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Test Firestore emulator
      const response = await fetch(`http://localhost:${EMULATOR_CONFIG.ports.firestore}`);
      if (response.ok) {
        console.log('✅ Firestore emulator ready');
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('Firestore emulator failed to start within timeout');
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  
  // Give additional time for all services to initialize
  await new Promise(resolve => setTimeout(resolve, 3000));
}

/**
 * Deploy security rules to emulator
 */
async function deploySecurityRules() {
  console.log('🛡️ Deploying security rules to emulator...');
  
  try {
    // Deploy Firestore rules
    execSync(`firebase deploy --only firestore:rules --project ${EMULATOR_CONFIG.projectId}`, {
      cwd: path.join(__dirname, '../../'),
      stdio: 'inherit'
    });
    
    // Deploy Storage rules
    execSync(`firebase deploy --only storage:rules --project ${EMULATOR_CONFIG.projectId}`, {
      cwd: path.join(__dirname, '../../'),
      stdio: 'inherit'
    });
    
    // Deploy Firestore indexes
    execSync(`firebase deploy --only firestore:indexes --project ${EMULATOR_CONFIG.projectId}`, {
      cwd: path.join(__dirname, '../../'),
      stdio: 'inherit'
    });
    
    console.log('✅ Security rules deployed successfully');
    
  } catch (error) {
    console.error('❌ Failed to deploy security rules:', error);
    throw error;
  }
}

/**
 * Seed test data into emulator
 */
async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  try {
    // Run the database seeding script
    execSync(`FIREBASE_PROJECT_ID=${EMULATOR_CONFIG.projectId} node scripts/seed-database.js`, {
      cwd: path.join(__dirname, '../../'),
      stdio: 'inherit',
      env: {
        ...process.env,
        FIREBASE_PROJECT_ID: EMULATOR_CONFIG.projectId,
        FIRESTORE_EMULATOR_HOST: `localhost:${EMULATOR_CONFIG.ports.firestore}`,
        FIREBASE_AUTH_EMULATOR_HOST: `localhost:${EMULATOR_CONFIG.ports.auth}`,
        FIREBASE_STORAGE_EMULATOR_HOST: `localhost:${EMULATOR_CONFIG.ports.storage}`
      }
    });
    
    console.log('✅ Test data seeded successfully');
    
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
}

/**
 * Validate emulator environment
 */
async function validateEmulatorEnvironment() {
  console.log('🔍 Validating emulator environment...');
  
  const validationChecks = [
    {
      name: 'Firestore Emulator',
      url: `http://localhost:${EMULATOR_CONFIG.ports.firestore}`,
      required: true
    },
    {
      name: 'Auth Emulator', 
      url: `http://localhost:${EMULATOR_CONFIG.ports.auth}`,
      required: true
    },
    {
      name: 'Storage Emulator',
      url: `http://localhost:${EMULATOR_CONFIG.ports.storage}`,
      required: true
    }
  ];
  
  for (const check of validationChecks) {
    try {
      const response = await fetch(check.url);
      if (response.ok) {
        console.log(`✅ ${check.name} is running`);
      } else {
        throw new Error(`${check.name} returned status ${response.status}`);
      }
    } catch (error) {
      if (check.required) {
        throw new Error(`Required service ${check.name} is not available: ${error.message}`);
      } else {
        console.warn(`⚠️ Optional service ${check.name} is not available: ${error.message}`);
      }
    }
  }
  
  console.log('✅ Emulator environment validation complete');
}

/**
 * Main setup function
 */
module.exports = async function globalSetup() {
  console.log('🎯 Starting Firebase Integration Test Environment Setup');
  console.log('=====================================');
  
  try {
    // Setup Firebase emulator
    await setupFirebaseEmulator();
    
    // Validate environment
    await validateEmulatorEnvironment();
    
    console.log('=====================================');
    console.log('✅ Global test setup completed successfully');
    console.log(`🔗 Emulator UI: http://localhost:${EMULATOR_CONFIG.ports.ui}`);
    console.log('📊 Ready for integration testing with parallel delegation');
    
    // Store configuration for tests
    global.__EMULATOR_CONFIG__ = EMULATOR_CONFIG;
    
  } catch (error) {
    console.error('=====================================');
    console.error('❌ Global test setup failed:', error);
    console.error('=====================================');
    process.exit(1);
  }
};