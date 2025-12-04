import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';
import Environment from './Environment.tsx';
import Floor from './Floor.tsx';
import Marty from './Marty.tsx';
import Labyrinth from './Labyrinth.tsx';
import SceneDirector from './SceneDirector.ts';

/**
 * World
 * Contains all the 3D objects in the scene
 */
export default class World {
  experience: Experience;
  scene: THREE.Scene;
  resources: Resources;
  floor?: Floor;
  labyrinth?: Labyrinth;
  marty?: Marty;
  environment?: Environment;
  sceneDirector?: SceneDirector;
  pendingScenePresetId: string | null = null;

  constructor() {
    this.experience = (
      window as unknown as { experience: Experience }
    ).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    // Wait for resources to be ready
    this.resources.on('ready', () => {
      // Setup world objects
      this.floor = new Floor();
      // this.labyrinth = new Labyrinth(); // Disabled for now
      this.marty = new Marty();
      this.environment = new Environment();
      this.sceneDirector = new SceneDirector({
        floor: this.floor,
        environment: this.environment,
        marty: this.marty,
      });
      this.sceneDirector.applyScenePreset(this.pendingScenePresetId);
    });
  }

  update() {
    if (this.marty) {
      this.marty.update();
    }
    if (this.labyrinth) {
      this.labyrinth.update();
    }
  }

  dispose() {
    this.floor?.dispose();
    this.labyrinth?.dispose();
    this.marty?.dispose();
    this.environment?.dispose();
  }

  applyScenePreset(presetId?: string | null) {
    this.pendingScenePresetId = presetId ?? null;
    if (this.sceneDirector) {
      this.sceneDirector.applyScenePreset(this.pendingScenePresetId);
    }
  }
}
