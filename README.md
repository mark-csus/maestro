# Maestro Test Automation Boilerplate

A complete boilerplate project for [Maestro](https://maestro.mobile.dev/) mobile UI testing with built-in test result tracking, CI/CD integration, and example test flows. Perfect for quickly setting up mobile automation for iOS and Android apps.

## Project Structure

```
maestro/
├── .maestro/
│   ├── config.yaml
│   ├── scripts/
│   │   ├── api-client/          # JavaScript clients for API server
│   │   │   ├── shake-device.js
│   │   │   ├── set-username.js
│   │   │   ├── restart-services.js
│   │   │   └── README.md
│   │   ├── set-env.js           # Environment management
│   │   ├── get-env.js
│   │   ├── clear-env.js
│   │   └── report-*.js          # Test result reporting
│   └── tests/
│       ├── api-integration/     # Tests using API server
│       │   └── shake-device.yaml
│       ├── settings/
│       └── chrome/
├── api-server/                  # Local API for extended functionality
│   ├── server.py
│   ├── requirements.txt
│   └── README.md
└── test-results-api/            # Test result tracking API
    ├── server.js
    └── package.json
```

## Usage

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

**Run a specific test:**

```bash
./run-tests.sh .maestro/tests/settings/open-settings.yaml
```

**Or run tests manually without API reporting:**

```bash
maestro test .maestro/tests/
```

### 3. View Test Results

If the API is running, view all results:

```bash
curl http://localhost:3000/test-results
```

Get formatted output with jq:

```bash
curl http://localhost:3000/test-results | jq
```

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
