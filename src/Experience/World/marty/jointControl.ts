import * as THREE from 'three';
import { JointID, JointName } from '../../../shared/types/marty.types.ts';
import type { BoneNode } from './model.ts';

type JointAxis = 'x' | 'y' | 'z';

export interface JointControlTarget {
  id: JointID;
  name: JointName;
  boneNames: string[];
  counterRotateBones?: string[];
  axis: JointAxis;
  invert?: boolean;
  clamp?: { min?: number; max?: number };
}

interface JointAnimation {
  bone: THREE.Bone;
  axis: JointAxis;
  start: number;
  target: number;
  duration: number;
  elapsed: number;
}

export interface JointControllerOptions {
  getBoneNodes: () => BoneNode[];
  getInitialRotation: (boneName: string) => THREE.Euler | undefined;
}

export interface SetJointAngleOptions {
  moveTime?: number;
}

export interface JointController {
  setJointAngle: (
    joint: number | string,
    angle: number,
    options?: SetJointAngleOptions,
  ) => { success: boolean; message?: string };
  update: (deltaSeconds: number) => void;
}

// Map each servo exposed by the API to the GLTF bones we can pose in the scene
export const JOINT_CONTROL_TARGETS: JointControlTarget[] = [
  {
    id: JointID.LEFT_HIP,
    name: JointName.LEFT_HIP,
    boneNames: ['LegL'],
    counterRotateBones: ['LegL001'],
    axis: 'z',
    clamp: { min: -35, max: 35 },
  },
  {
    id: JointID.LEFT_KNEE,
    name: JointName.LEFT_KNEE,
    boneNames: ['LegL002'],
    counterRotateBones: ['LegL003'],
    axis: 'x',
    clamp: { min: -45, max: 45 },
  },
  {
    id: JointID.RIGHT_HIP,
    name: JointName.RIGHT_HIP,
    boneNames: ['LegR'],
    axis: 'z',
    counterRotateBones: ['LegR001'],
    invert: true,
    clamp: { min: -35, max: 35 },
  },
  {
    id: JointID.RIGHT_TWIST,
    name: JointName.RIGHT_TWIST,
    boneNames: ['LegR001'],
    axis: 'z',
    invert: true,
  },
  {
    id: JointID.RIGHT_KNEE,
    name: JointName.RIGHT_KNEE,
    boneNames: ['LegR002'],
    counterRotateBones: ['LegR003'],
    axis: 'x',
    invert: true,
    clamp: { min: -45, max: 45 },
  },
  {
    id: JointID.LEFT_ARM,
    name: JointName.LEFT_ARM,
    boneNames: ['ArmL'],
    axis: 'x',
    invert: true,
    clamp: { min: -45, max: 125 },
  },
  {
    id: JointID.RIGHT_ARM,
    name: JointName.RIGHT_ARM,
    boneNames: ['ArmR'],
    axis: 'x',
    invert: true,
    clamp: { min: -45, max: 125 },
  },
  { id: JointID.LEFT_EYE,
    name: JointName.LEFT_EYE,
    boneNames: ['EyeL'],
    axis: 'z',
    clamp: {min: -45, max: 10} },
  { id: JointID.RIGHT_EYE,
    name: JointName.RIGHT_EYE,
    boneNames: ['EyeR'],
    axis: 'z',
    clamp: {min: -10, max: 45} },
];

