import * as THREE from 'three';

/**
 * Obstacle Detection Sensor
 * Casts a horizontal ray from the robot's torso to detect walls and obstacles
 */
export class ObstacleSensor {
  private raycaster: THREE.Raycaster;
  private parent: THREE.Object3D;
  private scene: THREE.Scene;
  
  private maxRange: number;
  private sensorHeight: number;
  private forwardOffset: number;
  private minDistance: number;
  
  private ignoredObjects: Set<THREE.Object3D> = new Set();

  constructor(
    parent: THREE.Object3D,
    scene: THREE.Scene,
    options?: {
      maxRange?: number;
      sensorHeight?: number;
      forwardOffset?: number;
      minDistance?: number;
    }
  ) {
    this.parent = parent;
    this.scene = scene;
    
    this.maxRange = options?.maxRange ?? 5.0;
    this.sensorHeight = options?.sensorHeight ?? 0.25;
    this.forwardOffset = options?.forwardOffset ?? 0.3;
    this.minDistance = options?.minDistance ?? 0.3;
    
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxRange;
    this.raycaster.near = 0;

    // Auto-find and ignore ground objects
    this.findAndIgnoreGround();
  }

  /**
   * Find ground plane(s) and large horizontal surfaces to ignore
   */
  private findAndIgnoreGround(): void {
    this.scene.traverse((obj) => {
      const name = obj.name.toLowerCase();
      
      // 1. Ignore by name
      if (name.includes('floor') || 
          name.includes('ground') || 
          name.includes('plane') ||
          name.includes('terrain')) {
        this.ignoredObjects.add(obj);
        return;
      }
      
      // 2. Ignore large flat meshes (likely ground)
      if (obj instanceof THREE.Mesh) {
        const geometry = obj.geometry;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        
        if (box) {
          const sizeX = box.max.x - box.min.x;
          const sizeY = box.max.y - box.min.y;
          const sizeZ = box.max.z - box.min.z;
          
          // Very flat AND large = ground
          if (sizeY < 0.2 && (sizeX > 5 || sizeZ > 5)) {
            this.ignoredObjects.add(obj);
          }
        }
      }
    });
  }

  /**
   * Manually add object(s) to ignore
   */
  addIgnoredObject(obj: THREE.Object3D): void {
    this.ignoredObjects.add(obj);
  }

  /**
   * Check if object or any of its parents should be ignored
   */
  private shouldIgnore(obj: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = obj;
    
    while (current) {
      // Check ignored set
      if (this.ignoredObjects.has(current)) {
        return true;
      }
      
      // Check if it's the robot
      if (current === this.parent) {
        return true;
      }
      
      current = current.parent;
    }

    return false;
  }

  /**
   * Cast ray and return first valid intersection
   */
  private cast(): THREE.Intersection | null {
    if (!this.parent) return null;

    // 1. Get robot world position
    const origin = new THREE.Vector3();
    this.parent.getWorldPosition(origin);

    // 2. Get robot's forward direction (horizontal only)
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.parent.quaternion);
    forward.y = 0;
    forward.normalize();

    // 3. Position sensor origin
    // IMPORTANT: Use absolute Y coordinate (not relative to robot)
    const sensorOrigin = new THREE.Vector3(
      origin.x,
      this.sensorHeight, // Absolute height from ground
      origin.z
    );
    
    // Move forward from robot center
    sensorOrigin.add(forward.clone().multiplyScalar(this.forwardOffset));

    // 4. Cast ray
    this.raycaster.set(sensorOrigin, forward);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    // 5. Find first valid hit
    for (const hit of intersects) {
      if (this.shouldIgnore(hit.object)) continue;
      if (hit.distance < this.minDistance) continue;
      return hit;
    }

    return null;
  }

  /**
   * Get distance to nearest obstacle (Infinity if none)
   */
  getDistance(): number {
    const hit = this.cast();
    return hit ? hit.distance : Infinity;
  }

  /**
   * Get detailed obstacle info for debugging
   */
  getObstacleInfo() {
    const hit = this.cast();
    if (!hit) return null;
    
    return {
      distance: hit.distance,
      point: hit.point,
      object: hit.object,
      objectName: hit.object.name || 'unnamed',
      normal: hit.face?.normal
    };
  }

  /**
   * Get ray origin (for visualization)
   */
  getSensorOrigin(): THREE.Vector3 {
    if (!this.parent) return new THREE.Vector3();
    
    const origin = new THREE.Vector3();
    this.parent.getWorldPosition(origin);
    
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.parent.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const sensorOrigin = new THREE.Vector3(
      origin.x,
      this.sensorHeight,
      origin.z
    );
    sensorOrigin.add(forward.multiplyScalar(this.forwardOffset));
    
    return sensorOrigin;
  }

  /**
   * Get ray direction (for visualization)
   */
  getSensorDirection(): THREE.Vector3 {
    if (!this.parent) return new THREE.Vector3(0, 0, 1);
    
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.parent.quaternion);
    forward.y = 0;
    forward.normalize();
    
    return forward;
  }

  /**
   * Check if obstacle within threshold
   */
  isObstacleWithin(threshold: number): boolean {
    return this.getDistance() < threshold;
  }

  dispose(): void {
    this.ignoredObjects.clear();
  }
}
