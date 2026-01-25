export type Vec3Tuple = [number, number, number];

export interface LightingPreset {
  sunLight?: {
    intensity?: number;
    color?: string;
    position?: Vec3Tuple;
  };
  ambientLight?: {
    intensity?: number;
    color?: string;
  };
}

export interface FloorPreset {
  size?: number;
  color?: string;
  textureRepeat?: number;
}

export interface MartyPreset {
  position?: Vec3Tuple;
  rotationY?: number; // degrees
}

export interface ScenePreset {
  id: string;
  label: string;
  description?: string;
  tags?: string[];
  lighting?: LightingPreset;
  floor?: FloorPreset;
  marty?: MartyPreset;
}

export const DEFAULT_SCENE_PRESET_ID = 'tutorial-grid-basic';

export const SCENE_PRESETS: Record<string, ScenePreset> = {
  'labyrinth-default': {
    id: 'labyrinth-default',
    label: 'Labyrinth Default',
    description: 'Neutral lighting with tight floor footprint for maze scenarios.',
    tags: ['labyrinth', 'default'],
    lighting: {
      sunLight: { intensity: 3.5, position: [3.5, 2, -1.25] },
      ambientLight: { intensity: 1.5 },
    },
    floor: {
      size: 40,
      color: '#b8b8b8',
      textureRepeat: 80,
    },
    marty: {
      position: [0, 0, 0],
      rotationY: 0,
    },
  },
  'playground-wide': {
    id: 'playground-wide',
    label: 'Playground Wide',
    description: 'Softer light with a wide floor for free exploration.',
    tags: ['playground'],
    lighting: {
      sunLight: { intensity: 2.8, color: '#fff0d2', position: [2.5, 3.2, -3] },
      ambientLight: { intensity: 1.8, color: '#ffe9c3' },
    },
    floor: {
      size: 40,
      color: '#f4f1e8',
      textureRepeat: 80,
    },
    marty: {
      position: [0, 0, 0],
      rotationY: 0,
    },
  },
  'classroom-focused': {
    id: 'classroom-focused',
    label: 'Classroom Focused',
    description: 'Cooler light and smaller floor for classroom demonstrations.',
    tags: ['classroom'],
    lighting: {
      sunLight: { intensity: 2.2, color: '#f2f6ff', position: [1.4, 2.4, -1.4] },
      ambientLight: { intensity: 1.2, color: '#dfe8ff' },
    },
    floor: {
      size: 40,
      color: '#d8e2fc',
      textureRepeat: 80,
    },
    marty: {
      position: [0, 0, 0],
      rotationY: 0,
    },
  },
  'outdoor-sunny': {
    id: 'outdoor-sunny',
    label: 'Outdoor Sunny',
    description: 'High-energy sunlight and massive floor for long walks.',
    tags: ['outdoor'],
    lighting: {
      sunLight: { intensity: 4.2, color: '#fff7d9', position: [4.5, 3.5, -2.5] },
      ambientLight: { intensity: 2, color: '#fff5d2' },
    },
    floor: {
      size: 40,
      color: '#eae2cf',
      textureRepeat: 80,
    },
    marty: {
      position: [0, 0, 0],
      rotationY: 0,
    },
  },
  'tutorial-grid-basic': {
    id: 'tutorial-grid-basic',
    label: 'Tutorial Grid: Basics',
    description: 'Bright teaching stage with a centered grid and calm lighting.',
    tags: ['tutorial', 'basics'],
    lighting: {
      sunLight: { intensity: 3.1, color: '#ffffff', position: [2.2, 2.6, -1.2] },
      ambientLight: { intensity: 1.6, color: '#ffffff' },
    },
    floor: {
      size: 40,
      color: '#f5f7fb',
      textureRepeat: 80,
    },
    marty: {
      position: [0, 0, 0],
      rotationY: 0,
    },
  },
  'tutorial-obstacle-course': {
    id: 'tutorial-obstacle-course',
    label: 'Tutorial Grid: Obstacles',
    description: 'Directional light and long floor to highlight obstacle runs.',
    tags: ['tutorial', 'advanced'],
    lighting: {
      sunLight: { intensity: 3.1, color: '#ffffff', position: [2.2, 2.6, -1.2] },
      ambientLight: { intensity: 1.6, color: '#ffffff' },
    },
    floor: {
      size: 40,
      color: '#f5f7fb',
      textureRepeat: 80,
    },
    marty: {
      position: [0, 0, 0],
      rotationY: 0,
    },
  },
};
