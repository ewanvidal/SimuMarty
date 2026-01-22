import * as THREE from 'three';

/**
 * Obstacle Detection Sensor
 * Raycaster-based sensor that detects obstacles in front of the robot
 */
export class ObstacleSensor {
  private raycaster: THREE.Raycaster;
  private direction: THREE.Vector3;
  private parent: THREE.Object3D;
  private scene: THREE.Scene;
  private maxRange: number;
  private sensorHeight: number;
  private sensorOffset: THREE.Vector3;

  constructor(
    parent: THREE.Object3D,
    scene: THREE.Scene,
    options?: {
      maxRange?: number;
      sensorHeight?: number;
      sensorOffset?: THREE.Vector3;
    }
  ) {
    this.parent = parent;
    this.scene = scene;
    this.maxRange = options?.maxRange ?? 10;
    this.sensorHeight = options?.sensorHeight ?? 0.1;
    this.sensorOffset = options?.sensorOffset ?? new THREE.Vector3(0, 0, 0);

    // Initialize raycaster
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxRange;
    this.direction = new THREE.Vector3();
  }

  /**
   * Detect obstacles ahead of the robot
   * @param excludeObjects Optional array of objects to exclude from detection
   * @returns Distance to nearest obstacle, or Infinity if nothing detected
   */
  getDistance(excludeObjects?: THREE.Object3D[]): number {
    // Get robot's forward direction in world space
    this.parent.getWorldDirection(this.direction);

    // Set raycaster origin (sensor position)
    const origin = this.parent.position.clone();
    origin.y += this.sensorHeight;
    origin.add(this.sensorOffset);

    // Configure and cast ray
    this.raycaster.set(origin, this.direction);

    // Filter out excluded objects (including the parent/robot itself)
    const objectsToExclude = excludeObjects || [];
    objectsToExclude.push(this.parent);

    const sceneChildren = this.scene.children.filter(
      (child) => !objectsToExclude.includes(child)
    );

    // Intersect with scene objects
    const intersects = this.raycaster.intersectObjects(sceneChildren, true);

    if (intersects.length > 0) {
      return intersects[0].distance;
    }

    return Infinity; // Nothing detected
  }

  /**
   * Check if there's an obstacle within a specific distance
   * @param threshold Distance threshold in world units
   * @returns True if obstacle detected within threshold
   */
  isObstacleWithin(threshold: number): boolean {
    const distance = this.getDistance();
    return distance < threshold;
  }

  /**
   * Get detailed information about the detected obstacle
   * @returns Object with distance, position, and intersected object, or null
   */
  getObstacleInfo(excludeObjects?: THREE.Object3D[]): {
    distance: number;
    point: THREE.Vector3;
    object: THREE.Object3D;
    normal: THREE.Vector3;
  } | null {
    // Get robot's forward direction in world space
    this.parent.getWorldDirection(this.direction);

    // Set raycaster origin
    const origin = this.parent.position.clone();
    origin.y += this.sensorHeight;
    origin.add(this.sensorOffset);

    // Configure and cast ray
    this.raycaster.set(origin, this.direction);

    // Filter out excluded objects
    const objectsToExclude = excludeObjects || [];
    objectsToExclude.push(this.parent);

    const sceneChildren = this.scene.children.filter(
      (child) => !objectsToExclude.includes(child)
    );

    const intersects = this.raycaster.intersectObjects(sceneChildren, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      return {
        distance: hit.distance,
        point: hit.point,
        object: hit.object,
        normal: hit.face?.normal ?? new THREE.Vector3(0, 1, 0),
      };
    }

    return null;
  }

  /**
   * Cast ray in a custom direction relative to the parent
   * @param direction Direction vector (will be normalized)
   * @returns Distance to obstacle or Infinity
   */
  castInDirection(direction: THREE.Vector3, excludeObjects?: THREE.Object3D[]): number {
    const origin = this.parent.position.clone();
    origin.y += this.sensorHeight;
    origin.add(this.sensorOffset);

    const worldDirection = direction.clone().normalize();
    
    // Transform direction to world space if needed
    worldDirection.applyQuaternion(this.parent.quaternion);

    this.raycaster.set(origin, worldDirection);

    const objectsToExclude = excludeObjects || [];
    objectsToExclude.push(this.parent);

    const sceneChildren = this.scene.children.filter(
      (child) => !objectsToExclude.includes(child)
    );

    const intersects = this.raycaster.intersectObjects(sceneChildren, true);

    if (intersects.length > 0) {
      return intersects[0].distance;
    }

    return Infinity;
  }

  /**
   * Update sensor configuration
   */
  setMaxRange(range: number): void {
    this.maxRange = range;
    this.raycaster.far = range;
  }

  setSensorHeight(height: number): void {
    this.sensorHeight = height;
  }

  setSensorOffset(offset: THREE.Vector3): void {
    this.sensorOffset.copy(offset);
  }

  /**
   * Get the raycaster for advanced usage
   */
  getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  /**
   * Get current sensor origin in world space (useful for debugging)
   */
  getSensorOrigin(): THREE.Vector3 {
    const origin = this.parent.position.clone();
    origin.y += this.sensorHeight;
    origin.add(this.sensorOffset);
    return origin;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
  }
}
