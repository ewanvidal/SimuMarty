import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';
import type Debug from '../Utils/Debug.tsx';

export interface EnvironmentPresetConfig {
  sunLight?: {
    intensity?: number;
    color?: string;
    position?: [number, number, number];
  };
  ambientLight?: {
    intensity?: number;
    color?: string;
  };
}

/**
 * Environment
 * Handles lighting and environment map
 */
export default class Environment {
  experience: Experience;
  scene: THREE.Scene;
  resources: Resources;
  debug: Debug;
  sunLight?: THREE.DirectionalLight;
  ambientLight?: THREE.AmbientLight;
  environmentMap?: {
    intensity: number;
    texture: THREE.Texture;
  };
  private initialSunState?: Required<
    NonNullable<EnvironmentPresetConfig['sunLight']>
  >;
  private initialAmbientState?: Required<
    NonNullable<EnvironmentPresetConfig['ambientLight']>
  >;

  constructor() {
    this.experience = (
      window as unknown as { experience: Experience }
    ).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;

    this.setSunLight();
    this.setAmbientLight();
    // this.setEnvironmentMap();
    this.captureInitialStates();
  }

  private setSunLight() {
    this.sunLight = new THREE.DirectionalLight('#ffffff', 3.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.far = 15;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.normalBias = 0.05;
    this.sunLight.position.set(3.5, 2, -1.25);
    this.scene.add(this.sunLight);

    // Debug
    if (this.debug.active && this.debug.ui) {
      const folder = this.debug.ui.addFolder('sunLight');
      folder
        .add(this.sunLight, 'intensity')
        .min(0)
        .max(10)
        .step(0.001)
        .name('intensity');
      folder
        .add(this.sunLight.position, 'x')
        .min(-5)
        .max(5)
        .step(0.001)
        .name('x');
      folder
        .add(this.sunLight.position, 'y')
        .min(-5)
        .max(5)
        .step(0.001)
        .name('y');
      folder
        .add(this.sunLight.position, 'z')
        .min(-5)
        .max(5)
        .step(0.001)
        .name('z');
    }
  }

  private setAmbientLight() {
    this.ambientLight = new THREE.AmbientLight('#ffffff', 1.5);
    this.scene.add(this.ambientLight);

    // Debug
    if (this.debug.active && this.debug.ui) {
      this.debug.ui
        .add(this.ambientLight, 'intensity')
        .min(0)
        .max(3)
        .step(0.001)
        .name('ambientIntensity');
    }
  }

  private captureInitialStates() {
    if (this.sunLight) {
      this.initialSunState = {
        intensity: this.sunLight.intensity,
        color: `#${this.sunLight.color.getHexString()}`,
        position: [
          this.sunLight.position.x,
          this.sunLight.position.y,
          this.sunLight.position.z,
        ],
      };
    }

    if (this.ambientLight) {
      this.initialAmbientState = {
        intensity: this.ambientLight.intensity,
        color: `#${this.ambientLight.color.getHexString()}`,
      };
    }
  }

  applyPreset(preset?: EnvironmentPresetConfig | null) {
    const sunConfig = this.initialSunState
      ? {
          ...this.initialSunState,
          ...(preset?.sunLight ?? {}),
        }
      : undefined;

    if (this.sunLight && sunConfig) {
      this.sunLight.intensity = sunConfig.intensity;
      this.sunLight.color.set(sunConfig.color);
      this.sunLight.position.set(...sunConfig.position);
    }

    const ambientConfig = this.initialAmbientState
      ? {
          ...this.initialAmbientState,
          ...(preset?.ambientLight ?? {}),
        }
      : undefined;

    if (this.ambientLight && ambientConfig) {
      this.ambientLight.intensity = ambientConfig.intensity;
      this.ambientLight.color.set(ambientConfig.color);
    }
  }

  // Uncomment when environment map texture is available
  // private setEnvironmentMap() {
  //   this.environmentMap = {
  //     intensity: 0.4,
  //     texture: this.resources.items.environmentMapTexture
  //   };
  //
  //   this.scene.environment = this.environmentMap.texture;
  //
  //   if (this.debug.active && this.debug.ui) {
  //     this.debug.ui.add(this.environmentMap, 'intensity').min(0).max(4).step(0.001).name('envMapIntensity');
  //   }
  // }

  dispose() {
    if (this.sunLight) {
      this.scene.remove(this.sunLight);
    }
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
    }
  }
}
