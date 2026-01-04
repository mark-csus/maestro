# Maestro Test Results API

A simple Node.js API server that tracks test execution results for Maestro mobile automation tests. This enables you to collect, store, and query test results via HTTP API calls from your Maestro flows.

## Features

- ✅ **Track Test Results**: Report PASS/FAIL status for each test execution
- 🔍 **Query Results**: Retrieve individual or all test results
- 📊 **Test Summary**: Get statistics on total, passed, and failed tests
- 🚀 **Simple Setup**: No database required - runs in-memory
- 🔄 **Real-time Updates**: Instant result tracking as tests complete

## Quick Start

### 1. Start the API Server

```bash
cd test-results-api
node server.js
```

The server will start on `http://localhost:3000` by default.

To use a different port:
```bash
node server.js 8080
```

### 2. Run Maestro Tests

Your Maestro tests will automatically report results to the API when using the provided scripts.

Example:
```bash
maestro test .maestro/tests/settings/open-settings-with-reporting.yaml
```

### 3. View Test Results

Get all test results:
```bash
curl http://localhost:3000/test-results
```

Get a specific test result:
```bash
curl http://localhost:3000/test-result/YOUR_TEST_ID
```

## API Endpoints

### Submit Test Result
```http
POST /test-result
Content-Type: application/json

{
  "testId": "unique-test-id",
  "testName": "My Test",
  "status": "pass",
  "timestamp": "2026-01-04T10:00:00Z",
  "details": {
    "message": "Additional context"
  }
}
```

**Response:**
```json
{
  "message": "Test result recorded successfully",
  "result": {
    "testId": "unique-test-id",
    "testName": "My Test",
    "status": "pass",
    "timestamp": "2026-01-04T10:00:00Z",
    "details": {},
    "recordedAt": "2026-01-04T10:00:05Z"
  }
}
```

### Get Specific Test Result
```http
GET /test-result/:testId
```

**Response:**
```json
{
  "testId": "unique-test-id",
  "testName": "My Test",
  "status": "pass",
  "timestamp": "2026-01-04T10:00:00Z",
  "details": {},
  "recordedAt": "2026-01-04T10:00:05Z"
}
```

### Get All Test Results
```http
GET /test-results
```

**Response:**
```json
{
  "summary": {
    "total": 10,
    "passed": 8,
    "failed": 2
  },
  "results": [
    {
      "testId": "test-1",
      "testName": "Login Test",
      "status": "pass",
      "timestamp": "2026-01-04T10:00:00Z"
    }
  ]
}
```

### Clear All Results
```http
DELETE /test-results
```

**Response:**
```json
{
  "message": "Cleared 10 test results"
}
```

## Using with Maestro

### Automated Post-Processing (Recommended)

The best way to report results is using the test runner script, which automatically captures actual test outcomes:

```bash
# Start the API server
node test-results-api/server.js &

# Run tests with automatic reporting
./run-tests.sh .maestro/tests/

# Or run a specific test
./run-tests.sh .maestro/tests/settings/open-settings-with-reporting.yaml
```

Your test flows just need to contain the actual test steps:

```yaml
appId: com.example.app
---
- launchApp
- assertVisible: "Welcome"
```

The runner script will:
1. Execute Maestro tests with JUnit XML output
2. Parse the actual pass/fail results from the XML
3. Automatically report each test result to the API

### Manual Reporting (Alternative)

You can also manually report results using the scripts:

```yaml
onFlowComplete:
  - runScript: .maestro/scripts/report-test-result.js PASS "my-test-name"
```

### Retrieve Test Results

```bash
# Via API
curl http://localhost:3000/test-results

# Or using the script
node .maestro/scripts/get-test-result.js ALL
```

## Script Reference

### run-tests.sh (Wrapper Script)

**Recommended approach** - Runs Maestro tests and automatically reports actual results from JUnit XML.

**Usage:**
```bash
./run-tests.sh [test-path] [maestro-options]
./run-tests.sh .maestro/tests/
./run-tests.sh .maestro/tests/settings/open-settings.yaml
./run-tests.sh .maestro/tests/ --format junit
```

**Environment Variables:**
- `TEST_API_URL`: Base URL of the API (default: `http://localhost:3000`)
- `SKIP_API_REPORTING`: Set to "true" to skip reporting to API

