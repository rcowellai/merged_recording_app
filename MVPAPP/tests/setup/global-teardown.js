/**
 * Global Test Teardown for Firebase Integration Testing
 * Cleans up Firebase emulator environment and generates final reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Cleanup Firebase emulator environment
 */
async function cleanupFirebaseEmulator() {
  console.log('🧹 Cleaning up Firebase emulator environment...');
  
  try {
    // Stop Firebase emulators
    execSync('firebase emulators:stop', {
      stdio: 'ignore',
      timeout: 10000
    });
    
    console.log('✅ Firebase emulators stopped');
    
  } catch (error) {
    console.warn('⚠️ Warning: Could not stop emulators gracefully:', error.message);
    
    // Force kill any remaining processes
    try {
      execSync('pkill -f "firebase.*emulator"', { stdio: 'ignore' });
      console.log('✅ Emulator processes terminated');
    } catch (killError) {
      console.warn('⚠️ Could not force kill emulator processes');
    }
  }
}

/**
 * Generate test summary report
 */
async function generateTestSummaryReport() {
  console.log('📊 Generating test summary report...');
  
  try {
    const reportsDir = path.join(__dirname, '../reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Read test results if available
    const junitReportPath = path.join(reportsDir, 'junit-integration-tests.xml');
    const htmlReportPath = path.join(reportsDir, 'integration-test-report.html');
    
    let testSummary = {
      timestamp: new Date().toISOString(),
      environment: 'Firebase Emulator',
      testType: 'Integration Testing with Parallel Delegation',
      reports: {
        junit: fs.existsSync(junitReportPath),
        html: fs.existsSync(htmlReportPath)
      }
    };
    
    // Write summary
    const summaryPath = path.join(reportsDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(testSummary, null, 2));
    
    console.log('✅ Test summary report generated');
    console.log(`📁 Reports available in: ${reportsDir}`);
    
    if (testSummary.reports.html) {
      console.log(`🌐 HTML Report: ${htmlReportPath}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to generate test summary report:', error);
  }
}

/**
 * Archive test artifacts
 */
async function archiveTestArtifacts() {
  console.log('📦 Archiving test artifacts...');
  
  try {
    const artifactsDir = path.join(__dirname, '../artifacts');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(artifactsDir, `test-run-${timestamp}`);
    
    // Create archive directory
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    // Copy reports
    const reportsDir = path.join(__dirname, '../reports');
    if (fs.existsSync(reportsDir)) {
      execSync(`cp -r "${reportsDir}" "${archiveDir}/reports"`, { stdio: 'ignore' });
    }
    
    // Copy coverage
    const coverageDir = path.join(__dirname, '../coverage');
    if (fs.existsSync(coverageDir)) {
      execSync(`cp -r "${coverageDir}" "${archiveDir}/coverage"`, { stdio: 'ignore' });
    }
    
    // Copy emulator data if needed for debugging
    const emulatorDataDir = path.join(__dirname, '../data/emulator-data');
    if (fs.existsSync(emulatorDataDir)) {
      execSync(`cp -r "${emulatorDataDir}" "${archiveDir}/emulator-data"`, { stdio: 'ignore' });
    }
    
    console.log('✅ Test artifacts archived');
    console.log(`📁 Archive location: ${archiveDir}`);
    
  } catch (error) {
    console.warn('⚠️ Warning: Could not archive test artifacts:', error.message);
  }
}

/**
 * Validate test cleanup
 */
async function validateTestCleanup() {
  console.log('🔍 Validating test cleanup...');
  
  const cleanupChecks = [
    {
      name: 'Emulator Processes',
      check: () => {
        try {
          execSync('pgrep -f "firebase.*emulator"', { stdio: 'ignore' });
          return false; // Processes still running
        } catch (error) {
          return true; // No processes found (good)
        }
      }
    },
    {
      name: 'Test Reports Generated',
      check: () => {
        const reportsDir = path.join(__dirname, '../reports');
        return fs.existsSync(reportsDir) && fs.readdirSync(reportsDir).length > 0;
      }
    }
  ];
  
  for (const check of cleanupChecks) {
    const passed = check.check();
    if (passed) {
      console.log(`✅ ${check.name}: OK`);
    } else {
      console.warn(`⚠️ ${check.name}: Warning`);
    }
  }
  
  console.log('✅ Test cleanup validation complete');
}

/**
 * Display final test results summary
 */
async function displayFinalSummary() {
  console.log('');
  console.log('=====================================');
  console.log('🎯 Firebase Integration Test Complete');
  console.log('=====================================');
  
  try {
    const reportsDir = path.join(__dirname, '../reports');
    const summaryPath = path.join(reportsDir, 'test-summary.json');
    
    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      console.log(`📊 Test Type: ${summary.testType}`);
      console.log(`🕐 Completed: ${summary.timestamp}`);
      console.log(`🌐 Environment: ${summary.environment}`);
      
      if (summary.reports.html) {
        console.log(`📄 HTML Report: ${reportsDir}/integration-test-report.html`);
      }
      if (summary.reports.junit) {
        console.log(`📋 JUnit Report: ${reportsDir}/junit-integration-tests.xml`);
      }
    }
    
    console.log('');
    console.log('📁 Test artifacts preserved for analysis');
    console.log('🧹 Emulator environment cleaned up');
    console.log('✅ Teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Error displaying final summary:', error);
  }
  
  console.log('=====================================');
}

/**
 * Main teardown function
 */
module.exports = async function globalTeardown() {
  console.log('');
  console.log('🔄 Starting Firebase Integration Test Teardown');
  console.log('=====================================');
  
  try {
    // Generate test reports
    await generateTestSummaryReport();
    
    // Archive test artifacts
    await archiveTestArtifacts();
    
    // Cleanup Firebase emulator
    await cleanupFirebaseEmulator();
    
    // Validate cleanup
    await validateTestCleanup();
    
    // Display final summary
    await displayFinalSummary();
    
  } catch (error) {
    console.error('❌ Teardown error:', error);
    // Don't exit with error - tests may have completed successfully
  }
};