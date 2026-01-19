#!/usr/bin/env python3
"""
Maestro API Server
Local API service for extending Maestro functionality with custom bash and Python commands.
"""

import os
import subprocess
import time
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)
PORT = int(os.environ.get('PORT', 3001))


def run_command(cmd, shell=False):
    """
    Execute a shell command and return the result.
    
    Args:
        cmd: Command to execute (list or string)
        shell: Whether to run through shell (default: False for security)
    
    Returns:
        dict with success, stdout, stderr, and exit_code
    """
    try:
        # Inherit the current environment to get PATH and other variables
        env = os.environ.copy()
        
        result = subprocess.run(
            cmd,
            shell=shell,
            capture_output=True,
            text=True,
            timeout=30,
            env=env
        )
        return {
            'success': result.returncode == 0,
            'stdout': result.stdout.strip(),
            'stderr': result.stderr.strip(),
            'exit_code': result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Command timed out after 30 seconds',
            'stdout': '',
            'stderr': ''
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'stdout': '',
            'stderr': ''
        }


@app.before_request
def log_request():
    """Log incoming requests"""
    timestamp = datetime.now().isoformat()
    print(f"{timestamp} - {request.method} {request.path}")


@app.route('/', methods=['GET'])
def root():
    """Root endpoint with API information"""
    return jsonify({
        'name': 'Maestro API Server',
        'version': '1.0.0',
        'endpoints': [
            'POST /shake_device - Shake the connected device',
            'POST /set_username - Set MAESTRO_USERNAME environment variable (body: {username: "foo"})',
            'POST /restart_test_services - Kill ADB, restart it, and reboot the connected device',
            'GET /health - Health check'
        ]
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/shake_device', methods=['POST'])
def shake_device():
    """
    Shake the connected Android device.
    Triggers keyevent 97 which opens the developer menu in React Native apps.
    """
    print('Executing: adb shell input keyevent 97')
    result = run_command(['adb', 'shell', 'input', 'keyevent', '97'])
    
    if result['success']:
        return jsonify({
            'success': True,
            'message': 'Device shaken successfully',
            'stdout': result['stdout'],
            'stderr': result['stderr']
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Failed to shake device',
            'error': result.get('error', 'Command failed'),
            'stdout': result['stdout'],
            'stderr': result['stderr']
        }), 500


@app.route('/set_username', methods=['POST'])
def set_username():
    """
    Set the MAESTRO_USERNAME environment variable.
    Expects JSON body: {"username": "value"}
    """
    data = request.get_json()
    
    if not data or 'username' not in data:
        return jsonify({
            'success': False,
            'message': 'Username is required in request body'
        }), 400
    
    username = data['username']
    
    # Validate username (alphanumeric, underscore, hyphen only)
    if not username or not all(c.isalnum() or c in '_-' for c in username):
        return jsonify({
            'success': False,
            'message': 'Invalid username format. Use only alphanumeric characters, underscores, and hyphens.'
        }), 400
    
    # Set environment variable for this process
    os.environ['MAESTRO_USERNAME'] = username
    
    print(f'Set MAESTRO_USERNAME={username}')
    
    return jsonify({
        'success': True,
        'message': f'Username set to: {username}',
        'username': username,
        'note': 'Environment variable is set for this server process and its child processes'
    })


@app.route('/restart_test_services', methods=['POST'])
def restart_test_services():
    """
    Restart test services: Kill ADB, restart it, and reboot the connected device.
    Assumes only one device is connected.
    """
    print('Restarting test services...')
    results = []
    
    # Step 1: Kill ADB server
    print('Executing: adb kill-server')
    result = run_command(['adb', 'kill-server'])
    results.append({
        'step': 'kill-server',
        'success': result['success'],
        'stdout': result['stdout'],
        'stderr': result['stderr']
    })
    
    # Wait before starting ADB again
    time.sleep(1)
    
    # Step 2: Start ADB server
    print('Executing: adb start-server')
    result = run_command(['adb', 'start-server'])
    results.append({
        'step': 'start-server',
        'success': result['success'],
        'stdout': result['stdout'],
        'stderr': result['stderr']
    })
    
    # Wait before rebooting device
    time.sleep(1)
    
    # Step 3: Reboot the connected device
    print('Executing: adb reboot')
    result = run_command(['adb', 'reboot'])
    results.append({
        'step': 'reboot-device',
        'success': result['success'],
        'stdout': result['stdout'],
        'stderr': result['stderr']
    })
    
    all_success = all(r['success'] for r in results)
    
    return jsonify({
        'success': all_success,
        'message': 'Test services restart completed',
        'results': results,
        'note': 'Device will take some time to fully restart'
    })


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found',
        'error': '404 Not Found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'message': 'Internal server error',
        'error': str(error)
    }), 500


if __name__ == '__main__':
    print(f'Maestro API Server is running on http://localhost:{PORT}')
    print('Available endpoints:')
    print(f'  POST http://localhost:{PORT}/shake_device')
    print(f'  POST http://localhost:{PORT}/set_username')
    print(f'  POST http://localhost:{PORT}/restart_test_services')
    print(f'  GET  http://localhost:{PORT}/health')
    
    # Bind to localhost only for security
    app.run(host='127.0.0.1', port=PORT, debug=False)
