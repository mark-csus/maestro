#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Maestro Environment Variable Printer
 * Prints environment variables in a readable format for Maestro output
 * 
 * Usage:
 *   node print-env.js USERNAME PASSWORD
 *   runScript: .maestro/scripts/print-env.js USERNAME PASSWORD
 */

function printEnvironmentVariables() {
  const args = process.argv.slice(2);
  const jsonFile = path.join(os.homedir(), '.maestro-env.json');

  try {
    // Check if env file exists
    if (!fs.existsSync(jsonFile)) {
      console.log('ERROR: No environment variables set. Run set-env.js first.');
      process.exit(1);
    }

    // Read all variables
    const allVars = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    if (args.length === 0) {
      // Print all variables in readable format
      console.log('=== Environment Variables ===');
      Object.entries(allVars).forEach(([key, value]) => {
        console.log(`${key} = ${value}`);
      });
      console.log('============================');
    } else {
      // Print specific variables
      console.log('=== Requested Variables ===');
      args.forEach(key => {
        const value = allVars[key];
        if (value !== undefined) {
          console.log(`${key} = ${value}`);
        } else {
          console.log(`${key} = [NOT SET]`);
        }
      });
      console.log('===========================');
    }

  } catch (error) {
    console.log(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  printEnvironmentVariables();
}

module.exports = { printEnvironmentVariables };
