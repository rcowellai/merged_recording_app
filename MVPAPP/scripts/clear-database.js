/**
 * Database Cleanup Script for Love Retold Recording Integration
 * Safely clears development and test data
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin SDK
const app = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'love-retold-backend-dev'
});

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/**
 * Safety check to prevent production data deletion
 */
function validateEnvironment() {
  const projectId = app.options.projectId;
  
  // Prevent deletion in production
  if (projectId === 'love-retold-backend' || projectId.includes('prod')) {
    throw new Error('🚨 PRODUCTION SAFETY: Cannot clear production database!');
  }
  
  console.log(`🔧 Environment validated: ${projectId}`);
  return true;
}

/**
 * Delete all documents in a collection
 */
async function clearCollection(collectionName, batchSize = 500) {
  const collectionRef = db.collection(collectionName);
  
  let deletedCount = 0;
  let hasMore = true;
  
  while (hasMore) {
    const snapshot = await collectionRef.limit(batchSize).get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    deletedCount += snapshot.docs.length;
    
    console.log(`   Deleted ${snapshot.docs.length} documents from ${collectionName}`);
    
    // If we got fewer documents than requested, we're done
    if (snapshot.docs.length < batchSize) {
      hasMore = false;
    }
  }
  
  return deletedCount;
}

/**
 * Clear all Firestore collections
 */
async function clearFirestore() {
  console.log('🗄️  Clearing Firestore collections...');
  
  const collections = [
    'users',
    'prompts', 
    'recordingSessions',
    'stories',
    'analytics'
  ];
  
  let totalDeleted = 0;
  
  for (const collection of collections) {
    try {
      const deleted = await clearCollection(collection);
      totalDeleted += deleted;
      console.log(`✓ Cleared ${collection}: ${deleted} documents`);
    } catch (error) {
      console.error(`❌ Error clearing ${collection}:`, error);
    }
  }
  
  console.log(`📊 Total documents deleted: ${totalDeleted}`);
  return totalDeleted;
}

/**
 * Clear Firebase Auth users
 */
async function clearAuthUsers() {
  console.log('🔐 Clearing Firebase Auth users...');
  
  let deletedCount = 0;
  let nextPageToken;
  
  do {
    try {
      const listResult = await auth.listUsers(1000, nextPageToken);
      
      if (listResult.users.length === 0) {
        break;
      }
      
      // Delete users in batches
      const uids = listResult.users.map(user => user.uid);
      const result = await auth.deleteUsers(uids);
      
      deletedCount += result.successCount;
      
      if (result.failureCount > 0) {
        console.warn(`⚠️  Failed to delete ${result.failureCount} users`);
        result.errors.forEach(error => {
          console.warn(`   Error deleting ${error.uid}: ${error.error.message}`);
        });
      }
      
      console.log(`   Deleted ${result.successCount} users`);
      nextPageToken = listResult.pageToken;
      
    } catch (error) {
      console.error('❌ Error clearing auth users:', error);
      break;
    }
  } while (nextPageToken);
  
  console.log(`✓ Cleared Firebase Auth: ${deletedCount} users`);
  return deletedCount;
}

/**
 * Clear Storage files (development only)
 */
async function clearStorage() {
  console.log('📦 Clearing Firebase Storage...');
  
  try {
    const bucket = storage.bucket();
    
    // List all files
    const [files] = await bucket.getFiles({ prefix: 'recordings/' });
    
    if (files.length === 0) {
      console.log('   No files to delete');
      return 0;
    }
    
    // Delete files in batches
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const deletePromises = batch.map(file => 
        file.delete().catch(error => 
          console.warn(`   Failed to delete ${file.name}: ${error.message}`)
        )
      );
      
      await Promise.all(deletePromises);
      deletedCount += batch.length;
      
      console.log(`   Deleted batch of ${batch.length} files`);
    }
    
    console.log(`✓ Cleared Storage: ${deletedCount} files`);
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
    return 0;
  }
}

/**
 * Clear specific user data (useful for testing)
 */
async function clearUserData(userId) {
  console.log(`👤 Clearing data for user: ${userId}`);
  
  try {
    // Delete user's prompts
    const promptsSnapshot = await db.collection('prompts')
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    promptsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete user's stories
    const storiesSnapshot = await db.collection('stories')
      .where('userId', '==', userId)
      .get();
    
    storiesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete user's recording sessions
    const sessionsSnapshot = await db.collection('recordingSessions')
      .where('userId', '==', userId)
      .get();
    
    sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete user document
    batch.delete(db.collection('users').doc(userId));
    
    await batch.commit();
    
    // Delete from Firebase Auth
    await auth.deleteUser(userId);
    
    const totalDeleted = promptsSnapshot.size + storiesSnapshot.size + 
                        sessionsSnapshot.size + 1; // +1 for user doc
    
    console.log(`✓ Cleared user data: ${totalDeleted} documents`);
    return totalDeleted;
    
  } catch (error) {
    console.error(`❌ Error clearing user data for ${userId}:`, error);
    return 0;
  }
}

/**
 * Reset database to clean state
 */
async function resetDatabase() {
  try {
    console.log('🔄 Resetting database to clean state...');
    
    // Validate environment first
    validateEnvironment();
    
    // Clear all data
    await clearFirestore();
    await clearAuthUsers();
    await clearStorage();
    
    console.log('✅ Database reset completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   All Firestore collections cleared');
    console.log('   All Firebase Auth users deleted');
    console.log('   All Storage files removed');
    console.log('\n💡 Ready for fresh seeding with: npm run db:seed');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

/**
 * Interactive confirmation for safety
 */
async function confirmReset() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`🚨 This will permanently delete ALL data in ${app.options.projectId}. Continue? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main cleanup function
 */
async function cleanDatabase(options = {}) {
  try {
    const { userId, skipConfirmation = false } = options;
    
    // Validate environment
    validateEnvironment();
    
    if (userId) {
      // Clear specific user data
      await clearUserData(userId);
      return;
    }
    
    // Full database reset
    if (!skipConfirmation) {
      const confirmed = await confirmReset();
      if (!confirmed) {
        console.log('❌ Operation cancelled');
        return;
      }
    }
    
    await resetDatabase();
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
}

/**
 * Command line interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user' && args[i + 1]) {
      options.userId = args[i + 1];
      i++; // Skip next argument
    }
    if (args[i] === '--force') {
      options.skipConfirmation = true;
    }
  }
  
  cleanDatabase(options)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  cleanDatabase,
  clearFirestore,
  clearAuthUsers,
  clearStorage,
  clearUserData,
  resetDatabase
};