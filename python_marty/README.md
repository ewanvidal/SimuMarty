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
# Walk forward 2 steps (matches real martypy API)
marty.walk(num_steps=2)

# Walk with turn (turn parameter in degrees)
marty.walk(num_steps=2, turn=45)

# Kick with right foot
marty.kick(side='right')

# Dance
marty.dance()

# Sidestep left
marty.sidestep('left', steps=2)

# Stop
marty.stop()

# Get distance sensor reading (mm)
distance = marty.get_distance_sensor()

# Get ground color sensor reading (returns {r, g, b})
color = marty.get_ground_sensor_reading('left')
print(f"Color: R={color['r']}, G={color['g']}, B={color['b']}")

# Check if foot is on ground
on_ground = marty.foot_on_ground('left')

# Move a specific joint
marty.move_joint('left arm', 45, 1000)
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

### Supported Commands (martypy compatible)

- `walk` - Make Marty walk (num_steps, turn, step_length, move_time)
- `kick` - Kick with foot (side: 'left'/'right')
- `dance` - Dance animation (side: 'left'/'right')
- `sidestep` → `slideLeft`/`slideRight` - Sidestep movement
- `stop` - Stop all motion
- `move_joint` → `joint` - Move a specific joint
- `get_distance_sensor` → `getObstacleDistance` - Get distance sensor reading (mm)
- `get_ground_sensor_reading` → `getGroundColor` - Get color sensor RGB values
- `foot_on_ground` - Check if foot is on surface
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
