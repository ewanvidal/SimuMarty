"""
Test script for WebSocket connection
Run this to verify the WebSocket server is working correctly
"""

import asyncio
import json
import websockets

async def test_connection():
    uri = "ws://localhost:8765"
    
    print("🔌 Connecting to WebSocket server...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected!")
            
            # Wait for connection acknowledgment
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📥 Received: {data['type']}")
            print(f"   Status: {data['payload']['status']}")
            
            # Send a walk command
            print("\n📤 Sending walk command...")
            command = {
                "type": "command",
                "payload": {
                    "action": "walk",
                    "params": {"steps": 2},
                    "requestId": "test_001"
                },
                "timestamp": 1234567890
            }
            await websocket.send(json.dumps(command))
            
            # Wait for acknowledgment
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📥 Received: {data['type']}")
            print(f"   Status: {data['payload']['status']}")
            print(f"   Message: {data['payload']['message']}")
            
            # Send Python code
            print("\n📤 Sending Python code...")
            code_command = {
                "type": "command",
                "payload": {
                    "action": "execute_python",
                    "params": {
                        "code": "marty.walk(2)\nmarty.wave()\nmarty.turn(90)"
                    },
                    "requestId": "test_002"
                },
                "timestamp": 1234567890
            }
            await websocket.send(json.dumps(code_command))
            
            # Wait for acknowledgment
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📥 Received: {data['type']}")
            print(f"   Status: {data['payload']['status']}")
            print(f"   Message: {data['payload']['message']}")
            
            print("\n✅ All tests passed!")
            
    except ConnectionRefusedError:
        print("❌ Connection refused. Is the WebSocket server running?")
        print("   Start it with: python websocket_server.py")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
