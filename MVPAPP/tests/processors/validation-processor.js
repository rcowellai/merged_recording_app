/**
 * Test Results Validation Processor
 * Implements hard validation gates for QA standards compliance
 */

const fs = require('fs');
const path = require('path');

/**
 * Validation gate definitions with pass/fail criteria
 */
const VALIDATION_GATES = {
  security: {
    name: 'Security Compliance Gate',
    required: true,
    criteria: {
      unauthorizedAccessBlocked: 100, // 100% of unauthorized access attempts must be blocked
      dataIsolationIntact: 100,       // 100% data isolation must be maintained
      sessionValidationWorking: 100,  // 100% session validation must work
      fileAccessControlled: 100       // 100% file access must be controlled
    }
  },
  performance: {
    name: 'Performance Standards Gate',
    required: true,
    criteria: {
      queryResponseTime: 200,      // Max 200ms for queries
      indexHitRatio: 95,          // Min 95% index usage
      uploadTimeout: 30000        // Max 30s for uploads
    }
  },
  schema: {
    name: 'Schema Integrity Gate',
    required: true,
    criteria: {
      dataValidation: 100,        // 100% of data must validate
      relationshipIntegrity: 100, // 100% of relationships must be intact
      indexOptimization: 95       // 95% of queries must use indexes
    }
  },
  integration: {
    name: 'Integration Flow Gate',
    required: true,
    criteria: {
      endToEndSuccess: 100,       // 100% of end-to-end flows must work
      errorHandling: 100,         // 100% of error scenarios must be handled
      dataConsistency: 100        // 100% data consistency across services
    }
  }
};

/**
 * Process test results and apply validation gates
 */
function processTestResults(results) {
  console.log('🔍 Processing test results with validation gates...');
  
  const validationReport = {
    timestamp: new Date().toISOString(),
    overallStatus: 'UNKNOWN',
    gates: {},
    summary: {
      totalTests: results.numTotalTests || 0,
      passedTests: results.numPassedTests || 0,
      failedTests: results.numFailedTests || 0,
      testSuites: results.numTotalTestSuites || 0
    },
    errors: [],
    warnings: []
  };

  try {
    // Apply each validation gate
    for (const [gateKey, gateConfig] of Object.entries(VALIDATION_GATES)) {
      const gateResult = applyValidationGate(gateKey, gateConfig, results);
      validationReport.gates[gateKey] = gateResult;
      
      if (gateConfig.required && !gateResult.passed) {
        validationReport.errors.push(`CRITICAL: ${gateConfig.name} failed validation`);
      }
    }
    
    // Determine overall status
    const criticalFailures = validationReport.errors.filter(e => e.includes('CRITICAL')).length;
    const allRequiredGatesPassed = Object.values(validationReport.gates)
      .filter(gate => gate.required)
      .every(gate => gate.passed);
    
    if (criticalFailures === 0 && allRequiredGatesPassed && results.success) {
      validationReport.overallStatus = 'PASS';
    } else {
      validationReport.overallStatus = 'FAIL';
    }
    
    // Generate detailed report
    generateValidationReport(validationReport);
    
    // Output validation summary
    outputValidationSummary(validationReport);
    
    return results; // Return original results for Jest
    
  } catch (error) {
    console.error('❌ Error processing test results:', error);
    validationReport.overallStatus = 'ERROR';
    validationReport.errors.push(`Processing error: ${error.message}`);
    return results;
  }
}

/**
 * Apply individual validation gate
 */
function applyValidationGate(gateKey, gateConfig, testResults) {
  const gateResult = {
    name: gateConfig.name,
    required: gateConfig.required,
    passed: false,
    score: 0,
    details: {},
    errors: [],
    warnings: []
  };
  
  try {
    switch (gateKey) {
      case 'security':
        gateResult = applySecurityGate(gateConfig, testResults);
        break;
      case 'performance':
        gateResult = applyPerformanceGate(gateConfig, testResults);
        break;
      case 'schema':
        gateResult = applySchemaGate(gateConfig, testResults);
        break;
      case 'integration':
        gateResult = applyIntegrationGate(gateConfig, testResults);
        break;
      default:
        gateResult.errors.push(`Unknown validation gate: ${gateKey}`);
    }
  } catch (error) {
    gateResult.errors.push(`Gate processing error: ${error.message}`);
  }
  
  return gateResult;
}

/**
 * Apply security validation gate
 */
