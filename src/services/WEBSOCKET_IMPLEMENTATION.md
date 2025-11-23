# WebSocket Implementation Summary

## What Was Implemented

A complete WebSocket system that connects the Monaco code editor with the 3D
robot simulation, enabling real-time bidirectional communication.

## Architecture

```
┌──────────────────────┐
│   React Frontend     │
│                      │
│  ┌────────────────┐  │
│  │ Monaco Editor  │  │
│  │ (Python Code)  │  │
│  └────────┬───────┘  │
│           │          │
│  ┌────────▼───────┐  │
│  │ WebSocketSvc   │◄─┼─── ws://localhost:8765
│  └────────┬───────┘  │
│           │          │
│  ┌────────▼───────┐  │
│  │ MartyController│  │
│  └────────┬───────┘  │
│           │          │
│  ┌────────▼───────┐  │
│  │ Marty 3D Model │  │
│  │  (Three.js)    │  │
│  └────────────────┘  │
└──────────────────────┘
           ▲
           │ WebSocket
           │
┌──────────▼───────────┐
│  Python Backend      │
│                      │
│  ┌────────────────┐  │
│  │ WebSocket      │  │
│  │ Server         │  │
│  │ (port 8765)     │  │
│  └────────────────┘  │
└──────────────────────┘
```

## Files Created

### 1. Frontend - WebSocket Service

**File:** `src/services/WebSocketService.ts`

**Purpose:** Core WebSocket client for browser

**Features:**

- Connection management with auto-reconnect
- Event subscription system
- Message sending/receiving
- Heartbeat/keepalive
- Type-safe message handling
- Command queueing

**Key Methods:**

- `connect()` - Establish WebSocket connection
- `sendCommand()` - Send robot commands
- `executeCode()` - Execute Python code
- `on()` / `off()` - Event subscriptions
- Helper methods: `walk()`, `turn()`, `wave()`, etc.

### 2. Frontend - Marty Controller

**File:** `src/Experience/World/MartyController.ts`

**Purpose:** Bridge WebSocket commands to 3D animations

**Features:**

- Command processing
- Python code parser
- Animation triggers
- Movement control
- Command queue management

**Supported Commands:**

- `walk` - Walking animation + movement
- `turn` - Rotation
- `wave` - Waving animation
- `dance` - Dance animation
- `kick` - Kick animation
- `sidestep` - Sideways movement
- `stop` - Stop all motion
- `execute_python` - Parse and execute Python code

### 3. Frontend - App Integration

**File:** `src/App.tsx` (updated)

**Changes:**

- WebSocket connection on mount
- Connection status indicator (green/red)
- Event subscriptions
- Code execution handler
- Status messages
- Cleanup on unmount

**UI Additions:**

- Status bar showing connection state
- Real-time status messages
- Color-coded indicators

### 4. Frontend - Marty Integration

**File:** `src/Experience/World/Marty.tsx` (updated)

**Changes:**

- WebSocket event subscription
- Command reception
- Controller integration
- Cleanup on dispose

### 5. Backend - WebSocket Server

**File:** `python_marty/websocket_server.py`

**Purpose:** Python WebSocket server

**Features:**

- Client connection management
- Message routing
- Command processing
- Python code parsing
- Telemetry broadcasting
- Error handling
- Logging

**Protocol:**

- Follows AsyncAPI spec in `docs/api-websocket.yaml`
- JSON message format
- Request/response pattern
- Broadcast to all clients

### 6. Backend - Dependencies

**File:** `python_marty/requirements.txt`

```
websockets>=12.0
```

### 7. Documentation

**Files:**

- `python_marty/README.md` - Backend documentation
- `WEBSOCKET_SETUP.md` - Complete setup guide
- `python_marty/test_websocket.py` - Test script

## How It Works

### 1. Connection Flow

```
Frontend                    Backend
   │                          │
   ├──connect()──────────────►│
   │                          ├──accept connection
   │◄─────────ack─────────────┤
   │                          │
   │──ping (every 30s)───────►│
   │◄─────────pong────────────┤
```

### 2. Code Execution Flow

```
User                Monaco Editor        WebSocket         Server           3D Simulation
 │                       │                   │               │                    │
 ├─"Run Code"───────────►│                   │               │                    │
 │                       ├─executeCode()────►│               │                    │
 │                       │                   ├─send cmd─────►│                    │
 │                       │                   │               ├─parse Python      │
 │                       │                   │               ├─extract commands  │
 │                       │                   │               ├─broadcast────────►│
 │                       │                   │◄─commandAck───┤                    │
 │                       │◄──event───────────┤               │                    ├─animate
 │◄─status message───────┤                   │               │                    │
```

### 3. Command Processing

