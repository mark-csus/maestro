#!/usr/bin/env node

/**
 * TestRail API Client
 * 
 * A Node.js client for interacting with the TestRail API
 * Used by Maestro flows to manage test runs and results
 * 
 * Environment Variables:
 *   TESTRAIL_URL - TestRail instance URL (e.g., https://yourcompany.testrail.io)
 *   TESTRAIL_USER - TestRail user email
 *   TESTRAIL_API_KEY - TestRail API key
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class TestRailClient {
  constructor() {
    this.url = process.env.TESTRAIL_URL;
    this.user = process.env.TESTRAIL_USER;
    this.apiKey = process.env.TESTRAIL_API_KEY;

    if (!this.url || !this.user || !this.apiKey) {
      throw new Error(
        'TestRail credentials not configured. Set TESTRAIL_URL, TESTRAIL_USER, and TESTRAIL_API_KEY environment variables.'
      );
    }

    // Remove trailing slash from URL
    this.url = this.url.replace(/\/$/, '');
    
    // Create base64 encoded auth string
    this.authString = Buffer.from(`${this.user}:${this.apiKey}`).toString('base64');
  }

  /**
   * Make an authenticated request to TestRail API
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} endpoint - API endpoint (without /api/v2/ prefix)
   * @param {object} data - Request body data
   * @returns {Promise<object>} Response data
   */
  async request(method, endpoint, data = null) {
    const apiUrl = `${this.url}/index.php?/api/v2/${endpoint}`;
    const parsedUrl = new URL(apiUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Authorization': `Basic ${this.authString}`,
        'Content-Type': 'application/json'
      }
    };

    return new Promise((resolve, reject) => {
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`TestRail API error (${res.statusCode}): ${parsed.error || responseData}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Create a new test run in TestRail
   * @param {number} projectId - Project ID
   * @param {object} options - Run options (suite_id, name, description, etc.)
   * @returns {Promise<object>} Created run object
   */
  async createRun(projectId, options = {}) {
    const data = {
      suite_id: options.suite_id || options.suiteId,
      name: options.name || `Maestro Test Run - ${new Date().toISOString()}`,
      description: options.description || 'Automated test run created by Maestro',
      ...options
    };

    return this.request('POST', `add_run/${projectId}`, data);
  }

  /**
   * Add a single test result to a test run
   * @param {number} runId - Test run ID
   * @param {number} caseId - Test case ID
   * @param {object} result - Result data (status_id, comment, elapsed, etc.)
   * @returns {Promise<object>} Added result object
   */
  async addResult(runId, caseId, result) {
    const data = {
      status_id: result.status_id || result.statusId,
      comment: result.comment || '',
      elapsed: result.elapsed || null,
      ...result
    };

    return this.request('POST', `add_result_for_case/${runId}/${caseId}`, data);
  }

  /**
   * Add multiple test results to a test run
   * @param {number} runId - Test run ID
   * @param {array} results - Array of result objects
   * @returns {Promise<object>} Response with added results
   */
  async addResults(runId, results) {
    const data = {
      results: results.map(r => ({
        case_id: r.case_id || r.caseId,
        status_id: r.status_id || r.statusId,
        comment: r.comment || '',
        elapsed: r.elapsed || null,
        ...r
      }))
    };

    return this.request('POST', `add_results_for_cases/${runId}`, data);
  }

  /**
   * Get test run details
   * @param {number} runId - Test run ID
   * @returns {Promise<object>} Run object
   */
  async getRun(runId) {
    return this.request('GET', `get_run/${runId}`);
  }

  /**
   * Close a test run
   * @param {number} runId - Test run ID
   * @returns {Promise<object>} Closed run object
   */
  async closeRun(runId) {
    return this.request('POST', `close_run/${runId}`);
  }

  /**
   * Get results for a test
   * @param {number} testId - Test ID
   * @returns {Promise<array>} Array of result objects
   */
  async getResults(testId) {
    return this.request('GET', `get_results/${testId}`);
  }
}

/**
 * Command-line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.error('Usage: node testrail-client.js <command> [options]');
    console.error('Commands:');
    console.error('  create-run <projectId> [name] [description]');
    console.error('  add-result <runId> <caseId> <statusId> [comment] [elapsed]');
    console.error('  add-results <runId> <resultsJson>');
    console.error('  get-run <runId>');
    console.error('  close-run <runId>');
    process.exit(1);
  }

  try {
    const client = new TestRailClient();
    let result;

    switch (command) {
      case 'create-run':
        const projectId = parseInt(args[1]);
        const name = args[2] || undefined;
        const description = args[3] || undefined;
        result = await client.createRun(projectId, { name, description });
        break;

      case 'add-result':
        const runId = parseInt(args[1]);
        const caseId = parseInt(args[2]);
        const statusId = parseInt(args[3]);
        const comment = args[4] || undefined;
        const elapsed = args[5] || undefined;
        result = await client.addResult(runId, caseId, {
          status_id: statusId,
          comment,
          elapsed
        });
        break;

      case 'add-results':
        const runIdMulti = parseInt(args[1]);
        const resultsJson = args[2];
        const results = JSON.parse(resultsJson);
        result = await client.addResults(runIdMulti, results);
        break;

      case 'get-run':
        const runIdGet = parseInt(args[1]);
        result = await client.getRun(runIdGet);
        break;

      case 'close-run':
        const runIdClose = parseInt(args[1]);
        result = await client.closeRun(runIdClose);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = TestRailClient;
