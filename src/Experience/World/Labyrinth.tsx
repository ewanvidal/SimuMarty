import * as THREE from 'three';
import type Experience from '../Experience.tsx';

/**
 * Labyrinth
 * The maze environment
 */
export default class Labyrinth {
  experience: Experience;
  scene: THREE.Scene;
  resources: any;
  model?: THREE.Object3D;

  constructor() {
    this.experience = (window as any).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    console.log('🧱 Labyrinth constructor');

    this.setModel();
    
    console.log('🧱 Labyrinth created - model added to scene');
  }

  private setModel() {
    // Load the labyrinth model
    const gltf = this.resources.items.labyrinthModel;
    
    if (gltf && gltf.scene) {
      console.log('🧱 Loading Labyrinth GLTF model:', gltf);
      this.model = gltf.scene;
      
      // Enable shadows on all meshes
      this.model!.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Position the model
      this.model!.position.set(0, 0, 0);
      
      this.scene.add(this.model!);
      console.log('🧱 Labyrinth model added to scene');
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