function applySecurityGate(gateConfig, testResults) {
  const gateResult = {
    name: gateConfig.name,
    required: gateConfig.required,
    passed: false,
    score: 0,
    details: {},
    errors: [],
    warnings: []
  };
  
  // Extract security test results from Jest results
  const securityTests = extractTestsByPattern(testResults, /security|auth|permission/i);
  
  if (securityTests.length === 0) {
    gateResult.errors.push('No security tests found');
    return gateResult;
  }
  
  // Check security criteria
  const securityScore = calculateSecurityScore(securityTests);
  gateResult.score = securityScore;
  gateResult.details = {
    totalSecurityTests: securityTests.length,
    passedSecurityTests: securityTests.filter(t => t.status === 'passed').length,
    unauthorizedAccessBlocked: securityScore >= gateConfig.criteria.unauthorizedAccessBlocked
  };
  
  // Determine if gate passes
  gateResult.passed = securityScore >= gateConfig.criteria.unauthorizedAccessBlocked;
  
  if (!gateResult.passed) {
    gateResult.errors.push(`Security score ${securityScore}% below required ${gateConfig.criteria.unauthorizedAccessBlocked}%`);
  }
  
  return gateResult;
}

/**
 * Apply performance validation gate
 */
function applyPerformanceGate(gateConfig, testResults) {
  const gateResult = {
    name: gateConfig.name,
    required: gateConfig.required,
    passed: false,
    score: 0,
    details: {},
    errors: [],
    warnings: []
  };
  
  // Extract performance test results
  const performanceTests = extractTestsByPattern(testResults, /performance|query|speed|time/i);
  
  if (performanceTests.length === 0) {
    gateResult.warnings.push('No explicit performance tests found - using test execution times');
  }
  
  // Analyze test execution times as performance proxy
  const executionTimes = extractExecutionTimes(testResults);
  const averageTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
  
  gateResult.details = {
    averageExecutionTime: Math.round(averageTime),
    maxExecutionTime: Math.max(...executionTimes),
    performanceThreshold: gateConfig.criteria.queryResponseTime,
    withinThreshold: averageTime <= gateConfig.criteria.queryResponseTime
  };
  
  // Performance score based on execution time
  gateResult.score = Math.max(0, 100 - (averageTime / gateConfig.criteria.queryResponseTime * 100));
  gateResult.passed = averageTime <= gateConfig.criteria.queryResponseTime;
  
  if (!gateResult.passed) {
    gateResult.errors.push(`Average execution time ${Math.round(averageTime)}ms exceeds threshold ${gateConfig.criteria.queryResponseTime}ms`);
  }
  
  return gateResult;
}

/**
 * Apply schema validation gate
 */
function applySchemaGate(gateConfig, testResults) {
  const gateResult = {
    name: gateConfig.name,
    required: gateConfig.required,
    passed: false,
    score: 0,
    details: {},
    errors: [],
    warnings: []
  };
  
  // Extract schema-related tests
  const schemaTests = extractTestsByPattern(testResults, /schema|validation|integrity|data/i);
  
  if (schemaTests.length === 0) {
    gateResult.errors.push('No schema validation tests found');
    return gateResult;
  }
  
  const passedSchemaTests = schemaTests.filter(t => t.status === 'passed').length;
  const schemaScore = (passedSchemaTests / schemaTests.length) * 100;
  
  gateResult.score = schemaScore;
  gateResult.details = {
    totalSchemaTests: schemaTests.length,
    passedSchemaTests: passedSchemaTests,
    dataValidationScore: schemaScore
  };
  
  gateResult.passed = schemaScore >= gateConfig.criteria.dataValidation;
  
  if (!gateResult.passed) {
    gateResult.errors.push(`Schema validation score ${schemaScore}% below required ${gateConfig.criteria.dataValidation}%`);
  }
  
  return gateResult;
}

/**
 * Apply integration validation gate
 */
function applyIntegrationGate(gateConfig, testResults) {
  const gateResult = {
    name: gateConfig.name,
    required: gateConfig.required,
    passed: false,
    score: 0,
    details: {},
    errors: [],
    warnings: []
  };
  
  // Extract integration tests
  const integrationTests = extractTestsByPattern(testResults, /integration|flow|end.*to.*end|workflow/i);
  
  if (integrationTests.length === 0) {
    gateResult.errors.push('No integration tests found');
    return gateResult;
  }
  
  const passedIntegrationTests = integrationTests.filter(t => t.status === 'passed').length;
  const integrationScore = (passedIntegrationTests / integrationTests.length) * 100;
  
  gateResult.score = integrationScore;
  gateResult.details = {
    totalIntegrationTests: integrationTests.length,
    passedIntegrationTests: passedIntegrationTests,
    endToEndSuccessRate: integrationScore
  };
  
  gateResult.passed = integrationScore >= gateConfig.criteria.endToEndSuccess;
  
  if (!gateResult.passed) {
    gateResult.errors.push(`Integration success rate ${integrationScore}% below required ${gateConfig.criteria.endToEndSuccess}%`);
  }
  
  return gateResult;
}

/**
 * Helper functions
 */