export function createJointController({
  getBoneNodes,
  getInitialRotation,
}: JointControllerOptions): JointController {
  const jointTargetsById = new Map<number, JointControlTarget>();
  const jointTargetsByName = new Map<string, JointControlTarget>();
  const jointAnimations = new Map<string, JointAnimation>();

  JOINT_CONTROL_TARGETS.forEach((target) => {
    jointTargetsById.set(target.id, target);
    jointTargetsByName.set(target.name.toLowerCase(), target);
  });

  const resolveJointTarget = (
    joint: number | string | undefined,
  ): JointControlTarget | undefined => {
    if (joint === undefined || joint === null) {
      return undefined;
    }

    if (typeof joint === 'number') {
      return jointTargetsById.get(joint);
    }

    const trimmed = joint.trim().toLowerCase();
    if (!trimmed) {
      return undefined;
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      const byId = jointTargetsById.get(numeric as JointID);
      if (byId) {
        return byId;
      }
    }

    return jointTargetsByName.get(trimmed);
  };

  const setJointAngle: JointController['setJointAngle'] = (
    joint,
    angle,
    options,
  ) => {
    const boneNodes = getBoneNodes();
    if (boneNodes.length === 0) {
      return { success: false, message: 'Bone hierarchy not ready yet' };
    }

    const target = resolveJointTarget(joint);
    if (!target) {
      return {
        success: false,
        message: `Unknown joint: ${joint ?? '(undefined)'}`,
      };
    }

    const numericAngle = typeof angle === 'string' ? Number(angle) : angle;
    if (typeof numericAngle !== 'number' || Number.isNaN(numericAngle)) {
      return { success: false, message: 'Invalid angle value' };
    }

    let clampedAngle = numericAngle;
    if (target.clamp) {
      if (target.clamp.min !== undefined && clampedAngle < target.clamp.min) {
        console.warn(`⚠️ Joint ${target.name} angle ${clampedAngle}° clamped to min ${target.clamp.min}°`);
        clampedAngle = target.clamp.min;
      }
      if (target.clamp.max !== undefined && clampedAngle > target.clamp.max) {
        console.warn(`⚠️ Joint ${target.name} angle ${clampedAngle}° clamped to max ${target.clamp.max}°`);
        clampedAngle = target.clamp.max;
      }
    }

    const durationSeconds = Math.max((options?.moveTime ?? 1000) / 1000, 0);
    const signedRadians = THREE.MathUtils.degToRad(clampedAngle);
    let affectedBones = 0;

    // Helper to process a bone
    const processBone = (boneName: string, invertBone: boolean) => {
      const boneEntry = boneNodes.find((bone) => bone.name === boneName);
      if (!boneEntry) {
        console.warn(`⚠️ Bone ${boneName} not found for joint ${target.name}`);
        return;
      }

      const initialRotation = getInitialRotation(boneName);
      const baseValue = initialRotation
        ? initialRotation[target.axis]
        : boneEntry.object.rotation[target.axis];
      
      // Calculate goal for this specific bone
      // If invertBone is true, we flip the sign of the movement relative to the joint command
      // target.invert flips the joint command itself
      // Total inversion = target.invert XOR invertBone
      const totalInvert = (target.invert ? !invertBone : invertBone);
      const rawGoal = baseValue + signedRadians * (totalInvert ? -1 : 1);
      
      const animationKey = `${boneName}:${target.axis}`;

      let startValue: number;
      let targetValue: number;

      if (target.clamp) {
        // For clamped joints, we normalize angles around the baseValue (rest position).
        const currentRotation = boneEntry.object.rotation[target.axis];
        const twoPi = 2 * Math.PI;
        
        const normalizeAround = (val: number, center: number) => {
          const diff = val - center;
          return center + (diff - twoPi * Math.round(diff / twoPi));
        };

        startValue = normalizeAround(currentRotation, baseValue);
        targetValue = normalizeAround(rawGoal, baseValue);
      } else {
        // For continuous joints, take the shortest path
        const currentRotation = boneEntry.object.rotation[target.axis];
        const twoPi = 2 * Math.PI;
        const diff = currentRotation - rawGoal;
        const normalizedDiff = diff - twoPi * Math.round(diff / twoPi);
        startValue = rawGoal + normalizedDiff;
        targetValue = rawGoal;
      }

      // Update bone to start value immediately
      boneEntry.object.rotation[target.axis] = startValue;

      if (durationSeconds > 0) {
        jointAnimations.set(animationKey, {
          bone: boneEntry.object,
          axis: target.axis,
          start: startValue,
          target: targetValue,
          duration: durationSeconds,
          elapsed: 0,
        });
      } else {
        boneEntry.object.rotation[target.axis] = targetValue;
        jointAnimations.delete(animationKey);
      }

      affectedBones += 1;
    };

    // Process primary bones (normal movement)
    target.boneNames.forEach((boneName) => processBone(boneName, false));

    // Process counter-rotating bones (inverted movement)
    if (target.counterRotateBones) {
      target.counterRotateBones.forEach((boneName) => processBone(boneName, true));
    }

    if (affectedBones === 0) {
      return {
        success: false,
        message: `Joint ${target.name} has no mapped bones`,
      };
    }

    return {
      success: true,
      message: `Joint ${target.name} set to ${numericAngle.toFixed(1)}°`,
    };
  };

  const update: JointController['update'] = (deltaSeconds) => {
    if (jointAnimations.size === 0) {
      return;
    }

    jointAnimations.forEach((animation, key) => {
      animation.elapsed += deltaSeconds;
      const progress = animation.duration > 0
        ? Math.min(animation.elapsed / animation.duration, 1)
        : 1;
      const nextValue = THREE.MathUtils.lerp(
        animation.start,
        animation.target,
        progress,
      );
      animation.bone.rotation[animation.axis] = nextValue;

      if (progress >= 1) {
        jointAnimations.delete(key);
      }
    });
  };

  return {
    setJointAngle,
    update,
  };
}
