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

// Event types for subscribers
export type WebSocketEventType =
  | 'connected'
  | 'disconnected'
  | 'command'
  | 'telemetry'
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

  constructor(url: string = 'ws://localhost:8765') {
    this.url = url;
    this.initializeListeners();
  }

  private initializeListeners() {
    // Initialize listener sets for each event type
    const eventTypes: WebSocketEventType[] = [
      'connected',
      'disconnected',
      'command',
      'telemetry',
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
        console.log('✅ WebSocket already connected');
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log('⏳ WebSocket connection already in progress');
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      console.log('🔌 Connecting to WebSocket:', this.url);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
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
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });

          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(
              `🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            );
            setTimeout(() => this.connect(), this.reconnectDelay);
          }
        };
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
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
  private send(message: WebSocketMessage) {
    if (!this.isConnected()) {
      console.warn('⚠️ WebSocket not connected, message not sent');
      return false;
    }

    try {
      this.ws!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
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
          console.log('✅ WebSocket connected');
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

        case 'error':
          console.error('❌ Server error:', message.payload);
          this.emit('error', message.payload);
          break;

        case 'pong':
          // Heartbeat response (silent)
          break;

        default:
          console.warn('⚠️ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
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

  // Gestures
  wave() {
    return this.sendCommand({
      action: 'wave',
      params: {},
    });
  }

  // Control commands
  stop() {
    return this.sendCommand({ action: 'stop' });
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

export default WebSocketService;
