/**
 * C09 E2E Test Global Setup
 * =========================
 * 
 * Sets up Firebase emulators and test data for E2E testing
 */

async function globalSetup(config) {
  console.log('🚀 Starting E2E test global setup...');
  
  // Note: Firebase emulators should be started manually with:
  // npm run emulate
  
  // Wait for emulators to be ready
  const { chromium } = require('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Check if Firebase emulators are running
    console.log('📡 Checking Firebase emulators...');
    
    // Check Auth emulator
    try {
      await page.goto('http://localhost:9099', { waitUntil: 'domcontentloaded', timeout: 5000 });
      console.log('✅ Firebase Auth emulator is running on port 9099');
    } catch (error) {
      console.warn('⚠️ Firebase Auth emulator not detected. Some tests may fail.');
    }
    
    // Check Firestore emulator
    try {
      await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded', timeout: 5000 });
      console.log('✅ Firebase Firestore emulator is running on port 8080');
    } catch (error) {
      console.warn('⚠️ Firebase Firestore emulator not detected. Some tests may fail.');
    }
    
    // Check Functions emulator
    try {
      await page.goto('http://localhost:5001', { waitUntil: 'domcontentloaded', timeout: 5000 });
      console.log('✅ Firebase Functions emulator is running on port 5001');
    } catch (error) {
      console.warn('⚠️ Firebase Functions emulator not detected. Some tests may fail.');
    }
    
    // Check Storage emulator
    try {
      await page.goto('http://localhost:9199', { waitUntil: 'domcontentloaded', timeout: 5000 });
      console.log('✅ Firebase Storage emulator is running on port 9199');
    } catch (error) {
      console.warn('⚠️ Firebase Storage emulator not detected. Some tests may fail.');
    }
    
  } catch (error) {
    console.error('❌ Error during E2E setup:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('✅ E2E test global setup complete');
}

module.exports = globalSetup;