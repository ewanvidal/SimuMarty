/**
 * Procedural Turn Animation System for Marty Robot
 *
 * This module implements a procedural turn animation (no pre-baked Blender animations).
 *
 * HOW IT WORKS:
 * -------------
 * A turn is broken into 5 phases that repeat for each "step" (max 30° per step):
 *
 * 1. SHIFT-WEIGHT: Lean toward supporting leg (ankles tilt, body translates)
 * 2. LIFT-FOOT: Lift the free foot higher
 * 3. ROTATE-BODY: Pivot around the supporting foot (the actual turn)
 * 4. LOWER-FOOT: Put the free foot back down
 * 5. STRAIGHTEN: Return to neutral stance
 *
 * For turns > 30°, we alternate legs (right-left-right-left...).
 *
 * KEY CONCEPT: "Pivot Rotation"
 * When rotating, the supporting foot stays planted on the ground.
 * We rotate the entire model around the foot, then counter-rotate
 * the ankle/foot bones so they appear stationary.
 */

import * as THREE from 'three';
import type { BoneNode } from './model.ts';
import {
  applyPivotRotationY,
  capturePivotRotationState,
  findModelRoot,
  getExcludedBonesForLeg,
  type PivotRotationState,
  type SupportingLeg,
} from './model.ts';

// ============================================================================
// TYPES
// ============================================================================

export type TurnDirection = 'left' | 'right';
export type { SupportingLeg } from './model.ts';

/** The 5 phases of a turn step, plus idle/complete/final-reset states */
export type TurnPhase =
  | 'idle'
  | 'shift-weight'
  | 'lift-foot'
  | 'rotate-body'
  | 'lower-foot'
  | 'straighten'
  | 'final-reset' // Smooth reset to neutral at the very end
  | 'complete';

/** Configuration for a single turn step (max 30°) */
export interface TurnStepConfig {
  direction: TurnDirection;
  supportingLeg: SupportingLeg;
  angleDegrees: number;
}

