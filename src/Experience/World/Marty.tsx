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
  boneNodes: { name: string; object: THREE.Bone }[] = [];
  boneDebugFolder?: ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;
  wsUnsubscribe?: () => void;
  movement: {
    speed: number;
    fps: number;
    moveFrames: number;
    cycleFrames: number;
    moveDuration: number;
    restDuration: number;
    enabled: boolean;
    active: boolean;
    moveTimer: number;
    restTimer: number;
  };
  turn: {
    active: boolean;
    elapsed: number;
    delay: number;
    duration: number;
    startAngle: number;
    targetAngle: number;
    state: 'idle' | 'waiting' | 'rotating' | 'resumeWait';
    resumeDelay: number;
    turnAction: THREE.AnimationAction | null;
  };
  slide: {
    enabled: boolean;
    direction: 'left' | 'right' | null;
    speed: number;
    elapsed: number;
    duration: number;
  };
  animation: {
    mixer?: THREE.AnimationMixer;
    actions?: {
      walking?: THREE.AnimationAction;
      waving?: THREE.AnimationAction;
      turnRight?: THREE.AnimationAction;
      turnLeft?: THREE.AnimationAction;
      kick?: THREE.AnimationAction;
      dance?: THREE.AnimationAction;
      slideLeft?: THREE.AnimationAction;
      slideRight?: THREE.AnimationAction;
      getReady?: THREE.AnimationAction;
      current?: THREE.AnimationAction | null;
    };
    settings?: {
      timeScale: number;
      crossFadeDuration: number;
      turnBaseAngle: number;
    };
    clips?: {
      walking?: THREE.AnimationClip;
      waving?: THREE.AnimationClip;
      turnRight?: THREE.AnimationClip;
      turnLeft?: THREE.AnimationClip;
      kick?: THREE.AnimationClip;
      dance?: THREE.AnimationClip;
      slideLeft?: THREE.AnimationClip;
      slideRight?: THREE.AnimationClip;
      getReady?: THREE.AnimationClip;
    };
    play?: (name: string, options?: { autoStop?: boolean }) => void;
    stop?: () => void;
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

    // Initialize movement and animation objects
    this.movement = {
      speed: 0.025, // Scaled down to match 0.05 model scale (10x smaller)
      fps: 30,
      moveFrames: 30,
      cycleFrames: 70,
      moveDuration: 0,
      restDuration: 0,
      enabled: false,
      active: false,
      moveTimer: 0,
      restTimer: 0,
    };

    this.turn = {
      active: false,
      elapsed: 0,
      delay: 30 / 30, // 30 frames at 30 fps (seconds)
      duration: 0,
      startAngle: 0,
      targetAngle: 0,
      state: 'idle',
      resumeDelay: 0,
      turnAction: null,
    };

    this.slide = {
      enabled: false,
      direction: null,
      speed: 0.025, // Scaled down to match 0.05 model scale (10x smaller)
      elapsed: 0,
      duration: 1.7, // 1.7 seconds - stop a bit before animation ends
    };

    this.animation = {};

    this.setModel();
    this.setMovement();
    this.setAnimation();
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
    if (!this.resource || !this.resource.scene) {
      // Fallback: Create a simple box as placeholder
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: '#ff6b6b' });
      this.model = new THREE.Mesh(geometry, material) as unknown as THREE.Group;
      this.model!.position.set(0, 0.5, 0);
      this.model!.castShadow = true;
      this.scene.add(this.model!);
      return;
    }

    this.model = this.resource.scene;
    this.model!.scale.set(0.05, 0.05, 0.05);
    this.model!.position.set(0, 0, 0);
    this.scene.add(this.model!);

    this.boneNodes = [];

    this.model!.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }

      if (child instanceof THREE.Bone) {
        const hasName = child.name && child.name.trim().length > 0;
        const label = hasName
          ? child.name
          : `bone_${this.boneNodes.length.toString().padStart(2, '0')}`;
        this.boneNodes.push({ name: label, object: child });
      }
    });

    this.setupBoneDebugControls();
  }

  private setupBoneDebugControls() {
    if (!this.debug.active || !this.debugFolder || this.boneNodes.length === 0) {
      return;
    }

    this.boneDebugFolder?.destroy();
    this.boneDebugFolder = this.debugFolder.addFolder('bones');
    this.boneDebugFolder.close();

    const helpers = {
      logBones: () => {
        console.table(
          this.boneNodes.map((bone) => ({
            name: bone.name,
          })),
        );
      },
    };

    this.boneDebugFolder.add(helpers, 'logBones').name('Log bone list');

    // Hard-code folders so bones stay organized in debug UI
    const boneGroups = [
      { label: 'Core', names: ['Root', 'Body'] },
      { label: 'Head & Eyes', names: ['Head', 'EyeL', 'EyeR'] },
      { label: 'Left Arm', names: ['ArmL'] },
      { label: 'Right Arm', names: ['ArmR'] },
      {
        label: 'Left Leg',
        names: ['LegL', 'LegL001', 'LegL002', 'LegL003'],
      },
      {
        label: 'Right Leg',
        names: ['LegR', 'LegR001', 'LegR002', 'LegR003'],
      },
      { label: 'Floor', names: ['Floor'] },
    ];

    const assigned = new Set<string>();
    const addBoneRotationControls = (
      folder: ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>,
      bone: { name: string; object: THREE.Bone },
    ) => {
      // Proxy keeps slider values in sync when lil-gui updates
      const rotationProxy = {
        x: bone.object.rotation.x,
        y: bone.object.rotation.y,
        z: bone.object.rotation.z,
      };

      folder
        .add(rotationProxy, 'x', -Math.PI, Math.PI, 0.01)
        .name(`${bone.name} rotX`)
        .onChange((value: number) => {
          bone.object.rotation.x = value;
          rotationProxy.x = value;
        });

      folder
        .add(rotationProxy, 'y', -Math.PI, Math.PI, 0.01)
        .name(`${bone.name} rotY`)
        .onChange((value: number) => {
          bone.object.rotation.y = value;
          rotationProxy.y = value;
        });

      folder
        .add(rotationProxy, 'z', -Math.PI, Math.PI, 0.01)
        .name(`${bone.name} rotZ`)
        .onChange((value: number) => {
          bone.object.rotation.z = value;
          rotationProxy.z = value;
        });
    };

    boneGroups.forEach((group) => {
      const bonesInGroup = this.boneNodes.filter((bone) =>
        group.names.includes(bone.name),
      );
      if (bonesInGroup.length === 0) {
        return;
      }

      const groupFolder = this.boneDebugFolder!.addFolder(group.label);
      groupFolder.close();
      bonesInGroup.forEach((bone) => {
        assigned.add(bone.name);
        addBoneRotationControls(groupFolder, bone);
      });
    });

    const unassignedBones = this.boneNodes.filter(
      (bone) => !assigned.has(bone.name),
    );
    if (unassignedBones.length > 0) {
      // If new bones appear later, keep them reachable under "Other"
      const miscFolder = this.boneDebugFolder.addFolder('Other');
      miscFolder.close();
      unassignedBones.forEach((bone) => addBoneRotationControls(miscFolder, bone));
    }
  }

  private setMovement() {
    this.syncMovementDurations();
  }

  private syncMovementDurations() {
    const { fps } = this.movement;
    const moveFrames = Math.max(this.movement.moveFrames, 0);
    const cycleFrames = Math.max(this.movement.cycleFrames, moveFrames);

    this.movement.moveFrames = moveFrames;
    this.movement.cycleFrames = cycleFrames;
    this.movement.moveDuration = moveFrames / fps;
    this.movement.restDuration = (cycleFrames - moveFrames) / fps;

    // Update turn timings based on fps
    this.turn.delay = 30 / fps; // 30 frames before rotation

    if (this.movement.active) {
      this.movement.moveTimer = Math.min(
        this.movement.moveTimer,
        this.movement.moveDuration,
      );
    } else {
      this.movement.restTimer = Math.min(
        this.movement.restTimer,
        this.movement.restDuration,
      );
    }
  }

  private setAnimation() {
    if (!this.model || !this.resource.animations) {
      return;
    }

    this.animation.mixer = new THREE.AnimationMixer(this.model);
    this.animation.actions = {};

    // Debug: Log all available animations
    console.log('📋 Available animations in GLTF:');
    this.resource.animations.forEach(
      (clip: THREE.AnimationClip, index: number) => {
        console.log(
          `Animation ${index}:`,
          clip.name,
          'Duration:',
          clip.duration,
        );
      },
    );

    const walkingClip =
      this.resource.animations.find((clip) =>
        clip.name.toLowerCase().includes('walking'),
      ) || this.resource.animations[0];

    const wavingClip =
      this.resource.animations.find((clip) =>
        clip.name.toLowerCase().includes('waving'),
      ) ||
      this.resource.animations[1] ||
      walkingClip;

    const getReadyClip = this.resource.animations.find(
      (clip) =>
        clip.name.toLowerCase().includes('getready') ||
        clip.name.toLowerCase().includes('get_ready'),
    );

    const turnRightClip = this.resource.animations.find(
      (clip) =>
        clip.name.toLowerCase().includes('turn_right') ||
        clip.name.toLowerCase().includes('turnright'),
    );

    const turnLeftClip = this.resource.animations.find(
      (clip) =>
        clip.name.toLowerCase().includes('turn_left') ||
        clip.name.toLowerCase().includes('turnleft'),
    );

    const kickClip = this.resource.animations.find(
      (clip) => clip.name.toLowerCase().includes('kick'),
    );

    const danceClip = this.resource.animations.find(
      (clip) => clip.name.toLowerCase().includes('dance'),
    );

    const slideLeftClip = this.resource.animations.find(
      (clip) =>
        clip.name.toLowerCase().includes('slide') &&
        clip.name.toLowerCase().includes('left'),
    );
    console.log('🔍 slideLeftClip found:', slideLeftClip?.name || 'NOT FOUND');

    const slideRightClip = this.resource.animations.find(
      (clip) =>
        clip.name.toLowerCase().includes('slide') &&
        clip.name.toLowerCase().includes('right'),
    );
    console.log('🔍 slideRightClip found:', slideRightClip?.name || 'NOT FOUND');

    // Store the clips for duration access
    this.animation.clips = {
      walking: walkingClip,
      waving: wavingClip,
      getReady: getReadyClip,
      turnRight: turnRightClip,
      turnLeft: turnLeftClip,
      kick: kickClip,
      dance: danceClip,
      slideLeft: slideLeftClip,
      slideRight: slideRightClip,
    };

    this.animation.actions.walking =
      this.animation.mixer.clipAction(walkingClip);
    this.animation.actions.waving = this.animation.mixer.clipAction(wavingClip);

    if (getReadyClip) {
      this.animation.actions.getReady =
        this.animation.mixer.clipAction(getReadyClip);
      this.animation.actions.getReady.setLoop(THREE.LoopOnce, 1);
      this.animation.actions.getReady.clampWhenFinished = true;
    }

    if (turnRightClip) {
      this.animation.actions.turnRight =
        this.animation.mixer.clipAction(turnRightClip);
      this.animation.actions.turnRight.setLoop(THREE.LoopOnce, 1);
      this.animation.actions.turnRight.clampWhenFinished = true;
    }

    if (turnLeftClip) {
      this.animation.actions.turnLeft =
        this.animation.mixer.clipAction(turnLeftClip);
      this.animation.actions.turnLeft.setLoop(THREE.LoopOnce, 1);
      this.animation.actions.turnLeft.clampWhenFinished = true;
    }

    if (kickClip) {
      this.animation.actions.kick =
        this.animation.mixer.clipAction(kickClip);
      this.animation.actions.kick.setLoop(THREE.LoopOnce, 1);
      this.animation.actions.kick.clampWhenFinished = true;
    }

    if (danceClip) {
      this.animation.actions.dance =
        this.animation.mixer.clipAction(danceClip);
      this.animation.actions.dance.setLoop(THREE.LoopOnce, 1);
      this.animation.actions.dance.clampWhenFinished = true;
    }

    if (slideLeftClip) {
      this.animation.actions.slideLeft =
        this.animation.mixer.clipAction(slideLeftClip);
      this.animation.actions.slideLeft.setLoop(THREE.LoopOnce, 1);
      this.animation.actions.slideLeft.clampWhenFinished = true;
    }

    if (slideRightClip) {
      this.animation.actions.slideRight =
        this.animation.mixer.clipAction(slideRightClip);
      this.animation.actions.slideRight.setLoop(THREE.LoopOnce, 1);
      this.animation.actions.slideRight.clampWhenFinished = true;
    }

    // Configurer les animations pour ne se jouer qu'une fois
    this.animation.actions.walking.setLoop(THREE.LoopOnce, 1);
    this.animation.actions.waving.setLoop(THREE.LoopOnce, 1);
    this.animation.actions.walking.clampWhenFinished = true;
    this.animation.actions.waving.clampWhenFinished = true;

    this.animation.actions.current = null; // Pas d'animation au démarrage

    this.animation.settings = {
      timeScale: 1,
      crossFadeDuration: 0.6,
      turnBaseAngle: THREE.MathUtils.degToRad(30), // 30 degrees turn by default
    };

    this.animation.play = (name: string, options?: { autoStop?: boolean }) => {
      const newAction = this.animation.actions![
        name as 'walking' | 'waving' | 'turnRight' | 'turnLeft' | 'kick' | 'dance' | 'slideLeft' | 'slideRight' | 'getReady'
      ];
      if (!newAction) return;

      const oldAction = this.animation.actions!.current;
      const crossFadeDuration = 1; // Use 1 second for cross-fade as requested

      // Stop and reset the action completely
      newAction.stop();
      newAction.reset();
      newAction.play();

      // Only cross-fade if switching between different animations
      if (oldAction && oldAction !== newAction) {
        newAction.crossFadeFrom(oldAction, crossFadeDuration, false);
      }

      this.animation.actions!.current = newAction;

      // Activer le mouvement cyclique si c'est walking
      if (name === 'walking') {
        this.movement.enabled = true;
        this.movement.active = false; // Commence par la phase de repos
        this.movement.moveTimer = 0;
        this.movement.restTimer = 0;

        // Only auto-stop if explicitly requested (default behavior)
        const shouldAutoStop = options?.autoStop !== false;
        if (shouldAutoStop) {
          const animationDuration = this.getAnimationDuration('walking');
          
          // After animation completes, transition to getReady
          setTimeout(() => {
            this.movement.enabled = false;
            this.movement.active = false;
            
            if (this.animation.actions!.getReady) {
              const getReadyAction = this.animation.actions!.getReady;
              const currentAction = this.animation.actions!.current;
              
              getReadyAction.stop();
              getReadyAction.reset();
              getReadyAction.play();
              
              if (currentAction && currentAction !== getReadyAction) {
                getReadyAction.crossFadeFrom(currentAction, 1, false);
              }
              
              this.animation.actions!.current = getReadyAction;
            }
          }, animationDuration);
        }
      }

      // Handle waving animation
      if (name === 'waving') {
        this.movement.enabled = false;
        this.movement.active = false;

        const shouldAutoStop = options?.autoStop !== false;
        if (shouldAutoStop) {
          const animationDuration = this.getAnimationDuration('waving');
          
          // After animation completes, transition to getReady
          setTimeout(() => {
            if (this.animation.actions!.getReady) {
              const getReadyAction = this.animation.actions!.getReady;
              const currentAction = this.animation.actions!.current;
              
              getReadyAction.stop();
              getReadyAction.reset();
              getReadyAction.play();
              
              if (currentAction && currentAction !== getReadyAction) {
                getReadyAction.crossFadeFrom(currentAction, 1, false);
              }
              
              this.animation.actions!.current = getReadyAction;
            }
          }, animationDuration);
        }
      }

      // If playing getReady, ensure movement is disabled
      if (name === 'getReady') {
        this.movement.enabled = false;
        this.movement.active = false;
      }

      // If playing turnRight, disable movement and start turn sequence
      if (name === 'turnRight') {
        this.movement.enabled = false;
        this.movement.active = false;
        
        // Start turn cycle: wait 30 frames, pause, rotate during pause, then resume
        this.turn.active = true;
        this.turn.elapsed = 0;
        this.turn.startAngle = this.model!.rotation.y;
        this.turn.state = 'waiting';
        this.turn.turnAction = this.animation.actions!.turnRight || null;

        // Duration of rotation proportional to angle for constant speed
        const angleDeg = THREE.MathUtils.radToDeg(
          this.animation.settings!.turnBaseAngle,
        );
        const absAngleDeg = Math.max(Math.abs(angleDeg), 1);
        const baseSpeedDegPerSec = 60; // 60° per second => 30° in 0.5s

        this.turn.duration = absAngleDeg / baseSpeedDegPerSec;
        this.turn.resumeDelay = this.turn.duration * 0.2; // Small pause after rotation
        this.turn.targetAngle = this.turn.startAngle - this.animation.settings!.turnBaseAngle; // Store target for rotation
      }

      // If playing turnLeft, disable movement and start turn sequence (opposite direction)
      if (name === 'turnLeft') {
        this.movement.enabled = false;
        this.movement.active = false;
        
        // Start turn cycle: wait 30 frames, pause, rotate during pause, then resume
        this.turn.active = true;
        this.turn.elapsed = 0;
        this.turn.startAngle = this.model!.rotation.y;
        this.turn.state = 'waiting';
        this.turn.turnAction = this.animation.actions!.turnLeft || null;

        // Duration of rotation proportional to angle for constant speed
        const angleDeg = THREE.MathUtils.radToDeg(
          this.animation.settings!.turnBaseAngle,
        );
        const absAngleDeg = Math.max(Math.abs(angleDeg), 1);
        const baseSpeedDegPerSec = 60; // 60° per second => 30° in 0.5s

        this.turn.duration = absAngleDeg / baseSpeedDegPerSec;
        this.turn.resumeDelay = this.turn.duration * 0.2; // Small pause after rotation
        this.turn.targetAngle = this.turn.startAngle + this.animation.settings!.turnBaseAngle; // Store target for rotation
      }

      // If playing slideLeft, enable slide movement
      if (name === 'slideLeft') {
        console.log('🎯 slideLeft activated');
        this.movement.enabled = false;
        this.movement.active = false;
        this.slide.enabled = true;
        this.slide.direction = 'left';
        this.slide.elapsed = 0;
        console.log('🎯 slide state:', this.slide);
      }

      // If playing slideRight, enable slide movement
      if (name === 'slideRight') {
        console.log('🎯 slideRight activated');
        this.movement.enabled = false;
        this.movement.active = false;
        this.slide.enabled = true;
        this.slide.direction = 'right';
        this.slide.elapsed = 0;
        console.log('🎯 slide state:', this.slide);
      }

      // Handle animations that need to transition to getReady at the end
      const animationsWithGetReady = ['turnRight', 'turnLeft', 'kick', 'dance', 'slideLeft', 'slideRight'] as const;
      type AnimationWithGetReady = (typeof animationsWithGetReady)[number];
      const requiresGetReady = (value: string): value is AnimationWithGetReady =>
        animationsWithGetReady.includes(value as AnimationWithGetReady);

      if (requiresGetReady(name)) {
        const shouldAutoStop = options?.autoStop !== false;
        if (shouldAutoStop) {
          const animationDuration = this.getAnimationDuration(name);
          
          // After animation completes, transition to getReady
          setTimeout(() => {
            // Disable slide movement if active
            this.slide.enabled = false;
            
            if (this.animation.actions!.getReady) {
              const getReadyAction = this.animation.actions!.getReady;
              const currentAction = this.animation.actions!.current;
              
              getReadyAction.stop();
              getReadyAction.reset();
              getReadyAction.play();
              
              if (currentAction && currentAction !== getReadyAction) {
                getReadyAction.crossFadeFrom(currentAction, 1, false);
              }
              
              this.animation.actions!.current = getReadyAction;
            }
          }, animationDuration);
        }
      }
    };

    this.animation.stop = () => {
      if (this.animation.actions!.current) {
        this.animation.actions!.current.fadeOut(
          this.animation.settings!.crossFadeDuration,
        );
        this.animation.actions!.current = null;
      }
    };

    // Debug
    if (this.debug.active && this.debugFolder) {
      const debugObject = {
        timeScale: this.animation.settings.timeScale,
        crossFadeDuration: this.animation.settings.crossFadeDuration,
        turnBaseAngleDeg: THREE.MathUtils.radToDeg(
          this.animation.settings.turnBaseAngle,
        ),
        moveSpeed: this.movement.speed,
        moveFrames: this.movement.moveFrames,
        cycleFrames: this.movement.cycleFrames,
        playWalking: () => {
          this.animation.play!('walking');
        },
        playWaving: () => {
          this.animation.play!('waving');
        },
        playTurnRight: () => {
          if (this.animation.actions!.turnRight) {
            this.animation.play!('turnRight');
          }
        },
        playTurnLeft: () => {
          if (this.animation.actions!.turnLeft) {
            this.animation.play!('turnLeft');
          }
        },
        playKick: () => {
          if (this.animation.actions!.kick) {
            this.animation.play!('kick');
          }
        },
        playDance: () => {
          if (this.animation.actions!.dance) {
            this.animation.play!('dance');
          }
        },
        playSlideLeft: () => {
          if (this.animation.actions!.slideLeft) {
            this.animation.play!('slideLeft');
          }
        },
        playSlideRight: () => {
          if (this.animation.actions!.slideRight) {
            this.animation.play!('slideRight');
          }
        },
        playGetReady: () => {
          if (this.animation.actions!.getReady) {
            this.animation.play!('getReady');
          }
        },
        stopAnimation: () => {
          this.animation.stop!();
        },
      };

      // Animation controls
      this.debugFolder.add(debugObject, 'playWalking');
      this.debugFolder.add(debugObject, 'playWaving');
      if (this.animation.actions.turnRight) {
        this.debugFolder.add(debugObject, 'playTurnRight');
      }
      if (this.animation.actions.turnLeft) {
        this.debugFolder.add(debugObject, 'playTurnLeft');
      }
      if (this.animation.actions.kick) {
        this.debugFolder.add(debugObject, 'playKick');
      }
      if (this.animation.actions.dance) {
        this.debugFolder.add(debugObject, 'playDance');
      }
      if (this.animation.actions.slideLeft) {
        this.debugFolder.add(debugObject, 'playSlideLeft');
      }
      if (this.animation.actions.slideRight) {
        this.debugFolder.add(debugObject, 'playSlideRight');
      }
      if (this.animation.actions.getReady) {
        this.debugFolder.add(debugObject, 'playGetReady');
      }
      this.debugFolder.add(debugObject, 'stopAnimation');
      this.debugFolder
        .add(debugObject, 'timeScale', 0.1, 2)
        .onChange((value: number) => {
          this.animation.settings!.timeScale = value;
        });
      this.debugFolder
        .add(debugObject, 'crossFadeDuration', 0.1, 2)
        .onChange((value: number) => {
          this.animation.settings!.crossFadeDuration = value;
        });
      this.debugFolder
        .add(debugObject, 'turnBaseAngleDeg', -180, 180, 1)
        .onChange((value: number) => {
          this.animation.settings!.turnBaseAngle =
            THREE.MathUtils.degToRad(value);
        });

      // Movement controls
      this.debugFolder
        .add(debugObject, 'moveSpeed', 0.1, 3)
        .onChange((value: number) => {
          this.movement.speed = value;
        });
      this.debugFolder
        .add(debugObject, 'moveFrames', 1, 60, 1)
        .onChange((value: number) => {
          this.movement.moveFrames = Math.min(value, this.movement.cycleFrames);
          debugObject.moveFrames = this.movement.moveFrames;
          this.syncMovementDurations();
        });
      this.debugFolder
        .add(debugObject, 'cycleFrames', 1, 180, 1)
        .onChange((value: number) => {
          this.movement.cycleFrames = Math.max(value, this.movement.moveFrames);
          debugObject.cycleFrames = this.movement.cycleFrames;
          this.syncMovementDurations();
        });
    }
  }

  /**
   * Get the duration of an animation in milliseconds
   * For turn animations, optionally specify the angle to calculate the proper duration
   */
  getAnimationDuration(
    name: 'walking' | 'waving' | 'turnRight' | 'turnLeft' | 'kick' | 'dance' | 'slideLeft' | 'slideRight' | 'getReady',
    options?: { angle?: number },
  ): number {
    if (!this.animation.clips || !this.animation.settings) {
      return 2000; // Default fallback
    }

    const clip = this.animation.clips[name];
    if (!clip) {
      return 2000; // Default fallback
    }

    // For turn animations, calculate duration based on angle
    if ((name === 'turnRight' || name === 'turnLeft') && options?.angle !== undefined) {
      const baseAnimationDuration = (clip.duration * 1000) / this.animation.settings.timeScale;
      const absAngle = Math.abs(options.angle);
      const baseSpeedDegPerSec = 60; // 60° per second
      
      // Calculate rotation duration based on angle
      const rotationDuration = (absAngle / baseSpeedDegPerSec) * 1000; // in ms
      
      // Total duration includes: initial delay + rotation + resume delay
      const delayMs = this.turn.delay * 1000;
      const resumeDelayMs = rotationDuration * 0.2;
      
      // Return the maximum of either the base animation duration or calculated duration
      return Math.max(baseAnimationDuration, delayMs + rotationDuration + resumeDelayMs);
    }

    return (clip.duration * 1000) / this.animation.settings.timeScale;
  }

  update() {
    const deltaSeconds = this.time.delta / 1000;

    if (this.animation.mixer && this.animation.actions?.current) {
      this.animation.mixer.timeScale = this.animation.settings!.timeScale;
      this.animation.mixer.update(deltaSeconds);
    }

    if (this.movement.enabled) {
      this.updateMovement(deltaSeconds);
    }

    if (this.slide.enabled) {
      this.updateSlide(deltaSeconds);
    }

    this.updateTurn(deltaSeconds);
  }

  private updateMovement(deltaSeconds: number) {
    if (!this.model) return;

    if (this.movement.active) {
      this.movement.moveTimer += deltaSeconds;
      // Move forward in the local Z direction (translateZ handles rotation)
      const distance = this.movement.speed * deltaSeconds;
      this.model.translateZ(distance);

      if (this.movement.moveTimer >= this.movement.moveDuration) {
        this.movement.active = false;
        this.movement.moveTimer = 0;
        this.movement.restTimer = 0;
      }
      return;
    }

    this.movement.restTimer += deltaSeconds;
    if (this.movement.restTimer >= this.movement.restDuration) {
      this.movement.active = true;
      this.movement.restTimer = 0;
    }
  }

  private updateTurn(deltaSeconds: number) {
    if (!this.turn || !this.turn.active || !this.model) return;

    this.turn.elapsed += deltaSeconds;
    const { state } = this.turn;

    // Phase 1: Initial wait
    if (state === 'waiting') {
      if (this.turn.elapsed >= this.turn.delay) {
        // Move to rotation phase and pause animation
        if (this.turn.turnAction) {
          this.turn.turnAction.paused = true;
        }
        this.turn.state = 'rotating';
        this.turn.elapsed = 0; // Reset for rotation phase
      }
      return;
    }

    // Phase 2: Rotation (animation paused)
    if (state === 'rotating') {
      const t = Math.min(this.turn.elapsed / this.turn.duration, 1);

      // Use the stored target angle for rotation
      this.model.rotation.y = THREE.MathUtils.lerp(
        this.turn.startAngle,
        this.turn.targetAngle,
        t,
      );

      if (t >= 1) {
        // Rotation complete -> wait phase before resuming
        this.turn.state = 'resumeWait';
        this.turn.elapsed = 0;
      }
      return;
    }

    // Phase 3: Wait before resuming animation
    if (state === 'resumeWait') {
      if (this.turn.elapsed >= this.turn.resumeDelay) {
        if (this.turn.turnAction) {
          this.turn.turnAction.paused = false;
        }
        this.turn.active = false;
        this.turn.state = 'idle';
      }
    }
  }

  private updateSlide(deltaSeconds: number) {
    if (!this.model || !this.slide.enabled) return;

    this.slide.elapsed += deltaSeconds;
    
    // Move sideways continuously in the local X direction
    const distance = this.slide.speed * deltaSeconds;
    if (this.slide.direction === 'left') {
      console.log('⬅️ Moving left:', distance);
      this.model.translateX(distance); // Positive X is left
    } else if (this.slide.direction === 'right') {
      console.log('➡️ Moving right:', distance);
      this.model.translateX(-distance); // Negative X is right
    }

    // Stop after duration
    if (this.slide.elapsed >= this.slide.duration) {
      console.log('✅ Slide complete');
      this.slide.enabled = false;
      this.slide.elapsed = 0;
    }
  }

  dispose() {
    // Clean up WebSocket subscription
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe();
    }

    if (this.model) {
      this.scene.remove(this.model);
    }
    if (this.animation.mixer) {
      this.animation.mixer.stopAllAction();
    }
  }
}