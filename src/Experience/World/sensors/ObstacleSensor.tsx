import * as THREE from 'three';

/**
 * Obstacle Detection Sensor
 * Casts a horizontal ray from the robot's feet to detect walls and obstacles.
 * Used by the robot's navigation system to avoid collisions.
 */
export class ObstacleSensor {
  private raycaster: THREE.Raycaster;
  private parent: THREE.Object3D;
  private scene: THREE.Scene;

  // Sensor configuration
  private maxRange: number;
  private sensorHeight: number;
  private forwardOffset: number;
  private minDistance: number;

  // Objects to ignore during raycasting (floor, robot parts, etc.)
  private ignoredObjects: Set<THREE.Object3D> = new Set();

  // Debug visualization
  private debugLine: THREE.Line | null = null;
  private debugEnabled: boolean = false;

  constructor(
    parent: THREE.Object3D,
    scene: THREE.Scene,
    options?: {
      maxRange?: number;
      sensorHeight?: number;
      forwardOffset?: number;
      minDistance?: number;
      debug?: boolean;
    },
  ) {
    this.parent = parent;
    this.scene = scene;

    this.maxRange = options?.maxRange ?? 5.0;
    this.sensorHeight = options?.sensorHeight ?? 0.02; // Default: 2cm from ground (foot level)
    this.forwardOffset = options?.forwardOffset ?? 0.3;
    this.minDistance = options?.minDistance ?? 0.1;
    this.debugEnabled = options?.debug ?? false;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxRange;
    this.raycaster.near = 0;

    // Auto-find and ignore ground objects
    this.findAndIgnoreGround();

    // Create debug visualization if enabled
    if (this.debugEnabled) {
      this.createDebugVisualization();
    }
  }

