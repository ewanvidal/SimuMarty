import * as THREE from 'three';
import type Experience from '../Experience.tsx';

/**
 * Floor
 * Creates the ground plane with textures
 */
export default class Floor {
  experience: Experience;
  scene: THREE.Scene;
  resources: any;
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
    this.experience = (window as any).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    console.log('🟫 Floor constructor');

    this.setGeometry();
    this.setTextures();
    this.setMaterial();
    this.setMesh();
    
    console.log('🟫 Floor created - mesh added to scene');
  }

  private setGeometry() {
    this.geometry = new THREE.PlaneGeometry(50, 50);
  }

  private setTextures() {
    // Get textures from resources
    const diffuse = this.resources.items.floorDiffuseTexture;
    const normal = this.resources.items.floorNormalTexture;
    const arm = this.resources.items.floorArmTexture;
    const alpha = this.resources.items.floorAlphaTexture;

    if (diffuse && normal && arm && alpha) {
      console.log('🟫 Floor textures loaded');
      
      // Set texture wrapping and repeat
      const repeat = 100;
      [diffuse, normal, arm].forEach((texture: THREE.Texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat, repeat);
      });

      this.textures = { diffuse, normal, arm, alpha };
    } else {
      console.warn('⚠️ Floor textures not loaded, using simple material');
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
