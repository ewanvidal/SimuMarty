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
  animation: {
    mixer?: THREE.AnimationMixer;
    actions?: {
      walking?: THREE.AnimationAction;
      waving?: THREE.AnimationAction;
      turnRight?: THREE.AnimationAction;
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
      speed: 0.25,
      fps: 30,
      moveFrames: 20,
      cycleFrames: 55,
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

    this.model!.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });
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

    // // Debug: Log all available animations
    // this.resource.animations.forEach(
    //   (clip: THREE.AnimationClip, index: number) => {
    //     console.log(
    //       `Animation ${index}:`,
    //       clip.name,
    //       'Duration:',
    //       clip.duration,
    //     );
    //   },
    // );

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

    // Store the clips for duration access
    this.animation.clips = {
      walking: walkingClip,
      waving: wavingClip,
      getReady: getReadyClip,
      turnRight: turnRightClip,
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
        name as 'walking' | 'waving' | 'turnRight' | 'getReady'
      ];
      if (!newAction) return;

      const oldAction = this.animation.actions!.current;
      const crossFadeDuration = this.animation.settings!.crossFadeDuration;

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
          // Désactiver après la durée de l'animation complète
          setTimeout(
            () => {
              this.movement.enabled = false;
              this.movement.active = false;
            },
            (this.animation.clips!.walking!.duration * 1000) /
              this.animation.settings!.timeScale,
          );
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
   */
  getAnimationDuration(
    name: 'walking' | 'waving' | 'turnRight' | 'getReady',
  ): number {
    if (!this.animation.clips || !this.animation.settings) {
      return 2000; // Default fallback
    }

    const clip = this.animation.clips[name];
    if (!clip) {
      return 2000; // Default fallback
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

      const targetAngle =
        this.turn.startAngle - this.animation.settings!.turnBaseAngle;
      this.model.rotation.y = THREE.MathUtils.lerp(
        this.turn.startAngle,
        targetAngle,
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
