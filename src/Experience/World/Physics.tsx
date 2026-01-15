/**
 * Physics.tsx
 * Cannon.js physics world wrapper for Three.js integration
 */

import * as CANNON from 'cannon-es';
import { PHYSICS_CONFIG } from '../config/robotPhysics.ts';
import type Experience from '../Experience.tsx';
import type Debug from '../Utils/Debug.tsx';

/**
 * Physics world wrapper class
 * Manages Cannon.js physics simulation and Three.js synchronization
 */
export default class Physics {
  experience: Experience;
  debug: Debug;
  debugFolder?: ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;
  world: CANNON.World;
  groundBody?: CANNON.Body;

  constructor() {
    this.experience = (window as unknown as { experience: Experience }).experience;
    this.debug = this.experience.debug;

    // Create physics world
    this.world = new CANNON.World();
    this.world.gravity.set(0, PHYSICS_CONFIG.gravity, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    // Disable sleep for more responsive physics during jumps
    this.world.allowSleep = false;

    // Set solver iterations for stability
    (this.world.solver as CANNON.GSSolver).iterations = 10;

    // Create ground plane
    this.createGround();

    // Setup debug controls
    this.setupDebug();
  }

  /**
   * Create the ground plane physics body
   */
  private createGround(): void {
    const groundShape = new CANNON.Plane();
    const groundMaterial = new CANNON.Material('ground');
    groundMaterial.friction = PHYSICS_CONFIG.groundFriction;
    groundMaterial.restitution = PHYSICS_CONFIG.groundRestitution;

    this.groundBody = new CANNON.Body({
      mass: 0, // Static body
      shape: groundShape,
      material: groundMaterial,
    });

    // Rotate plane to be horizontal (pointing up)
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(this.groundBody);
  }

  /**
   * Setup debug controls
   */
  private setupDebug(): void {
    if (!this.debug.active || !this.debug.ui) return;

    this.debugFolder = this.debug.ui.addFolder('physics');
    this.debugFolder.close();

    const debugControls = {
      gravity: PHYSICS_CONFIG.gravity,
    };

    this.debugFolder
      .add(debugControls, 'gravity', -20, 0, 0.1)
      .name('Gravity')
      .onChange((value: number) => {
        this.world.gravity.set(0, value, 0);
      });
  }

  /**
   * Create a physics material with custom properties
   */
  createMaterial(name: string, friction?: number, restitution?: number): CANNON.Material {
    const material = new CANNON.Material(name);
    material.friction = friction ?? PHYSICS_CONFIG.robotFriction;
    material.restitution = restitution ?? PHYSICS_CONFIG.robotRestitution;
    return material;
  }

  /**
   * Add a body to the physics world
   */
  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
  }

  /**
   * Remove a body from the physics world
   */
  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }

  /**
   * Create a contact material for interactions between two materials
   */
  createContactMaterial(
    material1: CANNON.Material,
    material2: CANNON.Material,
    friction?: number,
    restitution?: number,
  ): CANNON.ContactMaterial {
    const contactMaterial = new CANNON.ContactMaterial(material1, material2, {
      friction: friction ?? 0.5,
      restitution: restitution ?? 0.1,
    });
    this.world.addContactMaterial(contactMaterial);
    return contactMaterial;
  }

  /**
   * Step the physics simulation
   */
  update(): void {
    this.world.step(1 / 60);
  }

  /**
   * Dispose of all physics resources
   */
  dispose(): void {
    while (this.world.bodies.length > 0) {
      this.world.removeBody(this.world.bodies[0]);
    }
  }
}
