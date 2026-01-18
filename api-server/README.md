# Maestro API Server

Local API service for extending Maestro functionality with custom bash and Python commands.

## Overview

This Flask-based service provides HTTP endpoints that can be called from Maestro flows to execute system commands on the local machine, enabling advanced functionality beyond Maestro's built-in capabilities.

## Setup

1. Install dependencies:
   ```bash
   cd api-server
   pip install -r requirements.txt
   ```

2. Start the server:
   ```bash
   python server.py
   ```

   Or for development with auto-reload:
   ```bash
   FLASK_ENV=development python server.py
   ```

The server will run on `http://localhost:3001` by default and binds to `127.0.0.1` for security.

## Available Endpoints

### 1. Shake Device
Triggers the shake gesture on the connected Android device (opens developer menu in React Native apps).

**Endpoint:** `POST http://localhost:3001/shake_device`

**Example:**
```bash
curl -X POST http://localhost:3001/shake_device
```

**Maestro Flow:**
```yaml
- runFlow:
    http:
      method: POST
      url: http://localhost:3001/shake_device
```

---

### 2. Set Username
Sets the `MAESTRO_USERNAME` environment variable for the server process and its child processes.

**Endpoint:** `POST http://localhost:3001/set_username`

**Body:**
```json
{
  "username": "testuser123"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/set_username \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser123"}'
```

**Maestro Flow:**
```yaml
- runFlow:
    http:
      method: POST
      url: http://localhost:3001/set_username
      headers:
        Content-Type: application/json
      body: |
        {
          "username": "${USERNAME}"
        }
```

---

### 3. Restart Test Services
Kills the ADB server, restarts it, and reboots the connected device. Assumes only one device is connected.

**Endpoint:** `POST http://localhost:3001/restart_test_services`

**Example:**
```bash
curl -X POST http://localhost:3001/restart_test_services
```

**Maestro Flow:**
```yaml
- runFlow:
    http:
      method: POST
      url: http://localhost:3001/restart_test_services
```

**Note:** The device will take some time to fully restart after this command.

---

### Health Check
Check if the server is running.

**Endpoint:** `GET http://localhost:3001/health`

**Example:**
```bash
curl http://localhost:3001/health
```

---

## Usage in Maestro Flows

### JavaScript Client Scripts

For easier integration, use the provided JavaScript client scripts located in `.maestro/scripts/api-client/`:

- `shake-device.js` - Shake the device
- Additional client scripts can be added for other endpoints

### Using JavaScript Clients

```yaml
appId: com.example.app
---
# Use the JavaScript client to shake device
- runScript: ../../scripts/api-client/shake-device.js
```

See `.maestro/tests/api-integration/` for complete examples.

### Direct HTTP Calls

You can also call the API directly using Maestro's `runFlow` with HTTP:

```yaml
appId: com.example.app
---
# Restart services before testing
- runFlow:
    http:
      method: POST
      url: http://localhost:3001/restart_test_services

- launchApp

# Set username for test
- runFlow:
    http:
      method: POST
      url: http://localhost:3001/set_username
      headers:
        Content-Type: application/json
      body: |
        {
          "username": "testuser"
        }

# Open developer menu in React Native
- runFlow:
    http:
      method: POST
      url: http://localhost:3001/shake_device

# Rest of your test flow...
```

## Response Format

All endpoints return JSON responses:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "stdout": "...",
  "stderr": "..."
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Requirements

- Python 3.7 or higher
- ADB (Android Debug Bridge) installed and in PATH
- Android device connected via USB or network

## Extending the API

To add new endpoints:

1. Add a new route in `server.py`:
   ```python
   @app.route('/your_endpoint', methods=['POST'])
   def your_endpoint():
       result = run_command(['your', 'command'])
       if result['success']:
           return jsonify({'success': True, 'stdout': result['stdout']})
       return jsonify({'success': False, 'error': 'Command failed'}), 500
   ```

2. Update this README with the new endpoint documentation.

## Port Configuration

To change the default port (3001), set the `PORT` environment variable:

```bash
PORT=4000 python server.py
```

## Security Notes

- Server binds to `127.0.0.1` (localhost only) for security
- Username input is validated (alphanumeric, underscore, hyphen only)
- Commands use `subprocess.run` with lists (not shell) to prevent injection
- 30-second timeout on all commands

## Troubleshooting

- **ADB not found:** Ensure ADB is installed and added to your system PATH
- **Device not connected:** Run `adb devices` to verify device connection
- **Port already in use:** Change the port using the `PORT` environment variable
- **Permission errors:** Some commands may require elevated permissions
- **Python not found:** Ensure Python 3.7+ is installed

## License

ISC
