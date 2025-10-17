/**
 * Types pour l'API REST et WebSocket de Marty V2
 * Basé sur l'API RIC (Robotical Interface Controller)
 */

import type {
  JointInfo,
  RobotStatus,
  PowerStatus,
  SystemStatus,
} from './marty.types';

/**
 * Endpoints REST de l'API Marty V2
 * Format: /traj/{action}?params
 */
export const ApiEndpoint = {
  // Trajectoires et mouvements
  TRAJ_GET_READY: 'traj/getReady',
  TRAJ_STAND_STRAIGHT: 'traj/standStraight',
  TRAJ_STEP: 'traj/step',
  TRAJ_WALK: 'traj/step',
  TRAJ_KICK: 'traj/kick',
  TRAJ_WAVE: 'traj/wave',
  TRAJ_LEAN: 'traj/lean',
  TRAJ_SIDESTEP: 'traj/sidestep',
  TRAJ_CIRCLE: 'traj/circle',
  TRAJ_DANCE: 'traj/dance',
  TRAJ_WIGGLE: 'traj/wiggle',
  TRAJ_JOINT: 'traj/joint',

  // Yeux (trajectoires prédéfinies)
  TRAJ_EYES_ANGRY: 'traj/eyesAngry',
  TRAJ_EYES_EXCITED: 'traj/eyesExcited',
  TRAJ_EYES_NORMAL: 'traj/eyesNormal',
  TRAJ_EYES_WIDE: 'traj/eyesWide',
  TRAJ_WIGGLE_EYES: 'traj/wiggleEyes',

  // Audio
  AUDIO_VOLUME: 'audio/vol',
  AUDIO_PLAY: 'filerun',

  // LEDs Disco
  LED_OFF: 'led/{name}/off',
  LED_PATTERN: 'led/{name}/pattern',
  LED_COLOR: 'led/{name}/color',

  // Status et info
  HW_STATUS: 'hwstatus',
  SYSTEM_INFO: 'v',

  // Pause/Resume
  TRAJ_PAUSE: 'traj/pause',
  TRAJ_RESUME: 'traj/resume',
  TRAJ_STOP: 'traj/stop',
} as const;

export type ApiEndpoint = (typeof ApiEndpoint)[keyof typeof ApiEndpoint];

/**
 * Réponse générique de l'API RIC
 */
export interface RicResponse<T = unknown> {
  rslt: 'ok' | 'fail' | string;
  data?: T;
  [key: string]: unknown;
}

/**
 * Réponse de hwstatus (liste des éléments hardware)
 */
export interface HwStatusResponse extends RicResponse {
  hw: HwElement[];
}

/**
 * Élément hardware
 */
export interface HwElement {
  name: string;
  type: string;
  busName?: string;
  addr?: number;
  addrValid?: 0 | 1;
  IDNo: number;
  whoAmI?: string;
  whoAmITypeCode?: string;
  SN?: string;
  versionStr?: string;
  commsOK?: 0 | 1;
}

/**
 * Types d'éléments hardware
 */
export const HwElemType = {
  SMART_SERVO: 'SmartServo',
  IMU: 'IMU',
  I2S_OUT: 'I2SOut',
  BUS_PIXELS: 'BusPixels',
  GPIO: 'GPIO',
  FUEL_GAUGE: 'FuelGauge',
  POWER_CTRL: 'PowerCtrl',
} as const;

export type HwElemType = (typeof HwElemType)[keyof typeof HwElemType];

/**
 * Informations système
 */
export interface SystemInfo {
  HardwareVersion: string;
  SystemName: string;
  SystemVersion: string;
  SerialNo: string;
  MAC: string;
  RicHwRevNo?: number;
  [key: string]: unknown;
}

/**
 * Topics ROS Serial
 */
export const RosTopic = {
  SMART_SERVOS: 'smartServos',
  ACCEL: 'accel',
  POWER_STATUS: 'powerStatus',
  ADDONS: 'addOns',
  ROBOT_STATUS: 'robotStatus',
} as const;

export type RosTopic = (typeof RosTopic)[keyof typeof RosTopic];

/**
 * Message ROS Serial
 */
export interface RosSerialMessage {
  topic: RosTopic;
  payload: unknown;
  timestamp: number;
}

/**
 * Publication servos
 */
export interface ServosPublication {
  topic: typeof RosTopic.SMART_SERVOS;
  servos: JointInfo[];
}

/**
 * Publication accéléromètre
 */
export interface AccelPublication {
  topic: typeof RosTopic.ACCEL;
  x: number;
  y: number;
  z: number;
}

/**
 * Publication alimentation
 */
export interface PowerPublication {
  topic: typeof RosTopic.POWER_STATUS;
  power: PowerStatus;
}

/**
 * Publication statut robot
 */
export interface RobotStatusPublication {
  topic: typeof RosTopic.ROBOT_STATUS;
  status: RobotStatus;
}

/**
 * Configuration de connexion
 */
export interface ConnectionConfig {
  method: 'wifi' | 'usb' | 'exp' | 'test';
  locator?: string;
  blocking?: boolean;
  subscribeRateHz?: number;
}

/**
 * Paramètres REST
 */
export interface RestParams {
  [key: string]: string | number | boolean;
}

