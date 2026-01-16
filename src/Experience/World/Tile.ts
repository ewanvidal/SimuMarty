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
  DANGER: {
    name: 'Danger',
    color: '#dc2626', // Dark red
    animated: true,
    pulseSpeed: 5,
    pulseIntensity: 0.4,
  },
  WARNING: {
    name: 'Warning',
    color: '#eab308', // Yellow
    animated: true,
    pulseSpeed: 4,
    pulseIntensity: 0.3,
  },
} as const satisfies Record<string, TileConfig>;

export type TileTypeName = keyof typeof TileTypes;

/**
 * Tile
 * A single floor tile with optional pulsing animation.
 * Can be any predefined type or custom configuration.
 */
export class Tile {
  private mesh: THREE.Mesh;
  private border: THREE.LineSegments;
  private material: THREE.MeshStandardMaterial;
  private config: Required<TileConfig>;
  private animationTime = 0;
  private baseOpacity: number;

  constructor(parent: THREE.Object3D, config: TileConfig, position: { x: number; z: number }) {
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

    // Create material
    this.material = new THREE.MeshStandardMaterial({
      color: this.config.color,
      roughness: 0.8,
      transparent: this.config.animated || this.config.opacity < 1,
      opacity: this.config.opacity,
    });

    // Create mesh
    const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(position.x, 0.0002, position.z);
    this.mesh.receiveShadow = true;

    // Create border/grid lines
    const edges = new THREE.EdgesGeometry(geometry);
    this.border = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5 })
    );
    this.border.rotation.x = -Math.PI / 2;
    this.border.position.set(position.x, 0.0002, position.z);

    parent.add(this.mesh);
    parent.add(this.border);
  }

  /**
   * Update animation (call every frame)
   */
  update(deltaSeconds: number): void {
    if (!this.config.animated) return;

    this.animationTime += deltaSeconds;
    const pulse = Math.sin(this.animationTime * this.config.pulseSpeed) * this.config.pulseIntensity + (1 - this.config.pulseIntensity);
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
    const halfSize = TILE_SIZE / 2 + tolerance;
    const dx = Math.abs(position.x - this.mesh.position.x);
    const dz = Math.abs(position.z - this.mesh.position.z);
    return dx <= halfSize && dz <= halfSize;
  }

  /**
   * Change tile color
   */
  setColor(color: string): void {
    this.material.color.set(color);
  }

  /**
   * Show/hide the tile
   */
  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.parent?.remove(this.mesh);
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
  position: { x: number; z: number }
): Tile {
  const config = typeof type === 'string' ? TileTypes[type] : type;
  return new Tile(parent, config, position);
}
