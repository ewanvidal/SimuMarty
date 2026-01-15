import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';

export interface FloorAppearancePreset {
  size?: number;
  color?: string;
  textureRepeat?: number;
}

/**
 * Floor
 * Creates the ground plane with textures
 */
export default class Floor {
  experience: Experience;
  scene: THREE.Scene;
  resources: Resources;
  geometry?: THREE.PlaneGeometry;
  textures?: {
    diffuse: THREE.Texture;
    normal: THREE.Texture;
    arm: THREE.Texture;
    alpha: THREE.Texture;
  };
  material?: THREE.MeshStandardMaterial;
  mesh?: THREE.Mesh;
  private readonly baseSize = 50;
  private readonly defaultRepeat = 100;
  private readonly defaultColor = '#777777';
  private initialPreset: Required<FloorAppearancePreset> = {
    size: this.baseSize,
    color: this.defaultColor,
    textureRepeat: this.defaultRepeat,
  };

  constructor() {
    this.experience = (
      window as unknown as { experience: Experience }
    ).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    this.setGeometry();
    this.setTextures();
    this.setMaterial();
    this.setMesh();
    this.captureInitialPreset();
  }

  private setGeometry() {
    this.geometry = new THREE.PlaneGeometry(this.baseSize, this.baseSize);
  }

  private setTextures() {
    // Get textures from resources
    const diffuse = this.resources.items.floorDiffuseTexture as THREE.Texture;
    const normal = this.resources.items.floorNormalTexture as THREE.Texture;
    const arm = this.resources.items.floorArmTexture as THREE.Texture;
    const alpha = this.resources.items.floorAlphaTexture as THREE.Texture;

    if (diffuse && normal && arm && alpha) {
      // Set texture wrapping and repeat
      const repeat = this.defaultRepeat;
      [diffuse, normal, arm].forEach((texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat, repeat);
      });

      this.textures = { diffuse, normal, arm, alpha };
    } else {
      console.warn('⚠️ Floor textures not loaded');
    }
  }

  private setMaterial() {
    if (this.textures) {
      // Material with textures - use texture maps for realistic reflections
      this.material = new THREE.MeshStandardMaterial({
        map: this.textures.diffuse,
        normalMap: this.textures.normal,
        roughnessMap: this.textures.arm,
        metalnessMap: this.textures.arm,
        aoMap: this.textures.arm,
        alphaMap: this.textures.alpha,
        transparent: true,
      });
    } else {
      // Fallback simple material
      this.material = new THREE.MeshStandardMaterial({
        color: this.defaultColor,
        metalness: 0.3,
        roughness: 0.7,
      });
    }
  }

  private setMesh() {
    if (!this.geometry || !this.material) return;

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI * 0.5;
    this.mesh.position.set(0, 0, 0);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  private captureInitialPreset() {
    const currentColor = this.material
      ? `#${this.material.color.getHexString()}`
      : this.defaultColor;
    const repeat = this.textures?.diffuse.repeat.x ?? this.defaultRepeat;
    this.initialPreset = {
      size: this.baseSize,
      color: currentColor,
      textureRepeat: repeat,
    };
  }

  applyPreset(preset?: FloorAppearancePreset | null) {
    const target = {
      size: preset?.size ?? this.initialPreset.size,
      color: preset?.color ?? this.initialPreset.color,
      textureRepeat: preset?.textureRepeat ?? this.initialPreset.textureRepeat,
    };

    this.updateSize(target.size);
    this.updateColor(target.color);
    this.updateTextureRepeat(target.textureRepeat);
  }

  private updateSize(size: number) {
    if (!this.mesh || size === undefined || size === null) return;
    const scale = size / this.initialPreset.size;
    this.mesh.scale.setScalar(scale);
  }

  private updateColor(color: string) {
    if (!this.material || color === undefined || color === null) return;
    this.material.color.set(color);
    this.material.needsUpdate = true;
  }

  private updateTextureRepeat(repeat: number) {
    if (!this.textures || repeat === undefined || repeat === null) return;
    [this.textures.diffuse, this.textures.normal, this.textures.arm].forEach((texture) => {
      texture.repeat.set(repeat, repeat);
      texture.needsUpdate = true;
    });
  }

  dispose() {
    this.geometry?.dispose();
    this.material?.dispose();
    this.textures?.diffuse.dispose();
    this.textures?.normal.dispose();
    this.textures?.arm.dispose();
    this.textures?.alpha.dispose();
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
  }
}
