#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Maestro Environment Variable Clearer
 * Clears all or specific environment variables
 * 
 * Usage:
 *   node clear-env.js          # Clear all
 *   node clear-env.js KEY1 KEY2 # Clear specific keys
 */

function clearEnvironmentVariables() {
  const args = process.argv.slice(2);
  const envFile = path.join(os.homedir(), '.maestro-env');
  const jsonFile = path.join(os.homedir(), '.maestro-env.json');

  try {
    // If no args, clear everything
    if (args.length === 0) {
      if (fs.existsSync(envFile)) fs.unlinkSync(envFile);
      if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);
      
      console.log(JSON.stringify({ 
        success: true, 
        message: 'All environment variables cleared' 
      }));
      return;
    }

    // Clear specific keys
    if (!fs.existsSync(jsonFile)) {
      console.log(JSON.stringify({ 
        success: true, 
        message: 'No environment variables to clear' 
      }));
      return;
    }

    const allVars = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const removed = [];

    args.forEach(key => {
      if (allVars[key] !== undefined) {
        delete allVars[key];
        removed.push(key);
      }
    });

    // Write back
    if (Object.keys(allVars).length === 0) {
      if (fs.existsSync(envFile)) fs.unlinkSync(envFile);
      if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);
    } else {
      const envContent = Object.entries(allVars)
        .map(([k, v]) => `export ${k}="${v.replace(/"/g, '\\"')}"`)
        .join('\n');
      fs.writeFileSync(envFile, envContent + '\n', { mode: 0o600 });
      fs.writeFileSync(jsonFile, JSON.stringify(allVars, null, 2), { mode: 0o600 });
    }

    console.log(JSON.stringify({ 
      success: true, 
      removed,
      remaining: Object.keys(allVars).length
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
  clearEnvironmentVariables();
}

module.exports = { clearEnvironmentVariables };
