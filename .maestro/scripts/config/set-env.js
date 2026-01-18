#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Maestro Environment Variable Manager
 * Sets shell environment variables and makes them available to Maestro flows
 * 
 * Usage:
 *   node set-env.js KEY1=value1 KEY2=value2
 *   runScript: .maestro/scripts/set-env.js TEST_USER=john@example.com
 */

function setEnvironmentVariables() {
  const args = process.argv.slice(2);
  const envVars = {};
  const errors = [];

  // Parse arguments
  args.forEach(arg => {
    const [key, ...valueParts] = arg.split('=');
    const value = valueParts.join('='); // Handle values with = in them
    
    if (key && value !== undefined) {
      envVars[key] = value;
      process.env[key] = value;
    } else {
      errors.push(`Invalid argument format: ${arg}`);
    }
  });

  if (Object.keys(envVars).length === 0 && args.length > 0) {
    console.error(JSON.stringify({ 
      success: false, 
      error: 'No valid environment variables provided',
      errors 
    }));
    process.exit(1);
  }

  // Write to environment file for shell sourcing
  const envFile = path.join(os.homedir(), '.maestro-env');
  
  try {
    // Read existing env file if it exists
    let existingVars = {};
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^export\s+([^=]+)="(.*)"/);
        if (match) {
          existingVars[match[1]] = match[2];
        }
      });
    }

    // Merge with new vars
    const allVars = { ...existingVars, ...envVars };

    // Write updated env file
    const envContent = Object.entries(allVars)
      .map(([k, v]) => `export ${k}="${v.replace(/"/g, '\\"')}"`)
      .join('\n');

    fs.writeFileSync(envFile, envContent + '\n', { mode: 0o600 });

    // Also write a JSON version for easy parsing
    const jsonFile = path.join(os.homedir(), '.maestro-env.json');
    fs.writeFileSync(jsonFile, JSON.stringify(allVars, null, 2), { mode: 0o600 });

    // Output success
    console.log(JSON.stringify({ 
      success: true, 
      vars: envVars,
      total: Object.keys(allVars).length,
      file: envFile
    }));

  } catch (error) {
    console.error(JSON.stringify({ 
      success: false, 
      error: error.message 
    }));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setEnvironmentVariables();
}

module.exports = { setEnvironmentVariables };