function extractTestsByPattern(testResults, pattern) {
  const tests = [];
  
  if (testResults.testResults) {
    testResults.testResults.forEach(suiteResult => {
      if (suiteResult.assertionResults) {
        suiteResult.assertionResults.forEach(test => {
          if (pattern.test(test.title) || pattern.test(test.fullName)) {
            tests.push({
              title: test.title,
              status: test.status,
              duration: test.duration || 0
            });
          }
        });
      }
    });
  }
  
  return tests;
}

function extractExecutionTimes(testResults) {
  const times = [];
  
  if (testResults.testResults) {
    testResults.testResults.forEach(suiteResult => {
      if (suiteResult.perfStats && suiteResult.perfStats.runtime) {
        times.push(suiteResult.perfStats.runtime);
      }
      if (suiteResult.assertionResults) {
        suiteResult.assertionResults.forEach(test => {
          if (test.duration) {
            times.push(test.duration);
          }
        });
      }
    });
  }
  
  return times.length > 0 ? times : [0];
}

function calculateSecurityScore(securityTests) {
  if (securityTests.length === 0) return 0;
  
  const passedSecurityTests = securityTests.filter(t => t.status === 'passed').length;
  return (passedSecurityTests / securityTests.length) * 100;
}

/**
 * Generate detailed validation report
 */
function generateValidationReport(validationReport) {
  const reportsDir = path.join(__dirname, '../reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Generate JSON report
  const jsonReportPath = path.join(reportsDir, 'validation-report.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(validationReport, null, 2));
  
  // Generate human-readable report
  const textReport = generateTextReport(validationReport);
  const textReportPath = path.join(reportsDir, 'validation-report.txt');
  fs.writeFileSync(textReportPath, textReport);
}

/**
 * Generate human-readable text report
 */
function generateTextReport(validationReport) {
  let report = [];
  
  report.push('=====================================');
  report.push('🎯 FIREBASE INTEGRATION TEST VALIDATION REPORT');
  report.push('=====================================');
  report.push('');
  report.push(`📊 Overall Status: ${validationReport.overallStatus}`);
  report.push(`🕐 Generated: ${validationReport.timestamp}`);
  report.push('');
  
  // Test Summary
  report.push('📋 Test Summary:');
  report.push(`   Total Tests: ${validationReport.summary.totalTests}`);
  report.push(`   Passed: ${validationReport.summary.passedTests}`);
  report.push(`   Failed: ${validationReport.summary.failedTests}`);
  report.push(`   Test Suites: ${validationReport.summary.testSuites}`);
  report.push('');
  
  // Validation Gates
  report.push('🚦 Validation Gates:');
  for (const [gateKey, gateResult] of Object.entries(validationReport.gates)) {
    const status = gateResult.passed ? '✅ PASS' : '❌ FAIL';
    const required = gateResult.required ? '(REQUIRED)' : '(OPTIONAL)';
    
    report.push(`   ${status} ${gateResult.name} ${required}`);
    report.push(`      Score: ${Math.round(gateResult.score)}%`);
    
    if (gateResult.errors.length > 0) {
      report.push(`      Errors: ${gateResult.errors.join(', ')}`);
    }
    if (gateResult.warnings.length > 0) {
      report.push(`      Warnings: ${gateResult.warnings.join(', ')}`);
    }
  }
  report.push('');
  
  // Overall Errors and Warnings
  if (validationReport.errors.length > 0) {
    report.push('❌ Critical Errors:');
    validationReport.errors.forEach(error => {
      report.push(`   • ${error}`);
    });
    report.push('');
  }
  
  if (validationReport.warnings.length > 0) {
    report.push('⚠️ Warnings:');
    validationReport.warnings.forEach(warning => {
      report.push(`   • ${warning}`);
    });
    report.push('');
  }
  
  report.push('=====================================');
  
  return report.join('\n');
}

/**
 * Output validation summary to console
 */
function outputValidationSummary(validationReport) {
  console.log('');
  console.log('🎯 VALIDATION GATES SUMMARY');
  console.log('=====================================');
  console.log(`📊 Overall Status: ${validationReport.overallStatus}`);
  
  for (const [gateKey, gateResult] of Object.entries(validationReport.gates)) {
    const status = gateResult.passed ? '✅' : '❌';
    const score = Math.round(gateResult.score);
    console.log(`${status} ${gateResult.name}: ${score}%`);
    
    if (!gateResult.passed && gateResult.required) {
      console.log(`   🚨 CRITICAL FAILURE: ${gateResult.errors.join(', ')}`);
    }
  }
  
  console.log('=====================================');
  
  if (validationReport.overallStatus === 'PASS') {
    console.log('✅ ALL VALIDATION GATES PASSED - INTEGRATION TESTS SUCCESSFUL');
  } else {
    console.log('❌ VALIDATION GATE FAILURES DETECTED - INTEGRATION TESTS FAILED');
    console.log('🔍 See validation-report.txt for detailed analysis');
  }
  
  console.log('');
}

module.exports = processTestResults;