/**
 * Types pour le simulateur 3D (environnements, caméra, physique)
 * Ces types sont spécifiques au simulateur et peuvent différer du robot réel
 */

import type { Position3D, Rotation3D } from './marty.types';

/**
 * Types d'environnements disponibles dans le simulateur
 */
export const EnvironmentType = {
  EMPTY: 'empty',
  CLASSROOM: 'classroom',
  MAZE: 'maze',
  OBSTACLE_COURSE: 'obstacle_course',
  PLAYGROUND: 'playground',
  CUSTOM: 'custom',
} as const;

export type EnvironmentType =
  (typeof EnvironmentType)[keyof typeof EnvironmentType];

/**
 * Matériaux physiques
 */
export const PhysicsMaterial = {
  WOOD: 'wood',
  METAL: 'metal',
  PLASTIC: 'plastic',
  RUBBER: 'rubber',
  CONCRETE: 'concrete',
} as const;

export type PhysicsMaterial =
  (typeof PhysicsMaterial)[keyof typeof PhysicsMaterial];

/**
 * Propriétés physiques d'un matériau
 */
export interface MaterialPhysics {
  friction: number; // 0-1
  restitution: number; // 0-1 (rebond)
  density: number; // kg/m³
}

/**
 * Objet 3D dans l'environnement
 */
export interface EnvironmentObject {
  id: string;
  name: string;
  type: 'static' | 'dynamic' | 'kinematic';
  position: Position3D;
  rotation: Rotation3D;
  scale: Position3D;
  modelPath?: string;
  geometry?: GeometryType;
  material: PhysicsMaterial;
  color?: string;
  isCollider: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Types de géométrie de base
 */
export type GeometryType =
  | { type: 'box'; width: number; height: number; depth: number }
  | { type: 'sphere'; radius: number }
  | { type: 'cylinder'; radius: number; height: number }
  | { type: 'plane'; width: number; height: number }
  | { type: 'custom' };

/**
 * Configuration d'un environnement
 */
export interface EnvironmentConfig {
  id: string;
  name: string;
  type: EnvironmentType;
  description: string;
  thumbnail?: string;
  objects: EnvironmentObject[];
  lighting: LightingConfig;
  physics: PhysicsConfig;
  spawnPoint: Position3D;
  bounds?: {
    min: Position3D;
    max: Position3D;
  };
}

/**
 * Configuration de l'éclairage
 */
export interface LightingConfig {
  ambient: {
    color: string;
    intensity: number;
  };
  directional: {
    color: string;
    intensity: number;
    position: Position3D;
    castShadow: boolean;
  }[];
  pointLights?: {
    color: string;
    intensity: number;
    position: Position3D;
    distance: number;
  }[];
}

/**
 * Configuration physique de l'environnement
 */
export interface PhysicsConfig {
  gravity: Position3D;
  timeStep: number;
  substeps: number;
  enabled: boolean;
}

/**
 * Modes de caméra
 */
export const CameraMode = {
  FREE: 'free',
  FOLLOW: 'follow',
  ORBIT: 'orbit',
  FIRST_PERSON: 'first_person',
  TOP_DOWN: 'top_down',
  SIDE: 'side',
  FIXED: 'fixed',
  CINEMATIC: 'cinematic',
} as const;

export type CameraMode = (typeof CameraMode)[keyof typeof CameraMode];

/**
 * Configuration de la caméra
 */
export interface CameraConfig {
  mode: CameraMode;
  position: Position3D;
  target: Position3D;
  fov: number;
  near: number;
  far: number;
  zoom: number;
}

/**
 * Paramètres de suivi du robot
 */
export interface FollowCameraParams {
  distance: number;
  height: number;
  angle: number;
  smoothness: number;
  lookAhead: number;
}

/**
 * État de la caméra
 */
export interface CameraState {
  mode: CameraMode;
  config: CameraConfig;
  isTransitioning: boolean;
  controlsEnabled: boolean;
  target?: string;
}