  /**
   * Create debug visualization objects
   */
  private createDebugVisualization(): void {
    // Simple ray line (green when clear, red when obstacle)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 2,
    });
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 1], 3),
    );
    this.debugLine = new THREE.Line(lineGeometry, lineMaterial);
    this.debugLine.name = 'debug_ray';
    this.scene.add(this.debugLine);

    // Add to ignored list so raycaster doesn't detect it
    this.ignoredObjects.add(this.debugLine);
  }

  /**
   * Update debug visualization
   */
  updateDebugVisualization(): void {
    if (!this.debugEnabled || !this.debugLine) return;

    const origin = this.getSensorOrigin();
    const direction = this.getSensorDirection();
    const hit = this.cast();

    // Calculate end point
    const endPoint = origin.clone();
    if (hit) {
      endPoint.copy(hit.point);
      // Red line for obstacle
      (this.debugLine.material as THREE.LineBasicMaterial).color.setHex(
        0xff0000,
      );
    } else {
      endPoint.add(direction.clone().multiplyScalar(this.maxRange));
      // Green line for clear
      (this.debugLine.material as THREE.LineBasicMaterial).color.setHex(
        0x00ff00,
      );
    }

    // Update line geometry
    const positions = this.debugLine.geometry.attributes
      .position as THREE.BufferAttribute;
    positions.setXYZ(0, origin.x, origin.y, origin.z);
    positions.setXYZ(1, endPoint.x, endPoint.y, endPoint.z);
    positions.needsUpdate = true;
  }

  /**
   * Enable/disable debug visualization
   */
  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;

    if (enabled && !this.debugLine) {
      this.createDebugVisualization();
    }

    if (this.debugLine) this.debugLine.visible = enabled;
  }

  /**
   * Find ground plane(s) and horizontal surfaces to ignore
   */
  private findAndIgnoreGround(): void {
    this.scene.traverse((obj) => {
      const name = obj.name.toLowerCase();

      // 1. Ignore by name
      if (
        name.includes('floor') ||
        name.includes('ground') ||
        name.includes('plane') ||
        name.includes('terrain') ||
        name.includes('tile')
      ) {
        this.ignoredObjects.add(obj);
        return;
      }

      // 2. Ignore flat meshes (planes, tiles, ground)
      if (obj instanceof THREE.Mesh && obj.geometry) {
        const geometry = obj.geometry;

        // Check if it's a PlaneGeometry (tiles are planes)
        if (geometry.type === 'PlaneGeometry') {
          this.ignoredObjects.add(obj);
          return;
        }

        geometry.computeBoundingBox();
        const box = geometry.boundingBox;

        if (box) {
          const sizeY = box.max.y - box.min.y;

          // Very flat geometry = ground/tile (height < 5cm)
          if (sizeY < 0.05) {
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
   * Check if object is part of the robot (should be ignored)
   */
  private isPartOfRobot(obj: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current === this.parent) {
        return true;
      }

      // Ignore physics debug meshes
      if (current.name && current.name.startsWith('bb_')) {
        return true;
      }

      current = current.parent;
    }
    return false;
  }

  /**
   * Check if object or any of its parents should be ignored
   */
  private shouldIgnore(obj: THREE.Object3D): boolean {
    // Check if it's part of the robot model
    if (this.isPartOfRobot(obj)) {
      return true;
    }

    // Ignore LineSegments (edge/wireframe visualizations)
    if (obj.type === 'LineSegments' || obj.type === 'Line') {
      return true;
    }

    // Ignore EdgesGeometry (wireframes)
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && mesh.geometry.type === 'EdgesGeometry') {
      return true;
    }

    // Check ignored set
    if (this.ignoredObjects.has(obj)) {
      return true;
    }

    // Check parents in ignored set
    let current: THREE.Object3D | null = obj.parent;
    while (current) {
      if (this.ignoredObjects.has(current)) {
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

    // 2. Get robot's forward direction using WORLD quaternion (not local)
    const worldQuaternion = new THREE.Quaternion();
    this.parent.getWorldQuaternion(worldQuaternion);

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuaternion);
    forward.y = 0; // Keep horizontal
    forward.normalize();

    // 3. Position sensor origin
    // Use relative Y coordinate from robot world position (usually feet level)
    const sensorOrigin = new THREE.Vector3(
      origin.x,
      origin.y + this.sensorHeight,
      origin.z,
    );

    // Move forward from robot center
    sensorOrigin.add(forward.clone().multiplyScalar(this.forwardOffset));

    // 4. Cast ray
    this.raycaster.set(sensorOrigin, forward);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true,
    );

    // 5. Find first valid hit
    for (const hit of intersects) {
      if (!this.shouldIgnore(hit.object) && hit.distance >= this.minDistance) {
        return hit;
      }
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
      normal: hit.face?.normal,
    };
  }

  /**
   * Get ray origin (for visualization)
   */
  getSensorOrigin(): THREE.Vector3 {
    if (!this.parent) return new THREE.Vector3();

    const origin = new THREE.Vector3();
    this.parent.getWorldPosition(origin);

    const worldQuaternion = new THREE.Quaternion();
    this.parent.getWorldQuaternion(worldQuaternion);

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuaternion);
    forward.y = 0;
    forward.normalize();

    const sensorOrigin = new THREE.Vector3(
      origin.x,
      this.sensorHeight,
      origin.z,
    );
    sensorOrigin.add(forward.multiplyScalar(this.forwardOffset));

    return sensorOrigin;
  }

  /**
   * Get ray direction (for visualization)
   */
  getSensorDirection(): THREE.Vector3 {
    if (!this.parent) return new THREE.Vector3(0, 0, 1);

    const worldQuaternion = new THREE.Quaternion();
    this.parent.getWorldQuaternion(worldQuaternion);

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuaternion);
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

    // Clean up debug line
    if (this.debugLine) {
      this.scene.remove(this.debugLine);
      this.debugLine.geometry.dispose();
      (this.debugLine.material as THREE.Material).dispose();
    }
  }
}
