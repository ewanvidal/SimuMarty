import * as THREE from 'three';

/**
 * Ground Color Sensor
 * Virtual camera sensor that detects the color of the ground beneath the robot
 */
export class GroundColorSensor {
  private camera: THREE.PerspectiveCamera;
  private renderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private parent: THREE.Object3D;
  private sensorOffsetY: number;
  private helperObject: THREE.Object3D; // Helper for world position tracking

  constructor(
    parent: THREE.Object3D,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    options?: {
      fov?: number;
      sensorHeight?: number;
      nearPlane?: number;
      farPlane?: number;
    }
  ) {
    this.parent = parent;
    this.scene = scene;
    this.renderer = renderer;
    this.sensorOffsetY = options?.sensorHeight ?? 0.05;

    // Create a 1x1 render target for color sampling
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1);

    // Create helper object attached to parent for tracking position
    this.helperObject = new THREE.Object3D();
    this.helperObject.position.set(0, this.sensorOffsetY, 0);
    parent.add(this.helperObject);

    // Create camera in world space pointing downward
    this.camera = new THREE.PerspectiveCamera(
      options?.fov ?? 10,
      1,
      options?.nearPlane ?? 0.01,
      options?.farPlane ?? 1
    );
    this.camera.rotation.x = -Math.PI / 2; // Point down
    
    // Configure camera layers:
    // - Only layer 2: sensor meshes (opaque tiles for accurate color detection)
    // - Layer 0 (floor/scene) and layer 1 (foot light) are excluded
    this.camera.layers.disableAll();
    this.camera.layers.enable(2); // Only see sensor meshes
    
    // Add camera to scene (not parent) to avoid transform issues
    scene.add(this.camera);
  }

  /**
   * Update sensor position to follow parent
   */
  update(): void {
    // Get world position from helper object
    const worldPos = new THREE.Vector3();
    this.helperObject.getWorldPosition(worldPos);
    this.camera.position.copy(worldPos);
  }

  /**
   * Get the ground color beneath the sensor
   * @returns RGB color object {r, g, b} with values 0-255, or null if error
   */
  getColor(): { r: number; g: number; b: number } | null {
    try {
      // Update camera position before rendering
      this.update();
      // Render scene from sensor camera perspective
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.render(this.scene, this.camera);

      // Read pixel data
      const pixel = new Uint8Array(4);
      this.renderer.readRenderTargetPixels(
        this.renderTarget,
        0,
        0,
        1,
        1,
        pixel
      );

      // Reset render target to default
      this.renderer.setRenderTarget(null);

      return {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if the detected color matches red
   * @param threshold RGB threshold values (default: 200 for target, 50 for others)
   */
  isRed(threshold = { target: 200, others: 50 }): boolean {
    const color = this.getColor();
    if (!color) return false;
    return (
      color.r > threshold.target &&
      color.g < threshold.others &&
      color.b < threshold.others
    );
  }

  /**
   * Check if the detected color matches blue
   * @param threshold RGB threshold values (default: 200 for target, 50 for others)
   */
  isBlue(threshold = { target: 200, others: 50 }): boolean {
    const color = this.getColor();
    if (!color) return false;
    return (
      color.b > threshold.target &&
      color.r < threshold.others &&
      color.g < threshold.others
    );
  }

  /**
   * Check if the detected color matches green
   * @param threshold RGB threshold values (default: 200 for target, 50 for others)
   */
  isGreen(threshold = { target: 200, others: 50 }): boolean {
    const color = this.getColor();
    if (!color) return false;
    return (
      color.g > threshold.target &&
      color.r < threshold.others &&
      color.b < threshold.others
    );
  }

  /**
   * Check if the detected color matches a custom RGB range
   */
  isColorInRange(
    targetColor: { r: number; g: number; b: number },
    tolerance = 50
  ): boolean {
    const color = this.getColor();
    if (!color) return false;

    return (
      Math.abs(color.r - targetColor.r) <= tolerance &&
      Math.abs(color.g - targetColor.g) <= tolerance &&
      Math.abs(color.b - targetColor.b) <= tolerance
    );
  }

  /**
   * Get the camera object (useful for debugging/visualization)
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Update sensor position relative to parent
   */
  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.renderTarget.dispose();
    this.scene.remove(this.camera);
    this.parent.remove(this.helperObject);
  }
}
