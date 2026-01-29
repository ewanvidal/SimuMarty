import * as THREE from 'three';
import type Experience from './Experience.tsx';
import type Sizes from './Utils/Sizes.tsx';
import type Camera from './Camera.tsx';

/**
 * Renderer
 * Handles WebGL rendering
 */
export default class Renderer {
  experience: Experience;
  canvas: HTMLCanvasElement;
  sizes: Sizes;
  scene: THREE.Scene;
  camera: Camera;
  instance?: THREE.WebGLRenderer;

  constructor() {
    this.experience = (
      window as unknown as { experience: Experience }
    ).experience;
    this.canvas = this.experience.canvas;
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.camera = this.experience.camera;

    this.setInstance();
  }

  private setInstance() {
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
    this.instance.setClearColor('#211d20');
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setShadows(enabled: boolean) {
    if (this.instance) {
      this.instance.shadowMap.enabled = enabled;
      this.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => (m.needsUpdate = true));
          } else {
            child.material.needsUpdate = true;
          }
        }
      });
    }
  }

  resize() {
    if (!this.instance) return;

    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
  }

  update() {
    if (!this.instance || !this.camera.instance) return;

    this.instance.render(this.scene, this.camera.instance);
  }

  dispose() {
    this.instance?.dispose();
  }
}
