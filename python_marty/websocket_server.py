"""
WebSocket Server for MartyEngine
Handles bidirectional communication between the frontend and robot simulation
Based on the AsyncAPI specification in docs/api-websocket.yaml
"""

import asyncio
import json
import logging
import threading
import queue
import time
from datetime import datetime
from typing import Dict, Set, Any, Optional
import websockets
from websockets.server import WebSocketServerProtocol

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Servo identifiers (mirrors src/shared/types/marty.types.ts)
JOINT_IDS = {
    'LEFT_HIP': 0,
    'LEFT_TWIST': 1,
    'LEFT_KNEE': 2,
    'RIGHT_HIP': 3,
    'RIGHT_TWIST': 4,
    'RIGHT_KNEE': 5,
    'LEFT_ARM': 6,
    'RIGHT_ARM': 7,
    'LEFT_EYE': 8,
    'RIGHT_EYE': 9,
}

# Common string aliases that users may type in Monaco
JOINT_ALIAS_MAP = {
    'left_hip': JOINT_IDS['LEFT_HIP'],
    'left_twist': JOINT_IDS['LEFT_TWIST'],
    'left_knee': JOINT_IDS['LEFT_KNEE'],
    'right_hip': JOINT_IDS['RIGHT_HIP'],
    'right_twist': JOINT_IDS['RIGHT_TWIST'],
    'right_knee': JOINT_IDS['RIGHT_KNEE'],
    'left_arm': JOINT_IDS['LEFT_ARM'],
    'right_arm': JOINT_IDS['RIGHT_ARM'],
    'left_eye': JOINT_IDS['LEFT_EYE'],
    'right_eye': JOINT_IDS['RIGHT_EYE'],
}

