import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';

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
  }

  private setGeometry() {
    this.geometry = new THREE.PlaneGeometry(50, 50);
  }

  private setTextures() {
    // Get textures from resources
    const diffuse = this.resources.items.floorDiffuseTexture as THREE.Texture;
    const normal = this.resources.items.floorNormalTexture as THREE.Texture;
    const arm = this.resources.items.floorArmTexture as THREE.Texture;
    const alpha = this.resources.items.floorAlphaTexture as THREE.Texture;

    if (diffuse && normal && arm && alpha) {
      // Set texture wrapping and repeat
      const repeat = 100;
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
      // Material with textures
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
        color: '#777777',
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
