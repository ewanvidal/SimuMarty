import * as THREE from 'three';
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
import { GroundColorSensor, ObstacleSensor, FootLight } from './sensors/index.tsx';

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
  boneDebugFolder?: ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;
  boneInitialRotations: Map<string, THREE.Euler> = new Map();
  jointController: JointController;
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
  private initialTransform = {
    position: new THREE.Vector3(0, 0, 0),
    rotationY: 0,
  };

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

    this.setModel();
    this.setMovement();
    this.setAnimation();
    this.setupSensors();
    this.setupWebSocket();
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

  applyTransformPreset(transform?: { position?: [number, number, number]; rotationY?: number }) {
    if (!this.model) return;

    const position = transform?.position ?? [
      this.initialTransform.position.x,
      this.initialTransform.position.y,
      this.initialTransform.position.z,
    ];
    this.model.position.set(position[0], position[1], position[2]);

    if (typeof transform?.rotationY === 'number') {
      this.model.rotation.y = THREE.MathUtils.degToRad(transform.rotationY);
    } else {
      this.model.rotation.y = this.initialTransform.rotationY;
    }
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
      onMovementChange: () => this.syncMovementDurations(),
    });
  }

  /**
   * Setup virtual sensors for the robot
   */
  private setupSensors() {
    if (!this.model || !this.experience.renderer.instance) return;

    // Find the right foot bone - used for both color sensor and foot light
    const rightFootBone = this.boneNodes.find(b => b.name === 'LegR003');

    // 1. Ground Color Sensor
    // Attached to the right foot bone (LegR003) where the foot light is located
    // The sensor looks through the hollow sole to detect ground color
    if (rightFootBone) {
      this.sensors.groundColorSensor = new GroundColorSensor(
        rightFootBone.object,
        this.scene,
        this.experience.renderer.instance,
        {
          fov: 30,              // Wider FOV to see more ground area
          sensorHeight: 0.0,    // At foot level (inside hollow sole)
          nearPlane: 0.001,
          farPlane: 0.5,        // Short range - just need to see the ground
        }
      );
    }

    // 2. Obstacle Detection Sensor
    this.sensors.obstacleSensor = new ObstacleSensor(
      this.model,
      this.scene,
      {
        maxRange: 10,
        sensorHeight: 0.1,
      }
    );

    // 3. Foot Light for ground color sensor illumination
    // Attached to the right foot bone (LegR003) - same location as color sensor
    // The GLB model has hollow soles to accommodate this light
    // Uses very low intensity for diffuse-only illumination (no bright specular)
    if (rightFootBone) {
      this.sensors.footLight = new FootLight(
        rightFootBone.object,
        this.scene,
        {
          intensity: 0.06,      // Very low intensity for diffuse-only effect
          color: 0xffffff,      // Pure white for accurate color detection
          angle: Math.PI,       // ~180 degrees - broad diffuse beam for whole space below foot
          penumbra: 1.0,        // Maximum softness for even diffuse lighting
          distance: 0.3,        // Short range to avoid over-illumination
          heightOffset: 0.0,    // Position at foot level (inside hollow sole)
          showHelper: false,    // Set to true for debugging
        }
      );
    }
  }

  /**
   * Get the ground color beneath the robot
   * @returns RGB color object {r, g, b} with values 0-255
   */
  getGroundColor(): { r: number; g: number; b: number } | null {
    if (!this.sensors.groundColorSensor) {
      console.warn('Ground color sensor not initialized');
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
      console.warn('Obstacle detection sensor not initialized');
      return Infinity;
    }
    return this.sensors.obstacleSensor.getDistance();
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

  update() {
    const deltaSeconds = this.time.delta / 1000;

    updateAnimationSystem({
      animation: this.animation,
      movement: this.movement,
      turn: this.turn,
      slide: this.slide,
      model: this.model,
      deltaSeconds,
    });

    this.jointController.update(deltaSeconds);

    // Update foot light position to follow foot bone
    if (this.sensors.footLight) {
      this.sensors.footLight.update();
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

    if (this.model) {
      this.scene.remove(this.model);
    }
    if (this.animation.mixer) {
      this.animation.mixer.stopAllAction();
    }
  }
}