/**
 * Résultat de commande
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  duration?: number;
}

/**
 * État de santé du service
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number; // secondes
  system?: SystemStatus;
  components: {
    engine: 'up' | 'down' | 'unknown';
    websocket: 'up' | 'down' | 'unknown';
    physics: 'up' | 'down' | 'unknown';
  };
}

// ============================================================================
// WEBSOCKET API TYPES
// ============================================================================

/**
 * Types de messages WebSocket
 * Correspond aux channels de l'AsyncAPI
 */
export const WebSocketMessageType = {
  // Lifecycle
  ACK: 'ack',
  DISCONNECT: 'disconnect',
  HEARTBEAT: 'heartbeat',
  HEARTBEAT_ACK: 'heartbeat_ack',

  // Telemetry - Robot (Server → Client)
  SMART_SERVOS: 'smartServos',
  ROBOT_STATUS: 'robotStatus',
  ACCEL: 'accel',
  POWER_STATUS: 'powerStatus',
  ADDONS: 'addOns',

  // Telemetry - System (Server → Client)
  SYSTEM_STATUS: 'systemStatus',

  // Commands (Client → Server)
  COMMAND: 'command',
  COMMAND_ACK: 'command_ack',

  // Events
  ERROR: 'error',
} as const;

export type WebSocketMessageType =
  (typeof WebSocketMessageType)[keyof typeof WebSocketMessageType];

/**
 * Structure de base pour tous les messages WebSocket
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: number;
}

/**
 * Message de connexion établie
 */
export interface ConnectAckMessage extends WebSocketMessage<{
  status: 'connected';
  serverVersion: string;
  subscriptionRate: number;
}> {
  type: typeof WebSocketMessageType.ACK;
}

/**
 * Message de déconnexion
 */
export interface DisconnectMessage extends WebSocketMessage<{
  reason: string;
  code?: number;
}> {
  type: typeof WebSocketMessageType.DISCONNECT;
}

/**
 * Message heartbeat (ping)
 */
export interface HeartbeatMessage extends WebSocketMessage<{
  clientTime: number;
}> {
  type: typeof WebSocketMessageType.HEARTBEAT;
}

/**
 * Message heartbeat ack (pong)
 */
export interface HeartbeatAckMessage extends WebSocketMessage<{
  serverTime: number;
  clientTime: number;
}> {
  type: typeof WebSocketMessageType.HEARTBEAT_ACK;
}

/**
 * Message état servos (10 Hz)
 */
export interface ServosStateMessage extends WebSocketMessage<JointInfo[]> {
  type: typeof WebSocketMessageType.SMART_SERVOS;
}

/**
 * Message statut robot (10 Hz)
 */
export interface RobotStatusMessage extends WebSocketMessage<RobotStatus> {
  type: typeof WebSocketMessageType.ROBOT_STATUS;
}

/**
 * Message accéléromètre (10 Hz)
 */
export interface AccelMessage extends WebSocketMessage<{
  x: number;
  y: number;
  z: number;
}> {
  type: typeof WebSocketMessageType.ACCEL;
}

/**
 * Message alimentation (1 Hz)
 */
export interface PowerStatusMessage extends WebSocketMessage<PowerStatus> {
  type: typeof WebSocketMessageType.POWER_STATUS;
}

/**
 * Message add-ons (10 Hz)
 */
export interface AddonsMessage extends WebSocketMessage<unknown[]> {
  type: typeof WebSocketMessageType.ADDONS;
}

/**
 * Message métriques système (1 Hz)
 */
export interface SystemStatusMessage extends WebSocketMessage<SystemStatus> {
  type: typeof WebSocketMessageType.SYSTEM_STATUS;
}

/**
 * Message commande (Client → Server)
 */
export interface CommandMessage extends WebSocketMessage<{
  endpoint: ApiEndpoint;
  params?: RestParams;
}> {
  type: typeof WebSocketMessageType.COMMAND;
}

/**
 * Message accusé réception commande
 */
export interface CommandAckMessage extends WebSocketMessage<{
  commandId: string;
  status: 'accepted' | 'rejected' | 'completed';
  message?: string;
}> {
  type: typeof WebSocketMessageType.COMMAND_ACK;
}

/**
 * Codes d'erreur WebSocket
 */
export const WebSocketErrorCode = {
  INVALID_MESSAGE: 1000,
  UNAUTHORIZED: 1001,
  COMMAND_FAILED: 1002,
  ROBOT_NOT_READY: 1003,
  SIMULATION_ERROR: 1004,
  INTERNAL_ERROR: 1005,
} as const;

export type WebSocketErrorCode =
  (typeof WebSocketErrorCode)[keyof typeof WebSocketErrorCode];

/**
 * Message erreur
 */
export interface ErrorMessage extends WebSocketMessage<{
  code: WebSocketErrorCode;
  message: string;
  details?: unknown;
}> {
  type: typeof WebSocketMessageType.ERROR;
}

/**
 * Union de tous les messages WebSocket
 */
export type AnyWebSocketMessage =
  | ConnectAckMessage
  | DisconnectMessage
  | HeartbeatMessage
  | HeartbeatAckMessage
  | ServosStateMessage
  | RobotStatusMessage
  | AccelMessage
  | PowerStatusMessage
  | AddonsMessage
  | SystemStatusMessage
  | CommandMessage
  | CommandAckMessage
  | ErrorMessage;

/**
 * Configuration WebSocket
 */
export interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  subscriptionRate?: number;
}
