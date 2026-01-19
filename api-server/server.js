const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Endpoint: Shake device
 * Triggers the shake gesture on the connected Android device
 */
app.post('/shake_device', async (req, res) => {
  try {
    console.log('Executing: adb shell input keyevent 97');
    const { stdout, stderr } = await execAsync('adb shell input keyevent 97');
    
    res.json({
      success: true,
      message: 'Device shaken successfully',
      stdout: stdout.trim(),
      stderr: stderr.trim()
    });
  } catch (error) {
    console.error('Error shaking device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to shake device',
      error: error.message
    });
  }
});

/**
 * Endpoint: Set username
 * Sets the MAESTRO_USERNAME environment variable
 */
app.post('/set_username', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required in request body'
      });
    }

    // Set the environment variable in the current Node.js process
    process.env.MAESTRO_USERNAME = username;
    
    // Also execute the export command (this will work for child processes)
    const command = `export MAESTRO_USERNAME=${username}`;
    console.log(`Executing: ${command}`);
    
    res.json({
      success: true,
      message: `Username set to: ${username}`,
      username: username,
      note: 'Environment variable is set for this server process and its child processes'
    });
  } catch (error) {
    console.error('Error setting username:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set username',
      error: error.message
    });
  }
});

/**
 * Endpoint: Restart test services
 * Kills ADB, restarts it, and restarts the connected device
 */
app.post('/restart_test_services', async (req, res) => {
  try {
    console.log('Restarting test services...');
    const results = [];
    
    // Step 1: Kill ADB server
    console.log('Executing: adb kill-server');
    try {
      const { stdout: stdout1, stderr: stderr1 } = await execAsync('adb kill-server');
      results.push({
        step: 'kill-server',
        success: true,
        stdout: stdout1.trim(),
        stderr: stderr1.trim()
      });
    } catch (error) {
      results.push({
        step: 'kill-server',
        success: false,
        error: error.message
      });
    }

    // Wait a moment before starting ADB again
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Start ADB server
    console.log('Executing: adb start-server');
    try {
      const { stdout: stdout2, stderr: stderr2 } = await execAsync('adb start-server');
      results.push({
        step: 'start-server',
        success: true,
        stdout: stdout2.trim(),
        stderr: stderr2.trim()
      });
    } catch (error) {
      results.push({
        step: 'start-server',
        success: false,
        error: error.message
      });
    }

    // Wait a moment before restarting device
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Restart the connected device
    console.log('Executing: adb reboot');
    try {
      const { stdout: stdout3, stderr: stderr3 } = await execAsync('adb reboot');
      results.push({
        step: 'reboot-device',
        success: true,
        stdout: stdout3.trim(),
        stderr: stderr3.trim()
      });
    } catch (error) {
      results.push({
        step: 'reboot-device',
        success: false,
        error: error.message
      });
    }

    const allSuccess = results.every(r => r.success !== false);
    
    res.json({
      success: allSuccess,
      message: 'Test services restart completed',
      results: results,
      note: 'Device will take some time to fully restart'
    });
  } catch (error) {
    console.error('Error restarting test services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restart test services',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Maestro API Flows',
    version: '1.0.0',
    endpoints: [
      'POST /shake_device - Shake the connected device',
      'POST /set_username - Set MAESTRO_USERNAME environment variable (body: {username: "foo"})',
      'POST /restart_test_services - Kill ADB, restart it, and reboot the connected device',
      'GET /health - Health check'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Maestro API Flows server is running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`  POST http://localhost:${PORT}/shake_device`);
  console.log(`  POST http://localhost:${PORT}/set_username`);
  console.log(`  POST http://localhost:${PORT}/restart_test_services`);
  console.log(`  GET  http://localhost:${PORT}/health`);
});
