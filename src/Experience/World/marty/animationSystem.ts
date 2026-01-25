import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type Debug from '../../Utils/Debug.tsx';

type GuiFolder = ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;

export type AnimationName =
  | 'walking'
  | 'waving'
  | 'turnRight'
  | 'turnLeft'
  | 'kick'
  | 'dance'
  | 'slideLeft'
  | 'slideRight'
  | 'getReady';

export interface MovementState {
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
  phases: MovementPhase[];
  currentPhaseIndex: number;
}

export interface MovementPhase {
  type: 'rest' | 'move';
  duration: number; // in seconds
  elapsed: number;
}

export interface TurnState {
  active: boolean;
  elapsed: number;
  delay: number;
  duration: number;
  startAngle: number;
  targetAngle: number;
  state: 'idle' | 'waiting' | 'rotating' | 'resumeWait';
  resumeDelay: number;
  turnAction: THREE.AnimationAction | null;
}

export interface SlideState {
  enabled: boolean;
  direction: 'left' | 'right' | null;
  speed: number;
  elapsed: number;
  duration: number;
}

export interface AnimationState {
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
  play?: (name: AnimationName, options?: { autoStop?: boolean }) => void;
  stop?: () => void;
}

export const createMovementState = (): MovementState => ({
  speed: 0.025,
  fps: 30,
  moveFrames: 30,
  cycleFrames: 70,
  moveDuration: 0,
  restDuration: 0,
  enabled: false,
  active: false,
  moveTimer: 0,
  restTimer: 0,
  phases: [],
  currentPhaseIndex: 0,
});

export const createTurnState = (): TurnState => ({
  active: false,
  elapsed: 0,
  delay: 30 / 30,
  duration: 0,
  startAngle: 0,
  targetAngle: 0,
  state: 'idle',
  resumeDelay: 0,
  turnAction: null,
});

export const createSlideState = (): SlideState => ({
  enabled: false,
  direction: null,
  speed: 0.025,
  elapsed: 0,
  duration: 1.7,
});

export const createAnimationState = (): AnimationState => ({ });

export const syncMovementDurations = (movement: MovementState, turn: TurnState) => {
  const { fps } = movement;
  const moveFrames = Math.max(movement.moveFrames, 0);
  const cycleFrames = Math.max(movement.cycleFrames, moveFrames);

  movement.moveFrames = moveFrames;
  movement.cycleFrames = cycleFrames;
  movement.moveDuration = moveFrames / fps;
  movement.restDuration = (cycleFrames - moveFrames) / fps;

  turn.delay = 30 / fps;

  if (movement.active) {
    movement.moveTimer = Math.min(movement.moveTimer, movement.moveDuration);
  } else {
    movement.restTimer = Math.min(movement.restTimer, movement.restDuration);
  }
};

export const configureMultiStepTiming = (
  movement: MovementState,
  intervals: { start: number; end: number }[],
  fps: number = movement.fps,
) => {
  const phases: MovementPhase[] = [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const interval of sorted) {
    const restFrames = Math.max(interval.start - cursor, 0);
    if (restFrames > 0) {
      phases.push({
        type: 'rest',
        duration: restFrames / fps,
        elapsed: 0,
      });
    }

    const moveFrames = Math.max(interval.end - interval.start, 0);
    if (moveFrames > 0) {
      phases.push({
        type: 'move',
        duration: moveFrames / fps,
        elapsed: 0,
      });
    }

    cursor = Math.max(cursor, interval.end);
  }

  movement.phases = phases;
  movement.currentPhaseIndex = 0;
  movement.active = phases[0]?.type === 'move';
};

import type Time from '../../Utils/Time.tsx';

interface AnimationSetupParams {
  model?: THREE.Group;
  resource?: GLTF;
  movement: MovementState;
  turn: TurnState;
  slide: SlideState;
  animation: AnimationState;
  debug: Debug;
  debugFolder?: GuiFolder;
  time?: Time;
  onMovementChange: () => void;
}

