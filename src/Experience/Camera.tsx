import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type Experience from './Experience.tsx';

/**
 * Camera
 * Handles the main perspective camera and controls
 */
export default class Camera {
  experience: Experience;
  sizes: any;
  scene: THREE.Scene;
  canvas: HTMLCanvasElement;
  instance?: THREE.PerspectiveCamera;
  controls?: OrbitControls;

  constructor() {
    this.experience = (window as any).experience;
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.canvas = this.experience.canvas;

    this.setInstance();
    this.setControls();
  }

  private setInstance() {
    this.instance = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );
    this.instance.position.set(6, 4, 8);
    this.scene.add(this.instance);
    
    console.log('📷 Camera initialized - position:', this.instance.position, 'aspect:', this.sizes.width / this.sizes.height);
  }

  private setControls() {
    if (!this.instance) return;

    this.controls = new OrbitControls(this.instance, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  resize() {
    if (!this.instance) return;

    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    this.controls?.update();
  }

  dispose() {
    this.controls?.dispose();
  }
}
