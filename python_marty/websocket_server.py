"""
WebSocket Server for MartyEngine
Handles bidirectional communication between the frontend and robot simulation
Based on the AsyncAPI specification in docs/api-websocket.yaml
"""

import asyncio
import json
import logging
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

class MartyWebSocketServer:
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[WebSocketServerProtocol] = set()
        self.telemetry_task: Optional[asyncio.Task] = None
        
    async def register_client(self, websocket: WebSocketServerProtocol):
        """Register a new client connection"""
        self.clients.add(websocket)
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
            elif action in ["walk", "turn", "wave", "dance", "kick", "sidestep", "stop", "get_ready", "stand_straight"]:
                # Robot movement commands - forward to simulation
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
        This is a simplified implementation - in production, use a sandboxed environment
        """
        logger.info(f"Executing Python code:\n{code}")
        
        # For now, just parse and forward Marty commands
        # In a real implementation, you would execute the code in a sandboxed environment
        # and interface with the actual Marty robot or its Python API
        
        commands = []
        lines = code.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            # Parse marty commands with parameters
            if 'marty.walk(' in line:
                # Extract steps parameter: marty.walk(4)
                import re
                match = re.search(r'marty\.walk\((\d+)\)', line)
                steps = int(match.group(1)) if match else 2
                logger.info(f"  → Parsed: walk({steps})")
                commands.append({"action": "walk", "params": {"steps": steps}})
            elif 'marty.wave(' in line:
                logger.info(f"  → Parsed: wave()")
                commands.append({"action": "wave", "params": {}})
            elif 'marty.stop(' in line:
                logger.info(f"  → Parsed: stop()")
                commands.append({"action": "stop", "params": {}})
                
        if commands:
            # Broadcast commands to simulation
            for cmd in commands:
                await self.broadcast({
                    "type": "command",
                    "payload": cmd,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
                await asyncio.sleep(0.5)  # Small delay between commands
                
            return {
                "success": True,
                "message": f"Executed {len(commands)} command(s)"
            }
        else:
            return {
                "success": True,
                "message": "No Marty commands found in code"
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