export const setupAnimationSystem = ({
  model,
  resource,
  movement,
  turn,
  slide,
  animation,
  debug,
  debugFolder,
  time,
  onMovementChange,
}: AnimationSetupParams) => {
  if (!model || !resource?.animations) {
    return;
  }

  animation.mixer = new THREE.AnimationMixer(model);
  animation.actions = {};

  const walkingClip =
    resource.animations.find((clip) =>
      clip.name.toLowerCase().includes('walking'),
    ) || resource.animations[0];

  const wavingClip =
    resource.animations.find((clip) =>
      clip.name.toLowerCase().includes('waving'),
    ) || resource.animations[1] || walkingClip;

  const getReadyClip = resource.animations.find((clip) =>
    clip.name.toLowerCase().includes('getready') ||
    clip.name.toLowerCase().includes('get_ready'),
  );

  const turnRightClip = resource.animations.find((clip) =>
    clip.name.toLowerCase().includes('turn_right') ||
    clip.name.toLowerCase().includes('turnright'),
  );

  const turnLeftClip = resource.animations.find((clip) =>
    clip.name.toLowerCase().includes('turn_left') ||
    clip.name.toLowerCase().includes('turnleft'),
  );

  const kickClip = resource.animations.find((clip) =>
    clip.name.toLowerCase().includes('kick'),
  );

  const danceClip = resource.animations.find((clip) =>
    clip.name.toLowerCase().includes('dance'),
  );

  const slideLeftClip = resource.animations.find((clip) =>
    clip.name.toLowerCase().includes('slide') &&
    clip.name.toLowerCase().includes('left'),
  );

  const slideRightClip = resource.animations.find((clip) =>
    clip.name.toLowerCase().includes('slide') &&
    clip.name.toLowerCase().includes('right'),
  );

  animation.clips = {
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

  animation.actions.walking = animation.mixer.clipAction(walkingClip);
  animation.actions.waving = animation.mixer.clipAction(wavingClip);

  if (getReadyClip) {
    animation.actions.getReady = animation.mixer.clipAction(getReadyClip);
    animation.actions.getReady.setLoop(THREE.LoopOnce, 1);
    animation.actions.getReady.clampWhenFinished = true;
  }

  if (turnRightClip) {
    animation.actions.turnRight = animation.mixer.clipAction(turnRightClip);
    animation.actions.turnRight.setLoop(THREE.LoopOnce, 1);
    animation.actions.turnRight.clampWhenFinished = true;
  }

  if (turnLeftClip) {
    animation.actions.turnLeft = animation.mixer.clipAction(turnLeftClip);
    animation.actions.turnLeft.setLoop(THREE.LoopOnce, 1);
    animation.actions.turnLeft.clampWhenFinished = true;
  }

  if (kickClip) {
    animation.actions.kick = animation.mixer.clipAction(kickClip);
    animation.actions.kick.setLoop(THREE.LoopOnce, 1);
    animation.actions.kick.clampWhenFinished = true;
  }

  if (danceClip) {
    animation.actions.dance = animation.mixer.clipAction(danceClip);
    animation.actions.dance.setLoop(THREE.LoopOnce, 1);
    animation.actions.dance.clampWhenFinished = true;
  }

  if (slideLeftClip) {
    animation.actions.slideLeft = animation.mixer.clipAction(slideLeftClip);
    animation.actions.slideLeft.setLoop(THREE.LoopOnce, 1);
    animation.actions.slideLeft.clampWhenFinished = true;
  }

  if (slideRightClip) {
    animation.actions.slideRight = animation.mixer.clipAction(slideRightClip);
    animation.actions.slideRight.setLoop(THREE.LoopOnce, 1);
    animation.actions.slideRight.clampWhenFinished = true;
  }

  animation.actions.walking.setLoop(THREE.LoopOnce, 1);
  animation.actions.waving.setLoop(THREE.LoopOnce, 1);
  animation.actions.walking.clampWhenFinished = true;
  animation.actions.waving.clampWhenFinished = true;

  animation.actions.current = null;

  animation.settings = {
    timeScale: 1,
    crossFadeDuration: 0.6,
    turnBaseAngle: THREE.MathUtils.degToRad(30),
  };

  animation.play = (name, options) => {
    if (!animation.actions) return;
    const newAction = animation.actions[name];
    if (!newAction) return;

    const oldAction = animation.actions.current;
    const crossFadeDuration = 1;

    newAction.stop();
    newAction.reset();
    newAction.play();

    if (oldAction && oldAction !== newAction) {
      newAction.crossFadeFrom(oldAction, crossFadeDuration, false);
    }

    animation.actions.current = newAction;

    if (name === 'walking') {
      movement.enabled = true;
      // Tightened intervals to reduce foot sliding:
      // First step: delayed start (33 vs 30) to let animation plant the right foot first
      // Second step: similar tightening for consistency
      configureMultiStepTiming(
        movement,
        [
          { start: 35, end: 53 },   // First step: left foot lifts, right foot planted
          { start: 112, end: 132 }, // Second step: right foot lifts, left foot planted
        ],
        30,
      );
      movement.moveTimer = 0;
      movement.restTimer = 0;

      const shouldAutoStop = options?.autoStop !== false;
      if (shouldAutoStop) {
        const animationDuration = getAnimationDuration(animation, turn, 'walking');

        const onComplete = () => {
          movement.enabled = false;
          movement.active = false;

          if (animation.actions?.getReady) {
            const getReadyAction = animation.actions.getReady;
            const currentAction = animation.actions.current;

            getReadyAction.stop();
            getReadyAction.reset();
            getReadyAction.play();

            if (currentAction && currentAction !== getReadyAction) {
              getReadyAction.crossFadeFrom(currentAction, 1, false);
            }

            animation.actions.current = getReadyAction;
          }
        };

        if (time) {
          time.wait(animationDuration).then(onComplete);
        } else {
          setTimeout(onComplete, animationDuration);
        }
      }
    }

    if (name === 'waving') {
      movement.enabled = false;
      movement.active = false;

      const shouldAutoStop = options?.autoStop !== false;
      if (shouldAutoStop) {
        const animationDuration = getAnimationDuration(animation, turn, 'waving');

        const onComplete = () => {
          if (animation.actions?.getReady) {
            const getReadyAction = animation.actions.getReady;
            const currentAction = animation.actions.current;

            getReadyAction.stop();
            getReadyAction.reset();
            getReadyAction.play();

            if (currentAction && currentAction !== getReadyAction) {
              getReadyAction.crossFadeFrom(currentAction, 1, false);
            }

            animation.actions.current = getReadyAction;
          }
        };

        if (time) {
          time.wait(animationDuration).then(onComplete);
        } else {
          setTimeout(onComplete, animationDuration);
        }
      }
    }

    if (name === 'getReady') {
      movement.enabled = false;
      movement.active = false;
    }

    if (name === 'turnRight' || name === 'turnLeft') {
      movement.enabled = false;
      movement.active = false;

      turn.active = true;
      turn.elapsed = 0;
      turn.startAngle = model?.rotation.y ?? 0;
      turn.state = 'waiting';
      turn.turnAction = name === 'turnRight'
        ? animation.actions.turnRight || null
        : animation.actions.turnLeft || null;

      const angleDeg = THREE.MathUtils.radToDeg(animation.settings!.turnBaseAngle);
      const absAngleDeg = Math.max(Math.abs(angleDeg), 1);
      const baseSpeedDegPerSec = 60;

      turn.duration = absAngleDeg / baseSpeedDegPerSec;
      turn.resumeDelay = turn.duration * 0.2;
      turn.targetAngle =
        (model?.rotation.y ?? 0) +
        (name === 'turnRight'
          ? -animation.settings!.turnBaseAngle
          : animation.settings!.turnBaseAngle);
    }

    if (name === 'slideLeft') {
      movement.enabled = false;
      movement.active = false;
      slide.enabled = true;
      slide.direction = 'left';
      slide.elapsed = 0;
    }

    if (name === 'slideRight') {
      movement.enabled = false;
      movement.active = false;
      slide.enabled = true;
      slide.direction = 'right';
      slide.elapsed = 0;
    }

    const animationsWithGetReady = ['turnRight', 'turnLeft', 'kick', 'dance', 'slideLeft', 'slideRight'] as const;
    type AnimationWithGetReady = (typeof animationsWithGetReady)[number];
    const requiresGetReady = (value: string): value is AnimationWithGetReady =>
      animationsWithGetReady.includes(value as AnimationWithGetReady);

    if (requiresGetReady(name)) {
      const shouldAutoStop = options?.autoStop !== false;
      if (shouldAutoStop) {
        const animationDuration = getAnimationDuration(animation, turn, name as AnimationName);

        const onComplete = () => {
          slide.enabled = false;

          if (animation.actions?.getReady) {
            const getReadyAction = animation.actions.getReady;
            const currentAction = animation.actions.current;

            getReadyAction.stop();
            getReadyAction.reset();
            getReadyAction.play();

            if (currentAction && currentAction !== getReadyAction) {
              getReadyAction.crossFadeFrom(currentAction, 1, false);
            }

            animation.actions.current = getReadyAction;
          }
        };

        if (time) {
          time.wait(animationDuration).then(onComplete);
        } else {
          setTimeout(onComplete, animationDuration);
        }
      }
    }
  };

  animation.stop = () => {
    if (animation.actions?.current) {
      animation.actions.current.fadeOut(animation.settings!.crossFadeDuration);
      animation.actions.current = null;
    }
  };

  if (debug.active && debugFolder && animation.settings && animation.actions) {
    const debugObject = {
      timeScale: animation.settings.timeScale,
      crossFadeDuration: animation.settings.crossFadeDuration,
      turnBaseAngleDeg: THREE.MathUtils.radToDeg(animation.settings.turnBaseAngle),
      moveSpeed: movement.speed,
      moveFrames: movement.moveFrames,
      cycleFrames: movement.cycleFrames,
      playWalking: () => animation.play?.('walking'),
      playWaving: () => animation.play?.('waving'),
      playTurnRight: () => animation.actions?.turnRight && animation.play?.('turnRight'),
      playTurnLeft: () => animation.actions?.turnLeft && animation.play?.('turnLeft'),
      playKick: () => animation.actions?.kick && animation.play?.('kick'),
      playDance: () => animation.actions?.dance && animation.play?.('dance'),
      playSlideLeft: () => animation.actions?.slideLeft && animation.play?.('slideLeft'),
      playSlideRight: () => animation.actions?.slideRight && animation.play?.('slideRight'),
      playGetReady: () => animation.actions?.getReady && animation.play?.('getReady'),
      stopAnimation: () => animation.stop?.(),
    };

    debugFolder.add(debugObject, 'playWalking');
    debugFolder.add(debugObject, 'playWaving');
    if (animation.actions.turnRight) {
      debugFolder.add(debugObject, 'playTurnRight');
    }
    if (animation.actions.turnLeft) {
      debugFolder.add(debugObject, 'playTurnLeft');
    }
    if (animation.actions.kick) {
      debugFolder.add(debugObject, 'playKick');
    }
    if (animation.actions.dance) {
      debugFolder.add(debugObject, 'playDance');
    }
    if (animation.actions.slideLeft) {
      debugFolder.add(debugObject, 'playSlideLeft');
    }
    if (animation.actions.slideRight) {
      debugFolder.add(debugObject, 'playSlideRight');
    }
    if (animation.actions.getReady) {
      debugFolder.add(debugObject, 'playGetReady');
    }
    debugFolder.add(debugObject, 'stopAnimation');
    debugFolder
      .add(debugObject, 'timeScale', 0.1, 2)
      .onChange((value: number) => {
        if (animation.settings) {
          animation.settings.timeScale = value;
        }
      });
    debugFolder
      .add(debugObject, 'crossFadeDuration', 0.1, 2)
      .onChange((value: number) => {
        if (animation.settings) {
          animation.settings.crossFadeDuration = value;
        }
      });
    debugFolder
      .add(debugObject, 'turnBaseAngleDeg', -180, 180, 1)
      .onChange((value: number) => {
        if (animation.settings) {
          animation.settings.turnBaseAngle = THREE.MathUtils.degToRad(value);
        }
      });
    debugFolder
      .add(debugObject, 'moveSpeed', 0.1, 3)
      .onChange((value: number) => {
        movement.speed = value;
      });
    debugFolder
      .add(debugObject, 'moveFrames', 1, 60, 1)
      .onChange((value: number) => {
        movement.moveFrames = Math.min(value, movement.cycleFrames);
        debugObject.moveFrames = movement.moveFrames;
        onMovementChange();
      });
    debugFolder
      .add(debugObject, 'cycleFrames', 1, 180, 1)
      .onChange((value: number) => {
        movement.cycleFrames = Math.max(value, movement.moveFrames);
        debugObject.cycleFrames = movement.cycleFrames;
        onMovementChange();
      });
  }
};

interface AnimationDurationOptions {
  angle?: number;
}

export const getAnimationDuration = (
  animation: AnimationState,
  turn: TurnState,
  name: AnimationName,
  options?: AnimationDurationOptions,
): number => {
  if (!animation.clips || !animation.settings) {
    return 2000;
  }

  const clip = animation.clips[name];
  if (!clip) {
    return 2000;
  }

  if ((name === 'turnRight' || name === 'turnLeft') && options?.angle !== undefined) {
    const baseAnimationDuration = (clip.duration * 1000) / animation.settings.timeScale;
    const absAngle = Math.abs(options.angle);
    const baseSpeedDegPerSec = 60;

    const rotationDuration = (absAngle / baseSpeedDegPerSec) * 1000;
    const delayMs = turn.delay * 1000;
    const resumeDelayMs = rotationDuration * 0.2;

    return Math.max(baseAnimationDuration, delayMs + rotationDuration + resumeDelayMs);
  }

  return (clip.duration * 1000) / animation.settings.timeScale;
};

interface AnimationUpdateParams {
  animation: AnimationState;
  movement: MovementState;
  turn: TurnState;
  slide: SlideState;
  model?: THREE.Group;
  deltaSeconds: number;
}

export const updateAnimationSystem = ({
  animation,
  movement,
  turn,
  slide,
  model,
  deltaSeconds,
}: AnimationUpdateParams) => {
  if (animation.mixer && animation.actions?.current) {
    animation.mixer.timeScale = animation.settings?.timeScale ?? 1;
    animation.mixer.update(deltaSeconds);
  }

  if (movement.enabled) {
    updateMovement(movement, model, deltaSeconds);
  }

  if (slide.enabled) {
    updateSlide(slide, model, deltaSeconds);
  }

  updateTurn(turn, model, deltaSeconds);
};

const updateMovement = (
  movement: MovementState,
  model: THREE.Group | undefined,
  deltaSeconds: number,
) => {
  if (!model) return;

  if (!movement.phases.length) {
    movement.enabled = false;
    movement.active = false;
    return;
  }

  let remaining = deltaSeconds;
  while (remaining > 0 && movement.currentPhaseIndex < movement.phases.length) {
    const phase = movement.phases[movement.currentPhaseIndex];
    const remainingPhaseTime = Math.max(phase.duration - phase.elapsed, 0);
    const step = Math.min(remaining, remainingPhaseTime);

    if (phase.type === 'move') {
      const distance = movement.speed * step;
      model.translateZ(distance);
    }

    phase.elapsed += step;
    remaining -= step;

    if (phase.elapsed >= phase.duration) {
      movement.currentPhaseIndex += 1;
    }
  }

  const current = movement.phases[movement.currentPhaseIndex];
  movement.active = current?.type === 'move';

  if (movement.currentPhaseIndex >= movement.phases.length) {
    movement.enabled = false;
    movement.active = false;
  }
};

const updateTurn = (
  turn: TurnState,
  model: THREE.Group | undefined,
  deltaSeconds: number,
) => {
  if (!turn || !turn.active || !model) return;

  turn.elapsed += deltaSeconds;
  const { state } = turn;

  if (state === 'waiting') {
    if (turn.elapsed >= turn.delay) {
      if (turn.turnAction) {
        turn.turnAction.paused = true;
      }
      turn.state = 'rotating';
      turn.elapsed = 0;
    }
    return;
  }

  if (state === 'rotating') {
    const t = Math.min(turn.elapsed / turn.duration, 1);

    model.rotation.y = THREE.MathUtils.lerp(
      turn.startAngle,
      turn.targetAngle,
      t,
    );

    if (t >= 1) {
      turn.state = 'resumeWait';
      turn.elapsed = 0;
    }
    return;
  }

  if (state === 'resumeWait') {
    if (turn.elapsed >= turn.resumeDelay) {
      if (turn.turnAction) {
        turn.turnAction.paused = false;
      }
      turn.active = false;
      turn.state = 'idle';
    }
  }
};

const updateSlide = (
  slide: SlideState,
  model: THREE.Group | undefined,
  deltaSeconds: number,
) => {
  if (!model || !slide.enabled) return;

  slide.elapsed += deltaSeconds;

  const distance = slide.speed * deltaSeconds;
  if (slide.direction === 'left') {
    model.translateX(distance);
  } else if (slide.direction === 'right') {
    model.translateX(-distance);
  }

  if (slide.elapsed >= slide.duration) {
    slide.enabled = false;
    slide.elapsed = 0;
  }
};
