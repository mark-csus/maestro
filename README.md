# Maestro Test Automation Project

This project contains Maestro mobile automation tests with integrated API-based test result tracking.

## Structure

```
.
├── .github/
│   └── workflows/
│       └── maestro-tests.yml      # CI/CD workflow for running tests
├── .maestro/
│   ├── config.yaml                # Maestro configuration
│   ├── scripts/
│   │   ├── report-test-result.js  # Report test results to API
│   │   ├── get-test-result.js     # Retrieve test results from API
│   │   ├── set-env.js             # Set environment variables
│   │   ├── get-env.js             # Get environment variables
│   │   ├── print-env.js           # Print environment variables
│   │   └── clear-env.js           # Clear environment variables
│   └── tests/
│       ├── chrome/                # Chrome app tests
│       │   ├── chrome-failure-example.yaml
│       │   └── openChromeInjectFailure.yaml
│       └── settings/              # Settings app tests
│           ├── open-settings.yaml
│           ├── open-settings-with-reporting.yaml
│           └── settings-search-with-reporting.yaml
└── test-results-api/
    ├── server.js                  # Node.js API server for test results
    ├── package.json
    └── README.md                  # Detailed API documentation
```

## Quick Start

### 1. Start the Test Results API (Optional)

If you want to track test results via API:

```bash
cd test-results-api
node server.js
```

The API will be available at `http://localhost:3000`.

### 2. Run Maestro Tests

**Recommended: Use the test runner with automatic reporting**

```bash
./run-tests.sh .maestro/tests/
```

This will:
- Run all Maestro tests
- Capture actual pass/fail results from JUnit XML
- Automatically report results to the API

**Or run tests manually:**

```bash
maestro test .maestro/tests/
```

Run a specific test:
```bash
./run-tests.sh .maestro/tests/settings/open-settings-with-reporting.yaml
```

### 3. View Test Results

If the API is running, view all results:
```bash
curl http://localhost:3000/test-results
```

## Test Result Reporting

Tests automatically report their actual execution status (PASS/FAIL) to the API when using the `run-tests.sh` wrapper script.

### How It Works

1. **Run tests with the wrapper script:**
   ```bash
   ./run-tests.sh .maestro/tests/
   ```

2. **The script automatically:**
   - Executes Maestro tests with JUnit XML output
   - Parses the XML to extract actual pass/fail results
   - Reports each test result to the API with accurate status

3. **Your test flows stay clean:**
   ```yaml
   appId: com.example.app
   ---
   - launchApp
   - assertVisible: "Welcome"
   ```

No need to manually add `onFlowComplete` hooks or hardcode PASS/FAIL status!
utomatic API Reporting

When run with `./run-tests.sh`, these tests automatically report their actual results:

1. **open-settings-with-reporting.yaml**
   - Opens Android Settings app
   - Reports actual PASS/FAIL status based on test execution

2. **settings-search-with-reporting.yaml**
   - Tests Settings search functionality
   - Reports actual results to API

3. **chrome-failure-example.yaml**
   - Intentionally fails to demonstrate automatic error reporting
   - Reports FAIL status with actual error details from Maestro

### Tests with API Reporting

1. **open-settings-with-reporting.yaml**
   - Opens Android Settings app
   - Reports PASS status to API

2. **settings-search-with-reporting.yaml**
   - Tests Settings search functionality
   - Reports results to API

3. **chrome-failure-example.yaml**
   - Intentionally fails to demonstrate error reporting
   - Reports FAIL status with error details

### Tests without Reporting

1. **open-settings.yaml**
   - Basic Settings app test
   - No API integration

2. **demo-login-env.yaml**
   - Demonstrates environment variable usage
   - Uses onFlowStart and onFlowComplete for setup/teardown

## Environment Variables

Set environment variables in your flows:

```yaml
onFlowStart:
  - runScript: .maestro/scripts/set-env.js KEY=value
```

Useful variables for test reporting:
- `TEST_API_URL`: API server URL (default: `http://localhost:3000`)
- `TEST_RUN_ID`: Unique test run identifier (use `${UUID}`)

## CI/CD Integration

The project includes a GitHub Actions workflow (`.github/workflows/maestro-tests.yml`) that:
- Sets up Android emulator
- Installs Maestro
- Runs automatic API reporting to CI/CD:

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
  run: kill $(cat test-results-api/api.pid) || true
- name: Stop API
  run: kill $(cat test-results-api/api.pid)
```

## Documentation

- [Test Results API Documentation](test-results-api/README.md)
- [Maestro Official Docs](https://maestro.mobile.dev/)
- [JavaScript in Maestro](https://docs.maestro.dev/advanced/javascript)
- [HTTP Requests in Maestro](https://docs.maestro.dev/advanced/javascript/make-http-s-requests)

## Troubleshooting

### API Connection Issues

If tests can't connect to the API:
1. Verify the API server is running: `node test-results-api/server.js`
2. Check the port (default: 3000)
3. For device/emulator tests, use your machine's IP instead of localhost

### Script Execution Errors

If Maestro scripts fail:
1. Ensure script paths are correct in your YAML files
2. Check script has execute permissions: `chmod +x .maestro/scripts/*.js`
3. Verify Node.js is installed and accessible

## Contributing

When adding new tests:
1. Place them in the appropriate directory under `.maestro/tests/`
2. Consider adding API reporting with `onFlowComplete`
3. Use meaningful test names for better result tracking
4. Add comments explaining the test's purpose

## License

MIT
