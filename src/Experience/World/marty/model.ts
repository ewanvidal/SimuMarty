import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type Debug from '../../Utils/Debug.tsx';

type GuiFolder = ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;

export interface BoneNode {
  name: string;
  object: THREE.Bone;
}

// ============================================================================
// Pivot Rotation Utility
// ============================================================================

export type SupportingLeg = 'left' | 'right';

/**
 * Represents the captured state required for performing a pivot rotation on the model.
 * Used during procedural turn animation to rotate around a fixed foot.
 */
export interface PivotRotationState {
  /** The initial world position of the model root before pivot rotation */
  initialModelPos: THREE.Vector3;
  /** The initial world orientation (quaternion) of the model root before pivot rotation */
  initialModelQuat: THREE.Quaternion;
  /** The world position of the pivot bone (foot) at the start of the rotation */
  pivotWorldPos: THREE.Vector3;
  /** Map storing the initial local quaternions of bones excluded from pivot rotation (to counter-rotate) */
  excludedBoneLocalQuats: Map<string, THREE.Quaternion>;
}

/**
 * Get the bone configuration for a pivot rotation based on which leg is supporting.
 * 
 * @param supportingLeg - Which leg is planted on the ground ('left' or 'right')
 * @returns Object containing:
 *   - excludedBoneNames: Bones that should NOT rotate with the model (ankle + foot of supporting leg)
 *   - pivotBoneName: The foot bone to pivot around (stays fixed in world space)
 *   - ankleBoneName: The ankle bone of the supporting leg (for counter-rotation)
 */
export function getExcludedBonesForLeg(supportingLeg: SupportingLeg): {
  excludedBoneNames: string[];
  pivotBoneName: string;
  ankleBoneName: string;
} {
  if (supportingLeg === 'right') {
    return {
      excludedBoneNames: ['LegR002', 'LegR003'],
      pivotBoneName: 'LegR003',
      ankleBoneName: 'LegR002',
    };
  } else {
    return {
      excludedBoneNames: ['LegL002', 'LegL003'],
      pivotBoneName: 'LegL003',
      ankleBoneName: 'LegL002',
    };
  }
}

/**
 * Find the model root (topmost parent before Scene)
 */
export function findModelRoot(bone: THREE.Bone): THREE.Object3D {
  let current: THREE.Object3D = bone;
  while (current.parent && !(current.parent instanceof THREE.Scene)) {
    current = current.parent;
  }
  return current;
}

/**
 * Capture initial state for pivot rotation
 */
export function capturePivotRotationState(
  modelRoot: THREE.Object3D,
  pivotBone: BoneNode,
  excludedBones: BoneNode[],
): PivotRotationState {
  const pivotWorldPos = new THREE.Vector3();
  pivotBone.object.getWorldPosition(pivotWorldPos);
  
  // Capture initial local quaternions for excluded bones
  const excludedBoneLocalQuats = new Map<string, THREE.Quaternion>();
  excludedBones.forEach((bone) => {
    excludedBoneLocalQuats.set(bone.name, bone.object.quaternion.clone());
  });
  
  return {
    initialModelPos: modelRoot.position.clone(),
    initialModelQuat: modelRoot.quaternion.clone(),
    pivotWorldPos,
    excludedBoneLocalQuats,
  };
}

/**
 * Apply pivot rotation around Y axis
 * Rotates the model around the pivot point while keeping the supporting leg fixed
 */
