import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import { webSocketService } from '../../services/WebSocketService.ts';
import { MartyController } from './MartyController.ts';

/**
 * Marty
 * The robot character with animations and movement
 */
export default class Marty {
  experience: Experience;
  scene: THREE.Scene;
  resources: any;
  time: any;
  debug: any;
  debugFolder?: any;
  resource: any;
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
  animation: {
    mixer?: THREE.AnimationMixer;
    actions?: {
      walking?: THREE.AnimationAction;
      waving?: THREE.AnimationAction;
      current?: THREE.AnimationAction | null;
    };
    settings?: {
      timeScale: number;
      crossFadeDuration: number;
    };
    clips?: {
      walking?: THREE.AnimationClip;
      waving?: THREE.AnimationClip;
    };
    play?: (name: string, options?: { autoStop?: boolean }) => void;
    stop?: () => void;
  };

  constructor() {
    this.experience = (window as any).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.debug = this.experience.debug;

    // Debug
    if (this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('marty');
    }

    // Setup
    this.resource = this.resources.items.martyModel;

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
      if (data.action) {
        this.controller!.enqueueCommand(data);
      }
    });
  }

  private setModel() {
    if (!this.resource || !this.resource.scene) {
      // Fallback: Create a simple box as placeholder
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: '#ff6b6b' });
      this.model = new THREE.Mesh(geometry, material) as any;
      this.model!.position.set(0, 0.5, 0);
      this.model!.castShadow = true;
      this.scene.add(this.model!);
      return;
    }

    this.model = this.resource.scene;
    this.model!.scale.set(0.5, 0.5, 0.5);
    this.model!.position.set(2, 0, 0);
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
    console.log('Available animations:', this.resource.animations);
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
      this.resource.animations.find((clip: THREE.AnimationClip) =>
        clip.name.toLowerCase().includes('walking'),
      ) || this.resource.animations[0];

    const wavingClip =
      this.resource.animations.find((clip: THREE.AnimationClip) =>
        clip.name.toLowerCase().includes('waving'),
      ) ||
      this.resource.animations[1] ||
      walkingClip;

    console.log('Walking clip:', walkingClip?.name);
    console.log('Waving clip:', wavingClip?.name);

    // Store the clips for duration access
    this.animation.clips = {
      walking: walkingClip,
      waving: wavingClip,
    };

    this.animation.actions.walking =
      this.animation.mixer.clipAction(walkingClip);
    this.animation.actions.waving = this.animation.mixer.clipAction(wavingClip);

    // Configurer les animations pour ne se jouer qu'une fois
    this.animation.actions.walking.setLoop(THREE.LoopOnce, 1);
    this.animation.actions.waving.setLoop(THREE.LoopOnce, 1);
    this.animation.actions.walking.clampWhenFinished = true;
    this.animation.actions.waving.clampWhenFinished = true;

    this.animation.actions.current = null; // Pas d'animation au démarrage

    this.animation.settings = { timeScale: 1, crossFadeDuration: 0.6 };

    this.animation.play = (name: string, options?: { autoStop?: boolean }) => {
      const newAction = this.animation.actions![name as 'walking' | 'waving'];
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
            (walkingClip.duration * 1000) / this.animation.settings!.timeScale,
          );
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
        moveSpeed: this.movement.speed,
        moveFrames: this.movement.moveFrames,
        cycleFrames: this.movement.cycleFrames,
        playWalking: () => {
          this.animation.play!('walking');
        },
        playWaving: () => {
          this.animation.play!('waving');
        },
        stopAnimation: () => {
          this.animation.stop!();
        },
      };

      // Animation controls
      this.debugFolder.add(debugObject, 'playWalking');
      this.debugFolder.add(debugObject, 'playWaving');
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
  getAnimationDuration(name: 'walking' | 'waving'): number {
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
  }

  private updateMovement(deltaSeconds: number) {
    if (!this.model) return;

    if (this.movement.active) {
      this.movement.moveTimer += deltaSeconds;
      // Avancer dans la direction Z positive (vers l'avant selon l'orientation)
      this.model.position.z += this.movement.speed * deltaSeconds;

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