```python
# User writes in Monaco Editor:
marty.walk(3)
marty.wave()
marty.turn(90)

# 1. Sent via WebSocket as:
{
  "type": "command",
  "payload": {
    "action": "execute_python",
    "params": { "code": "marty.walk(3)..." }
  }
}

# 2. Server parses and broadcasts:
{ "action": "walk", "params": { "steps": 3 } }
{ "action": "wave", "params": {} }
{ "action": "turn", "params": { "angle": 90 } }

# 3. MartyController processes each command:
- Triggers walking animation
- Moves model forward
- Triggers waving animation
- Rotates model 90 degrees
```

## Message Protocol

### Client → Server

**Command Message:**

```json
{
  "type": "command",
  "payload": {
    "action": "walk",
    "params": { "steps": 2 },
    "requestId": "exec_1234567890"
  },
  "timestamp": 1729166400000
}
```

**Heartbeat:**

```json
{
  "type": "ping",
  "payload": {},
  "timestamp": 1729166400000
}
```

### Server → Client

**Connection Ack:**

```json
{
  "type": "ack",
  "payload": {
    "status": "connected",
    "serverVersion": "1.0.0",
    "subscriptionRate": 10
  },
  "timestamp": 1729166400000
}
```

**Command Ack:**

```json
{
  "type": "commandAck",
  "payload": {
    "requestId": "exec_1234567890",
    "status": "success",
    "message": "Walking 2 steps"
  },
  "timestamp": 1729166400000
}
```

**Robot Status (Telemetry):**

```json
{
  "type": "robotStatus",
  "payload": {
    "flags": 0,
    "workQCount": 0,
    "isMoving": true,
    "isPaused": false
  },
  "timestamp": 1729166400000
}
```

## Key Features

### 1. Auto-Reconnect

- Automatically reconnects if connection is lost
- Configurable retry attempts (default: 5)
- Configurable retry delay (default: 3s)

### 2. Event System

- Subscribe to events: `connected`, `disconnected`, `command`, `telemetry`,
  `error`
- Unsubscribe with returned function
- Type-safe event handling

### 3. Command Queue

- Commands queued for sequential execution
- Prevents command overlap
- Automatic delay between commands

### 4. Python Parser

- Parses common Marty commands
- Supports parameters
- Handles comments and empty lines
- Extensible for more commands

### 5. Status Indicator

- Visual connection status (green/red)
- Real-time status messages
- Error notifications

## Testing

### Start the System

**Terminal 1 - Python Server:**

```bash
cd python_marty
python websocket_server.py
```

**Terminal 2 - Frontend:**

```bash
npm run dev
```

### Test WebSocket

**Terminal 3 - Test Script:**

```bash
cd python_marty
python test_websocket.py
```

### Manual Testing

1. Open `http://localhost:5173`
2. Check status indicator is green
3. Write code in Monaco Editor:

```python
marty.walk(2)
marty.wave()

# Move individual joints (degrees, optional move_time in ms)
marty.set_joint('left_arm', 20)
marty.set_joint('left_eye', -10, move_time=800)
marty.set_joint('right_eye', 10)
```

4. Click "Run Code"
5. Watch the robot animate!

Joint names must be provided as underscore strings (e.g. `'left_arm'`, `'left_eye'`). Numeric IDs, `marty.joints[...]`, `JointID.X`, and the group alias `'eyes'` are not accepted — use `'left_eye'` and `'right_eye'` explicitly. The helper automatically routes to the WebSocket `joint` action and accepts an optional `move_time` (milliseconds).

## Browser Console Testing

```javascript
// Check connection
webSocketService.isConnected();

// Send commands directly
webSocketService.walk(3);
webSocketService.wave();
webSocketService.turn(90);

// Execute Python code
webSocketService.executeCode(`
marty.walk(2)
marty.wave()
marty.dance()
`);

// Subscribe to events
webSocketService.on('command', (data) => {
  console.log('Command result:', data);
});
```

## Troubleshooting

### Connection Issues

1. Verify Python server is running
2. Check port 8765 is available
3. Check firewall settings
4. Check browser console for errors

### Command Not Executing

1. Verify connection is green
2. Check browser console
3. Check Python server logs
4. Verify model is loaded

### Animation Issues

1. Check model has animations
2. Verify animation names
3. Check console for errors
4. Try debug panel controls

## Future Enhancements

### Short Term

- [ ] Add more Marty commands
- [ ] Improve Python parser
- [ ] Add syntax validation
- [ ] Show command queue status

### Medium Term

- [ ] Add breakpoint debugging
- [ ] Record command sequences
- [ ] Replay recorded sequences
- [ ] Visual trajectory planning

### Long Term

- [ ] Connect to real Marty robot
- [ ] Sandboxed Python execution
- [ ] Multi-robot support
- [ ] WebSocket authentication
- [ ] Sensor telemetry visualization

## References

- WebSocket Protocol: RFC 6455
- AsyncAPI Spec: `docs/api-websocket.yaml`
- Marty API: Robotical Interface Controller (RIC)
- Python websockets: https://websockets.readthedocs.io/
