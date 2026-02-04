/**
 * Robot Physics Configuration
 * Defines dimensions and bone mappings for physics bounding boxes
 *
 * All dimensions are in BLENDER UNITS (unscaled).
 * When attached as children of bones, they automatically inherit the model's 0.05 scale.
 */

export const ROBOT_SCALE = 0.05;

/**
 * Physics part configuration
 */
export interface PhysicsPartConfig {
  /** Dimensions in Blender units (x, y, z) */
  dimensions: [number, number, number];
  /** Local position offset relative to bone (in Blender units) */
  localPosition: [number, number, number];
  /** Local rotation offset in radians (x, y, z) */
  localRotation: [number, number, number];
  /** Name of the bone this part attaches to */
  boneName: string;
  /** Mass of this part in kg (for physics simulation) */
  mass: number;
  /** Debug color for visualization */
  debugColor: number;
}

/**
 * Robot parts physics configuration
 * Each key maps to a specific body part with its physics properties
 *
 * Dimensions from Blender (X, Y, Z):
 * - Feet: 0.821 x 1.24 x 0.175
 * - Tibias: 0.484 x 0.718 x 0.774
 * - Knees: 0.711 x 0.711 x 0.788
 * - Upper legs: 0.718 x 0.718 x 0.852
 * - Upper torso connector: 0.711 x 0.711 x 0.437
 * - Torso: 1.82 x 1.24 x 1.21
 * - Arm torso connector: 0.73 x 0.789 x 0.492
 * - Arms: 0.273 x 0.291 x 1.23
 *
 * NOTE: BBs are now AUTO-CENTERED at half the bone length.
 * localPosition is an ADDITIONAL offset from the auto-centered position.
 * Set to [0,0,0] for automatic centering, or add offsets as needed.
 *
 * Dimensions are [X, Y, Z] in THREE.js world space:
 * - X = left/right (width)
 * - Y = up/down (height)
 * - Z = front/back (depth)
 *
 * For parts marked as "keepHorizontal" (feet, torso), the BB will stay
 * axis-aligned in world space instead of rotating with the bone.
 */
export const ROBOT_PARTS: Record<string, PhysicsPartConfig> = {
  // === TORSO ===
  torso: {
    dimensions: [1.82, 1.21, 1.24], // width, height, depth
    localPosition: [0, 0.6, 0], // Move UP (negative Y in bone space = up in world for Body)
    localRotation: [0, 0, 0],
    boneName: 'Body',
    mass: 2.0,
    debugColor: 0x4444ff, // Blue
  },

  // Upper torso connector (where arms/head attach) - REMOVED, use torso only
  // upper_torso_connector: removed to simplify

  // === LEFT LEG ===
  upper_leg_left: {
    dimensions: [0.718, 0.852, 0.718], // width, height (vertical), depth
    localPosition: [0, 0, 0], // Auto-centered on LegL bone
    localRotation: [0, 0, 0],
    boneName: 'LegL',
    mass: 0.4,
    debugColor: 0xff4444, // Red
  },

  knee_left: {
    dimensions: [0.711, 0.788, 0.711], // roughly cubic
    localPosition: [0, 0, 0], // Auto-centered on LegL001 bone
    localRotation: [0, 0, 0],
    boneName: 'LegL001',
    mass: 0.2,
    debugColor: 0xff6666,
  },

  tibia_left: {
    dimensions: [0.484, 0.774, 0.718], // width, height (vertical), depth
    localPosition: [0, -0.1, 0], // Auto-centered on LegL002 bone
    localRotation: [0, 0, 0],
    boneName: 'LegL002',
    mass: 0.3,
    debugColor: 0xff8888,
  },

  foot_left: {
    dimensions: [0.821, 0.175, 1.24], // width, height (thin), depth (long forward)
    localPosition: [0, -0.25, 0.0], // Move down along bone (+Y) and forward (Z)
    localRotation: [1.5708, 0, 1.5708], // Kept horizontal by RobotPhysics (90 degrees in radians)
    boneName: 'LegL003',
    mass: 0.2,
    debugColor: 0xffaaaa,
  },

  // === RIGHT LEG ===
  upper_leg_right: {
    dimensions: [0.718, 0.852, 0.718], // width, height (vertical), depth
    localPosition: [0, 0, 0], // Auto-centered on LegR bone
    localRotation: [0, 0, 0],
    boneName: 'LegR',
    mass: 0.4,
    debugColor: 0x44ff44, // Green
  },

  knee_right: {
    dimensions: [0.711, 0.788, 0.711], // roughly cubic
    localPosition: [0, 0, 0], // Auto-centered on LegR001 bone
    localRotation: [0, 0, 0],
    boneName: 'LegR001',
    mass: 0.2,
    debugColor: 0x66ff66,
  },

  tibia_right: {
    dimensions: [0.484, 0.774, 0.718], // width, height (vertical), depth
    localPosition: [0, -0.1, 0], // Auto-centered on LegR002 bone
    localRotation: [0, 0, 0],
    boneName: 'LegR002',
    mass: 0.3,
    debugColor: 0x88ff88,
  },

  foot_right: {
    dimensions: [0.821, 0.175, 1.24], // width, height (thin), depth (long forward)
    localPosition: [0, -0.25, 0.0], // Move down along bone (+Y) and forward (Z)
    localRotation: [1.5708, 0, 1.5708], // Kept horizontal by RobotPhysics
    boneName: 'LegR003',
    mass: 0.2,
    debugColor: 0xaaffaa,
  },

  // === LEFT ARM (hanging down alongside body) ===
  arm_left: {
    dimensions: [0.273, 1.23, 0.291], // thin X, long Y (vertical), thin Z
    localPosition: [0, 0.325, 0], // Auto-centered on ArmL bone
    localRotation: [0, 0, 0],
    boneName: 'ArmL',
    mass: 0.3,
    debugColor: 0xffff44, // Yellow
  },

  // === RIGHT ARM (hanging down alongside body) ===
  arm_right: {
    dimensions: [0.273, 1.23, 0.291], // thin X, long Y (vertical), thin Z
    localPosition: [0, 0.325, 0], // Auto-centered on ArmR bone
    localRotation: [0, 0, 0],
    boneName: 'ArmR',
    mass: 0.3,
    debugColor: 0xff44ff, // Magenta
  },
};

/**
 * Get total mass of the robot
 */
export function getTotalMass(): number {
  return Object.values(ROBOT_PARTS).reduce((sum, part) => sum + part.mass, 0);
}

/**
 * Physics world configuration
 */
export const PHYSICS_CONFIG = {
  gravity: -9.82,
  timestep: 1 / 60,
  maxSubSteps: 3,
  groundFriction: 0.8,
  groundRestitution: 0.1,
  robotFriction: 0.6,
  robotRestitution: 0.2,
};

/**
 * Get parts grouped by bone name
 */
export function getPartsByBone(): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const [partName, config] of Object.entries(ROBOT_PARTS)) {
    const existing = map.get(config.boneName) ?? [];
    existing.push(partName);
    map.set(config.boneName, existing);
  }

  return map;
}