**How it works:**
1. Runs `maestro test` with JUnit XML output
2. Parses the XML to extract actual pass/fail results
3. Reports each test result to the API with accurate status

### report-from-junit.js

Parses JUnit XML and reports results to the API (used by run-tests.sh).

**Usage:**
```bash
node report-from-junit.js <junit-xml-file>
node report-from-junit.js test-results.xml
```

**Environment Variables:**
- `TEST_API_URL`: Base URL of the API (default: `http://localhost:3000`)
- `TEST_RUN_ID`: Unique identifier for the test run

### report-test-result.js

Reports a test result to the API (for manual/custom reporting).

**Usage:**
```bash
node report-test-result.js <PASS|FAIL> [testName] [details]
```

**Arguments:**
- `status` (required): Either "PASS" or "FAIL"
- `testName` (optional): Name of the test (defaults to timestamp-based ID)
- `details` (optional): Additional error or context information

**Environment Variables:**
- `TEST_API_URL`: Base URL of the API (default: `http://localhost:3000`)
- `TEST_RUN_ID`: Unique identifier for the test run

**Example in Maestro:**
```yaml
onFlowComplete:
  - runScript: .maestro/scripts/report-test-result.js PASS "login-test"
```

### get-test-result.js

Retrieves test results from the API.

**Usage:**
```bash
node get-test-result.js <testId|ALL>
```

**Arguments:**
- `testId`: Specific test ID to retrieve, or "ALL" for summary

**Environment Variables:**
- `TEST_API_URL`: Base URL of the API (default: `http://localhost:3000`)

**Example in Maestro:**
```yaml
- runScript: .maestro/scripts/get-test-result.js ALL
- runScript: .maestro/scripts/get-test-result.js run-123-login-test
```

## Example Test Flows

See the following example flows in `.maestro/tests/`:

1. **open-settings-with-reporting.yaml** - Basic test with success reporting
2. **settings-search-with-reporting.yaml** - More complex test flow
3. **chrome-failure-example.yaml** - Example of reporting test failures

## Configuration

### Change API URL

Set the `TEST_API_URL` environment variable:

```yaml
onFlowStart:
  - runScript: .maestro/scripts/set-env.js TEST_API_URL=http://192.168.1.100:3000
```

Or export it in your shell:
```bash
export TEST_API_URL=http://your-api-server:3000
```

### Use in CI/CD

Start the API server in the background and use the test runner:

```bash
# Start API server
node test-results-api/server.js &
API_PID=$!

# Run tests with automatic reporting
./run-tests.sh .maestro/tests/

# Get results
curl http://localhost:3000/test-results

# Stop API server
kill $API_PID
```

Or use the GitHub Actions workflow with JUnit reporting:

```yaml
- name: Start Test Results API
  run: |
    cd test-results-api
    node server.js &
    echo $! > api.pid
    sleep 2

- name: Run Maestro Tests with Reporting
  run: ./run-tests.sh .maestro/tests/

- name: Get Test Results Summary
  if: always()
  run: curl http://localhost:3000/test-results | jq

- name: Stop API
  if: always()
  run: kill $(cat test-results-api/api.pid)
```

## Troubleshooting

### Connection Refused

If you see "Connection refused" errors:
1. Ensure the API server is running: `node server.js`
2. Check the port is correct (default: 3000)
3. Verify `TEST_API_URL` is set correctly

### Tests Not Reporting

1. Check that `onFlowComplete` is properly configured in your flow
2. Verify the script paths are correct relative to your flow
3. Check Maestro logs for script execution errors

### API Not Accessible from Device/Emulator

If running tests on a physical device or emulator:
- Use your machine's IP address instead of `localhost`
- Example: `TEST_API_URL=http://192.168.1.100:3000`
- Ensure firewall allows connections on the API port

## Architecture

```
┌─────────────────┐
│  Maestro Flow   │
│                 │
│  onFlowComplete │
│       ↓         │
│  report-test-   │
│  result.js      │
└────────┬────────┘
         │ HTTP POST
         ↓
┌─────────────────┐
│  Test Results   │
│   API Server    │
│  (Node.js)      │
│                 │
│  In-Memory      │
│  Storage        │
└────────┬────────┘
         │ HTTP GET
         ↓
┌─────────────────┐
│  CI/CD or       │
│  Manual Query   │
└─────────────────┘
```

## License

MIT
