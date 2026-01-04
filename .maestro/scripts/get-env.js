#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Maestro Environment Variable Getter
 * Retrieves environment variables set by set-env.js
 * 
 * Usage:
 *   node get-env.js KEY1 KEY2
 *   runScript: .maestro/scripts/get-env.js TEST_USER
 */

function getEnvironmentVariables() {
  const args = process.argv.slice(2);
  const jsonFile = path.join(os.homedir(), '.maestro-env.json');

  try {
    // Check if env file exists
    if (!fs.existsSync(jsonFile)) {
      console.log(JSON.stringify({ 
        success: false, 
        error: 'No environment variables set yet. Run set-env.js first.' 
      }));
      return;
    }

    // Read all variables
    const allVars = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    // If specific keys requested, return only those
    if (args.length > 0) {
      const requestedVars = {};
      const missing = [];

      args.forEach(key => {
        if (allVars[key] !== undefined) {
          requestedVars[key] = allVars[key];
        } else {
          missing.push(key);
        }
      });

      console.log(JSON.stringify({ 
        success: true, 
        vars: requestedVars,
        missing: missing.length > 0 ? missing : undefined
      }));
    } else {
      // Return all variables
      console.log(JSON.stringify({ 
        success: true, 
        vars: allVars,
        count: Object.keys(allVars).length
      }));
    }

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
  getEnvironmentVariables();
}

module.exports = { getEnvironmentVariables };
