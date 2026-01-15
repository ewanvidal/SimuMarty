import * as THREE from 'three';

/**
 * Foot Light
 * A soft diffuse spotlight attached to the robot's foot for illuminating the ground
 * beneath the color sensor. The light fits inside the hollow sole of the foot
 * in the GLB model and is designed to:
 * - Provide soft diffuse-only illumination (no bright specular)
 * - Fit within the hollow sole cavity of the foot mesh
 * - Allow accurate ground color detection without washing out colors
 */
export class FootLight {
  private spotLight: THREE.SpotLight;
  private targetObject: THREE.Object3D;
  private parent: THREE.Object3D;
  private scene: THREE.Scene;
  private helperObject: THREE.Object3D;
  private spotLightHelper?: THREE.SpotLightHelper;

  constructor(
    parent: THREE.Object3D,
    scene: THREE.Scene,
    options?: {
      /** Light intensity (default: 0.08 - very low for diffuse-only effect) */
      intensity?: number;
      /** Light color (default: pure white 0xffffff) */
      color?: number;
      /** Cone angle in radians (default: Math.PI) */
      angle?: number;
      /** Penumbra - softness at cone edge 0-1 (default: 1.0 - maximum softness) */
      penumbra?: number;
      /** Light distance/range (default: 0.3m - short range) */
      distance?: number;
      /** Height offset from parent (default: 0.0 - at foot level inside hollow sole) */
      heightOffset?: number;
      /** Show debug helper (default: false) */
      showHelper?: boolean;
    }
  ) {
    this.parent = parent;
    this.scene = scene;

    const intensity = options?.intensity ?? 0.03;  // Very low for diffuse-only
    const color = options?.color ?? 0xffffff;
    const angle = options?.angle ?? Math.PI;   // ~180 degrees - broad diffuse beam for the whole space below foot
    const penumbra = options?.penumbra ?? 1.0;     // Maximum softness
    const distance = options?.distance ?? 0.3;     // Short range
    const heightOffset = options?.heightOffset ?? 0.0;

    // Create helper object to track position in world space
    this.helperObject = new THREE.Object3D();
    this.helperObject.position.set(0, heightOffset, 0);
    parent.add(this.helperObject);

    // Create target for the spotlight to aim at (below the foot)
    this.targetObject = new THREE.Object3D();
    scene.add(this.targetObject);

    // Create the spotlight with high decay for diffuse falloff
    this.spotLight = new THREE.SpotLight(color, intensity, distance, angle, penumbra);
    this.spotLight.target = this.targetObject;
    this.spotLight.decay = 2; // Physical light falloff for more natural diffuse look
    
    // Disable shadow casting - this is a soft fill light for color detection
    this.spotLight.castShadow = false;

    // Add light to scene (not parent, to avoid transform issues)
    scene.add(this.spotLight);

    // Optional debug helper
    if (options?.showHelper) {
      this.spotLightHelper = new THREE.SpotLightHelper(this.spotLight);
      scene.add(this.spotLightHelper);
    }

    console.log('💡 Foot Light initialized (diffuse mode)');
  }

  /**
   * Update light position to follow parent foot bone
   * Should be called every frame
   */
  update(): void {
    // Get world position from helper object
    const worldPos = new THREE.Vector3();
    this.helperObject.getWorldPosition(worldPos);
    
    // Position light at foot location
    this.spotLight.position.copy(worldPos);
    
    // Position target directly below the light (on the ground)
    this.targetObject.position.set(worldPos.x, 0, worldPos.z);

    // Update helper if it exists
    if (this.spotLightHelper) {
      this.spotLightHelper.update();
    }
  }

  /**
   * Set light intensity
   * @param intensity - Value between 0 and 1 recommended to avoid washing out colors
   */
  setIntensity(intensity: number): void {
    this.spotLight.intensity = intensity;
  }

  /**
   * Get current light intensity
   */
  getIntensity(): number {
    return this.spotLight.intensity;
  }

  /**
   * Set light color
   */
  setColor(color: number | string): void {
    this.spotLight.color.set(color);
  }

  /**
   * Enable or disable the light
   */
  setEnabled(enabled: boolean): void {
    this.spotLight.visible = enabled;
  }

  /**
   * Check if light is enabled
   */
  isEnabled(): boolean {
    return this.spotLight.visible;
  }

  /**
   * Get the spotlight object (useful for debugging)
   */
  getSpotLight(): THREE.SpotLight {
    return this.spotLight;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.scene.remove(this.spotLight);
    this.scene.remove(this.targetObject);
    this.parent.remove(this.helperObject);
    
    if (this.spotLightHelper) {
      this.scene.remove(this.spotLightHelper);
      this.spotLightHelper.dispose();
    }

    this.spotLight.dispose();
    console.log('🗑️ Foot Light disposed');
  }
}
