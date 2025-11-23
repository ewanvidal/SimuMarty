import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type Debug from '../../Utils/Debug.tsx';

type GuiFolder = ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;

export interface BoneNode {
  name: string;
  object: THREE.Bone;
}

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
  model.position.set(0, 0, 0);
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