export function applyPivotRotationY(
  angleRad: number,
  modelRoot: THREE.Object3D,
  pivotBone: BoneNode,
  excludedBones: BoneNode[],
  state: PivotRotationState,
): void {
  // Reset model to initial state first
  modelRoot.position.copy(state.initialModelPos);
  modelRoot.quaternion.copy(state.initialModelQuat);
  
  // Reset excluded bones to their initial local rotations
  excludedBones.forEach((bone) => {
    const initialQuat = state.excludedBoneLocalQuats.get(bone.name);
    if (initialQuat) {
      bone.object.quaternion.copy(initialQuat);
    }
  });
  
  modelRoot.updateMatrixWorld(true);
  
  // Get current pivot position (after reset)
  const currentPivotPos = new THREE.Vector3();
  pivotBone.object.getWorldPosition(currentPivotPos);
  
  // Create rotation around Y axis
  const rotQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    angleRad,
  );
  
  // Calculate model's offset from pivot
  const modelOffset = state.initialModelPos.clone().sub(currentPivotPos);
  
  // Rotate the offset
  const rotatedOffset = modelOffset.clone().applyQuaternion(rotQuat);
  
  // Apply new position to model (pivot point stays at same world position)
  modelRoot.position.copy(currentPivotPos).add(rotatedOffset);
  
  // Apply rotation to model
  modelRoot.quaternion.premultiply(rotQuat);
  modelRoot.updateMatrixWorld(true);
  
  // Counter-rotate ONLY the root bone of the excluded chain (ankle)
  // The children (foot) will inherit the correct orientation through the hierarchy
  // We apply the inverse rotation in local space
  const inverseRotQuat = rotQuat.clone().invert();
  
  // Find the root bone (the one that's not a child of another excluded bone)
  const rootExcludedBone = excludedBones.find((bone) => {
    // Check if this bone's parent is also in the excluded list
    const parentName = bone.object.parent?.name;
    return !excludedBones.some((b) => b.name === parentName);
  });
  
  if (rootExcludedBone) {
    const initialQuat = state.excludedBoneLocalQuats.get(rootExcludedBone.name);
    if (initialQuat && rootExcludedBone.object.parent) {
      // Get parent's world quaternion
      const parentWorldQuat = new THREE.Quaternion();
      rootExcludedBone.object.parent.getWorldQuaternion(parentWorldQuat);
      
      // Transform the inverse rotation from world space to local space
      const parentInverseQuat = parentWorldQuat.clone().invert();
      const localInverseRot = parentInverseQuat.clone()
        .multiply(inverseRotQuat)
        .multiply(parentWorldQuat);
      
      // Apply to the bone's initial local rotation
      rootExcludedBone.object.quaternion.copy(initialQuat).premultiply(localInverseRot);
    }
  }
  
  modelRoot.updateMatrixWorld(true);
}

// ============================================================================
// Model Setup
// ============================================================================

export interface ModelSetupResult {
  model: THREE.Group;
  boneNodes: BoneNode[];
  boneInitialRotations: Map<string, THREE.Euler>;
  boneDebugFolder?: GuiFolder;
}

interface ModelSetupParams {
  resource?: GLTF;
  scene: THREE.Scene;
  debug: Debug;
  debugFolder?: GuiFolder;
  existingBoneDebugFolder?: GuiFolder;
}

export function setupMartyModel({
  resource,
  scene,
  debug,
  debugFolder,
  existingBoneDebugFolder,
}: ModelSetupParams): ModelSetupResult {
  let model: THREE.Group;

  if (!resource || !resource.scene) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: '#ff6b6b' });
    model = new THREE.Mesh(geometry, material) as unknown as THREE.Group;
    model.position.set(0, 0.5, 0);
    model.castShadow = true;
    scene.add(model);

    return {
      model,
      boneNodes: [],
      boneInitialRotations: new Map(),
    };
  }

  model = resource.scene;
  model.scale.set(0.05, 0.05, 0.05);
  model.position.set(0, 0.001, 0);
  scene.add(model);

  const boneNodes: BoneNode[] = [];
  const boneInitialRotations = new Map<string, THREE.Euler>();

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
    }

    if (child instanceof THREE.Bone) {
      const hasName = child.name && child.name.trim().length > 0;
      const label = hasName
        ? child.name
        : `bone_${boneNodes.length.toString().padStart(2, '0')}`;
      boneNodes.push({ name: label, object: child });
      boneInitialRotations.set(label, child.rotation.clone());
    }
  });

  const boneDebugFolder = createBoneDebugControls({
    debug,
    debugFolder,
    boneNodes,
    existingBoneDebugFolder,
  });

  return {
    model,
    boneNodes,
    boneInitialRotations,
    boneDebugFolder,
  };
}

