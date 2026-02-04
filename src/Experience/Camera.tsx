import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type Experience from './Experience.tsx';
import type Sizes from './Utils/Sizes.tsx';
import type Debug from './Utils/Debug.tsx';

/**
 * Camera
 * Handles the main perspective camera and controls
 */
export default class Camera {
  experience: Experience;
  sizes: Sizes;
  scene: THREE.Scene;
  canvas: HTMLCanvasElement;
  instance?: THREE.PerspectiveCamera;
  controls?: OrbitControls;
  debug: Debug;
  debugFolder?: ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;
  followTarget = true;

  constructor() {
    this.experience = (
      window as unknown as { experience: Experience }
    ).experience;
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.canvas = this.experience.canvas;
    this.debug = this.experience.debug;

    this.setInstance();
    this.setControls();
    this.setDebug();
  }

  private setInstance() {
    this.instance = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      100,
    );
    this.instance.position.set(0.5, 1, 1);
    this.scene.add(this.instance);
  }

  private setControls() {
    if (!this.instance) return;

    this.controls = new OrbitControls(this.instance, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  private setDebug() {
    if (!this.debug.active || !this.debug.ui) return;
    this.debugFolder = this.debug.ui.addFolder('camera');
    this.debugFolder.add(this, 'followTarget').name('Follow Marty');
  }

  resize() {
    if (!this.instance) return;

    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  /**
   * Set the OrbitControls target (point the camera orbits around)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  setTarget(x: number, y: number, z: number) {
    if (!this.controls) return;
    this.controls.target.set(x, y, z);
    this.controls.update();
  }

  /**
   * Get the current OrbitControls target
   */
  getTarget(): { x: number; y: number; z: number } {
    if (!this.controls) return { x: 0, y: 0, z: 0 };
    return {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z,
    };
  }

  update() {
    // Update OrbitControls target to follow Marty
    if (this.followTarget) {
      const martyPos = this.experience.world?.marty?.model?.position;
      if (martyPos) {
        this.controls?.target.set(martyPos.x, martyPos.y, martyPos.z);
      }
    }
    this.controls?.update();
  }

  dispose() {
    this.controls?.dispose();
  }
}
