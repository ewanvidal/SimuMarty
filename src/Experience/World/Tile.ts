import * as THREE from 'three';

/** Tile size in world units */
export const TILE_SIZE = 0.1;

/**
 * Configuration for a tile type
 */
export interface TileConfig {
  /** Display name */
  name: string;
  /** Hex color string */
  color: string;
  /** Whether the tile should pulse/animate */
  animated?: boolean;
  /** Pulse speed multiplier (default: 3) */
  pulseSpeed?: number;
  /** Pulse intensity 0-1 (default: 0.2) */
  pulseIntensity?: number;
  /** Base opacity (default: 1) */
  opacity?: number;
}

/**
 * Predefined tile types - easily extensible
 */
export const TileTypes = {
  PATH: {
    name: 'Path',
    color: '#e5e5e5',
    animated: false,
  },
  START: {
    name: 'Start',
    color: '#ef4444', // Red
    animated: true,
    pulseSpeed: 2,
    pulseIntensity: 0.3,
  },
  GOAL: {
    name: 'Goal',
    color: '#22c55e', // Green
    animated: true,
    pulseSpeed: 3,
    pulseIntensity: 0.25,
  },
  CHECKPOINT: {
    name: 'Checkpoint',
    color: '#3b82f6', // Blue
    animated: true,
    pulseSpeed: 2.5,
    pulseIntensity: 0.2,
  },
} as const satisfies Record<string, TileConfig>;

export type TileTypeName = keyof typeof TileTypes;

/**
 * Tile
 * A single floor tile with optional pulsing animation.
 * Can be any predefined type or custom configuration.
 */
export class Tile {
  private mesh: THREE.Mesh; // Visual mesh (transparent, layer 0)
  private sensorMesh: THREE.Mesh; // Sensor mesh (opaque, layer 2 only)
  private border: THREE.LineSegments;
  private material: THREE.MeshStandardMaterial;
  private sensorMaterial: THREE.MeshBasicMaterial;
  private config: Required<TileConfig>;
  private animationTime = 0;
  private baseOpacity: number;
  private size: number;

  constructor(
    parent: THREE.Object3D,
    config: TileConfig,
    position: { x: number; z: number },
    size: number = TILE_SIZE,
  ) {
    // Merge with defaults
    this.config = {
      name: config.name,
      color: config.color,
      animated: config.animated ?? false,
      pulseSpeed: config.pulseSpeed ?? 3,
      pulseIntensity: config.pulseIntensity ?? 0.2,
      opacity: config.opacity ?? 1,
    };

    this.baseOpacity = this.config.opacity;
    this.size = size;

    const geometry = new THREE.PlaneGeometry(this.size, this.size);

    // === VISUAL MESH (transparent, seen by main camera on layer 0) ===
    this.material = new THREE.MeshStandardMaterial({
      color: this.config.color,
      emissive: this.config.color,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(position.x, 0.001, position.z);
    this.mesh.receiveShadow = false;
    // Visual mesh only on layer 0 (main camera)
    this.mesh.layers.set(0);

    // === SENSOR MESH (opaque, seen only by sensor camera on layer 2) ===
    this.sensorMaterial = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });

    this.sensorMesh = new THREE.Mesh(geometry, this.sensorMaterial);
    this.sensorMesh.rotation.x = -Math.PI / 2;
    this.sensorMesh.position.set(position.x, 0.002, position.z);
    // Sensor mesh only on layer 2 (sensor camera)
    this.sensorMesh.layers.set(2);

    // Create border/grid lines with strong contrast
    const edges = new THREE.EdgesGeometry(geometry);
    this.border = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }),
    );
    this.border.rotation.x = -Math.PI / 2;
    this.border.position.set(position.x, 0.0015, position.z);

    parent.add(this.mesh);
    parent.add(this.sensorMesh);
    parent.add(this.border);
  }

  /**
   * Update animation (call every frame)
   */
  update(deltaSeconds: number): void {
    if (!this.config.animated) return;

    this.animationTime += deltaSeconds;
    const pulse =
      Math.sin(this.animationTime * this.config.pulseSpeed) *
        this.config.pulseIntensity +
      (1 - this.config.pulseIntensity);
    this.material.opacity = this.baseOpacity * pulse;
  }

  /**
   * Get the tile's world position
   */
  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  /**
   * Check if a position is on this tile
   */
  isPositionOnTile(position: { x: number; z: number }, tolerance = 0): boolean {
    const halfSize = this.size / 2 + tolerance;
    const dx = Math.abs(position.x - this.mesh.position.x);
    const dz = Math.abs(position.z - this.mesh.position.z);
    return dx <= halfSize && dz <= halfSize;
  }

  /**
   * Change tile color
   */
  setColor(color: string): void {
    this.material.color.set(color);
    this.material.emissive.set(color);
    this.sensorMaterial.color.set(color);
  }

  /**
   * Show/hide the tile
   */
  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    this.sensorMesh.visible = visible;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.parent?.remove(this.mesh);
    this.sensorMesh.parent?.remove(this.sensorMesh);
    this.sensorMaterial.dispose();
    this.border.geometry.dispose();
    (this.border.material as THREE.Material).dispose();
    this.border.parent?.remove(this.border);
  }
}

/**
 * Factory function to create a tile from a predefined type
 */
export function createTile(
  parent: THREE.Object3D,
  type: TileTypeName | TileConfig,
  position: { x: number; z: number },
  size?: number,
): Tile {
  const config = typeof type === 'string' ? TileTypes[type] : type;
  return new Tile(parent, config, position, size);
}
