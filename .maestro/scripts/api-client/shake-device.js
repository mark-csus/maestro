// shake-device.js
// Calls the local API server to shake the connected device

const response = http.post('http://localhost:3001/shake_device', {
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
})

const result = json(response.body)

if (!result.success) {
    throw new Error('Failed to shake device: ' + (result.error || result.message))
}

output.shake_device = {
    success: result.success,
    message: result.message,
    stdout: result.stdout,
    stderr: result.stderr
}