/** Current state of the turn animation */
export interface ProceduralTurnState {
  active: boolean;
  direction: TurnDirection;
  totalAngle: number;
  completedAngle: number;
  currentStep: TurnStepConfig | null;
  phase: TurnPhase;
  phaseElapsed: number;
  phaseDuration: number;
  stepIndex: number;
  totalSteps: number;
  onComplete?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum rotation per step - larger turns need multiple steps */
const MAX_ANGLE_PER_STEP = 30;

/** Duration (seconds) for each phase */
const PHASE_DURATIONS: Record<string, number> = {
  'shift-weight': 1.0,
  'lift-foot': 0.5,
  'rotate-body': 1.0,
  'lower-foot': 0.5,
  straighten: 1.0,
  'final-reset': 0.8, // Smooth transition back to neutral stance
};

/** Rotation angles (degrees) for the turn animation */
const TURN_ANGLES = {
  weightShift: { ankle: 40 }, // Ankle tilt during weight shift
  footLift: { ankleIncrease: 10 }, // Extra tilt when lifting foot (40+10=50°)
  bodyTranslation: { x: -0.45, y: -0.16 }, // Body moves toward supporting leg
};

/** Bone naming for left/right legs */
const LEG_BONES = {
  left: { ankle: 'LegL002', foot: 'LegL003' },
  right: { ankle: 'LegR002', foot: 'LegR003' },
};

/**
 * Axis multiplier to handle mirrored bone orientations.
 * If legs bend in wrong directions, adjust these values.
 */
const LEG_AXIS_MULT: Record<'left' | 'right', number> = { left: -1, right: 1 };

/** Bone groups (exported for reference/documentation) */
const BONE_GROUPS = {
  leftLeg: ['LegL', 'LegL001', 'LegL002', 'LegL003'],
  rightLeg: ['LegR', 'LegR001', 'LegR002', 'LegR003'],
  body: ['Root', 'Body', 'Head', 'EyeL', 'EyeR', 'ArmL', 'ArmR'],
  leftArm: ['ArmL'],
  rightArm: ['ArmR'],
  head: ['Head', 'EyeL', 'EyeR'],
};

/** Bones that should NOT be animated during turn (arms stay still) */
const EXCLUDED_FROM_TURN = ['ArmL', 'ArmR'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Smooth easing for natural movement */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Smoother cubic easing for rotation */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Wrap angle to [-π, π] range */
function wrapPi(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Interpolate between two angles, taking the shortest path.
 * @param startAngle - The starting angle in radians
 * @param endAngle - The ending angle in radians
 * @param t - Interpolation factor (0 = startAngle, 1 = endAngle)
 * @returns The interpolated angle in radians
 */
function lerpAngleShortest(
  startAngle: number,
  endAngle: number,
  t: number,
): number {
  return startAngle + wrapPi(endAngle - startAngle) * t;
}

/** Calculate how many steps needed for a given angle */
function calculateTurnSteps(angleDeg: number): number {
  return Math.ceil(Math.abs(angleDeg) / MAX_ANGLE_PER_STEP);
}

/**
 * Generate the sequence of turn steps.
 * Alternates supporting legs for multi-step turns.
 */
function generateTurnStepSequence(
  direction: TurnDirection,
  totalAngleDeg: number,
): TurnStepConfig[] {
  const numSteps = calculateTurnSteps(totalAngleDeg);
  const anglePerStep = Math.abs(totalAngleDeg) / numSteps;

  // Start with same-side leg as support (right turn = right leg support)
  let support: SupportingLeg = direction;

  const steps: TurnStepConfig[] = [];
  for (let i = 0; i < numSteps; i++) {
    steps.push({
      direction,
      supportingLeg: support,
      angleDegrees: anglePerStep,
    });
    support = support === 'left' ? 'right' : 'left'; // Alternate
  }
  return steps;
}

// ============================================================================
// QUATERNION HELPERS (for smooth ankle rotations)
// ============================================================================

/**
 * Decompose quaternion into swing (perpendicular) and twist (around axis) components.
 * This is useful for rotating around a specific axis (like the ankle hinge).
 *
 * @param q - The quaternion to decompose
 * @param axis - The axis to decompose around (e.g., X axis for ankle hinge)
 * @returns Object with swing (orientation) and twist (rotation around axis) quaternions
 */
function decomposeSwingTwist(q: THREE.Quaternion, axis: THREE.Vector3) {
  const a = axis.clone().normalize();
  const v = new THREE.Vector3(q.x, q.y, q.z);
  const proj = a.multiplyScalar(v.dot(a));

  // Handle edge case: if projection is near zero, twist is identity-like
  let twist: THREE.Quaternion;
  if (proj.lengthSq() < 1e-8) {
    twist = new THREE.Quaternion(0, 0, 0, q.w).normalize();
  } else {
    twist = new THREE.Quaternion(proj.x, proj.y, proj.z, q.w).normalize();
  }

  const swing = q.clone().multiply(twist.clone().invert());
  return { swing, twist };
}

/** Get the signed rotation angle around an axis from a twist quaternion */
function getTwistAngle(twist: THREE.Quaternion, axis: THREE.Vector3): number {
  const a = axis.clone().normalize();
  const dotProduct = a.dot(new THREE.Vector3(twist.x, twist.y, twist.z));
  return 2 * Math.atan2(dotProduct, twist.w);
}

/** Extract rotation axis from a quaternion delta */
function axisFromQuatDelta(delta: THREE.Quaternion): THREE.Vector3 {
  const dq = delta.clone().normalize();
  if (dq.w < 0) {
    dq.x *= -1;
    dq.y *= -1;
    dq.z *= -1;
    dq.w *= -1;
  }
  const s = Math.sqrt(Math.max(0, 1 - dq.w * dq.w));
  if (s < 1e-6) return new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3(dq.x / s, dq.y / s, dq.z / s).normalize();
}

// ============================================================================
// CONTROLLER INTERFACE
// ============================================================================

export interface ProceduralTurnOptions {
  getBoneNodes: () => BoneNode[];
  getInitialRotation: (boneName: string) => THREE.Euler | undefined;
  getModel: () => THREE.Group | undefined;
}

export interface ProceduralTurnController {
  turnRight: (angleDeg: number) => Promise<void>;
  turnLeft: (angleDeg: number) => Promise<void>;
  getState: () => ProceduralTurnState;
  isActive: () => boolean;
  cancel: () => void;
  update: (deltaSeconds: number) => void;
  getEstimatedDuration: (angleDeg: number) => number;
}

// ============================================================================
// MAIN CONTROLLER FACTORY
// ============================================================================

/**
 * Creates a procedural turn controller for the Marty robot.
 *
 * Usage:
 *   const controller = createProceduralTurnController({ getBoneNodes, getInitialRotation, getModel });
 *   await controller.turnRight(90); // Turn 90° right
 *   // Call controller.update(deltaSeconds) every frame
 */
export function createProceduralTurnController({
  getBoneNodes,
  getInitialRotation,
  getModel,
}: ProceduralTurnOptions): ProceduralTurnController {
  // ----- STATE -----
  const state: ProceduralTurnState = {
    active: false,
    direction: 'right',
    totalAngle: 0,
    completedAngle: 0,
    currentStep: null,
    phase: 'idle',
    phaseElapsed: 0,
    phaseDuration: 0,
    stepIndex: 0,
    totalSteps: 0,
  };

  let stepSequence: TurnStepConfig[] = [];
  let resolvePromise: (() => void) | null = null;

  // Bone rotation snapshots for interpolation
  let phaseStartSnapshot: Map<string, THREE.Euler> = new Map();
  let phaseTargetSnapshot: Map<string, THREE.Euler> = new Map();

  // Body position tracking
  const bodyStartPos = new THREE.Vector3();
  const bodyTargetPos = new THREE.Vector3();
  const bodyInitialPos = new THREE.Vector3();

  // Pivot rotation (for rotate-body phase)
  let pivotState: PivotRotationState | null = null;
  let pivotBone: BoneNode | null = null;
  let pivotExcludedBones: BoneNode[] = [];
  let pivotStartAngle = 0;
  let pivotTargetAngle = 0;

  // Hinge plans for quaternion-based ankle control
  type HingePlan = {
    boneName: string;
    swing: THREE.Quaternion;
    axis: THREE.Vector3;
    startAngle: number;
    targetAngle: number;
  };
  let hingePlans: HingePlan[] = [];

  // Straighten phase ankle reset
  let straightenAnkle: {
    name: string;
    swing: THREE.Quaternion;
    axis: THREE.Vector3;
    start: number;
    target: number;
  } | null = null;
  let supportAnkleAxis: THREE.Vector3 | null = null;

  // ----- BONE HELPERS -----

  const findBone = (name: string) =>
    getBoneNodes().find((b) => b.name === name);
  const getSupportBones = (leg: SupportingLeg) => LEG_BONES[leg];
  const getFreeBones = (leg: SupportingLeg) =>
    LEG_BONES[leg === 'right' ? 'left' : 'right'];

  const getLegAxisMult = (boneName: string): number => {
    if (boneName.startsWith('LegL')) return LEG_AXIS_MULT.left;
    if (boneName.startsWith('LegR')) return LEG_AXIS_MULT.right;
    return 1;
  };

  // ----- SNAPSHOT FUNCTIONS -----

  /** Capture current rotation of all bones */
  const captureSnapshot = (): Map<string, THREE.Euler> => {
    const snapshot = new Map<string, THREE.Euler>();
    getBoneNodes().forEach((bone) =>
      snapshot.set(bone.name, bone.object.rotation.clone()),
    );
    return snapshot;
  };

  /** Interpolate bone rotations between two snapshots (excludes arms) */
  const interpolateSnapshot = (
    start: Map<string, THREE.Euler>,
    target: Map<string, THREE.Euler>,
    progress: number,
  ) => {
    const t = easeInOutQuad(progress);
    start.forEach((startRot, boneName) => {
      // Skip arms - they should not move during turns
      if (EXCLUDED_FROM_TURN.includes(boneName)) return;

      const targetRot = target.get(boneName);
      const bone = findBone(boneName);
      if (!targetRot || !bone) return;
      bone.object.rotation.x = THREE.MathUtils.lerp(startRot.x, targetRot.x, t);
      bone.object.rotation.y = THREE.MathUtils.lerp(startRot.y, targetRot.y, t);
      bone.object.rotation.z = THREE.MathUtils.lerp(startRot.z, targetRot.z, t);
    });
  };

  /**
   * Apply ankle+foot rotation pair.
   * Foot counter-rotates to stay flat on the ground.
   */
  const applyAnkleFootRotation = (
    target: Map<string, THREE.Euler>,
    ankleName: string,
    footName: string,
    degrees: number,
    visualSign: number,
  ) => {
    const ankleEuler = target.get(ankleName);
    const footEuler = target.get(footName);
    const ankleBase = getInitialRotation(ankleName) || new THREE.Euler();
    const footBase = getInitialRotation(footName) || new THREE.Euler();
    const axisMult = getLegAxisMult(ankleName);
    const rad = THREE.MathUtils.degToRad(degrees * visualSign * axisMult);
    if (ankleEuler) ankleEuler.x = ankleBase.x + rad;
    if (footEuler) footEuler.x = footBase.x - rad;
  };

  // ----- TARGET CALCULATION FOR EACH PHASE -----

  const calculateWeightShiftTarget = (step: TurnStepConfig) => {
    const target = captureSnapshot();
    const sign = step.supportingLeg === 'right' ? 1 : -1;
    const support = getSupportBones(step.supportingLeg);
    const free = getFreeBones(step.supportingLeg);
    applyAnkleFootRotation(
      target,
      support.ankle,
      support.foot,
      TURN_ANGLES.weightShift.ankle,
      sign,
    );
    applyAnkleFootRotation(
      target,
      free.ankle,
      free.foot,
      TURN_ANGLES.weightShift.ankle,
      sign,
    );
    return target;
  };

  const calculateFootLiftTarget = (step: TurnStepConfig) => {
    const target = captureSnapshot();
    const sign = step.supportingLeg === 'right' ? 1 : -1;
    const free = getFreeBones(step.supportingLeg);
    const totalAngle =
      TURN_ANGLES.weightShift.ankle + TURN_ANGLES.footLift.ankleIncrease;
    applyAnkleFootRotation(target, free.ankle, free.foot, totalAngle, sign);
    return target;
  };

  const calculateLowerFootTarget = (step: TurnStepConfig) => {
    const target = captureSnapshot();
    const sign = step.supportingLeg === 'right' ? 1 : -1;
    const free = getFreeBones(step.supportingLeg);
    applyAnkleFootRotation(
      target,
      free.ankle,
      free.foot,
      TURN_ANGLES.weightShift.ankle,
      sign,
    );
    return target;
  };

  const calculateStraightenTarget = (step: TurnStepConfig) => {
    const target = new Map<string, THREE.Euler>();
    const support = getSupportBones(step.supportingLeg);
    getBoneNodes().forEach((bone) => {
      const initial = getInitialRotation(bone.name);
      // Keep current rotation for support ankle (handled separately with quaternions)
      if (bone.name === support.ankle) {
        target.set(bone.name, bone.object.rotation.clone());
      } else {
        target.set(bone.name, initial?.clone() || bone.object.rotation.clone());
      }
    });
    return target;
  };

  // ----- HINGE PLAN HELPERS -----

  /** Create a hinge plan for quaternion-based ankle rotation */
  const createHingePlan = (
    boneName: string,
    targetAngle: number,
    axis: THREE.Vector3,
  ): HingePlan | null => {
    const bone = findBone(boneName);
    if (!bone) return null;
    const { swing, twist } = decomposeSwingTwist(
      bone.object.quaternion.clone(),
      axis,
    );
    return {
      boneName,
      swing,
      axis: axis.clone(),
      startAngle: getTwistAngle(twist, axis),
      targetAngle,
    };
  };

  /** Setup hinge plans for ankle during weight shift/lift/lower phases */
  const setupAnkleHingePlans = (
    ankleName: string,
    degrees: number,
    visualSign: number,
  ) => {
    const initial = getInitialRotation(ankleName);
    if (!initial) return;
    const axis = new THREE.Vector3(1, 0, 0);
    const axisMult = getLegAxisMult(ankleName);
    const baseQ = new THREE.Quaternion().setFromEuler(initial);
    const baseTheta = getTwistAngle(
      decomposeSwingTwist(baseQ, axis).twist,
      axis,
    );
    const targetTheta =
      baseTheta + THREE.MathUtils.degToRad(degrees * visualSign * axisMult);
    const plan = createHingePlan(ankleName, targetTheta, axis);
    if (plan) hingePlans.push(plan);
  };

  // ----- PHASE TRANSITION -----

  const transitionToPhase = (newPhase: TurnPhase) => {
    state.phase = newPhase;
    state.phaseElapsed = 0;
    hingePlans = [];

    if (newPhase === 'idle' || newPhase === 'complete') {
      state.phaseDuration = 0;
      return;
    }

    state.phaseDuration = PHASE_DURATIONS[newPhase] || 0.3;
    phaseStartSnapshot = captureSnapshot();

    const bodyBone = findBone('Body');
    if (bodyBone) bodyStartPos.copy(bodyBone.object.position);

    if (!state.currentStep) return;
    const step = state.currentStep;
    const bodyXDir = step.supportingLeg === 'right' ? 1 : -1;
    const visualSign = step.supportingLeg === 'right' ? 1 : -1;

    switch (newPhase) {
      case 'shift-weight': {
        phaseTargetSnapshot = calculateWeightShiftTarget(step);
        // Setup hinge plans for both ankles
        const support = getSupportBones(step.supportingLeg);
        const free = getFreeBones(step.supportingLeg);
        setupAnkleHingePlans(
          support.ankle,
          TURN_ANGLES.weightShift.ankle,
          visualSign,
        );
        setupAnkleHingePlans(
          free.ankle,
          TURN_ANGLES.weightShift.ankle,
          visualSign,
        );
        // Body translation
        if (bodyBone) {
          bodyTargetPos.set(
            bodyInitialPos.x + TURN_ANGLES.bodyTranslation.x * bodyXDir,
            bodyInitialPos.y + TURN_ANGLES.bodyTranslation.y,
            bodyStartPos.z,
          );
        }
        break;
      }

      case 'lift-foot': {
        phaseTargetSnapshot = calculateFootLiftTarget(step);
        const free = getFreeBones(step.supportingLeg);
        const totalAngle =
          TURN_ANGLES.weightShift.ankle + TURN_ANGLES.footLift.ankleIncrease;
        setupAnkleHingePlans(free.ankle, totalAngle, visualSign);
        bodyTargetPos.copy(bodyStartPos);
        break;
      }

      case 'rotate-body': {
        phaseTargetSnapshot = captureSnapshot();
        // Capture ankle axis for later straighten phase
        const support = getSupportBones(step.supportingLeg);
        const ankleBone = findBone(support.ankle);
        const initialEuler = getInitialRotation(support.ankle);
        if (ankleBone && initialEuler) {
          const baseQ = new THREE.Quaternion().setFromEuler(initialEuler);
          const delta = baseQ
            .clone()
            .invert()
            .multiply(ankleBone.object.quaternion.clone());
          supportAnkleAxis = axisFromQuatDelta(delta);
        }
        // Setup pivot rotation
        const { excludedBoneNames, pivotBoneName } = getExcludedBonesForLeg(
          step.supportingLeg,
        );
        const bones = getBoneNodes();
        pivotBone = bones.find((b) => b.name === pivotBoneName) || null;
        pivotExcludedBones = bones.filter((b) =>
          excludedBoneNames.includes(b.name),
        );
        if (pivotBone && pivotExcludedBones.length > 0) {
          const model = getModel();
          if (model) {
            pivotState = capturePivotRotationState(
              findModelRoot(pivotBone.object),
              pivotBone,
              pivotExcludedBones,
            );
          }
        }
        const rotRad = THREE.MathUtils.degToRad(step.angleDegrees);
        pivotStartAngle = 0;
        pivotTargetAngle = step.direction === 'right' ? -rotRad : rotRad;
        bodyTargetPos.copy(bodyStartPos);
        break;
      }

      case 'lower-foot': {
        phaseTargetSnapshot = calculateLowerFootTarget(step);
        const free = getFreeBones(step.supportingLeg);
        setupAnkleHingePlans(
          free.ankle,
          TURN_ANGLES.weightShift.ankle,
          visualSign,
        );
        bodyTargetPos.copy(bodyStartPos);
        break;
      }

      case 'straighten': {
        phaseTargetSnapshot = calculateStraightenTarget(step);
        // Setup quaternion-based reset for support ankle
        const support = getSupportBones(step.supportingLeg);
        const ankleBone = findBone(support.ankle);
        const initialEuler = getInitialRotation(support.ankle);
        if (ankleBone && initialEuler) {
          const startQ = ankleBone.object.quaternion.clone();
          const initialQ = new THREE.Quaternion().setFromEuler(initialEuler);
          const axis = supportAnkleAxis || new THREE.Vector3(1, 0, 0);
          const { swing, twist } = decomposeSwingTwist(startQ, axis);
          const initDecomp = decomposeSwingTwist(initialQ, axis);
          straightenAnkle = {
            name: support.ankle,
            swing,
            axis,
            start: getTwistAngle(twist, axis),
            target: getTwistAngle(initDecomp.twist, axis),
          };
        } else {
          straightenAnkle = null;
        }
        bodyTargetPos.copy(bodyInitialPos);
        break;
      }

      case 'final-reset': {
        // Smoothly reset ALL bones to their initial rotation
        phaseTargetSnapshot = new Map<string, THREE.Euler>();
        getBoneNodes().forEach((bone) => {
          const initial = getInitialRotation(bone.name);
          phaseTargetSnapshot.set(
            bone.name,
            initial?.clone() || bone.object.rotation.clone(),
          );
        });
        // Body stays at initial position
        bodyTargetPos.copy(bodyInitialPos);
        break;
      }
    }
  };

  // ----- STEP MANAGEMENT -----

  /** Start the next step in the sequence */
  const startNextStep = (): boolean => {
    if (state.stepIndex >= stepSequence.length) return false;
    state.currentStep = stepSequence[state.stepIndex];
    supportAnkleAxis = null;
    transitionToPhase('shift-weight');
    return true;
  };

  /** Complete current step and move to next */
  const completeCurrentStep = () => {
    if (state.currentStep)
      state.completedAngle += state.currentStep.angleDegrees;
    state.stepIndex++;

    if (!startNextStep()) {
      // All steps complete - do a smooth final reset
      transitionToPhase('final-reset');
    }
  };

  /** Called when the entire turn (including final-reset) is done */
  const finishTurn = () => {
    state.phase = 'complete';
    state.active = false;
    if (resolvePromise) {
      resolvePromise();
      resolvePromise = null;
    }
    if (state.onComplete) state.onComplete();
  };

  /** Get the next phase in sequence (for a single step, not including final-reset) */
  const getNextPhase = (current: TurnPhase): TurnPhase => {
    const order: TurnPhase[] = [
      'shift-weight',
      'lift-foot',
      'rotate-body',
      'lower-foot',
      'straighten',
      'complete',
    ];
    const idx = order.indexOf(current);
    return idx === -1 || idx >= order.length - 1 ? 'complete' : order[idx + 1];
  };

  // ----- PUBLIC API -----

  /** Start a turn animation */
  const startTurn = (
    direction: TurnDirection,
    angleDeg: number,
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (state.active) cancel();

      stepSequence = generateTurnStepSequence(direction, angleDeg);

      // Save initial body position
      const bodyBone = findBone('Body');
      if (bodyBone) bodyInitialPos.copy(bodyBone.object.position);

      // Initialize state
      state.active = true;
      state.direction = direction;
      state.totalAngle = Math.abs(angleDeg);
      state.completedAngle = 0;
      state.stepIndex = 0;
      state.totalSteps = stepSequence.length;
      resolvePromise = resolve;

      startNextStep();
    });
  };

  /** Cancel the current turn */
  const cancel = () => {
    state.active = false;
    state.phase = 'idle';
    state.currentStep = null;
    stepSequence = [];
    if (resolvePromise) {
      resolvePromise();
      resolvePromise = null;
    }
  };

  /** Update animation (call every frame) */
  const update = (deltaSeconds: number) => {
    if (!state.active || state.phase === 'idle' || state.phase === 'complete')
      return;

    state.phaseElapsed += deltaSeconds;
    const progress = Math.min(state.phaseElapsed / state.phaseDuration, 1);

    // Interpolate bone rotations
    interpolateSnapshot(phaseStartSnapshot, phaseTargetSnapshot, progress);

    // Apply hinge-driven ankle rotations (overrides Euler interpolation for smoother results)
    if (hingePlans.length > 0) {
      const t = easeInOutQuad(progress);
      for (const plan of hingePlans) {
        const bone = findBone(plan.boneName);
        if (!bone) continue;
        const theta = lerpAngleShortest(plan.startAngle, plan.targetAngle, t);
        const twist = new THREE.Quaternion().setFromAxisAngle(plan.axis, theta);
        bone.object.quaternion.copy(plan.swing.clone().multiply(twist));
      }
    }

    // Handle straighten phase ankle reset
    if (state.phase === 'straighten' && straightenAnkle) {
      const bone = findBone(straightenAnkle.name);
      if (bone) {
        const t = easeInOutQuad(progress);
        const theta = lerpAngleShortest(
          straightenAnkle.start,
          straightenAnkle.target,
          t,
        );
        const twist = new THREE.Quaternion().setFromAxisAngle(
          straightenAnkle.axis,
          theta,
        );
        bone.object.quaternion.copy(
          straightenAnkle.swing.clone().multiply(twist),
        );
      }
    }

    // Apply body translation
    const bodyBone = findBone('Body');
    if (bodyBone) {
      const t = easeInOutQuad(progress);
      bodyBone.object.position.x = THREE.MathUtils.lerp(
        bodyStartPos.x,
        bodyTargetPos.x,
        t,
      );
      bodyBone.object.position.y = THREE.MathUtils.lerp(
        bodyStartPos.y,
        bodyTargetPos.y,
        t,
      );
      bodyBone.object.position.z = THREE.MathUtils.lerp(
        bodyStartPos.z,
        bodyTargetPos.z,
        t,
      );
    }

    // Apply pivot rotation during rotate-body phase
    if (
      state.phase === 'rotate-body' &&
      pivotState &&
      pivotBone &&
      pivotExcludedBones.length > 0
    ) {
      const model = getModel();
      if (model) {
        const t = easeInOutCubic(progress);
        const angle = THREE.MathUtils.lerp(
          pivotStartAngle,
          pivotTargetAngle,
          t,
        );
        applyPivotRotationY(
          angle,
          findModelRoot(pivotBone.object),
          pivotBone,
          pivotExcludedBones,
          pivotState,
        );
      }
    }

    // Check if phase complete
    if (progress >= 1) {
      // Special handling for final-reset: turn is completely done
      if (state.phase === 'final-reset') {
        finishTurn();
        return;
      }

      const next = getNextPhase(state.phase);
      if (next === 'complete') {
        completeCurrentStep();
      } else {
        transitionToPhase(next);
      }
    }
  };

  /** Get estimated duration for a turn (in milliseconds) */
  const getEstimatedDuration = (angleDeg: number): number => {
    const numSteps = calculateTurnSteps(angleDeg);
    // Only sum durations of phases that occur per step (not final-reset)
    const perStepPhases = [
      'shift-weight',
      'lift-foot',
      'rotate-body',
      'lower-foot',
      'straighten',
    ] as const;
    const perStepDuration = perStepPhases.reduce(
      (sum, phase) => sum + PHASE_DURATIONS[phase],
      0,
    );
    const finalResetDuration = PHASE_DURATIONS['final-reset'];
    return (numSteps * perStepDuration + finalResetDuration) * 1000;
  };

  return {
    turnRight: (angleDeg: number) => startTurn('right', angleDeg),
    turnLeft: (angleDeg: number) => startTurn('left', angleDeg),
    getState: () => state,
    isActive: () => state.active,
    cancel,
    update,
    getEstimatedDuration,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { BONE_GROUPS, MAX_ANGLE_PER_STEP, PHASE_DURATIONS };
