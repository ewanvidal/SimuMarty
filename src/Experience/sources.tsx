/**
 * Sources
 * Define all assets to be loaded
 */

export interface Source {
  name: string;
  type: 'gltfModel' | 'texture' | 'cubeTexture';
  path: string | string[];
}

export const sources: Source[] = [
  // Marty 3D model
  {
    name: 'martyModel',
    type: 'gltfModel',
    path: '/blender/models/marty.glb',
  },
  // Labyrinth environment (disabled for now)
  // {
  //   name: 'labyrinthModel',
  //   type: 'gltfModel',
  //   path: '/blender/environments/labyrinth.glb'
  // },
  // Floor textures
  {
    name: 'floorDiffuseTexture',
    type: 'texture',
    path: '/textures/floor/granite_tile_diff_1k.jpg',
  },
  {
    name: 'floorNormalTexture',
    type: 'texture',
    path: '/textures/floor/granite_tile_nor_gl_1k.jpg',
  },
  {
    name: 'floorArmTexture',
    type: 'texture',
    path: '/textures/floor/granite_tile_arm_1k.jpg',
  },
  {
    name: 'floorAlphaTexture',
    type: 'texture',
    path: '/textures/floor/Frame 10.jpg',
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
