import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';
import Environment from './Environment.tsx';
import Floor from './Floor.tsx';
import Marty from './Marty.tsx';
import Labyrinth from './Labyrinth.tsx';

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
}
