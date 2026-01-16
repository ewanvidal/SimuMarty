/**
 * RobotPhysics.tsx
 * Simple physics for Marty robot using Cannon.js
 * 
 * The body is always DYNAMIC - gravity and collisions are handled by physics.
 * Each frame: physics steps, then we sync Three.js model to physics body.
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  ROBOT_PARTS,
  ROBOT_SCALE,
  type PhysicsPartConfig,
} from '../config/robotPhysics.ts';
import type Physics from './Physics.tsx';
import type { BoneNode } from './marty/model.ts';
import type Experience from '../Experience.tsx';
import type Debug from '../Utils/Debug.tsx';

interface PhysicsPart {
  name: string;
  config: PhysicsPartConfig;
  bone: THREE.Bone;
  debugMesh: THREE.Mesh;
  shape: CANNON.Box;
  worldPos: THREE.Vector3;
  worldQuat: THREE.Quaternion;
  localOffset: THREE.Vector3;
  configQuat: THREE.Quaternion;
  boneLength: number;
}

export default class RobotPhysics {
  experience: Experience;
  physics: Physics;
  model: THREE.Group;
  scene: THREE.Scene;
  boneNodes: BoneNode[];
  debug: Debug;
  debugFolder?: ReturnType<typeof import('lil-gui').GUI.prototype.addFolder>;

  parts: Map<string, PhysicsPart> = new Map();
  body?: CANNON.Body;
  robotMaterial?: CANNON.Material;
  showDebugMeshes: boolean = true;
  isJumping: boolean = false;
  isGrounded: boolean = true;
  autoCalculatedOffset: number = 0;
  
  // Nouvelle propriété pour communiquer la direction de la chute à Marty.tsx
  public fallDirection: 'none' | 'forward' | 'backward' = 'none';
  
  // Raycasting for ground detection
  private groundRaycaster: THREE.Raycaster;
  private downDirection: THREE.Vector3 = new THREE.Vector3(0, -1, 0);
  
  // Per-foot ground detection
  leftFootGrounded: boolean = false;
  rightFootGrounded: boolean = false;
  leftFootDistance: number = Infinity;
  rightFootDistance: number = Infinity;

  // Debug controls reference
  private debugControls?: {
    isGrounded: boolean;
    leftFootGrounded: boolean;
    rightFootGrounded: boolean;
    leftFootDist: number;
    rightFootDist: number;
  };

  constructor(
    physics: Physics,
    model: THREE.Group,
    boneNodes: BoneNode[],
  ) {
    this.experience = (window as unknown as { experience: Experience }).experience;
    this.physics = physics;
    this.model = model;
    this.scene = this.experience.scene;
    this.boneNodes = boneNodes;
    this.debug = this.experience.debug;

    // Initialize ground raycaster
    this.groundRaycaster = new THREE.Raycaster();
    this.groundRaycaster.far = 2.0; // Max ground detection range

    this.createPhysicsParts();
    this.createBody();
    this.setupDebug();
  }

  private setupDebug(): void {
    if (!this.debug.active || !this.debug.ui) return;

    this.debugFolder = this.debug.ui.addFolder('robotPhysics');
    this.debugFolder.close();

    const controls = {
      showBoundingBoxes: this.showDebugMeshes,
      jumpForce: 5.0,
      jump: () => this.jump(controls.jumpForce),
      isGrounded: true,
      leftFootGrounded: false,
      rightFootGrounded: false,
      leftFootDist: 0,
      rightFootDist: 0,
    };

    this.debugFolder
      .add(controls, 'showBoundingBoxes')
      .name('Show BBs')
      .onChange((value: boolean) => {
        this.showDebugMeshes = value;
        for (const part of this.parts.values()) {
          part.debugMesh.visible = value;
        }
      });

    this.debugFolder.add(controls, 'isGrounded').name('Stable Footing').listen();
    this.debugFolder.add(controls, 'leftFootGrounded').name('Left Foot').listen();
    this.debugFolder.add(controls, 'rightFootGrounded').name('Right Foot').listen();
    this.debugFolder.add(controls, 'leftFootDist').name('Left Dist').listen();
    this.debugFolder.add(controls, 'rightFootDist').name('Right Dist').listen();
    this.debugFolder.add(controls, 'jumpForce', 1, 15, 0.5).name('Jump Force');
    this.debugFolder.add(controls, 'jump').name('🦘 Jump!');

    // Store reference to update debug values
    this.debugControls = controls;
  }

  /**
   * Jump - apply upward velocity
   */
  jump(force: number = 5): void {
    if (!this.body) return;
    if (Math.abs(this.body.velocity.y) > 0.1) return;
    this.body.velocity.y = force;
    this.isJumping = true;
  }

  private getBoneLength(bone: THREE.Bone): number {
    for (const child of bone.children) {
      if (child instanceof THREE.Bone) {
        return child.position.length();
      }
    }
    return 0.5;
  }

  private createPhysicsParts(): void {
    this.robotMaterial = this.physics.createMaterial('robot');

    const boneMap = new Map<string, THREE.Bone>();
    for (const node of this.boneNodes) {
      boneMap.set(node.name, node.object);
    }

    for (const [partName, config] of Object.entries(ROBOT_PARTS)) {
      const bone = boneMap.get(config.boneName);
      if (!bone) continue;

      // Debug mesh
      const geometry = new THREE.BoxGeometry(
        config.dimensions[0] * ROBOT_SCALE,
        config.dimensions[1] * ROBOT_SCALE,
        config.dimensions[2] * ROBOT_SCALE,
      );
      const material = new THREE.MeshBasicMaterial({
        color: config.debugColor,
        wireframe: true,
        transparent: true,
        opacity: 0.8,
      });
      const debugMesh = new THREE.Mesh(geometry, material);
      debugMesh.name = `bb_${partName}`;
      this.scene.add(debugMesh);

      // Cannon shape
      const halfExtents = new CANNON.Vec3(
        (config.dimensions[0] * ROBOT_SCALE) / 2,
        (config.dimensions[1] * ROBOT_SCALE) / 2,
        (config.dimensions[2] * ROBOT_SCALE) / 2,
      );
      const shape = new CANNON.Box(halfExtents);

      const boneLength = this.getBoneLength(bone);
      const configQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(config.localRotation[0], config.localRotation[1], config.localRotation[2])
      );

      this.parts.set(partName, {
        name: partName,
        config,
        bone,
        debugMesh,
        shape,
        worldPos: new THREE.Vector3(),
        worldQuat: new THREE.Quaternion(),
        localOffset: new THREE.Vector3(),
        configQuat,
        boneLength,
      });
    }
  }

  private createBody(): void {
    // 1. Calculer la masse totale
    let totalMass = 0;
    for (const part of this.parts.values()) {
      totalMass += part.config.mass;
    }

    // 2. Créer le corps vide (sans forme pour l'instant)
    this.body = new CANNON.Body({
      mass: totalMass,
      material: this.robotMaterial,
      linearDamping: 0.1,
      angularDamping: 0.5, // Ajusté pour permettre la bascule pendant la chute
      fixedRotation: false, // Permet au corps de tourner physiquement
    });

    let minY = Infinity;

    // S'assurer que les matrices du monde sont à jour pour les calculs de position
    this.model.updateMatrixWorld(true);
    const modelWorldPos = new THREE.Vector3();
    const modelWorldQuat = new THREE.Quaternion();
    this.model.getWorldPosition(modelWorldPos);
    this.model.getWorldQuaternion(modelWorldQuat);

    // Inverse de la rotation du modèle pour calculer les offsets locaux
    const inverseModelQuat = modelWorldQuat.clone().invert();

    // 3. Ajouter chaque partie comme une "Shape" au corps principal
    for (const part of this.parts.values()) {
      // -- Calcul de la Position --
      // Position du bone dans le monde
      const boneWorldPos = new THREE.Vector3();
      part.bone.getWorldPosition(boneWorldPos);

      // Calcul de l'offset local du centre de la BB par rapport au bone
      // (Reprise de la logique de updateDebugMeshes pour l'offset initial)
      const partLocalOffset = new THREE.Vector3(
        part.config.localPosition[0] * ROBOT_SCALE,
        (part.config.localPosition[1] + part.boneLength / 2) * ROBOT_SCALE,
        part.config.localPosition[2] * ROBOT_SCALE
      );

      // Orientation du bone dans le monde
      const boneWorldQuat = new THREE.Quaternion();
      part.bone.getWorldQuaternion(boneWorldQuat);

      // Appliquer la rotation du bone à l'offset local
      partLocalOffset.applyQuaternion(boneWorldQuat);

      // Position finale du centre de la forme dans le monde
      const shapeWorldPos = boneWorldPos.clone().add(partLocalOffset);

      // Convertir cette position monde en position locale par rapport au centre du Body (le pivot du modèle)
      const shapeBodyOffset = shapeWorldPos.clone().sub(modelWorldPos);
      // Si le modèle est tourné, il faut aussi tourner l'offset pour qu'il soit local au Body
      shapeBodyOffset.applyQuaternion(inverseModelQuat);

      // -- Calcul de la Rotation --
      // La rotation de la shape par rapport au Body
      // On combine : Rotation Bone * Rotation Config * Inverse Rotation Modèle
      const shapeWorldQuat = boneWorldQuat.clone().multiply(part.configQuat);
      const shapeBodyQuat = inverseModelQuat.clone().multiply(shapeWorldQuat);

      // -- Conversion Three -> Cannon --
      const cannonOffset = new CANNON.Vec3(shapeBodyOffset.x, shapeBodyOffset.y, shapeBodyOffset.z);
      const cannonQuat = new CANNON.Quaternion(shapeBodyQuat.x, shapeBodyQuat.y, shapeBodyQuat.z, shapeBodyQuat.w);

      // Ajouter la forme au corps composite
      this.body.addShape(part.shape, cannonOffset, cannonQuat);

      // Track lowest point for auto-offset (halfHeight of the box)
      const bottom = shapeBodyOffset.y - (part.config.dimensions[1] * ROBOT_SCALE) / 2;
      if (bottom < minY) minY = bottom;
    }

    // Our offset is the distance from body center to its lowest point
    this.autoCalculatedOffset = Math.abs(minY);

    // Positionner le corps physique à l'emplacement du modèle
    this.body.position.set(
      this.model.position.x,
      this.model.position.y + this.autoCalculatedOffset,
      this.model.position.z,
    );

    this.physics.addBody(this.body);

    // Recalculer l'inertie (important pour que les poids/masses soient pris en compte dans la rotation)
    // Cannon le fait souvent automatiquement, mais c'est plus sûr ici.
    this.body.updateMassProperties();

    // Contact material (inchangé)
    if (this.physics.groundBody?.material && this.robotMaterial) {
      this.physics.createContactMaterial(
        this.physics.groundBody.material,
        this.robotMaterial,
        0.5,
        0.0,
      );
    }
  }

  /**
   * Get objects to test for ground detection (excludes robot parts)
   */
  private getGroundTestObjects(): THREE.Object3D[] {
    const testable: THREE.Object3D[] = [];
    
    // Get all debug mesh names to exclude
    const excludeNames = new Set<string>();
    for (const part of this.parts.values()) {
      excludeNames.add(part.debugMesh.name);
    }

    this.scene.traverse((child) => {
      // Skip robot model and its children
      if (child === this.model) return;
      let current = child.parent;
      while (current) {
        if (current === this.model) return;
        current = current.parent;
      }

      // Skip debug meshes (bounding boxes)
      if (excludeNames.has(child.name)) return;
      if (child.name.startsWith('bb_')) return;

      // Only include meshes
      if (child instanceof THREE.Mesh) {
        testable.push(child);
      }
    });

    return testable;
  }

  /**
   * Vérifie si le robot est au sol avec la logique des 3 rayons par pied.
   * Met à jour this.fallDirection.
   */
  checkGrounded(): boolean {
    if (!this.body) return false;
    this.model.updateMatrixWorld(true);

    // 1. Récupérer les bones des pieds
    const leftFoot = this.parts.get('foot_left')?.bone || this.boneNodes.find(b => b.name === 'LegL003')?.object;
    const rightFoot = this.parts.get('foot_right')?.bone || this.boneNodes.find(b => b.name === 'LegR003')?.object;

    if (!leftFoot || !rightFoot) {
      console.warn("Bones des pieds introuvables pour la physique");
      return true; // Sécurité
    }

    // 2. Définir les offsets locaux (Pointe, Milieu, Talon)
    // Ajustés pour l'échelle 0.05 (Edge Jitter Fix: Mid avancé vers 0.02)
    const rayPoints = [
      { name: 'front', offset: new THREE.Vector3(0, 0, 0.05) },   // Orteils
      { name: 'mid',   offset: new THREE.Vector3(0, 0, 0.02) },   // Coussinet (Juste devant la cheville)
      { name: 'back',  offset: new THREE.Vector3(0, 0, -0.03) }   // Talon
    ];

    // Fonction helper pour tester un pied
    const checkFootState = (bone: THREE.Object3D) => {
      const results = { front: false, mid: false, back: false };
      const bonePos = new THREE.Vector3();
      const boneQuat = new THREE.Quaternion();
      
      bone.getWorldPosition(bonePos);
      bone.getWorldQuaternion(boneQuat);

      for (const point of rayPoints) {
        // Calcul position monde du point de rayon
        const local = point.offset.clone().applyQuaternion(boneQuat);
        const origin = bonePos.clone().add(local);
        // On remonte un peu l'origine pour être sûr de ne pas partir de sous le sol
        origin.y += 0.02; 

        this.groundRaycaster.set(origin, this.downDirection);
        // On teste contre le décor
        const intersects = this.groundRaycaster.intersectObjects(this.getGroundTestObjects(), true);

        // Si on touche à moins de 4cm (2cm offset + 2cm marge), c'est grounded
        if (intersects.length > 0 && intersects[0].distance < 0.04) {
          results[point.name as keyof typeof results] = true;
        }
      }
      return results;
    };

    // 3. Tester les deux pieds
    const left = checkFootState(leftFoot);
    const right = checkFootState(rightFoot);

    // 4. Logique de décision (Chute ou Pas ?)
    
    // Un pied est stable si au moins 2 points sur 3 touchent
    const isLeftStable = (Number(left.front) + Number(left.mid) + Number(left.back)) >= 2;
    const isRightStable = (Number(right.front) + Number(right.mid) + Number(right.back)) >= 2;

    // Le robot est globalement stable si au moins UN pied est stable
    const isGrounded = isLeftStable || isRightStable;

    // 5. Déterminer la direction de la chute (pour la vélocité hardcodée)
    this.fallDirection = 'none';

    if (!isGrounded) {
      // Analyse des points manquants pour déterminer le sens
      // Si on manque le sol devant et au milieu -> Chute Avant
      const leftFallFwd = !left.front && !left.mid;
      const rightFallFwd = !right.front && !right.mid;
      
      // Si on manque le sol derrière et au milieu -> Chute Arrière
      const leftFallBwd = !left.back && !left.mid;
      const rightFallBwd = !right.back && !right.mid;

      if (leftFallFwd || rightFallFwd) {
        this.fallDirection = 'forward';
      } else if (leftFallBwd || rightFallBwd) {
        this.fallDirection = 'backward';
      } else {
        // Cas par défaut
        this.fallDirection = 'forward'; 
      }
    }

    // Update debug display
    if (this.debugControls) {
      this.debugControls.isGrounded = isGrounded;
    }

    this.isGrounded = isGrounded;
    return isGrounded;
  }

  /**
   * Update - called each frame AFTER physics.update()
   * Syncs the Three.js model position to match the physics body
   */
  update(): void {
    if (!this.body) return;

    // Sync Three.js model position FROM physics body
    this.model.position.x = this.body.position.x;
    this.model.position.y = this.body.position.y - this.autoCalculatedOffset;
    this.model.position.z = this.body.position.z;

    // Update debug meshes to follow bones
    this.updateDebugMeshes();
  }

  /**
   * Update debug meshes to follow bones
   */
  updateDebugMeshes(): void {
    // Update world matrices for bone positions
    this.model.updateMatrixWorld(true);
    
    for (const part of this.parts.values()) {
      part.bone.getWorldPosition(part.worldPos);
      part.bone.getWorldQuaternion(part.worldQuat);

      part.localOffset.set(
        part.config.localPosition[0] * ROBOT_SCALE,
        (part.config.localPosition[1] + part.boneLength / 2) * ROBOT_SCALE,
        part.config.localPosition[2] * ROBOT_SCALE,
      );
      part.localOffset.applyQuaternion(part.worldQuat);

      part.debugMesh.position.copy(part.worldPos).add(part.localOffset);
      part.debugMesh.quaternion.copy(part.worldQuat).multiply(part.configQuat);
    }
  }

  getBody(): CANNON.Body | undefined {
    return this.body;
  }

  dispose(): void {
    for (const part of this.parts.values()) {
      this.scene.remove(part.debugMesh);
      part.debugMesh.geometry.dispose();
      if (Array.isArray(part.debugMesh.material)) {
        part.debugMesh.material.forEach((m) => m.dispose());
      } else {
        part.debugMesh.material.dispose();
      }
    }
    this.parts.clear();

    if (this.body) {
      this.physics.removeBody(this.body);
      this.body = undefined;
    }

    if (this.debugFolder) {
      this.debugFolder.destroy();
    }
  }
}
