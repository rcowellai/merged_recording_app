#!/usr/bin/env node

/**
 * Firebase Session Diagnostic Tool
 * Use this to check session status and debug issues
 */

const admin = require('firebase-admin');
const path = require('path');

// Path to your service account key file
// Replace this with the actual path after downloading from Firebase Console
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'love-retold-webapp-firebase-adminsdk.json');

// Initialize Firebase Admin
try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'love-retold-webapp'
  });
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('\n📋 To fix this:');
  console.log('1. Download the service account key from Firebase Console');
  console.log('2. Save it as: love-retold-webapp-firebase-adminsdk.json');
  console.log('3. Place it in the project root directory');
  process.exit(1);
}

const db = admin.firestore();

/**
 * Check if a session exists and display its details
 */
async function checkSession(sessionId) {
  console.log(`\n🔍 Checking session: ${sessionId}\n`);
  
  try {
    // Check recordingSessions collection
    const sessionDoc = await db.collection('recordingSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      console.log('❌ Session does NOT exist in recordingSessions collection');
      
      // Check if it might be in other collections
      await checkAlternativeLocations(sessionId);
      return;
    }
    
    console.log('✅ Session found in recordingSessions collection!\n');
    console.log('📄 Session Data:');
    console.log('================');
    
    const data = sessionDoc.data();
    
    // Display all fields
    Object.keys(data).forEach(key => {
      let value = data[key];
      
      // Format timestamps
      if (value && value._seconds) {
        const date = new Date(value._seconds * 1000);
        value = `${date.toISOString()} (${date.toLocaleString()})`;
      }
      
      console.log(`  ${key}: ${JSON.stringify(value, null, 2)}`);
    });
    
    // Check session status
    console.log('\n📊 Status Analysis:');
    console.log('===================');
    
    if (!data.status) {
      console.log('⚠️  WARNING: Session has no status field!');
    } else {
      console.log(`  Current status: ${data.status}`);
      
      const expectedStatuses = ['active', 'completed', 'expired', 'removed', 'error'];
      if (!expectedStatuses.includes(data.status)) {
        console.log(`  ⚠️  WARNING: Status "${data.status}" is not in expected list!`);
        console.log(`  Expected: ${expectedStatuses.join(', ')}`);
      }
    }
    
    // Check expiration
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt._seconds * 1000);
      const now = new Date();
      
      if (now > expiresAt) {
        console.log(`  ⚠️  Session expired on: ${expiresAt.toLocaleString()}`);
      } else {
        const hoursLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60));
        console.log(`  ✅ Session valid for: ${hoursLeft} more hours`);
      }
    }
    
    // Parse session ID components
    console.log('\n🔤 Session ID Components:');
    console.log('=========================');
    const parts = sessionId.split('-');
    if (parts.length === 5) {
      console.log(`  Random Prefix: ${parts[0]}`);
      console.log(`  Prompt ID: ${parts[1]}`);
      console.log(`  User ID: ${parts[2]}`);
      console.log(`  Storyteller ID: ${parts[3]}`);
      console.log(`  Timestamp: ${parts[4]} (${new Date(parseInt(parts[4]) * 1000).toLocaleString()})`);
    } else {
      console.log('  ⚠️  Session ID format doesn\'t match expected pattern');
    }
    
  } catch (error) {
    console.error('❌ Error checking session:', error.message);
  }
}

/**
 * Check alternative locations where session might exist
 */
async function checkAlternativeLocations(sessionId) {
  console.log('\n🔎 Checking alternative locations...\n');
  
  // Parse session ID to get components
  const parts = sessionId.split('-');
  if (parts.length !== 5) {
    console.log('Cannot check user-specific paths - invalid session ID format');
    return;
  }
  
  const [, promptId, userId, storytellerId] = parts;
  
  // Check users collection
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      console.log(`✅ User ${userId} exists`);
      
      // Check for prompts subcollection
      const promptDoc = await db.collection('users').doc(userId)
        .collection('prompts').doc(promptId).get();
        
      if (promptDoc.exists) {
        console.log(`✅ Prompt ${promptId} exists for user`);
        const promptData = promptDoc.data();
        console.log('  Prompt data:', JSON.stringify(promptData, null, 2));
      } else {
        console.log(`❌ Prompt ${promptId} NOT found for user`);
      }
      
      // Check for recordings subcollection
      const recordingDoc = await db.collection('users').doc(userId)
        .collection('recordings').doc(sessionId).get();
        
      if (recordingDoc.exists) {
        console.log(`✅ Recording ${sessionId} exists for user`);
        const recordingData = recordingDoc.data();
        console.log('  Recording data:', JSON.stringify(recordingData, null, 2));
      } else {
        console.log(`❌ Recording ${sessionId} NOT found for user`);
      }
    } else {
      console.log(`❌ User ${userId} does NOT exist`);
    }
  } catch (error) {
    console.log('Error checking user paths:', error.message);
  }
  
  // Check prompts collection
  try {
    const promptDoc = await db.collection('prompts').doc(promptId).get();
    if (promptDoc.exists) {
      console.log(`✅ Prompt ${promptId} exists in prompts collection`);
      const data = promptDoc.data();
      console.log('  Prompt status:', data.status);
      console.log('  Created for user:', data.userId);
    } else {
      console.log(`❌ Prompt ${promptId} NOT found in prompts collection`);
    }
  } catch (error) {
    console.log('Error checking prompts collection:', error.message);
  }
}

/**
 * List recent sessions
 */
async function listRecentSessions(limit = 10) {
  console.log(`\n📋 Listing ${limit} most recent sessions:\n`);
  
  try {
    const snapshot = await db.collection('recordingSessions')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    if (snapshot.empty) {
      console.log('No sessions found in recordingSessions collection');
      return;
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt._seconds * 1000) : null;
      
      console.log(`\n📄 Session: ${doc.id}`);
      console.log(`  Status: ${data.status || 'NO STATUS'}`);
      console.log(`  Created: ${createdAt ? createdAt.toLocaleString() : 'Unknown'}`);
      console.log(`  User ID: ${data.userId || 'Unknown'}`);
      console.log(`  Prompt ID: ${data.promptId || 'Unknown'}`);
    });
  } catch (error) {
    console.error('Error listing sessions:', error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const sessionId = args[1];

async function main() {
  console.log('🔧 Love Retold Session Diagnostic Tool');
  console.log('======================================');
  
  if (!command) {
    console.log('\nUsage:');
    console.log('  node diagnose-session.js check <sessionId>  - Check specific session');
    console.log('  node diagnose-session.js list [limit]       - List recent sessions');
    console.log('\nExample:');
    console.log('  node diagnose-session.js check jioj9mf-custom17-myCtZuIW-myCtZuIW-1754920889');
    process.exit(0);
  }
  
  switch (command) {
    case 'check':
      if (!sessionId) {
        console.error('Please provide a session ID');
        process.exit(1);
      }
      await checkSession(sessionId);
      break;
      
    case 'list':
      const limit = parseInt(args[1]) || 10;
      await listRecentSessions(limit);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});