// set-username.js
// Calls the local API server to set the MAESTRO_USERNAME environment variable
// Usage: runScript: set-username.js
// Expects: input.username or throws error

if (!input.username) {
    throw new Error('username is required. Pass it via input.username')
}

const response = http.post('http://localhost:3001/set_username', {
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: input.username
    })
})

const result = json(response.body)

if (!result.success) {
    throw new Error('Failed to set username: ' + (result.error || result.message))
}

output.set_username = {
    success: result.success,
    message: result.message,
    username: result.username
}
