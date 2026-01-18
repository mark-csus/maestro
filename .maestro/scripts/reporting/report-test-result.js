#!/usr/bin/env node

/**
 * Report Test Result to API
 * 
 * Sends test execution results to the test results API server
 * 
 * Usage in Maestro flow:
 *   onFlowComplete:
 *     - runScript: .maestro/scripts/report-test-result.js PASS testName
 *     - runScript: .maestro/scripts/report-test-result.js FAIL testName "error details"
 * 
 * Arguments:
 *   1. Status: PASS or FAIL (required)
 *   2. Test Name: Name of the test (optional, defaults to timestamp-based ID)
 *   3. Details: Additional error or context information (optional)
 * 
 * Environment Variables:
 *   TEST_API_URL: Base URL of the test results API (default: http://localhost:3000)
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Parse arguments
const args = process.argv.slice(2);
const status = args[0] ? args[0].toLowerCase() : null;
const testName = args[1] || `test-${Date.now()}`;
const detailsArg = args[2] || '';

// Validate status
if (!status || !['pass', 'fail'].includes(status)) {
  console.error('Error: First argument must be PASS or FAIL');
  console.error('Usage: node report-test-result.js <PASS|FAIL> [testName] [details]');
  process.exit(1);
}

// Configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_RUN_ID = process.env.TEST_RUN_ID || `run-${Date.now()}`;

// Prepare test result payload
const testResult = {
  testId: `${TEST_RUN_ID}-${testName.replace(/\s+/g, '-')}`,
  testName: testName,
  status: status,
  timestamp: new Date().toISOString(),
  details: {
    runId: TEST_RUN_ID,
    message: detailsArg,
    environment: process.env.MAESTRO_ENV || 'default'
  }
};

// Make HTTP request
function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const parsedUrl = url.parse(fullUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const postData = JSON.stringify(data);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            resolve({ body: responseBody });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Report test result
async function reportTestResult() {
  try {
    console.log(`\nReporting test result to API...`);
    console.log(`   Test: ${testName}`);
    console.log(`   Status: ${status.toUpperCase()}`);
    console.log(`   API: ${API_BASE_URL}`);

    const response = await makeRequest('/test-result', testResult);

    if (status === 'pass') {
      console.log(`Test result reported successfully: PASSED`);
    } else {
      console.log(`Test result reported successfully: FAILED`);
      if (detailsArg) {
        console.log(`   Details: ${detailsArg}`);
      }
    }

    // Set output for Maestro
    if (typeof output !== 'undefined') {
      output.testResult = {
        submitted: true,
        status: status,
        testId: testResult.testId,
        apiResponse: response
      };
    }

  } catch (error) {
    console.error(`\nFailed to report test result to API:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Make sure the test results API server is running at ${API_BASE_URL}`);
    
    // Set error output for Maestro
    if (typeof output !== 'undefined') {
      output.testResult = {
        submitted: false,
        error: error.message
      };
    }
    
    // Don't fail the test if API is unavailable
    process.exit(0);
  }
}

// Execute
reportTestResult();
