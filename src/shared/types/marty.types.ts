/**
 * Types de base pour le robot Marty
 * Basé sur l'API officielle MartyPy v3.6+
 * @see https://github.com/robotical/martypy
 */

/**
 * IDs des articulations (servos) du robot Marty
 * Correspond exactement à Marty.JOINT_IDS de martypy
 */
export const JointID = {
  LEFT_HIP: 0,
  LEFT_TWIST: 1,
  LEFT_KNEE: 2,
  RIGHT_HIP: 3,
  RIGHT_TWIST: 4,
  RIGHT_KNEE: 5,
  LEFT_ARM: 6,
  RIGHT_ARM: 7,
  EYES: 8,
} as const;

export type JointID = (typeof JointID)[keyof typeof JointID];

/**
 * Noms des articulations (utilisables dans les commandes)
 */
export const JointName = {
  LEFT_HIP: 'left hip',
  LEFT_TWIST: 'left twist',
  LEFT_KNEE: 'left knee',
  RIGHT_HIP: 'right hip',
  RIGHT_TWIST: 'right twist',
  RIGHT_KNEE: 'right knee',
  LEFT_ARM: 'left arm',
  RIGHT_ARM: 'right arm',
  EYES: 'eyes',
} as const;

export type JointName = (typeof JointName)[keyof typeof JointName];

/**
 * Statuts des articulations (flags)
 * Correspond à Marty.JOINT_STATUS
 */
export const JointStatus = {
  ENABLED: 0x01,
  CURRENT_LIMIT_NOW: 0x02,
  CURRENT_LIMIT_LONG: 0x04,
  BUSY: 0x08,
  POS_RESTRICTED: 0x10,
  PAUSED: 0x20,
  COMMS_OK: 0x80,
} as const;

export type JointStatus = (typeof JointStatus)[keyof typeof JointStatus];

/**
 * Types d'arrêt du robot
 * Correspond à Marty.STOP_TYPE
 */
export const StopType = {
  CLEAR_QUEUE: 'clear queue', // finir le mouvement en cours
  CLEAR_AND_STOP: 'clear and stop', // arrêter immédiatement
  CLEAR_AND_DISABLE: 'clear and disable', // arrêter et désactiver moteurs
  CLEAR_AND_ZERO: 'clear and zero', // arrêter et retourner à la position zéro
  PAUSE: 'pause', // mettre en pause
  PAUSE_AND_DISABLE: 'pause and disable', // pause et désactiver moteurs
} as const;

export type StopType = (typeof StopType)[keyof typeof StopType];

/**
 * Directions/côtés pour les mouvements
 * Correspond à ClientGeneric.SIDE_CODES
 */
export const Side = {
  LEFT: 'left',
  RIGHT: 'right',
  FORWARD: 'forward',
  BACK: 'back',
  AUTO: 'auto',
} as const;

export type Side = (typeof Side)[keyof typeof Side];

/**
 * Poses prédéfinies pour les yeux
 * Correspond à ClientGeneric.EYE_POSES
 */
export const EyePose = {
  ANGRY: 'angry',
  EXCITED: 'excited',
  NORMAL: 'normal',
  WIDE: 'wide',
  WIGGLE: 'wiggle', // V2 uniquement
} as const;

export type EyePose = (typeof EyePose)[keyof typeof EyePose];

/**
 * Axes de l'accéléromètre
 * Correspond à Marty.ACCEL_AXES
 */
export const AccelAxis = {
  X: 'x',
  Y: 'y',
  Z: 'z',
} as const;

export type AccelAxis = (typeof AccelAxis)[keyof typeof AccelAxis];

/**
 * Position 3D (compatible Three.js)
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Rotation 3D en degrés
 */
export interface Rotation3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Informations sur une articulation
 * Retourné par get_joints()
 */
export interface JointInfo {
  IDNo: number; // JointID
  name: string; // JointName
  pos: number; // angle en degrés
  current: number; // courant en milli-Amps
  enabled: boolean;
  commsOK: boolean;
  flags: number; // combinaison de JointStatus
}

/**
 * État du robot
 * Retourné par get_robot_status()
 */
export interface RobotStatus {
  flags: number;
  workQCount: number; // nombre de mouvements en queue
  isMoving: boolean;
  isPaused: boolean;
  isFwUpdating: boolean;
  heapFree?: number;
  heapMin?: number;
  pixRGBT?: Array<{
    r: number;
    g: number;
    b: number;
    state: 'off' | 'on' | 'breathe' | 'override';
  }>;
  loopMsAvg?: number;
  loopMsMax?: number;
}

/**
 * État de la batterie et alimentation
 * Retourné par get_power_status()
 */
export interface PowerStatus {
  battRemainCapacityPercent: number;
  battTempDegC?: number;
  battRemainCapacityMAH?: number;
  battFullCapacityMAH?: number;
  battCurrentMA?: number;
  power5VOnTimeSecs?: number;
  powerUSBIsConnected?: boolean;
  power5VIsOn?: boolean;
}

/**
 * Lecture de l'accéléromètre
 */
export interface AccelerometerReading {
  x: number;
  y: number;
  z: number;
}

/**
 * Paramètres pour la commande walk()
 */
export interface WalkParams {
  numSteps?: number; // défaut: 2
  startFoot?: Side; // défaut: 'auto'
  turn?: number; // -100 à 100 degrés, défaut: 0
  stepLength?: number; // en mm, défaut: 25
  moveTime?: number; // en ms, défaut: 1500
}

/**
 * Paramètres pour la commande lean()
 */
export interface LeanParams {
  direction: Side; // 'left', 'right', 'forward', 'back'
  amount?: number; // V1: -60 à 60, défaut 50 | V2: degrés, défaut 29
  moveTime?: number; // en ms, défaut: 1000
}

/**
 * Paramètres pour la commande sidestep()
 */
export interface SidestepParams {
  side: Side; // 'left' ou 'right'
  steps?: number; // défaut: 1
  stepLength?: number; // défaut: 35
  moveTime?: number; // en ms, défaut: 1000
}

/**
 * Paramètres pour la commande kick()
 */
export interface KickParams {
  side?: Side; // 'left' ou 'right', défaut: 'right'
  twist?: number; // degrés, défaut: 0
  moveTime?: number; // en ms, défaut: 2500
}

/**
 * Paramètres pour la commande arms()
 */
export interface ArmsParams {
  leftAngle: number; // -100 à 100 degrés
  rightAngle: number; // -100 à 100 degrés
  moveTime: number; // en ms
}

/**
 * Paramètres pour déplacer une articulation
 */
export interface MoveJointParams {
  joint: JointID | JointName;
  position: number; // angle en degrés
  moveTime: number; // en ms
}
