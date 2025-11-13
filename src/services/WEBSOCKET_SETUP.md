# WebSocket Setup Guide for SimuMarty

## Overview

SimuMarty uses WebSocket for real-time bidirectional communication between the
Monaco code editor and the 3D robot simulation.

## Architecture

```
┌─────────────────┐          ┌──────────────────┐          ┌─────────────────┐
│  Monaco Editor  │  ◄───►   │  WebSocket       │  ◄───►   │  3D Simulation  │
│  (Python Code)  │  WS:8765 │  Server (Python) │          │  (Three.js)     │
└─────────────────┘          └──────────────────┘          └─────────────────┘
```

## Quick Start

### 1. Install Python Dependencies

```bash
cd python_marty
pip install -r requirements.txt
```

### 2. Start the WebSocket Server

```bash
python websocket_server.py
```

You should see:

```
✅ WebSocket server running on ws://localhost:8765
```

### 3. Start the Frontend

In a new terminal:

```bash
npm install
npm run dev
```

### 4. Open the Application

Navigate to `http://localhost:5173`

The connection status indicator at the top will show:

- 🟢 Green: Connected
- 🔴 Red: Disconnected

## Usage

### Writing Code

In the Monaco editor (right panel), write Python code using Marty API commands:

```python
# Make Marty walk forward
marty.walk(3)

# Wave hello
marty.wave()

# Turn 90 degrees
marty.turn(90)

# Dance
marty.dance()

# Stop all motion
marty.stop()
```

### Running Code

1. Click the "▶ Run Code" button in the editor
2. The code is sent via WebSocket to the Python server
3. The server parses the commands and broadcasts them to the simulation
4. Watch the 3D robot execute the commands in real-time!

## Supported Commands

| Command                  | Description            | Example                  |
| ------------------------ | ---------------------- | ------------------------ |
| `marty.walk(steps)`      | Walk forward           | `marty.walk(3)`          |
| `marty.turn(angle)`      | Turn in degrees        | `marty.turn(90)`         |
| `marty.wave()`           | Wave hand              | `marty.wave()`           |
| `marty.dance()`          | Dance animation        | `marty.dance()`          |
| `marty.kick()`           | Kick motion            | `marty.kick()`           |
| `marty.sidestep(steps)`  | Step sideways          | `marty.sidestep(2)`      |
| `marty.stop()`           | Stop all motion        | `marty.stop()`           |
| `marty.stand_straight()` | Return to default pose | `marty.stand_straight()` |

## Files Created

### Frontend (TypeScript)

- **`src/services/WebSocketService.ts`**
  - Core WebSocket client
  - Connection management
  - Message sending/receiving
  - Event subscriptions

- **`src/Experience/World/MartyController.ts`**
  - Command processor
  - Python code parser
  - Animation triggers
  - Movement control

- **`src/App.tsx`** (updated)
  - WebSocket lifecycle management
  - Connection status UI
  - Code execution handler

- **`src/Experience/World/Marty.tsx`** (updated)
  - WebSocket integration
  - Command reception
  - Animation coordination

### Backend (Python)

- **`python_marty/websocket_server.py`**
  - WebSocket server implementation
  - Message routing
  - Command processing
  - Telemetry broadcasting

- **`python_marty/requirements.txt`**
  - Python dependencies

## WebSocket Protocol

Based on the AsyncAPI specification in `docs/api-websocket.yaml`

### Message Format

All messages follow this structure:

```json
{
  "type": "message_type",
  "payload": {
    /* data */
  },
  "timestamp": 1234567890
}
```

### Message Types

**Client → Server:**

- `command`: Robot command execution
- `ping`: Heartbeat keepalive

**Server → Client:**

- `ack`: Connection acknowledgment
- `commandAck`: Command execution result
- `robotStatus`: Robot status updates
- `error`: Error messages
- `pong`: Heartbeat response

### Command Example

```json
{
  "type": "command",
  "payload": {
    "action": "walk",
    "params": {
      "steps": 3
    },
    "requestId": "exec_1234567890"
  },
  "timestamp": 1729166400000
}
```

## Troubleshooting

### Connection Refused ❌

**Problem:** Red status indicator, "Connection failed" message

**Solutions:**

1. Check if the Python server is running
2. Verify the port (default: 8765) is not in use
3. Check firewall settings

```bash
# Check if port is in use
netstat -an | grep 8765

# Kill process using the port (if needed)
# Windows:
netstat -ano | findstr :8765
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:8765 | xargs kill
```

### Commands Not Executing ⚠️

**Problem:** Code runs but robot doesn't move

**Solutions:**

1. Check browser console (F12) for errors
2. Verify connection status is green
3. Check Python server logs for errors
4. Ensure the Marty model is loaded

### Animation Issues 🎬

**Problem:** Robot doesn't animate properly

**Solutions:**

1. Check console for "Animation not ready" errors
2. Verify the GLTF model has animations
3. Check the model path in `src/Experience/sources.tsx`

### Server Crashes 💥

**Problem:** Python server stops unexpectedly

**Solutions:**

1. Check Python logs for stack traces
2. Verify websockets library is installed
3. Try restarting the server

```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

## Development Tips

### Debugging WebSocket Messages

In browser console:

```javascript
// Log all incoming messages
webSocketService.on('telemetry', (data) => {
  console.log('Telemetry:', data);
});

// Log all commands
webSocketService.on('command', (data) => {
  console.log('Command:', data);
});
```

### Testing Commands Manually

In browser console:

```javascript
// Send a walk command
webSocketService.walk(3);

// Send a wave command
webSocketService.wave();

// Execute Python code
webSocketService.executeCode('marty.walk(2)\nmarty.wave()');
```

### Server Logging

The Python server logs all activity:

```
INFO - Client connected. Total clients: 1
INFO - Received command: walk with params: {'steps': 3}
INFO - Executing Python code:
marty.walk(3)
marty.wave()
```

## Next Steps

### Planned Enhancements

- [ ] Add actual Marty robot integration via MartyPy
- [ ] Implement sandboxed Python code execution
- [ ] Add sensor telemetry visualization
- [ ] Support for multiple simultaneous robots
- [ ] WebSocket authentication and security
- [ ] Record and replay command sequences
- [ ] Code debugging and breakpoints
- [ ] Visual trajectory planning

### Integration with Real Robot

To connect to a real Marty robot:

1. Install MartyPy: `pip install martypy`
2. Update `websocket_server.py` to use MartyPy API
3. Configure robot connection parameters
4. Add error handling for robot communication

## Support

For issues or questions:

- Check the console logs (browser and server)
- Review the AsyncAPI spec: `docs/api-websocket.yaml`
- See detailed server docs: `python_marty/README.md`

## References

- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [AsyncAPI Specification](https://www.asyncapi.com/)
- [MartyPy Documentation](https://github.com/robotical/martypy)
- [Three.js Documentation](https://threejs.org/docs/)
