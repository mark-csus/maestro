#!/usr/bin/env node

/**
 * Get Test Result from API
 * 
 * Retrieves a test result from the test results API server
 * 
 * Usage in Maestro flow:
 *   - runScript: .maestro/scripts/get-test-result.js testId
 *   - runScript: .maestro/scripts/get-test-result.js ALL
 * 
 * Arguments:
 *   1. Test ID: Specific test ID to retrieve, or "ALL" for all results
 * 
 * Environment Variables:
 *   TEST_API_URL: Base URL of the test results API (default: http://localhost:3000)
 * 
 * Output:
 *   Sets output.testResult with the retrieved data
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Parse arguments
const args = process.argv.slice(2);
const testId = args[0];

if (!testId) {
  console.error('Error: Test ID is required');
  console.error('Usage: node get-test-result.js <testId|ALL>');
  process.exit(1);
}

// Configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

// Make HTTP GET request
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const parsedUrl = url.parse(fullUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: 'GET'
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

    req.end();
  });
}

// Get test result
async function getTestResult() {
  try {
    console.log(`\nRetrieving test result from API...`);
    console.log(`   Test ID: ${testId}`);
    console.log(`   API: ${API_BASE_URL}`);

    let endpoint;
    if (testId.toUpperCase() === 'ALL') {
      endpoint = '/test-results';
    } else {
      endpoint = `/test-result/${testId}`;
    }

    const response = await makeRequest(endpoint);

    console.log(`✅ Test result retrieved successfully`);
    
    // Display summary
    if (testId.toUpperCase() === 'ALL') {
      console.log(`\n📊 Test Results Summary:`);
      console.log(`   Total: ${response.summary.total}`);
      console.log(`   Passed: ${response.summary.passed}`);
      console.log(`   Failed: ${response.summary.failed}`);
      
      if (response.results && response.results.length > 0) {
        console.log(`\n   Recent results:`);
        response.results.slice(-5).forEach((result) => {
          const icon = result.status === 'pass' ? '[PASS]' : '[FAIL]';
          console.log(`   ${icon} ${result.testName} - ${result.status}`);
        });
      }
    } else {
      const icon = response.status === 'pass' ? '[PASS]' : '[FAIL]';
      console.log(`   ${icon} Status: ${response.status.toUpperCase()}`);
      console.log(`   Test: ${response.testName}`);
      console.log(`   Time: ${response.timestamp}`);
    }

    // Set output for Maestro
    if (typeof output !== 'undefined') {
      output.testResult = response;
    }

  } catch (error) {
    console.error(`\nFailed to retrieve test result from API:`);
    console.error(`   Error: ${error.message}`);
    
    // Set error output for Maestro
    if (typeof output !== 'undefined') {
      output.testResult = {
        error: error.message
      };
    }
    
    process.exit(1);
  }
}

// Execute
getTestResult();
