/**
 * Types pour les capteurs et add-ons de Marty
 * IR, Color, Distance, Disco LEDs, etc.
 */

/**
 * Types d'add-ons reconnus
 * Correspond à Marty.ADD_ON_TYPE_NAMES
 */
export const AddOnType = {
  IR_FOOT: 'IRFoot',
  COLOR_SENSOR: 'coloursensor',
  LED_FOOT: 'LEDfoot',
  LED_ARM: 'LEDarm',
  LED_EYE: 'LEDeye',
  DISTANCE: 'distance',
} as const;

export type AddOnType = (typeof AddOnType)[keyof typeof AddOnType];

/**
 * Informations sur un add-on
 * Retourné par get_add_ons_status()
 */
export interface AddOnInfo {
  IDNo: number;
  name: string;
  type: string; // AddOnType ou autre
  whoAmITypeCode: string;
  valid: boolean;
  data: number[]; // 10 bytes de données brutes
}

/**
 * Statut d'un add-on spécifique
 * Retourné par get_add_on_status()
 */
export interface AddOnStatus {
  IDNo: number;
  valid: boolean;
  data: number[];
}

/**
 * Requête pour interroger un add-on (mode raw)
 */
export interface AddOnQueryRequest {
  addOnName: string;
  dataToWrite: Uint8Array;
  numBytesToRead: number;
}

/**
 * Réponse d'une requête add-on
 */
export interface AddOnQueryResponse {
  rslt: 'ok' | 'fail';
  dataRead?: number[];
}

/**
 * Couleurs prédéfinies pour les LEDs disco
 */
export const DiscoColor = {
  WHITE: 'white',
  RED: 'red',
  BLUE: 'blue',
  YELLOW: 'yellow',
  GREEN: 'green',
  TEAL: 'teal',
  PINK: 'pink',
  PURPLE: 'purple',
  ORANGE: 'orange',
} as const;

export type DiscoColor = (typeof DiscoColor)[keyof typeof DiscoColor];

/**
 * Patterns pour les LEDs disco
 */
export const DiscoPattern = {
  SHOW_OFF: 'show-off',
  PINWHEEL: 'pinwheel',
  OFF: 'off',
} as const;

export type DiscoPattern = (typeof DiscoPattern)[keyof typeof DiscoPattern];

/**
 * Régions des LEDs disco
 */
export type DiscoRegion = 0 | 1 | 2 | 'all';

/**
 * Couleur RGB (0-255)
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Paramètres pour disco_color()
 */
export interface DiscoColorParams {
  color: DiscoColor | string | RGBColor; // hex, nom ou RGB
  addOn?: string; // nom de l'add-on
  region?: DiscoRegion;
}

/**
 * Add-ons disco disponibles (enum pour typage)
 */
export const DiscoAddOn = {
  ARMS: 'arms',
  FEET: 'feet',
  EYES: 'eyes',
  ALL: 'all',
} as const;

export type DiscoAddOn = (typeof DiscoAddOn)[keyof typeof DiscoAddOn];

/**
 * Lecture brute du capteur de couleur/IR
 */
export interface ColorIRReading {
  detectionFlags: number;
  obstacleRaw: number;
  groundRaw: number;
  side: 'left' | 'right';
}

/**
 * Canaux du capteur de couleur
 */
export const ColorChannel = {
  RED: 'red',
  GREEN: 'green',
  BLUE: 'blue',
  CLEAR: 'clear',
} as const;

export type ColorChannel = (typeof ColorChannel)[keyof typeof ColorChannel];

/**
 * Lecture du capteur de couleur
 */
export interface ColorSensorReading {
  red: number;
  green: number;
  blue: number;
  clear: number;
  hex: string; // format #RRGGBB
}

/**
 * Paramètres pour les fonctions de capteur pied
 */
export interface FootSensorParams {
  addOnOrSide: string; // nom du capteur ou 'left'/'right'
}
