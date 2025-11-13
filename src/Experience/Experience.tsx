import * as THREE from 'three';
import Sizes from './Utils/Sizes.tsx';
import Time from './Utils/Time.tsx';
import Camera from './Camera.tsx';
import Renderer from './Renderer.tsx';
import World from './World/World.tsx';
import Resources from './Utils/Resources.tsx';
import Debug from './Utils/Debug.tsx';
import { sources } from './sources.tsx';

/**
 * Experience
 * Main class that orchestrates the entire 3D experience
 */
let instance: Experience | null = null;

export default class Experience {
  canvas!: HTMLCanvasElement;
  debug!: Debug;
  sizes!: Sizes;
  time!: Time;
  scene!: THREE.Scene;
  resources!: Resources;
  camera!: Camera;
  renderer!: Renderer;
  world!: World;

  constructor(canvas: HTMLCanvasElement) {
    // Singleton - return existing instance if already created
    if (instance) {
      console.log('⚠️ Experience singleton already exists, returning existing instance');
      return instance;
    }

    console.log('🎬 Experience constructor — canvas:', canvas);

    // Set instance first
    instance = this;

    // Make experience accessible globally
    (window as any).experience = this;

    // Setup
    this.canvas = canvas;
    console.log('📐 Creating Sizes...');
    this.sizes = new Sizes(canvas);
    console.log('⏰ Creating Time...');
    this.time = new Time();
    console.log('🎨 Creating Scene...');
    this.scene = new THREE.Scene();
    console.log('🐛 Creating Debug...');
    this.debug = new Debug();
    console.log('📦 Creating Resources...');
    this.resources = new Resources(sources);
    console.log('📷 Creating Camera...');
    this.camera = new Camera();
    console.log('🖼️ Creating Renderer...');
    this.renderer = new Renderer();
    console.log('🌍 Creating World...');
    this.world = new World();

    // Resize event
    this.sizes.on('resize', () => {
      this.resize();
    });

    // Time tick event
    this.time.on('tick', () => {
      this.update();
    });
    
    console.log('✅ Experience initialized successfully!');
  }

  private resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  private update() {
    this.camera.update();
    this.world.update();
    this.renderer.update();
  }

  dispose() {
    this.sizes.dispose();
    this.time.dispose();
    this.resources.dispose();
    this.camera.dispose();
    this.renderer.dispose();
    this.world.dispose();
    this.debug.dispose();

    // Clean up global reference
    delete (window as any).experience;

    // Clear singleton
    instance = null;
  }
}
