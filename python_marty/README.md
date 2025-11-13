# WebSocket Integration for SimuMarty

This directory contains the Python WebSocket server that bridges the Monaco code
editor with the 3D robot simulation.

## Architecture

```
┌─────────────────┐          ┌──────────────────┐          ┌─────────────────┐
│  Monaco Editor  │  ◄───►   │  WebSocket       │  ◄───►   │  3D Simulation  │
│  (Python Code)  │  WS:8765 │  Server (Python) │  WS:8765 │  (Three.js)     │
└─────────────────┘          └──────────────────┘          └─────────────────┘
```

## Setup

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Start the WebSocket server:

```bash
python websocket_server.py
```

The server will run on `ws://localhost:8765`

## Usage

### From the Frontend

1. The WebSocket connection is automatically established when the app loads
2. Write Python code in the Monaco editor using Marty commands
3. Click "Run Code" to execute

### Example Code

```python
# Simple walk
marty.walk(2)

# Wave
marty.wave()

# Turn and walk
marty.turn(90)
marty.walk(3)

# Dance
marty.dance()

# Stop
marty.stop()
```

## WebSocket Protocol

Based on the AsyncAPI specification in `docs/api-websocket.yaml`

### Message Types

**Client → Server:**

- `command`: Send robot commands
- `ping`: Heartbeat keepalive

**Server → Client:**

- `ack`: Connection acknowledgment
- `commandAck`: Command execution result
- `robotStatus`: Robot status telemetry
- `smartServos`: Servo states
- `error`: Error messages
- `pong`: Heartbeat response

### Command Structure

```json
{
  "type": "command",
  "payload": {
    "action": "walk",
    "params": {
      "steps": 2
    },
    "requestId": "exec_1234567890"
  },
  "timestamp": 1729166400000
}
```

### Supported Commands

- `walk` - Make Marty walk
- `turn` - Turn Marty
- `wave` - Wave hand
- `dance` - Dance animation
- `kick` - Kick motion
- `sidestep` - Sidestep movement
- `stop` - Stop all motion
- `get_ready` / `stand_straight` - Return to default pose
- `execute_python` - Execute Python code block

## Development

### Vite Proxy Configuration

To avoid CORS issues, update your `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:8765',
        ws: true,
      },
    },
  },
});
```

### Frontend Integration

The WebSocket service is already integrated:

1. **WebSocketService** (`src/services/WebSocketService.ts`): Core WebSocket
   client
2. **MartyController** (`src/Experience/World/MartyController.ts`): Command
   processor
3. **App.tsx**: Connection management
4. **Marty.tsx**: Animation and movement control

## Troubleshooting

### Connection Refused

- Make sure the Python WebSocket server is running
- Check the port (default: 8765)
- Verify firewall settings

### Commands Not Executing

- Check browser console for errors
- Verify the connection status indicator (green = connected)
- Check Python server logs

### Animation Issues

- Ensure the Marty 3D model is loaded
- Check console for animation errors
- Verify the model has walking/waving animations

## Future Enhancements

- [ ] Add actual Marty robot integration via MartyPy
- [ ] Implement sandboxed Python code execution
- [ ] Add sensor telemetry visualization
- [ ] Support for multiple robot connections
- [ ] WebSocket authentication and security
- [ ] Record and replay command sequences
