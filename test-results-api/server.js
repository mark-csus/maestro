#!/usr/bin/env node

const http = require('http');
const url = require('url');

/**
 * Simple Test Results API Server
 * 
 * Provides endpoints to track Maestro test execution results
 * 
 * Endpoints:
 *   POST /test-result - Submit a test result
 *   GET /test-result/:testId - Get a specific test result
 *   GET /test-results - Get all test results
 *   DELETE /test-results - Clear all test results
 * 
 * Usage:
 *   node server.js [port]
 *   Default port: 3000
 */

const PORT = process.argv[2] || 3000;

// In-memory storage for test results
const testResults = new Map();

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// Helper function to parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// Request handler
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  try {
    // POST /test-result - Submit a test result
    if (req.method === 'POST' && pathname === '/test-result') {
      const body = await parseBody(req);
      
      const { testId, testName, status, timestamp, details } = body;
      
      if (!testId || !status) {
        sendJSON(res, 400, {
          error: 'Missing required fields: testId and status are required'
        });
        return;
      }

      if (!['pass', 'fail'].includes(status.toLowerCase())) {
        sendJSON(res, 400, {
          error: 'Invalid status. Must be "pass" or "fail"'
        });
        return;
      }

      const result = {
        testId,
        testName: testName || testId,
        status: status.toLowerCase(),
        timestamp: timestamp || new Date().toISOString(),
        details: details || {},
        recordedAt: new Date().toISOString()
      };

      testResults.set(testId, result);
      
      console.log(`  ✓ Recorded test result: ${testId} - ${status}`);
      sendJSON(res, 201, {
        message: 'Test result recorded successfully',
        result
      });
      return;
    }

    // GET /test-result/:testId - Get a specific test result
    if (req.method === 'GET' && pathname.startsWith('/test-result/')) {
      const testId = pathname.substring('/test-result/'.length);
      
      if (testResults.has(testId)) {
        sendJSON(res, 200, testResults.get(testId));
      } else {
        sendJSON(res, 404, {
          error: `Test result not found for testId: ${testId}`
        });
      }
      return;
    }

    // GET /test-results - Get all test results
    if (req.method === 'GET' && pathname === '/test-results') {
      const results = Array.from(testResults.values());
      const summary = {
        total: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        failed: results.filter(r => r.status === 'fail').length
      };

      sendJSON(res, 200, {
        summary,
        results
      });
      return;
    }

    // DELETE /test-results - Clear all test results
    if (req.method === 'DELETE' && pathname === '/test-results') {
      const count = testResults.size;
      testResults.clear();
      console.log(`  ✓ Cleared ${count} test results`);
      sendJSON(res, 200, {
        message: `Cleared ${count} test results`
      });
      return;
    }

    // GET / - Health check / API info
    if (req.method === 'GET' && pathname === '/') {
      sendJSON(res, 200, {
        name: 'Maestro Test Results API',
        version: '1.0.0',
        endpoints: {
          'POST /test-result': 'Submit a test result',
          'GET /test-result/:testId': 'Get a specific test result',
          'GET /test-results': 'Get all test results',
          'DELETE /test-results': 'Clear all test results'
        },
        currentResults: testResults.size
      });
      return;
    }

    // 404 - Not found
    sendJSON(res, 404, {
      error: 'Endpoint not found'
    });

  } catch (error) {
    console.error('Error handling request:', error);
    sendJSON(res, 500, {
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Start server
server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Maestro Test Results API Server             ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log('\n📚 Available endpoints:');
  console.log(`   POST   http://localhost:${PORT}/test-result`);
  console.log(`   GET    http://localhost:${PORT}/test-result/:testId`);
  console.log(`   GET    http://localhost:${PORT}/test-results`);
  console.log(`   DELETE http://localhost:${PORT}/test-results`);
  console.log('\n✨ Ready to receive test results!\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});
