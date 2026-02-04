import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';
import type Time from '../Utils/Time.tsx';
import type Debug from '../Utils/Debug.tsx';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  webSocketService,
  type RobotCommand,
} from '../../services/WebSocketService.ts';
import { MartyController } from './MartyController.ts';
import { setupMartyModel, type BoneNode } from './marty/model.ts';
import {
  createJointController,
  type JointController,
  type SetJointAngleOptions,
} from './marty/jointControl.ts';
import {
  createAnimationState,
  createMovementState,
  createSlideState,
  createTurnState,
  getAnimationDuration as getAnimationDurationHelper,
  setupAnimationSystem,
  syncMovementDurations as syncMovementDurationsHelper,
  updateAnimationSystem,
  type AnimationName,
  type AnimationState,
  type MovementState,
  type SlideState,
  type TurnState,
} from './marty/animationSystem.ts';
import {
  createProceduralTurnController,
  type ProceduralTurnController,
} from './marty/proceduralTurn.ts';
import {
  GroundColorSensor,
  ObstacleSensor,
  FootLight,
} from './sensors/index.tsx';
import Physics from './Physics.tsx';
import RobotPhysics from './RobotPhysics.tsx';

/**
 * Predefined velocities for animations used during falls
 */
const FALL_SPEEDS = {
  forward: 0.4,
  backward: -0.2,
};

/**
 * Marty
 * The robot character with animations and movement
 */
export default class Marty {
  experience: Experience;
  scene: THREE.Scene;
  resources: Resources;
  time: Time;
  debug: Debug;
  debugFolder?: ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;
  resource!: GLTF;
  model?: THREE.Group;
  controller?: MartyController;
  boneNodes: BoneNode[] = [];
  boneDebugFolder?: ReturnType<
    typeof import('lil-gui').GUI.prototype.addFolder
  >;
  boneInitialRotations: Map<string, THREE.Euler> = new Map();
  jointController: JointController;
  proceduralTurnController: ProceduralTurnController;
  wsUnsubscribe?: () => void;
  movement: MovementState;
  turn: TurnState;
  slide: SlideState;
  animation: AnimationState;
  sensors: {
    groundColorSensor?: GroundColorSensor;
    obstacleSensor?: ObstacleSensor;
    footLight?: FootLight;
  };
  initialTransform = {
    position: new THREE.Vector3(0, 0, 0),
    rotationY: 0,
  };
  physics?: Physics;
  robotPhysics?: RobotPhysics;
  isFalling: boolean = false;

  constructor() {
    this.experience = (
      window as unknown as { experience: Experience }
    ).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.debug = this.experience.debug;

    // Debug
    if (this.debug.active && this.debug.ui) {
      this.debugFolder = this.debug.ui.addFolder('marty');
    }

    // Setup
    this.resource = this.resources.items.martyModel as GLTF;

    // Initialize movement, animation, and joint systems
    this.movement = createMovementState();
    this.turn = createTurnState();
    this.slide = createSlideState();
    this.animation = createAnimationState();
    this.sensors = {};

    this.jointController = createJointController({
      getBoneNodes: () => this.boneNodes,
      getInitialRotation: (boneName) => this.boneInitialRotations.get(boneName),
    });

    this.proceduralTurnController = createProceduralTurnController({
      getBoneNodes: () => this.boneNodes,
      getInitialRotation: (boneName) => this.boneInitialRotations.get(boneName),
      getModel: () => this.model,
    });

    this.setModel();
    this.setMovement();
    this.setAnimation();
    this.setupSensors();
    this.setupPhysics();
    this.setupWebSocket();
  }

