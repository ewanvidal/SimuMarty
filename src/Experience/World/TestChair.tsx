import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type Experience from '../Experience.tsx';
import type Physics from './Physics.tsx';

/**
 * TestChair
 * A simple chair/platform for testing physics - robot can fall off or hit the back
 */
export default class TestChair {
  experience: Experience;
  scene: THREE.Scene;
  physics?: Physics;
  group: THREE.Group;
  bodies: CANNON.Body[] = [];
  boundingBoxHelpers: THREE.Box3Helper[] = [];
  
  // Chair dimensions - sized for Marty robot
  private readonly seatHeight = 0.3;   // Height of seat above ground (taller for testing falls)
  private readonly seatWidth = 0.35;   // Width of seat (X) - wider for robot
  private readonly seatDepth = 0.35;   // Depth of seat (Z) - deeper for robot
  private readonly seatThickness = 0.03;
  
  private readonly backHeight = 0.25;  // Height of chair back
  private readonly backThickness = 0.03;
  
  private readonly legHeight = 0.3;    // Match seat height
  private readonly legWidth = 0.025;

  constructor(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0), physics?: Physics) {
    this.experience = (window as unknown as { experience: Experience }).experience;
    this.scene = this.experience.scene;
    this.physics = physics;
    
    this.group = new THREE.Group();
    this.group.position.copy(position);
    
    this.createChair();
    this.scene.add(this.group);
    
    // Create bounding box helpers
    this.createBoundingBoxHelpers();
    
    console.log('🪑 Test Chair created at', position.toArray());
  }

  private createChair(): void {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,  // Saddle brown
      roughness: 0.8,
      metalness: 0.1,
    });

    // Create physics material if physics is available
    const physicsMaterial = this.physics?.createMaterial('chair', 0.6, 0.1);

    // === SEAT ===
    const seatGeometry = new THREE.BoxGeometry(
      this.seatWidth,
      this.seatThickness,
      this.seatDepth
    );
    const seat = new THREE.Mesh(seatGeometry, woodMaterial);
    seat.position.set(0, this.seatHeight, 0);
    seat.receiveShadow = true;
    seat.castShadow = true;
    seat.name = 'chair_seat';
    this.group.add(seat);

    // Add physics body for seat
    if (this.physics && physicsMaterial) {
      const seatShape = new CANNON.Box(new CANNON.Vec3(
        this.seatWidth / 2,
        this.seatThickness / 2,
        this.seatDepth / 2
      ));
      const seatBody = new CANNON.Body({
        mass: 0, // Static
        shape: seatShape,
        material: physicsMaterial,
      });
      seatBody.position.set(
        this.group.position.x,
        this.group.position.y + this.seatHeight,
        this.group.position.z
      );
      this.physics.addBody(seatBody);
      this.bodies.push(seatBody);
    }

    // === BACK REST ===
    const backGeometry = new THREE.BoxGeometry(
      this.seatWidth,
      this.backHeight,
      this.backThickness
    );
    const back = new THREE.Mesh(backGeometry, woodMaterial);
    back.position.set(
      0,
      this.seatHeight + this.backHeight / 2,
      -this.seatDepth / 2 + this.backThickness / 2
    );
    back.receiveShadow = true;
    back.castShadow = true;
    back.name = 'chair_back';
    this.group.add(back);

    // Add physics body for back
    if (this.physics && physicsMaterial) {
      const backShape = new CANNON.Box(new CANNON.Vec3(
        this.seatWidth / 2,
        this.backHeight / 2,
        this.backThickness / 2
      ));
      const backBody = new CANNON.Body({
        mass: 0, // Static
        shape: backShape,
        material: physicsMaterial,
      });
      backBody.position.set(
        this.group.position.x,
        this.group.position.y + this.seatHeight + this.backHeight / 2,
        this.group.position.z - this.seatDepth / 2 + this.backThickness / 2
      );
      this.physics.addBody(backBody);
      this.bodies.push(backBody);
    }

    // === LEGS ===
    const legGeometry = new THREE.BoxGeometry(
      this.legWidth,
      this.legHeight,
      this.legWidth
    );

    const legPositions = [
      // Front legs
      { x: this.seatWidth / 2 - this.legWidth, z: this.seatDepth / 2 - this.legWidth },
      { x: -this.seatWidth / 2 + this.legWidth, z: this.seatDepth / 2 - this.legWidth },
      // Back legs
      { x: this.seatWidth / 2 - this.legWidth, z: -this.seatDepth / 2 + this.legWidth },
      { x: -this.seatWidth / 2 + this.legWidth, z: -this.seatDepth / 2 + this.legWidth },
    ];

    legPositions.forEach((pos, index) => {
      const leg = new THREE.Mesh(legGeometry, woodMaterial);
      leg.position.set(pos.x, this.legHeight / 2, pos.z);
      leg.receiveShadow = true;
      leg.castShadow = true;
      leg.name = `chair_leg_${index}`;
      this.group.add(leg);

      // Add physics body for leg
      if (this.physics && physicsMaterial) {
        const legShape = new CANNON.Box(new CANNON.Vec3(
          this.legWidth / 2,
          this.legHeight / 2,
          this.legWidth / 2
        ));
        const legBody = new CANNON.Body({
          mass: 0, // Static
          shape: legShape,
          material: physicsMaterial,
        });
        legBody.position.set(
          this.group.position.x + pos.x,
          this.group.position.y + this.legHeight / 2,
          this.group.position.z + pos.z
        );
        this.physics.addBody(legBody);
        this.bodies.push(legBody);
      }
    });

    // === SIDE RAILS (arm rests) ===
    const railGeometry = new THREE.BoxGeometry(
      this.backThickness,
      this.backHeight * 0.5,
      this.seatDepth
    );
    
    // Left rail
    const leftRail = new THREE.Mesh(railGeometry, woodMaterial);
    leftRail.position.set(
      -this.seatWidth / 2 + this.backThickness / 2,
      this.seatHeight + this.backHeight * 0.25,
      0
    );
    leftRail.receiveShadow = true;
    leftRail.castShadow = true;
    leftRail.name = 'chair_rail_left';
    this.group.add(leftRail);

    // Add physics body for left rail
    if (this.physics && physicsMaterial) {
      const railShape = new CANNON.Box(new CANNON.Vec3(
        this.backThickness / 2,
        this.backHeight * 0.25,
        this.seatDepth / 2
      ));
      const leftRailBody = new CANNON.Body({
        mass: 0, // Static
        shape: railShape,
        material: physicsMaterial,
      });
      leftRailBody.position.set(
        this.group.position.x - this.seatWidth / 2 + this.backThickness / 2,
        this.group.position.y + this.seatHeight + this.backHeight * 0.25,
        this.group.position.z
      );
      this.physics.addBody(leftRailBody);
      this.bodies.push(leftRailBody);
    }

    // Right rail
    const rightRail = new THREE.Mesh(railGeometry, woodMaterial);
    rightRail.position.set(
      this.seatWidth / 2 - this.backThickness / 2,
      this.seatHeight + this.backHeight * 0.25,
      0
    );
    rightRail.receiveShadow = true;
    rightRail.castShadow = true;
    rightRail.name = 'chair_rail_right';
    this.group.add(rightRail);

    // Add physics body for right rail
    if (this.physics && physicsMaterial) {
      const railShape = new CANNON.Box(new CANNON.Vec3(
        this.backThickness / 2,
        this.backHeight * 0.25,
        this.seatDepth / 2
      ));
      const rightRailBody = new CANNON.Body({
        mass: 0, // Static
        shape: railShape,
        material: physicsMaterial,
      });
      rightRailBody.position.set(
        this.group.position.x + this.seatWidth / 2 - this.backThickness / 2,
        this.group.position.y + this.seatHeight + this.backHeight * 0.25,
        this.group.position.z
      );
      this.physics.addBody(rightRailBody);
      this.bodies.push(rightRailBody);
    }
  }

  /**
   * Create bounding box helpers for visualization
   */
  private createBoundingBoxHelpers(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Compute bounding box
        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        
        if (bbox) {
          // Create a Box3 in world space
          const worldBox = new THREE.Box3();
          worldBox.copy(bbox);
          
          // Transform to world space
          const matrix = new THREE.Matrix4();
          child.updateMatrixWorld(true);
          matrix.copy(child.matrixWorld);
          worldBox.applyMatrix4(matrix);
          
          // Create helper
          const helper = new THREE.Box3Helper(worldBox, 0x00ff00);
          this.scene.add(helper);
          this.boundingBoxHelpers.push(helper);
        }
      }
    });
  }

  /**
   * Get the position where the robot should be placed (on top of seat)
   */
  getRobotSpawnPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.group.position.x,
      this.group.position.y + this.seatHeight + this.seatThickness / 2,
      this.group.position.z
    );
  }

  /**
   * Get the seat height for reference
   */
  getSeatHeight(): number {
    return this.seatHeight + this.seatThickness / 2;
  }

  setPosition(position: THREE.Vector3): void {
    this.group.position.copy(position);
  }

  dispose(): void {
    // Remove bounding box helpers
    for (const helper of this.boundingBoxHelpers) {
      this.scene.remove(helper);
    }
    this.boundingBoxHelpers = [];
    
    // Remove physics bodies
    if (this.physics) {
      for (const body of this.bodies) {
        this.physics.removeBody(body);
      }
    }
    this.bodies = [];

    // Clean up meshes
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.group);
    console.log('🗑️ Test Chair disposed');
  }
}