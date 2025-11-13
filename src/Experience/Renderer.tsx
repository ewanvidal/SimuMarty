import * as THREE from 'three';
import type Experience from './Experience.tsx';

/**
 * Renderer
 * Handles WebGL rendering
 */
export default class Renderer {
  experience: Experience;
  canvas: HTMLCanvasElement;
  sizes: any;
  scene: THREE.Scene;
  camera: any;
  instance?: THREE.WebGLRenderer;

  constructor() {
    this.experience = (window as any).experience;
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
