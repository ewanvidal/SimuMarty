import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';

/**
 * Labyrinth
 * The maze environment
 */
export default class Labyrinth {
  experience: Experience;
  scene: THREE.Scene;
  resources: Resources;
  model?: THREE.Object3D;

  constructor() {
    this.experience = (
      window as unknown as { experience: Experience }
    ).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    this.setModel();
  }

  private setModel() {
    // Load the labyrinth model
    const gltf = this.resources.items.labyrinthModel;

    if (gltf && 'scene' in gltf && gltf.scene) {
      this.model = gltf.scene;

      // Enable shadows on all meshes
      this.model!.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).castShadow = true;
          (child as THREE.Mesh).receiveShadow = true;
        }
      });

      // Position the model
      this.model!.position.set(0, 0, 0);

      this.scene.add(this.model!);
    } else {
      console.warn('⚠️ Labyrinth model not loaded');
    }
  }

  update() {
    // Labyrinth is static, no update needed
  }

  dispose() {
    if (this.model) {
      this.scene.remove(this.model);
    }
  }
}
