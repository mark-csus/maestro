#!/usr/bin/env node

/**
 * Report Test Results from JUnit XML
 * 
 * Parses JUnit XML test results and reports them to the test results API
 * 
 * Usage:
 *   node report-from-junit.js <junit-xml-file>
 *   node report-from-junit.js results.xml
 * 
 * Environment Variables:
 *   TEST_API_URL: Base URL of the test results API (default: http://localhost:3000)
 *   TEST_RUN_ID: Unique identifier for the test run (optional)
 */

const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');

// Parse arguments
const junitFile = process.argv[2];

if (!junitFile) {
  console.error('Error: JUnit XML file path is required');
  console.error('Usage: node report-from-junit.js <junit-xml-file>');
  process.exit(1);
}

if (!fs.existsSync(junitFile)) {
  console.error(`Error: File not found: ${junitFile}`);
  process.exit(1);
}

// Configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_RUN_ID = process.env.TEST_RUN_ID || `run-${Date.now()}`;

// Simple XML parser (no dependencies)
function parseJUnitXML(xmlContent) {
  const results = [];
  
  // Extract test suites
  const testsuiteRegex = /<testsuite[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/testsuite>/g;
  let suiteMatch;
  
  while ((suiteMatch = testsuiteRegex.exec(xmlContent)) !== null) {
    const suiteName = suiteMatch[1];
    const suiteContent = suiteMatch[2];
    
    // Extract test cases from this suite (including self-closing tags)
    const testcaseRegex = /<testcase[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*(?:\/>|(>([\s\S]*?)<\/testcase>))/g;
    let testMatch;
    
    while ((testMatch = testcaseRegex.exec(suiteContent)) !== null) {
      const testName = testMatch[1];
      const time = testMatch[2];
      const testContent = testMatch[4] || ''; // Content between tags, empty if self-closing
      
      // Check for failure
      const hasFailure = testContent.includes('<failure') || testContent.includes('<error');
      const status = hasFailure ? 'fail' : 'pass';
      
      // Extract failure message if present
      let failureMessage = '';
      if (hasFailure) {
        const failureMatch = testContent.match(/<(?:failure|error)[^>]*message="([^"]*)"/);
        if (failureMatch) {
          failureMessage = failureMatch[1];
        } else {
          const failureContentMatch = testContent.match(/<(?:failure|error)[^>]*>([\s\S]*?)<\/(?:failure|error)>/);
          if (failureContentMatch) {
            failureMessage = failureContentMatch[1].trim().substring(0, 200); // Limit length
          }
        }
      }
      
      results.push({
        testId: `${TEST_RUN_ID}-${testName.replace(/\s+/g, '-')}`,
        testName: testName,
        suiteName: suiteName,
        status: status,
        duration: time,
        failureMessage: failureMessage,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

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

// Process and report results
async function processJUnitResults() {
  try {
    console.log(`\n📊 Processing JUnit XML results...`);
    console.log(`   File: ${junitFile}`);
    console.log(`   API: ${API_BASE_URL}`);
    
    // Read and parse XML
    const xmlContent = fs.readFileSync(junitFile, 'utf8');
    const testResults = parseJUnitXML(xmlContent);
    
    if (testResults.length === 0) {
      console.log(`\n⚠️  No test results found in XML file`);
      return;
    }
    
    console.log(`\n   Found ${testResults.length} test(s)\n`);
    
    // Report each test result
    let successCount = 0;
    let failureCount = 0;
    
    for (const result of testResults) {
      try {
        const payload = {
          testId: result.testId,
          testName: result.testName,
          status: result.status,
          timestamp: result.timestamp,
          details: {
            runId: TEST_RUN_ID,
            suite: result.suiteName,
            duration: result.duration,
            message: result.failureMessage || (result.status === 'pass' ? 'Test passed' : 'Test failed')
          }
        };
        
        await makeRequest('/test-result', payload);
        
        const icon = result.status === 'pass' ? '[PASS]' : '[FAIL]';
        console.log(`   ${icon} ${result.testName} - ${result.status.toUpperCase()}`);
        if (result.failureMessage) {
          console.log(`      ↳ ${result.failureMessage}`);
        }
        
        if (result.status === 'pass') {
          successCount++;
        } else {
          failureCount++;
        }
        
      } catch (error) {
        console.error(`   ⚠️  Failed to report: ${result.testName} - ${error.message}`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total: ${testResults.length}`);
    console.log(`   Reported: ${successCount + failureCount}`);
    console.log(`   ✅ Passed: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`\n✨ Results reported to API\n`);
    
  } catch (error) {
    console.error(`\n❌ Error processing JUnit results:`);
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

// Execute
processJUnitResults();