  /**
   * Enable or disable shadow casting for Marty's model
   */
  setCastShadow(enabled: boolean): void {
    if (!this.model) return;
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = enabled;
      }
    });
  }

  /**
   * Setup WebSocket connection to receive commands
   */
  private setupWebSocket() {
    // Create controller
    this.controller = new MartyController(this);

    // Subscribe to command events
    this.wsUnsubscribe = webSocketService.on('command', async (data) => {
      // If the data contains a command, enqueue it
      const commandData = data as RobotCommand;
      if (commandData.action) {
        this.controller!.enqueueCommand(commandData);
      }
    });
  }

  private setModel() {
    const { model, boneNodes, boneInitialRotations, boneDebugFolder } =
      setupMartyModel({
        resource: this.resource,
        scene: this.scene,
        debug: this.debug,
        debugFolder: this.debugFolder,
        existingBoneDebugFolder: this.boneDebugFolder,
      });

    this.model = model;
    this.boneNodes = boneNodes;
    this.boneInitialRotations = boneInitialRotations;
    this.boneDebugFolder = boneDebugFolder;

    if (this.model) {
      this.initialTransform = {
        position: this.model.position.clone(),
        rotationY: this.model.rotation.y,
      };
    }
  }

  /**
   * Programmatically rotate a bone group to match a servo command
   */
  setJointAngle(
    joint: number | string,
    angle: number,
    options?: SetJointAngleOptions,
  ): { success: boolean; message?: string } {
    return this.jointController.setJointAngle(joint, angle, options);
  }

  /**
   * Apply a transform preset (position and rotation) from scene configuration
   * @param transform - Optional transform with position [x, y, z] and rotationY in degrees
   */
  applyTransformPreset(transform?: {
    position?: [number, number, number];
    rotationY?: number;
  }) {
    if (!this.model) {
      return;
    }

    const position = transform?.position ?? [
      this.initialTransform.position.x,
      this.initialTransform.position.y,
      this.initialTransform.position.z,
    ];
    this.setPosition(position[0], position[1], position[2]);

    if (typeof transform?.rotationY === 'number') {
      this.setRotationY(transform.rotationY);
    } else {
      this.model.rotation.y = this.initialTransform.rotationY;
    }

    // Synchronize physics immediately to prevent jumping/glitching on preset apply
    if (this.robotPhysics) {
      const body = this.robotPhysics.getBody();
      if (body) {
        body.position.set(
          this.model.position.x,
          this.model.position.y + this.robotPhysics.autoCalculatedOffset,
          this.model.position.z,
        );
        // Sync rotation from model to physics body
        body.quaternion.setFromEuler(0, this.model.rotation.y, 0);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
      }
    }
  }

  /**
   * Set a new default spawn position and immediately move the robot there
   */
  setSpawnPosition(position: THREE.Vector3, rotationY?: number): void {
    if (!this.model) return;

    this.initialTransform.position.copy(position);
    if (rotationY !== undefined) {
      this.initialTransform.rotationY = rotationY;
    }

    // Apply it now
    this.applyTransformPreset();
  }

  /**
   * Move Marty to specific world coordinates
   * @param x - X coordinate (left/right)
   * @param y - Y coordinate (up/down, usually 0 for ground level)
   * @param z - Z coordinate (forward/backward)
   */
  setPosition(x: number, y: number, z: number): void {
    if (!this.model) return;
    this.model.position.set(x, y, z);
  }

  /**
   * Get Marty's current world position
   * @returns Current position as {x, y, z}
   */
  getPosition(): { x: number; y: number; z: number } {
    if (!this.model) return { x: 0, y: 0, z: 0 };
    return {
      x: this.model.position.x,
      y: this.model.position.y,
      z: this.model.position.z,
    };
  }

  /**
   * Set Marty's Y-axis rotation (heading direction)
   * @param degrees - Rotation angle in degrees
   */
  setRotationY(degrees: number): void {
    if (!this.model) return;
    this.model.rotation.y = THREE.MathUtils.degToRad(degrees);
  }

  /**
   * Get Marty's current Y-axis rotation in degrees
   * @returns Rotation in degrees
   */
  getRotationY(): number {
    if (!this.model) return 0;
    return THREE.MathUtils.radToDeg(this.model.rotation.y);
  }

  private setMovement() {
    this.syncMovementDurations();
  }

  private syncMovementDurations() {
    syncMovementDurationsHelper(this.movement, this.turn);
  }

  private setAnimation() {
    setupAnimationSystem({
      model: this.model,
      resource: this.resource,
      movement: this.movement,
      turn: this.turn,
      slide: this.slide,
      animation: this.animation,
      debug: this.debug,
      debugFolder: this.debugFolder,
      time: this.time,
      onMovementChange: () => this.syncMovementDurations(),
    });
  }

  /**
   * Setup virtual sensors for the robot
   */
  private setupSensors() {
    if (!this.model || !this.experience.renderer.instance) return;

    // Find the right foot bone - used for both color sensor and foot light
    const rightFootBone = this.boneNodes.find((b) => b.name === 'LegR003');

    // 1. Ground Color Sensor
    // Attached to the right foot bone (LegR003) where the foot light is located
    // The sensor looks through the hollow sole to detect ground color
    if (rightFootBone) {
      this.sensors.groundColorSensor = new GroundColorSensor(
        rightFootBone.object,
        this.scene,
        this.experience.renderer.instance,
        {
          fov: 30, // Wider FOV to see more ground area
          sensorHeight: 0.0, // At foot level (inside hollow sole)
          nearPlane: 0.001,
          farPlane: 0.5, // Short range - just need to see the ground
        },
      );
    }

    // 2. Obstacle Detection Sensor
    // Positioned at foot level looking forward
    this.sensors.obstacleSensor = new ObstacleSensor(
      this.model,
      this.scene,
      {
        maxRange: 4.0,           // 4 meters max range
        sensorHeight: 0.02,      // 2cm from ground (foot level)
        forwardOffset: 0,        // Start from robot center (no offset)
        minDistance: 0,          // No blind zone
        debug: false,            // Debug visualization disabled
      }
    );

    // 3. Foot Light for ground color sensor illumination
    // Attached to the right foot bone (LegR003) - same location as color sensor
    // The GLB model has hollow soles to accommodate this light
    // Uses layer 1 so it's only visible to color sensor, not main camera
    if (rightFootBone) {
      this.sensors.footLight = new FootLight(rightFootBone.object, this.scene, {
        intensity: 0.25, // Good illumination for color sensor (only visible on layer 1)
        color: 0xffffff, // Pure white for accurate color detection
        angle: Math.PI, // ~180 degrees - broad diffuse beam for whole space below foot
        penumbra: 1.0, // Maximum softness for even diffuse lighting
        distance: 0.3, // Short range to avoid over-illumination
        heightOffset: 0.0, // Position at foot level (inside hollow sole)
        showHelper: false, // Set to true for debugging
      });
    }
  }

  /**
   * Setup physics system with bounding boxes attached to bones
   */
  private setupPhysics(): void {
    if (!this.model || this.boneNodes.length === 0) return;

    this.physics = new Physics();
    this.robotPhysics = new RobotPhysics(
      this.physics,
      this.model,
      this.boneNodes,
    );
  }

  /**
   * Get the ground color beneath the robot
   * @returns RGB color object {r, g, b} with values 0-255
   */
  getGroundColor(): { r: number; g: number; b: number } | null {
    if (!this.sensors.groundColorSensor) {
      return null;
    }
    return this.sensors.groundColorSensor.getColor();
  }

  /**
   * Detect obstacles ahead of the robot
   * @returns Distance to nearest obstacle, or Infinity if nothing detected
   */
  getObstacleDistance(): number {
    if (!this.sensors.obstacleSensor) {
      return Infinity;
    }
    return this.sensors.obstacleSensor.getDistance();
  }

  /**
   * Refresh obstacle sensor's ignored objects list
   * Call this when the scene changes (e.g., loading a new level)
   */
  refreshObstacleSensor(): void {
    if (this.sensors.obstacleSensor) {
      this.sensors.obstacleSensor.refreshIgnoredObjects();
    }
  }

  /**
   * Check if ground color matches specific RGB thresholds
   * Example usage for colored ground detection
   */
  isGroundColorRed(): boolean {
    if (!this.sensors.groundColorSensor) return false;
    return this.sensors.groundColorSensor.isRed();
  }

  isGroundColorBlue(): boolean {
    if (!this.sensors.groundColorSensor) return false;
    return this.sensors.groundColorSensor.isBlue();
  }

  isGroundColorGreen(): boolean {
    if (!this.sensors.groundColorSensor) return false;
    return this.sensors.groundColorSensor.isGreen();
  }

  /**
   * Get the duration of an animation in milliseconds
   * For turn animations, optionally specify the angle to calculate the proper duration
   */
  getAnimationDuration(
    name: AnimationName,
    options?: { angle?: number },
  ): number {
    return getAnimationDurationHelper(this.animation, this.turn, name, options);
  }

  /**
   * Turn right by a specified angle (in degrees)
   * Uses procedural animation - no Blender animations required
   * @param angle - Angle to turn in degrees (default 30)
   * @returns Promise that resolves when turn is complete
   */
  async turnRight(
    angle: number = 30,
  ): Promise<{ success: boolean; message: string }> {
    if (this.proceduralTurnController.isActive()) {
      return { success: false, message: 'Turn already in progress' };
    }

    try {
      await this.proceduralTurnController.turnRight(angle);
      return { success: true, message: `Turned right ${angle}°` };
    } catch (error) {
      return { success: false, message: String(error) };
    }
  }

  /**
   * Turn left by a specified angle (in degrees)
   * Uses procedural animation - no Blender animations required
   * @param angle - Angle to turn in degrees (default 30)
   * @returns Promise that resolves when turn is complete
   */
  async turnLeft(
    angle: number = 30,
  ): Promise<{ success: boolean; message: string }> {
    if (this.proceduralTurnController.isActive()) {
      return { success: false, message: 'Turn already in progress' };
    }

    try {
      await this.proceduralTurnController.turnLeft(angle);
      return { success: true, message: `Turned left ${angle}°` };
    } catch (error) {
      return { success: false, message: String(error) };
    }
  }

  /**
   * Get estimated duration for a procedural turn in milliseconds
   */
  getTurnDuration(angleDeg: number): number {
    return this.proceduralTurnController.getEstimatedDuration(angleDeg);
  }

  /**
   * Check if a turn animation is currently in progress
   */
  isTurning(): boolean {
    return this.proceduralTurnController.isActive();
  }

  /**
   * Cancel any ongoing turn animation
   */
  cancelTurn(): void {
    this.proceduralTurnController.cancel();
  }

  update() {
    const deltaSeconds = this.time.delta / 1000;

    // 1. Update auxiliary controllers (Joints & Turn)
    this.jointController.update(deltaSeconds);
    this.proceduralTurnController.update(deltaSeconds);

    if (this.robotPhysics && this.model) {
      const body = this.robotPhysics.getBody();
      if (!body) return;

      const offset = this.robotPhysics.autoCalculatedOffset;
      const isGrounded = this.robotPhysics.checkGrounded();
      const isJumping = this.robotPhysics.isJumping;

      // --- LOGIQUE DE CHUTE ---
      // On tombe si on n'est pas au sol ET qu'on n'est pas en train de sauter (volontairement)
      if (!isGrounded && !isJumping) {
        if (!this.isFalling) {
          // --- DÉBUT DE CHUTE ---
          this.isFalling = true;

          // PAUSE DES ANIMATIONS : Les jambes s'immobilisent
          if (this.animation.mixer) {
            this.animation.mixer.timeScale = 0;
          }

          // IMPULSION INITIALE (Forward/Backward)
          const direction = this.robotPhysics.fallDirection;
          let speed = 0;
          if (direction === 'forward') speed = FALL_SPEEDS.forward;
          if (direction === 'backward') speed = FALL_SPEEDS.backward;

          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
            this.model.quaternion,
          );
          body.velocity.x = forward.x * speed;
          body.velocity.z = forward.z * speed;
        }
        // Pendant la chute, le body évolue seul (gravité) -> on ne le force pas à la position du modèle
      } else {
        // --- LOGIQUE AU SOL (Stable) ou SAUT ---

        if (this.isFalling) {
          // --- ATTERRISSAGE ---
          this.isFalling = false;

          // RELANCE DES ANIMATIONS
          if (this.animation.mixer) {
            this.animation.mixer.timeScale = 1;
          }

          // RESET ROTATION : Le robot se remet droit sur ses pieds
          // On garde l'orientation Y actuelle mais on annule X/Z (bascule)
          const currentYRotation = new THREE.Euler().setFromQuaternion(
            this.model.quaternion,
          ).y;
          this.model.rotation.set(0, currentYRotation, 0);
          body.quaternion.set(
            this.model.quaternion.x,
            this.model.quaternion.y,
            this.model.quaternion.z,
            this.model.quaternion.w,
          );

          body.velocity.set(0, 0, 0);
          body.angularVelocity.set(0, 0, 0);
        }

        // 1. UPDATE DES ANIMATIONS (Calcul de l'intention de mouvement)
        updateAnimationSystem({
          animation: this.animation,
          movement: this.movement,
          turn: this.turn,
          slide: this.slide,
          model: this.model,
          deltaSeconds,
        });

        // 2. SYNCHRO ANIMATION -> PHYSIQUE (Proposer la nouvelle position)
        body.position.x = this.model.position.x;
        body.position.z = this.model.position.z;

        if (!isJumping) {
          body.position.y = this.model.position.y + offset;
          // Kill all micro-velocities to prevent "ghost sliding"
          body.velocity.set(0, 0, 0);
          body.angularVelocity.set(0, 0, 0);

          // Force upright rotation to stop any tipping micro-forces
          body.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            this.model.rotation.y,
          );
        }
        // En saut, on ne touche pas à Y du body, la physique gère
      }

      // 3. STEP PHYSICS WORLD (Résolution des collisions)
      if (this.physics) {
        this.physics.update();
      }

      // 4. SYNCHRO PHYSIQUE -> MODÈLE (Appliquer les contraintes/collisions)
      if (!isGrounded && !isJumping) {
        // CHUTE : La Physique dicte tout
        this.model.position.set(
          body.position.x,
          body.position.y,
          body.position.z,
        );
        this.model.position.y -= offset;
        this.model.quaternion.set(
          body.quaternion.x,
          body.quaternion.y,
          body.quaternion.z,
          body.quaternion.w,
        );
      } else {
        // SOL/SAUT : On récupère la position corrigée (si mur, on est repoussé)
        this.model.position.x = body.position.x;
        this.model.position.z = body.position.z;

        if (isJumping) {
          // 1. Let physics dictate the position
          this.model.position.y = body.position.y - offset;

          // 2. Hard-clamp the model to the ground if it goes below 0
          // (Assuming 0 is your ground level)
          if (this.model.position.y < 0) {
            this.model.position.y = 0;
            body.position.y = offset;
            body.velocity.y = 0;
          }

          // 3. Grounding detection
          if (isGrounded && body.velocity.y <= 0) {
            this.robotPhysics.isJumping = false;
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            body.position.y = this.model.position.y + offset;

            // Force upright rotation on landing
            body.quaternion.setFromAxisAngle(
              new CANNON.Vec3(0, 1, 0),
              this.model.rotation.y,
            );
          }
        }
      }

      this.robotPhysics.updateDebugMeshes();
    } else {
      // Fallback si pas de robotPhysics
      if (this.physics) {
        this.physics.update();
      }
    }

    // Update sensors
    if (this.sensors.footLight) {
      this.sensors.footLight.update();
    }

    // Update obstacle sensor debug visualization
    if (this.sensors.obstacleSensor) {
      this.sensors.obstacleSensor.updateDebugVisualization();
    }
  }

  dispose() {
    // Clean up WebSocket subscription
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe();
    }

    // Clean up sensors
    if (this.sensors.groundColorSensor) {
      this.sensors.groundColorSensor.dispose();
    }
    if (this.sensors.obstacleSensor) {
      this.sensors.obstacleSensor.dispose();
    }
    if (this.sensors.footLight) {
      this.sensors.footLight.dispose();
    }

    // Clean up physics
    if (this.robotPhysics) {
      this.robotPhysics.dispose();
    }
    if (this.physics) {
      this.physics.dispose();
    }

    if (this.model) {
      this.scene.remove(this.model);
    }
    if (this.animation.mixer) {
      this.animation.mixer.stopAllAction();
    }
  }
}