class MartyWebSocketServer:
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[WebSocketServerProtocol] = set()
        self.telemetry_task: Optional[asyncio.Task] = None
        self.last_sensor_data = {
            "obstacle": {"distance": float('inf'), "detected": False},
            "groundColor": {"r": 0, "g": 0, "b": 0}
        }
        self.loop = None
        self.current_execution_queue = None
        self.active_websocket = None
        
    async def register_client(self, websocket: WebSocketServerProtocol):
        """Register a new client connection"""
        self.clients.add(websocket)
        self.active_websocket = websocket
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        
        # Send connection acknowledgment
        await self.send_message(websocket, {
            "type": "ack",
            "payload": {
                "status": "connected",
                "serverVersion": "1.0.0",
                "subscriptionRate": 10
            },
            "timestamp": int(datetime.now().timestamp() * 1000)
        })
        
    async def unregister_client(self, websocket: WebSocketServerProtocol):
        """Unregister a client connection"""
        self.clients.discard(websocket)
        if self.active_websocket == websocket:
            self.active_websocket = None
        logger.info(f"Client disconnected. Total clients: {len(self.clients)}")
        
    async def send_message(self, websocket: WebSocketServerProtocol, message: Dict[str, Any]):
        """Send a message to a specific client"""
        try:
            await websocket.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            logger.warning("Failed to send message: connection closed")
            
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients"""
        if not self.clients:
            return
            
        # Send to all clients concurrently
        await asyncio.gather(
            *[self.send_message(client, message) for client in self.clients],
            return_exceptions=True
        )
        
    async def handle_command(self, websocket: WebSocketServerProtocol, command: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle a command from the client
        Returns a command acknowledgment
        """
        action = command.get("action", "unknown")
        params = command.get("params", {})
        request_id = command.get("requestId")
        
        logger.info(f"Received command: {action} with params: {params}")
        
        # Process the command based on action type
        try:
            if action == "execute_python":
                # Execute Python code
                code = params.get("code", "")
                result = await self.execute_python_code(code)
                status = "success" if result["success"] else "error"
                message = result.get("message", "")
            elif action in ["walk", "turn", "turnLeft", "wave", "kick", "dance", "slideLeft", "slideRight", "stop", "get_ready", "stand_straight", "getGroundColor", "getObstacleDistance"]:
                # Robot movement commands and sensor queries - forward to simulation
                status = "success"
                message = f"Command {action} executed"
                
                # Broadcast the command to all clients (including the simulation)
                await self.broadcast({
                    "type": "command",
                    "payload": command,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
            else:
                status = "error"
                message = f"Unknown command: {action}"
                
            # Send acknowledgment
            ack = {
                "type": "commandAck",
                "payload": {
                    "requestId": request_id,
                    "status": status,
                    "message": message
                },
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
            
            await self.send_message(websocket, ack)
            return ack
            
        except Exception as e:
            logger.error(f"Error handling command: {e}")
            error_ack = {
                "type": "commandAck",
                "payload": {
                    "requestId": request_id,
                    "status": "error",
                    "message": str(e)
                },
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
            await self.send_message(websocket, error_ack)
            return error_ack
            
    async def execute_python_code(self, code: str) -> Dict[str, Any]:
        """
        Execute Python code and return result
        Executes the code in a separate thread to allow blocking operations (sensors)
        """
        logger.info(f"Executing Python code:\n{code}")
        
        # We need a queue to communicate between the thread and the async loop
        self.current_execution_queue = queue.Queue()
        # Create a command queue to capture marty commands
        commands = []
        server_instance = self
        
        # Capture 'self' (the server) in closure
        server = self
        
        # Counter for unique request IDs
        request_id_counter = [0]
        
        class LiveMockMarty:
            def __init__(self):
                pass
            
            def _send_and_wait(self, action, params=None):
                if params is None:
                    params = {}
                
                # Generate unique request ID
                request_id_counter[0] += 1
                request_id = f"req_{request_id_counter[0]}_{int(time.time()*1000)}"
                    
                cmd_payload = {"action": action, "params": params, "requestId": request_id}
                
                if server.active_websocket and server.loop:
                    asyncio.run_coroutine_threadsafe(
                        server.send_message(server.active_websocket, {
                            "type": "command",
                            "payload": cmd_payload,
                            "timestamp": int(time.time() * 1000)
                        }),
                        server.loop
                    )
                else:
                    logger.warning("No active websocket or loop")
                    return None
                
                try:
                    # Wait for the correct response (matching requestId)
                    timeout_time = time.time() + 30.0
                    while time.time() < timeout_time:
                        try:
                            response = server.current_execution_queue.get(timeout=0.1)
                            
                            # Check if this response matches our request
                            response_id = response.get("payload", {}).get("requestId")
                            
                            if response.get("type") == "sensorData":
                                # Sensor data doesn't have requestId, handle immediately
                                data = response.get("payload", {}).get("data", {})
                                if action == "getObstacleDistance":
                                    val = data.get("distance")
                                    logger.info(f"  ← Received obstacle distance: {val}")
                                    return val if val is not None else float('inf')
                                elif action == "getGroundColor":
                                    return data
                                return data
                            elif response.get("type") == "commandAck":
                                # For movement commands, wait for commandAck with matching ID
                                if response_id == request_id:
                                    logger.info(f"  ← Command {action} completed (requestId: {request_id})")
                                    return True
                                else:
                                    # Not our response, put it back? No, just log and continue
                                    logger.debug(f"  ← Ignoring commandAck for different request: {response_id}")
                            
                        except queue.Empty:
                            continue
                    
                    logger.warning(f"Timeout waiting for response to {action} (requestId: {request_id})")
                    return float('inf') if action == "getObstacleDistance" else None
                    
                except Exception as e:
                    logger.error(f"Error in _send_and_wait: {e}")
                    return float('inf') if action == "getObstacleDistance" else None

            def walk(self, steps=1):
                logger.info(f"  → Live: walk({steps})")
                self._send_and_wait("walk", {"steps": steps})

            def turn(self, angle):
                direction = 'turn' if angle >= 0 else 'turnLeft'
                magnitude = abs(angle)
                logger.info(f"  → Live: turn({angle})")
                self._send_and_wait(direction, {"angle": magnitude})

            def turnRight(self, angle):
                logger.info(f"  → Live: turnRight({angle})")
                self._send_and_wait("turn", {"angle": angle})

            def turnLeft(self, angle):
                logger.info(f"  → Live: turnLeft({angle})")
                self._send_and_wait("turnLeft", {"angle": angle})

            def wave(self):
                logger.info("  → Live: wave()")
                self._send_and_wait("wave")

            def kick(self):
                logger.info("  → Live: kick()")
                self._send_and_wait("kick")

            def dance(self):
                logger.info("  → Live: dance()")
                self._send_and_wait("dance")

            def slideLeft(self):
                logger.info("  → Live: slideLeft()")
                self._send_and_wait("slideLeft")

            def slideRight(self):
                logger.info("  → Live: slideRight()")
                self._send_and_wait("slideRight")

            def stop(self):
                logger.info("  → Live: stop()")
                self._send_and_wait("stop")

            # --- Joint helpers -------------------------------------------------
            def set_joint(self, joint, angle, move_time=None):
                joint_id = self._normalize_joint_identifier(joint)
                if joint_id is None:
                    return

                params = {"jointId": joint_id, "angle": angle}
                if move_time is not None:
                    params["moveTime"] = move_time

                logger.info(f"  → Live: set_joint({joint}, {angle})")
                self._send_and_wait("joint", params)

            def move_joint(self, joint, angle, move_time=None):
                self.set_joint(joint, angle, move_time)

            def set_joint_angle(self, joint, angle, move_time=None):
                self.set_joint(joint, angle, move_time)

            # --- Sensor helpers -------------------------------------------------
            def getGroundColor(self):
                logger.info("  → Live: getGroundColor()")
                return self._send_and_wait("getGroundColor")
            
            def get_ground_color(self):
                return self.getGroundColor()
            
            def getObstacleDistance(self):
                logger.info("  → Live: getObstacleDistance()")
                val = self._send_and_wait("getObstacleDistance")
                return val if val is not None else float('inf')

            def get_distance_sensor(self):
                return self.getObstacleDistance()

            def _normalize_joint_identifier(self, joint) -> Optional[int]:
                if isinstance(joint, (int, float)):
                    return None
                if isinstance(joint, str):
                    key = joint.strip().lower()
                    if key.startswith('jointid.') or key.isdigit() or ' ' in key or '-' in key:
                        return None
                    normalized = key.strip('_')
                    if normalized in JOINT_ALIAS_MAP:
                        return JOINT_ALIAS_MAP[normalized]
                return None
        
        def run_script():
            exec_globals = {
                'marty': LiveMockMarty(),
                '__builtins__': {
                    'range': range, 'len': len, 'print': print,
                    'int': int, 'float': float, 'str': str, 'bool': bool,
                    'True': True, 'False': False,
                }
            }
            try:
                exec(code, exec_globals)
                logger.info("Script execution completed successfully")
            except Exception as e:
                logger.error(f"Error in threaded execution: {e}")
                
        # Start execution in a thread
        threading.Thread(target=run_script, daemon=True).start()

        return {
            "success": True,
            "message": "Started execution in background thread"
        }
            
    async def handle_client(self, websocket: WebSocketServerProtocol):
        """Handle a client connection"""
        await self.register_client(websocket)
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    msg_type = data.get("type")
                    
                    logger.debug(f"Received message type: {msg_type}")
                    
                    if msg_type == "command":
                        await self.handle_command(websocket, data.get("payload", {}))
                    elif msg_type in ["sensorData", "commandAck"]:
                        if self.current_execution_queue:
                            self.current_execution_queue.put(data)
                    elif msg_type == "ping":
                        # Respond to heartbeat
                        await self.send_message(websocket, {
                            "type": "pong",
                            "payload": {},
                            "timestamp": int(datetime.now().timestamp() * 1000)
                        })
                    else:
                        logger.warning(f"Unknown message type: {msg_type}")
                        
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received: {message}")
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client connection closed")
        finally:
            await self.unregister_client(websocket)
            
    async def start_telemetry(self):
        """
        Start sending periodic telemetry data
        This would be connected to actual robot sensors in production
        """
        while True:
            if self.clients:
                # Send mock robot status
                await self.broadcast({
                    "type": "robotStatus",
                    "payload": {
                        "flags": 0,
                        "workQCount": 0,
                        "isMoving": False,
                        "isPaused": False,
                        "isFwUpdating": False
                    },
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
                
            await asyncio.sleep(1.0)  # Send every second
            
    async def start(self):
        """Start the WebSocket server"""
        logger.info(f"Starting WebSocket server on {self.host}:{self.port}")
        self.loop = asyncio.get_running_loop()
        
        # Start telemetry task
        self.telemetry_task = asyncio.create_task(self.start_telemetry())
        
        # Start WebSocket server
        async with websockets.serve(self.handle_client, self.host, self.port):
            logger.info(f"✅ WebSocket server running on ws://{self.host}:{self.port}")
            await asyncio.Future()  # Run forever
            
    def run(self):
        """Run the server"""
        try:
            asyncio.run(self.start())
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
        except Exception as e:
            logger.error(f"Server error: {e}")

if __name__ == "__main__":
    server = MartyWebSocketServer(host="localhost", port=8765)
    server.run()
