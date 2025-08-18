#!/usr/bin/env node

/**
 * Firebase Deployment Script for UIAPP
 * 
 * Deploys Firebase infrastructure (rules, indexes, functions) from UIAPP directory
 * Follows MVPAPP deployment patterns with safety checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFirebaseConfig() {
  log('🔍 Validating Firebase configuration...', 'cyan');
  
  const requiredFiles = [
    'firebase.json',
    'firestore.rules', 
    'storage.rules',
    'firestore.indexes.json',
    '.firebaserc'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ Missing required file: ${file}`, 'red');
      process.exit(1);
    }
  }
  
  log('✅ All Firebase configuration files found', 'green');
}

function checkFirebaseAuth() {
  log('🔐 Checking Firebase authentication...', 'cyan');
  
  try {
    execSync('firebase projects:list', { stdio: 'pipe' });
    log('✅ Firebase CLI authenticated', 'green');
  } catch (error) {
    log('❌ Firebase CLI not authenticated. Run: firebase login', 'red');
    process.exit(1);
  }
}

function deployComponent(component, description) {
  log(`🚀 Deploying ${description}...`, 'yellow');
  
  try {
    execSync(`firebase deploy --only ${component}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log(`✅ ${description} deployed successfully`, 'green');
  } catch (error) {
    log(`❌ Failed to deploy ${description}`, 'red');
    throw error;
  }
}

function main() {
  log('🔥 Firebase Deployment Script for UIAPP', 'bright');
  log('=====================================', 'bright');
  
  try {
    // Validation steps
    validateFirebaseConfig();
    checkFirebaseAuth();
    
    // Get deployment target from command line argument
    const target = process.argv[2] || 'all';
    
    log(`📋 Deployment target: ${target}`, 'blue');
    
    switch (target) {
      case 'rules':
        deployComponent('firestore:rules', 'Firestore Rules');
        deployComponent('storage', 'Storage Rules');
        break;
        
      case 'indexes':
        deployComponent('firestore:indexes', 'Firestore Indexes');
        break;
        
      case 'functions':
        deployComponent('functions', 'Cloud Functions');
        break;
        
      case 'hosting':
        deployComponent('hosting', 'Hosting');
        break;
        
      case 'all':
        log('🚀 Deploying all Firebase components...', 'magenta');
        deployComponent('firestore:rules', 'Firestore Rules');
        deployComponent('storage', 'Storage Rules');
        deployComponent('firestore:indexes', 'Firestore Indexes');
        
        // Only deploy functions and hosting if they exist
        if (fs.existsSync('functions')) {
          deployComponent('functions', 'Cloud Functions');
        }
        
        if (fs.existsSync('build')) {
          deployComponent('hosting', 'Hosting');
        }
        break;
        
      default:
        log(`❌ Unknown deployment target: ${target}`, 'red');
        log('Usage: node deploy-firebase.js [rules|indexes|functions|hosting|all]', 'yellow');
        process.exit(1);
    }
    
    log('✅ Firebase deployment completed successfully!', 'green');
    
  } catch (error) {
    log('❌ Deployment failed!', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { validateFirebaseConfig, deployComponent };