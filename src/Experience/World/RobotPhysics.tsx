/**
 * RobotPhysics.tsx
 * Simple physics for Marty robot using Cannon.js
 * 
 * The body is always DYNAMIC - gravity and collisions are handled by physics.
 * Each frame: physics steps, then we sync Three.js model to physics body.
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  ROBOT_PARTS,
  ROBOT_SCALE,
  type PhysicsPartConfig,
} from '../config/robotPhysics.ts';
import type Physics from './Physics.tsx';
import type { BoneNode } from './marty/model.ts';
import type Experience from '../Experience.tsx';
import type Debug from '../Utils/Debug.tsx';

interface PhysicsPart {
  name: string;
  config: PhysicsPartConfig;
  bone: THREE.Bone;
  debugMesh: THREE.Mesh;
  shape: CANNON.Box;
  worldPos: THREE.Vector3;
  worldQuat: THREE.Quaternion;
  localOffset: THREE.Vector3;
  configQuat: THREE.Quaternion;
  boneLength: number;
}

export default class RobotPhysics {
  experience: Experience;
  physics: Physics;
  model: THREE.Group;
  scene: THREE.Scene;
  boneNodes: BoneNode[];
  debug: Debug;
  debugFolder?: ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;

  parts: Map<string, PhysicsPart> = new Map();
  body?: CANNON.Body;
  robotMaterial?: CANNON.Material;
  showDebugMeshes: boolean = true;
  isJumping: boolean = false;
  private readonly bodyOffset: number = 0.08;

  constructor(
    physics: Physics,
    model: THREE.Group,
    boneNodes: BoneNode[],
  ) {
    this.experience = (window as unknown as { experience: Experience }).experience;
    this.physics = physics;
    this.model = model;
    this.scene = this.experience.scene;
    this.boneNodes = boneNodes;
    this.debug = this.experience.debug;

    this.createPhysicsParts();
    this.createBody();
    this.setupDebug();
  }

  private setupDebug(): void {
    if (!this.debug.active || !this.debug.ui) return;

    this.debugFolder = this.debug.ui.addFolder('robotPhysics');
    this.debugFolder.close();

    const controls = {
      showBoundingBoxes: this.showDebugMeshes,
      jumpForce: 5.0,
      jump: () => this.jump(controls.jumpForce),
    };

    this.debugFolder
      .add(controls, 'showBoundingBoxes')
      .name('Show BBs')
      .onChange((value: boolean) => {
        this.showDebugMeshes = value;
        for (const part of this.parts.values()) {
          part.debugMesh.visible = value;
        }
      });

    this.debugFolder.add(controls, 'jumpForce', 1, 15, 0.5).name('Jump Force');
    this.debugFolder.add(controls, 'jump').name('🦘 Jump!');
  }

  /**
   * Jump - apply upward velocity
   */
  jump(force: number = 5): void {
    if (!this.body) return;
    if (Math.abs(this.body.velocity.y) > 0.1) return;
    this.body.velocity.y = force;
    this.isJumping = true;
  }

  private getBoneLength(bone: THREE.Bone): number {
    for (const child of bone.children) {
      if (child instanceof THREE.Bone) {
        return child.position.length();
      }
    }
    return 0.5;
  }

  private createPhysicsParts(): void {
    this.robotMaterial = this.physics.createMaterial('robot');

    const boneMap = new Map<string, THREE.Bone>();
    for (const node of this.boneNodes) {
      boneMap.set(node.name, node.object);
    }

    for (const [partName, config] of Object.entries(ROBOT_PARTS)) {
      const bone = boneMap.get(config.boneName);
      if (!bone) continue;

      // Debug mesh
      const geometry = new THREE.BoxGeometry(
        config.dimensions[0] * ROBOT_SCALE,
        config.dimensions[1] * ROBOT_SCALE,
        config.dimensions[2] * ROBOT_SCALE,
      );
      const material = new THREE.MeshBasicMaterial({
        color: config.debugColor,
        wireframe: true,
        transparent: true,
        opacity: 0.8,
      });
      const debugMesh = new THREE.Mesh(geometry, material);
      debugMesh.name = `bb_${partName}`;
      this.scene.add(debugMesh);

      // Cannon shape
      const halfExtents = new CANNON.Vec3(
        (config.dimensions[0] * ROBOT_SCALE) / 2,
        (config.dimensions[1] * ROBOT_SCALE) / 2,
        (config.dimensions[2] * ROBOT_SCALE) / 2,
      );
      const shape = new CANNON.Box(halfExtents);

      const boneLength = this.getBoneLength(bone);
      const configQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(config.localRotation[0], config.localRotation[1], config.localRotation[2])
      );

      this.parts.set(partName, {
        name: partName,
        config,
        bone,
        debugMesh,
        shape,
        worldPos: new THREE.Vector3(),
        worldQuat: new THREE.Quaternion(),
        localOffset: new THREE.Vector3(),
        configQuat,
        boneLength,
      });
    }
  }

  private createBody(): void {
    // Calculate total mass
    let totalMass = 0;
    for (const part of this.parts.values()) {
      totalMass += part.config.mass;
    }

    // Create a simple box body for the whole robot
    // Use approximate dimensions that encompass the robot
    const bodySize = new CANNON.Vec3(0.05, this.bodyOffset, 0.05); // Half-extents
    const bodyShape = new CANNON.Box(bodySize);

    this.body = new CANNON.Body({
      mass: totalMass,
      material: this.robotMaterial,
      linearDamping: 0.1,
      angularDamping: 0.99, // High angular damping to prevent rotation
      fixedRotation: true, // Don't rotate from physics
    });

    this.body.addShape(bodyShape);

    // Position at model's current position (body center is offset above model origin)
    this.body.position.set(
      this.model.position.x,
      this.model.position.y + this.bodyOffset,
      this.model.position.z,
    );

    this.physics.addBody(this.body);

    // Create contact material with ground
    if (this.physics.groundBody?.material && this.robotMaterial) {
      this.physics.createContactMaterial(
        this.physics.groundBody.material,
        this.robotMaterial,
        0.5,
        0.0,
      );
    }
  }

  /**
   * Update - called each frame AFTER physics.update()
   * Syncs the Three.js model position to match the physics body
   */
  update(): void {
    if (!this.body) return;

    // Sync Three.js model position FROM physics body
    this.model.position.x = this.body.position.x;
    this.model.position.y = this.body.position.y - this.bodyOffset;
    this.model.position.z = this.body.position.z;

    // Update debug meshes to follow bones
    this.updateDebugMeshes();
  }

  /**
   * Update debug meshes to follow bones
   */
  updateDebugMeshes(): void {
    // Update world matrices for bone positions
    this.model.updateMatrixWorld(true);
    
    for (const part of this.parts.values()) {
      part.bone.getWorldPosition(part.worldPos);
      part.bone.getWorldQuaternion(part.worldQuat);

      part.localOffset.set(
        part.config.localPosition[0] * ROBOT_SCALE,
        (part.config.localPosition[1] + part.boneLength / 2) * ROBOT_SCALE,
        part.config.localPosition[2] * ROBOT_SCALE,
      );
      part.localOffset.applyQuaternion(part.worldQuat);

      part.debugMesh.position.copy(part.worldPos).add(part.localOffset);
      part.debugMesh.quaternion.copy(part.worldQuat).multiply(part.configQuat);
    }
  }

  getBody(): CANNON.Body | undefined {
    return this.body;
  }

  dispose(): void {
    for (const part of this.parts.values()) {
      this.scene.remove(part.debugMesh);
      part.debugMesh.geometry.dispose();
      if (Array.isArray(part.debugMesh.material)) {
        part.debugMesh.material.forEach((m) => m.dispose());
      } else {
        part.debugMesh.material.dispose();
      }
    }
    this.parts.clear();

    if (this.body) {
      this.physics.removeBody(this.body);
      this.body = undefined;
    }

    if (this.debugFolder) {
      this.debugFolder.destroy();
    }
  }
}