interface BoneDebugParams {
  debug: Debug;
  debugFolder?: GuiFolder;
  boneNodes: BoneNode[];
  existingBoneDebugFolder?: GuiFolder;
}

function createBoneDebugControls({
  debug,
  debugFolder,
  boneNodes,
  existingBoneDebugFolder,
}: BoneDebugParams): GuiFolder | undefined {
  if (!debug.active || !debugFolder || boneNodes.length === 0) {
    existingBoneDebugFolder?.destroy();
    return undefined;
  }

  existingBoneDebugFolder?.destroy();
  const folder = debugFolder.addFolder('bones');
  folder.close();

  const helpers = {
    logBones: () => {
      console.table(
        boneNodes.map((bone) => ({
          name: bone.name,
        })),
      );
    },
  };

  folder.add(helpers, 'logBones').name('Log bone list');

  // Add pivot rotation controls for both legs
  const createPivotRotationControl = (supportingLeg: SupportingLeg) => {
    const { excludedBoneNames, pivotBoneName } = getExcludedBonesForLeg(supportingLeg);
    const pivotBone = boneNodes.find((b) => b.name === pivotBoneName);
    const excludedBones = boneNodes.filter((b) => excludedBoneNames.includes(b.name));
    
    if (!pivotBone || excludedBones.length === 0) return;
    
    const modelRoot = findModelRoot(pivotBone.object);
    const state = capturePivotRotationState(modelRoot, pivotBone, excludedBones);
    
    const legLabel = supportingLeg === 'right' ? 'Right' : 'Left';
    const groupRotationFolder = folder.addFolder(`Pivot Rotation (${legLabel} Leg)`);
    groupRotationFolder.close();
    
    const groupRotation = { y: 0 };
    
    groupRotationFolder
      .add(groupRotation, 'y', -Math.PI, Math.PI, 0.01)
      .name(`Rotate Y (around ${pivotBoneName})`)
      .onChange((value: number) => {
        applyPivotRotationY(value, modelRoot, pivotBone, excludedBones, state);
      });
  };
  
  // Create controls for both legs
  createPivotRotationControl('right');
  createPivotRotationControl('left');

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
    groupFolder: GuiFolder,
    bone: BoneNode,
  ) => {
    const rotationProxy = {
      x: bone.object.rotation.x,
      y: bone.object.rotation.y,
      z: bone.object.rotation.z,
    };

    groupFolder
      .add(rotationProxy, 'x', -Math.PI, Math.PI, 0.01)
      .name(`${bone.name} rotX`)
      .onChange((value: number) => {
        bone.object.rotation.x = value;
        rotationProxy.x = value;
      });

    groupFolder
      .add(rotationProxy, 'y', -Math.PI, Math.PI, 0.01)
      .name(`${bone.name} rotY`)
      .onChange((value: number) => {
        bone.object.rotation.y = value;
        rotationProxy.y = value;
      });

    groupFolder
      .add(rotationProxy, 'z', -Math.PI, Math.PI, 0.01)
      .name(`${bone.name} rotZ`)
      .onChange((value: number) => {
        bone.object.rotation.z = value;
        rotationProxy.z = value;
      });
  };

  boneGroups.forEach((group) => {
    const bonesInGroup = boneNodes.filter((bone) =>
      group.names.includes(bone.name),
    );
    if (bonesInGroup.length === 0) {
      return;
    }

    const groupFolder = folder.addFolder(group.label);
    groupFolder.close();
    bonesInGroup.forEach((bone) => {
      assigned.add(bone.name);
      addBoneRotationControls(groupFolder, bone);
    });
  });

  const unassignedBones = boneNodes.filter((bone) => !assigned.has(bone.name));
  if (unassignedBones.length > 0) {
    const miscFolder = folder.addFolder('Other');
    miscFolder.close();
    unassignedBones.forEach((bone) => addBoneRotationControls(miscFolder, bone));
  }

  return folder;
}
