/**
 * Sources
 * Define all assets to be loaded
 */

export interface Source {
  name: string;
  type: 'gltfModel' | 'texture' | 'cubeTexture';
  path: string | string[];
}

// Use dynamic base URL for Electron compatibility
const base = import.meta.env.BASE_URL;

export const sources: Source[] = [
  // Marty 3D model
  {
    name: 'martyModel',
    type: 'gltfModel',
    path: `${base}models/marty.glb`,
  },
  // Floor textures
  {
    name: 'floorDiffuseTexture',
    type: 'texture',
    path: `${base}textures/floor/granite_tile_diff_1k.jpg`,
  },
  {
    name: 'floorNormalTexture',
    type: 'texture',
    path: `${base}textures/floor/granite_tile_nor_gl_1k.jpg`,
  },
  {
    name: 'floorArmTexture',
    type: 'texture',
    path: `${base}textures/floor/granite_tile_arm_1k.jpg`,
  },
  {
    name: 'floorAlphaTexture',
    type: 'texture',
    path: `${base}textures/floor/Frame 10.jpg`,
  },
  // Example cube texture for environment
  // {
  //   name: 'environmentMapTexture',
  //   type: 'cubeTexture',
  //   path: [
  //     '/textures/environmentMap/px.jpg',
  //     '/textures/environmentMap/nx.jpg',
  //     '/textures/environmentMap/py.jpg',
  //     '/textures/environmentMap/ny.jpg',
  //     '/textures/environmentMap/pz.jpg',
  //     '/textures/environmentMap/nz.jpg'
  //   ]
  // }
];
