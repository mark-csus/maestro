# Maestro Environment Variable Scripts

This directory contains scripts for managing environment variables across Maestro flows.

## Scripts

### `set-env.js`
Sets environment variables that persist across flows.

**Usage:**
```yaml
- runScript: .maestro/scripts/set-env.js KEY1=value1 KEY2=value2
```

**Example:**
```yaml
# Setup credentials at flow start
onFlowStart:
  - runScript: .maestro/scripts/set-env.js TEST_USER=john@example.com API_KEY=secret123

# Clean up at flow end
onFlowComplete:
  - runScript: .maestro/scripts/clear-env.js
```

### `get-env.js`
Retrieves previously set environment variables.

**Usage:**
```yaml
# Get specific variables
- runScript: .maestro/scripts/get-env.js TEST_USER API_KEY

# Get all variables
- runScript: .maestro/scripts/get-env.js
```

### `clear-env.js`
Clears environment variables.

**Usage:**
```yaml
# Clear all variables
- runScript: .maestro/scripts/clear-env.js

# Clear specific variables
- runScript: .maestro/scripts/clear-env.js TEST_USER API_KEY
```

## How It Works

1. Variables are stored in two files in your home directory:
   - `~/.maestro-env` - Shell-sourceable format
   - `~/.maestro-env.json` - JSON format for easy parsing

2. Variables persist across flow runs until explicitly cleared

3. Variables are merged (new values update existing ones)

## Common Use Cases

### Basic Setup/Teardown Pattern (Recommended)
```yaml
appId: my.app
onFlowStart:
  - runScript: .maestro/scripts/set-env.js USERNAME=test@example.com PASSWORD=secret
onFlowComplete:
  - runScript: .maestro/scripts/clear-env.js
---
# Your test steps here - variables are available throughout
- runScript: .maestro/scripts/print-env.js USERNAME PASSWORD
```

### Track Test Execution with Timing
```yaml
appId: my.app
onFlowStart:
  - runScript: .maestro/scripts/set-env.js TEST_RUN_ID=${UUID} START_TIME=${timestamp}
onFlowComplete:
  - runScript: .maestro/scripts/set-env.js END_TIME=${timestamp}
  - runScript: .maestro/scripts/print-env.js TEST_RUN_ID START_TIME END_TIME
  - runScript: .maestro/scripts/clear-env.js
---
# Your test steps here
```

### Set Credentials with onFlowStart
```yaml
appId: my.app
onFlowStart:
  - runScript: .maestro/scripts/set-env.js USERNAME=test@example.com PASSWORD=secret123
---
# Flow can now use these credentials
- runScript: .maestro/scripts/print-env.js USERNAME PASSWORD
```

### Share Data Between Flows (Without Auto-Cleanup)
```yaml
# flow1.yaml - Sets data for other flows to use
onFlowStart:
  - runScript: .maestro/scripts/set-env.js AUTH_TOKEN=abc123 USER_ID=12345
# NOTE: No onFlowComplete cleanup - data persists

# flow2.yaml - Uses data from flow1
- runScript: .maestro/scripts/get-env.js AUTH_TOKEN USER_ID
- runScript: .maestro/scripts/print-env.js AUTH_TOKEN

# flow3.yaml - Final cleanup
onFlowComplete:
  - runScript: .maestro/scripts/clear-env.js
```

### Debug Information with Cleanup
```yaml
onFlowComplete:
  - runScript: .maestro/scripts/set-env.js LAST_SCREEN=${screen} LAST_ACTION=${action}
  - runScript: .maestro/scripts/print-env.js
  - runScript: .maestro/scripts/clear-env.js
```

## Testing Scripts Directly

You can test the scripts from your terminal:

```bash
# Set variables
node .maestro/scripts/set-env.js TEST=hello ANOTHER=world

# Get variables
node .maestro/scripts/get-env.js

# Clear variables
node .maestro/scripts/clear-env.js
```

## CI/CD Integration

These scripts work seamlessly in GitHub Actions:

```yaml
- name: Run Maestro Tests
  run: |
    maestro test .maestro/tests/
    
    # Access variables set during tests
    source ~/.maestro-env
    echo "Test run ID: $TEST_RUN_ID"
```
