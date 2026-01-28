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
  
  // Mouse event handlers for placement mode
  private onMouseMoveBound: ((e: MouseEvent) => void) | null = null;
  private onMouseClickBound: ((e: MouseEvent) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    // Singleton - return existing instance if already created
    if (instance) {
      return instance;
    }

    // Set instance first
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    instance = this;

    // Make experience accessible globally
    (window as unknown as { experience: Experience }).experience = this;

    // Setup
    this.canvas = canvas;
    this.sizes = new Sizes(canvas);
    this.time = new Time();
    this.scene = new THREE.Scene();
    this.debug = new Debug();

    // Debug Time
    if (this.debug.active && this.debug.ui) {
      this.debug.ui
        .add(this.time, 'timeScale')
        .min(0)
        .max(15)
        .step(0.1)
        .name('Time Scale');
    }

    this.resources = new Resources(sources);
    this.camera = new Camera();
    this.renderer = new Renderer();
    this.world = new World();

    // Resize event
    this.sizes.on('resize', () => {
      this.resize();
    });

    // Time tick event
    this.time.on('tick', () => {
      this.update();
    });
    
    // Setup mouse events for placement mode
    this.setupPlacementModeEvents();
  }
  
  private setupPlacementModeEvents(): void {
    this.onMouseMoveBound = (e: MouseEvent) => this.onMouseMove(e);
    this.onMouseClickBound = (e: MouseEvent) => this.onMouseClick(e);
    
    this.canvas.addEventListener('mousemove', this.onMouseMoveBound);
    this.canvas.addEventListener('click', this.onMouseClickBound);
  }
  
  private getNormalizedMouse(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }
  
  private onMouseMove(e: MouseEvent): void {
    const lb = this.world?.levelBuilder;
    if (!lb || (!lb.isPlacementModeEnabled() && !lb.isEraserModeEnabled())) return;
    if (!this.camera.instance) return;
    
    const normalizedMouse = this.getNormalizedMouse(e);
    lb.updatePlacementHover(normalizedMouse, this.camera.instance);
  }
  
  private onMouseClick(e: MouseEvent): void {
    const lb = this.world?.levelBuilder;
    if (!lb || (!lb.isPlacementModeEnabled() && !lb.isEraserModeEnabled())) return;
    
    // Only handle left click
    if (e.button !== 0) return;
    
    // Prevent click if it's on a UI element
    const target = e.target as HTMLElement;
    if (target !== this.canvas) return;
    
    lb.placeTileAtHover();
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

  loadScenePreset(presetId: string | null) {
    if (!this.world) return;
    this.world.applyScenePreset(presetId);
  }

  /**
   * Load tutorial-specific objects (goal tiles, markers) for a lesson
   * @param lessonId - The lesson ID to load, or null to clear
   */
  loadTutorialLesson(lessonId: string | null) {
    if (!this.world) return;
    this.world.loadTutorialLesson(lessonId);
  }

  /**
   * Load a specific level for an environment
   * @param environmentId - The environment ID
   * @param levelId - The level ID
   */
  loadLevel(environmentId: string, levelId: string) {
    if (!this.world) return;
    this.world.loadLevel(environmentId, levelId);
  }

  dispose() {
    // Remove mouse event listeners
    if (this.onMouseMoveBound) {
      this.canvas.removeEventListener('mousemove', this.onMouseMoveBound);
    }
    if (this.onMouseClickBound) {
      this.canvas.removeEventListener('click', this.onMouseClickBound);
    }
    
    this.sizes.dispose();
    this.time.dispose();
    this.resources.dispose();
    this.camera.dispose();
    this.renderer.dispose();
    this.world.dispose();
    this.debug.dispose();

    // Clean up global reference
    delete (window as unknown as { experience?: Experience }).experience;

    // Clear singleton
    instance = null;
  }
}
