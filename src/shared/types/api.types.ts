/**
 * Types pour l'API REST et WebSocket de Marty V2
 * Basé sur l'API RIC (Robotical Interface Controller)
 */

import type { JointInfo, RobotStatus, PowerStatus } from './marty.types';

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
