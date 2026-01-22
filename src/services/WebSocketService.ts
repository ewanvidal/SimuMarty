/**
 * WebSocket Service for MartyEngine
 * Handles bidirectional communication between the code editor and the robot simulation
 * Based on the AsyncAPI specification in docs/api-websocket.yaml
 */

// Message types based on the API spec
export type MessageType =
  | 'ack'
  | 'smartServos'
  | 'robotStatus'
  | 'accel'
  | 'powerStatus'
  | 'addOns'
  | 'systemStatus'
  | 'command'
  | 'commandAck'
  | 'sensorData'
  | 'error'
  | 'ping'
  | 'pong';

export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
}

// Command structure for robot control
export interface RobotCommand {
  action: string; // e.g., 'walk', 'turn', 'wave', 'stop'
  params?: Record<string, unknown>;
  requestId?: string;
}

export interface CommandAck {
  requestId?: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
}

// Telemetry data structures
export interface ServoState {
  IDNo: number;
  name: string;
  pos: number;
  current: number;
  enabled: boolean;
  commsOK: boolean;
  flags: number;
}

export interface AccelData {
  x: number;
  y: number;
  z: number;
}

// Sensor data structures
export interface GroundColorData {
  r: number;
  g: number;
  b: number;
}

export interface ObstacleData {
  distance: number;
  detected: boolean;
}

export interface SensorDataPayload {
  sensorType: 'groundColor' | 'obstacle';
  data: GroundColorData | ObstacleData;
  timestamp: number;
}

// Event types for subscribers
export type WebSocketEventType =
  | 'connected'
  | 'disconnected'
  | 'command'
  | 'telemetry'
  | 'sensorData'
  | 'error';

type EventCallback = (data?: unknown) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private heartbeatInterval: number | null = null;
  private listeners: Map<WebSocketEventType, Set<EventCallback>> = new Map();
  private isConnecting = false;
  private suppressConnectionErrors: boolean;

  constructor(url: string = 'ws://localhost:8765', suppressConnectionErrors: boolean = true) {
    this.url = url;
    this.suppressConnectionErrors = suppressConnectionErrors;
    this.initializeListeners();
  }

  private initializeListeners() {
    // Initialize listener sets for each event type
    const eventTypes: WebSocketEventType[] = [
      'connected',
      'disconnected',
      'command',
      'telemetry',
      'sensorData',
      'error',
    ];
    eventTypes.forEach((type) => {
      this.listeners.set(type, new Set());
    });
  }

  /**
   * Subscribe to WebSocket events
   */
  on(event: WebSocketEventType, callback: EventCallback): () => void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off(event: WebSocketEventType, callback: EventCallback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to all subscribers
   */
  private emit(event: WebSocketEventType, data?: unknown) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          if (!this.suppressConnectionErrors) {
            console.error('❌ WebSocket error:', error);
          }
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });

          // Attempt reconnection silently
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), this.reconnectDelay);
          }
        };
      } catch (error) {
        if (!this.suppressConnectionErrors) {
          console.error('❌ Failed to create WebSocket:', error);
        }
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send a message to the server
   */
  send(message: WebSocketMessage): boolean {
    if (!this.isConnected()) {
      return false;
    }

    try {
      this.ws!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      if (!this.suppressConnectionErrors) {
        console.error('❌ Failed to send message:', error);
      }
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Send a command to the robot
   */
  sendCommand(command: RobotCommand): boolean {
    const message: WebSocketMessage<RobotCommand> = {
      type: 'command',
      payload: command,
      timestamp: Date.now(),
    };

    return this.send(message);
  }

  /**
   * Execute Python code by sending it to the backend
   */
  executeCode(code: string): boolean {
    const command: RobotCommand = {
      action: 'execute_python',
      params: { code },
      requestId: `exec_${Date.now()}`,
    };

    return this.sendCommand(command);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case 'ack':
          break;

        case 'commandAck':
          this.emit('command', message.payload);
          break;

        case 'command':
          // Broadcast command (from server to other clients)
          // This is for the simulation to handle, not the editor
          this.emit('command', message.payload);
          break;

        case 'smartServos':
        case 'robotStatus':
        case 'accel':
        case 'powerStatus':
        case 'systemStatus':
          // Telemetry data (silent, just emit)
          this.emit('telemetry', { type: message.type, data: message.payload });
          break;

        case 'sensorData':
          // Sensor data from robot
          this.emit('sensorData', message.payload);
          break;

        case 'error':
          if (!this.suppressConnectionErrors) {
            console.error('❌ Server error:', message.payload);
          }
          this.emit('error', message.payload);
          break;

        case 'pong':
          // Heartbeat response (silent)
          break;

        default:
          // Silently ignore unknown message types
          break;
      }
    } catch (error) {
      if (!this.suppressConnectionErrors) {
        console.error('❌ Failed to parse message:', error);
      }
      this.emit('error', error);
    }
  }

  /**
   * Start sending periodic heartbeat messages
   */
  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = window.setInterval(() => {
      const message: WebSocketMessage = {
        type: 'ping',
        payload: {},
        timestamp: Date.now(),
      };
      this.send(message);
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop sending heartbeat messages
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send specific robot commands based on Marty API
   */

  // Movement commands
  walk(steps: number = 2) {
    return this.sendCommand({
      action: 'walk',
      params: { steps },
    });
  }

  turnRight(angle: number = 30) {
    return this.sendCommand({
      action: 'turn',
      params: { angle },
    });
  }

  turnLeft(angle: number = 30) {
    return this.sendCommand({
      action: 'turnLeft',
      params: { angle },
    });
  }

  // Gestures
  wave() {
    return this.sendCommand({
      action: 'wave',
      params: {},
    });
  }

  kick() {
    return this.sendCommand({
      action: 'kick',
      params: {},
    });
  }

  dance() {
    return this.sendCommand({
      action: 'dance',
      params: {},
    });
  }

  slideLeft() {
    return this.sendCommand({
      action: 'slideLeft',
      params: {},
    });
  }

  slideRight() {
    return this.sendCommand({
      action: 'slideRight',
      params: {},
    });
  }

  // Control commands
  stop() {
    return this.sendCommand({ action: 'stop' });
  }

  // Sensor commands
  getGroundColor(): Promise<GroundColorData | null> {
    return new Promise((resolve) => {
      const requestId = `sensor_ground_${Date.now()}`;
      
      // Set up one-time listener for sensor data
      const handler = (data: unknown) => {
        const sensorData = data as SensorDataPayload;
        if (sensorData.sensorType === 'groundColor') {
          this.off('sensorData', handler);
          resolve(sensorData.data as GroundColorData);
        }
      };
      
      this.on('sensorData', handler);
      
      // Send request
      this.sendCommand({
        action: 'getGroundColor',
        requestId,
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.off('sensorData', handler);
        resolve(null);
      }, 5000);
    });
  }

  getObstacleDistance(): Promise<ObstacleData | null> {
    return new Promise((resolve) => {
      const requestId = `sensor_obstacle_${Date.now()}`;
      
      // Set up one-time listener for sensor data
      const handler = (data: unknown) => {
        const sensorData = data as SensorDataPayload;
        if (sensorData.sensorType === 'obstacle') {
          this.off('sensorData', handler);
          resolve(sensorData.data as ObstacleData);
        }
      };
      
      this.on('sensorData', handler);
      
      // Send request
      this.sendCommand({
        action: 'getObstacleDistance',
        requestId,
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.off('sensorData', handler);
        resolve(null);
      }, 5000);
    });
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

export default WebSocketService;
