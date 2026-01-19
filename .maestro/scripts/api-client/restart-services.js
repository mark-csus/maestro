// restart-services.js
// Calls the local API server to restart test services (ADB + device reboot)
// Usage: runScript: restart-services.js
// WARNING: This will reboot the connected device

const response = http.post('http://localhost:3001/restart_test_services', {
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
})

const result = json(response.body)

if (!result.success) {
    throw new Error('Failed to restart services: ' + (result.error || result.message))
}

output.restart_services = {
    success: result.success,
    message: result.message,
    results: result.results,
    note: result.note
}
