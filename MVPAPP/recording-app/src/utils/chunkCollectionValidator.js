/**
 * Chunk Collection Validator
 * Validation and testing utilities for the enhanced chunk collection system
 */

/**
 * Validate chunk collection completeness
 * @param {Array} collectedChunks - Array of collected chunks
 * @param {Array} recorderChunks - Array of chunks from ChunkedRecorder
 * @returns {Object} Validation result
 */
export const validateChunkCollection = (collectedChunks, recorderChunks) => {
  const validation = {
    isValid: false,
    completeness: 0,
    issues: [],
    recommendations: [],
    stats: {
      collectedCount: collectedChunks.length,
      recorderCount: recorderChunks.length,
      totalCollectedSize: 0,
      averageChunkSize: 0
    }
  };

  try {
    // Calculate total size and validate chunk data
    validation.stats.totalCollectedSize = collectedChunks.reduce((total, chunk) => {
      if (!chunk.data || chunk.size === 0) {
        validation.issues.push(`Invalid chunk at index ${chunk.index}`);
      }
      return total + (chunk.size || 0);
    }, 0);

    validation.stats.averageChunkSize = collectedChunks.length > 0 
      ? Math.round(validation.stats.totalCollectedSize / collectedChunks.length)
      : 0;

    // Check for missing chunks
    const expectedIndexes = Array.from({ length: collectedChunks.length }, (_, i) => i);
    const actualIndexes = collectedChunks.map(chunk => chunk.index).sort((a, b) => a - b);
    const missingIndexes = expectedIndexes.filter(index => !actualIndexes.includes(index));
    
    if (missingIndexes.length > 0) {
      validation.issues.push(`Missing chunks at indexes: ${missingIndexes.join(', ')}`);
    }

    // Check for duplicate chunks
    const duplicates = actualIndexes.filter((index, pos) => actualIndexes.indexOf(index) !== pos);
    if (duplicates.length > 0) {
      validation.issues.push(`Duplicate chunks at indexes: ${duplicates.join(', ')}`);
    }

    // Calculate completeness
    if (collectedChunks.length >= recorderChunks.length) {
      validation.completeness = 1.0; // 100% - we have more chunks than the recorder
      validation.isValid = validation.issues.length === 0;
      validation.recommendations.push('✅ Chunk collection is complete and should fix black screen issue');
    } else {
      validation.completeness = collectedChunks.length / Math.max(recorderChunks.length, 1);
      validation.issues.push(`Incomplete collection: ${collectedChunks.length}/${recorderChunks.length} chunks`);
      validation.recommendations.push('⚠️ Chunk collection incomplete - may still have playback issues');
    }

    // Memory usage validation
    const memoryMB = validation.stats.totalCollectedSize / (1024 * 1024);
    if (memoryMB > 400) {
      validation.issues.push(`High memory usage: ${memoryMB.toFixed(2)}MB`);
      validation.recommendations.push('🚨 Consider implementing progressive upload to reduce memory usage');
    } else if (memoryMB > 200) {
      validation.recommendations.push('⚠️ Monitor memory usage for longer recordings');
    }

    // Timeline validation
    const timestamps = collectedChunks.map(chunk => chunk.timestamp).sort();
    const timeSpan = timestamps.length > 1 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
    const expectedTimeSpan = collectedChunks.length * 45 * 1000; // 45 seconds per chunk
    const timeAccuracy = Math.abs(timeSpan - expectedTimeSpan) / expectedTimeSpan;
    
    if (timeAccuracy > 0.2) { // More than 20% time difference
      validation.issues.push(`Timeline mismatch: expected ${expectedTimeSpan/1000}s, actual ${timeSpan/1000}s`);
    }

  } catch (error) {
    validation.issues.push(`Validation error: ${error.message}`);
  }

  return validation;
};

/**
 * Test chunk collection functionality
 * @param {Function} onChunkReady - The onChunkReady callback to test
 * @returns {Promise<Object>} Test results
 */
export const testChunkCollection = async (onChunkReady) => {
  const testResults = {
    success: false,
    testsRun: 0,
    testsPassed: 0,
    errors: []
  };

  try {
    console.log('🧪 Starting chunk collection tests...');

    // Test 1: Basic chunk processing
    testResults.testsRun++;
    const testChunk = new Blob(['test data'], { type: 'audio/mp4' });
    testChunk.size = 1024;
    
    try {
      await onChunkReady(testChunk, 0);
      testResults.testsPassed++;
      console.log('✅ Test 1 passed: Basic chunk processing');
    } catch (error) {
      testResults.errors.push(`Test 1 failed: ${error.message}`);
    }

    // Test 2: Invalid chunk handling
    testResults.testsRun++;
    try {
      await onChunkReady(null, 1);
      testResults.testsPassed++;
      console.log('✅ Test 2 passed: Invalid chunk handling');
    } catch (error) {
      testResults.errors.push(`Test 2 failed: ${error.message}`);
    }

    // Test 3: Large chunk processing
    testResults.testsRun++;
    const largeChunk = new Blob([new ArrayBuffer(10 * 1024 * 1024)], { type: 'video/mp4' });
    try {
      await onChunkReady(largeChunk, 2);
      testResults.testsPassed++;
      console.log('✅ Test 3 passed: Large chunk processing');
    } catch (error) {
      testResults.errors.push(`Test 3 failed: ${error.message}`);
    }

    testResults.success = testResults.testsPassed === testResults.testsRun;
    console.log(`🧪 Tests complete: ${testResults.testsPassed}/${testResults.testsRun} passed`);

  } catch (error) {
    testResults.errors.push(`Test framework error: ${error.message}`);
  }

  return testResults;
};

/**
 * Performance benchmark for chunk collection
 * @param {Array} chunks - Array of chunks to benchmark
 * @returns {Object} Performance metrics
 */
export const benchmarkChunkCollection = (chunks) => {
  const startTime = performance.now();
  
  // Simulate blob creation from chunks
  const chunkData = chunks.map(chunk => chunk.data);
  const blob = new Blob(chunkData, { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  
  // Clean up
  URL.revokeObjectURL(url);
  
  return {
    processingTimeMs: Math.round(processingTime * 100) / 100,
    chunkCount: chunks.length,
    totalSizeMB: Math.round((blob.size / (1024 * 1024)) * 100) / 100,
    throughputMBps: Math.round((blob.size / (1024 * 1024)) / (processingTime / 1000) * 100) / 100,
    averageTimePerChunk: Math.round((processingTime / chunks.length) * 100) / 100
  };
};

/**
 * Generate detailed diagnostic report
 * @param {Object} chunkStats - Chunk collection statistics
 * @param {Array} collectedChunks - Collected chunks array
 * @returns {Object} Diagnostic report
 */
export const generateDiagnosticReport = (chunkStats, collectedChunks) => {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      status: 'Unknown',
      chunksCollected: collectedChunks.length,
      estimatedMemoryMB: chunkStats.estimatedMemoryMB,
      collectionTimeMs: chunkStats.lastChunkTime ? Date.now() - chunkStats.lastChunkTime : 0
    },
    analysis: {
      memoryEfficiency: 'Good',
      chunkIntegrity: 'Unknown',
      expectedBehavior: 'Preview should work for recordings of any length'
    },
    recommendations: []
  };

  // Determine status
  if (collectedChunks.length === 0) {
    report.summary.status = 'No chunks collected';
    report.recommendations.push('Check if recording is active and onChunkReady is being called');
  } else if (chunkStats.estimatedMemoryMB > 400) {
    report.summary.status = 'Memory pressure detected';
    report.analysis.memoryEfficiency = 'Critical';
    report.recommendations.push('Consider implementing progressive upload');
    report.recommendations.push('Monitor for memory-related crashes');
  } else if (chunkStats.estimatedMemoryMB > 200) {
    report.summary.status = 'High memory usage';
    report.analysis.memoryEfficiency = 'Warning';
    report.recommendations.push('Monitor memory usage for longer recordings');
  } else {
    report.summary.status = 'Healthy';
    report.recommendations.push('Chunk collection is operating within normal parameters');
  }

  return report;
};