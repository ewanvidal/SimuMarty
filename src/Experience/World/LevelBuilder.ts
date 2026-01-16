import * as THREE from 'three';
import EventEmitter from '../Utils/EventEmitter';
import { Tile, TileTypes, TILE_SIZE, type TileTypeName, createTile } from './Tile';

/** Map codes for level building */
export const MapCode = {
  VOID: 0,
  PATH: 1,
  GOAL: 3,
  START: 9,
} as const;

/**
 * LevelBuilder
 * Simple level builder that creates floor tiles from a 2D map.
 * Uses the Tile system for animated tiles (start, goal, etc.)
 * Emits 'goalReached' event when Marty stays on goal for required duration.
 */
export class LevelBuilder extends EventEmitter {
  private scene: THREE.Scene;
  private container: THREE.Group;
  private tiles: Tile[] = [];
  private tileEntries: Array<{ tile: Tile; type: TileTypeName }> = [];
  
  // Goal detection
  private goalEntry: { tile: Tile; type: TileTypeName } | null = null;
  private timeOnGoal: number = 0;
  private goalReachedDuration: number = 2.5; // seconds
  private goalReached: boolean = false;
  private lastTileKey: string | null = null;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
    this.container = new THREE.Group();
    this.scene.add(this.container);
  }

  // Store start position for Marty placement
  private startPosition: THREE.Vector3 | null = null;

  /**
   * Build level from a 2D map array
   * @param map - 2D array where: 0=void, 1=path, 3=goal, 9=start
   */
  build(map: number[][]): void {
    this.clear();

    const rows = map.length;
    const cols = map[0].length;
    
    // Center the level and align with floor grid
    // Floor texture tiles are at integer multiples of TILE_SIZE
    // We offset by TILE_SIZE/2 so tile centers align with floor grid centers
    const offsetX = (cols * TILE_SIZE) / 2;
    const offsetZ = (rows * TILE_SIZE) / 2;

    const tilesToCreate: Array<{ type: TileTypeName; x: number; z: number; code: number }> = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const code = map[row][col];
        if (code === MapCode.VOID) continue;

        // Position tiles so their centers align with floor texture grid
        const x = col * TILE_SIZE - offsetX;
        const z = row * TILE_SIZE - offsetZ;

        // Map code to tile type
        let tileType: TileTypeName = 'PATH';
        if (code === MapCode.START) tileType = 'START';
        if (code === MapCode.GOAL) tileType = 'GOAL';

        tilesToCreate.push({ type: tileType, x, z, code });

        if (code === MapCode.START) {
          this.startPosition = new THREE.Vector3(x, 0, z);
        }
      }
    }

    for (const tileDef of tilesToCreate) {
      const tile = createTile(this.container, TileTypes[tileDef.type], { x: tileDef.x, z: tileDef.z });
      this.tiles.push(tile);
      this.tileEntries.push({ tile, type: tileDef.type });

      if (tileDef.code === MapCode.GOAL) {
        this.goalEntry = { tile, type: tileDef.type };
      }
    }
  }

  /**
   * Get start position for Marty placement
   */
  getStartPosition(): THREE.Vector3 | null {
    return this.startPosition?.clone() ?? null;
  }

  /**
   * Add a tile of any type at position
   */
  addTile(type: TileTypeName, x: number, z: number): Tile {
    const tile = createTile(this.container, TileTypes[type], { x, z });
    this.tiles.push(tile);
    const entry = { tile, type };
    this.tileEntries.push(entry);

    if (type === 'START') {
      this.startPosition = new THREE.Vector3(x, 0, z);
    }
    if (type === 'GOAL') {
      this.goalEntry = entry;
    }
    return tile;
  }

  /**
   * Convenience: Add path tile
   */
  addPathTile(x: number, z: number): Tile {
    return this.addTile('PATH', x, z);
  }

  /**
   * Convenience: Add start tile (red, animated)
   */
  addStartTile(x: number, z: number): Tile {
    return this.addTile('START', x, z);
  }

  /**
   * Convenience: Add goal tile (green, animated)
   */
  addGoalTile(x: number, z: number): Tile {
    return this.addTile('GOAL', x, z);
  }

  /**
   * Check if position is on the goal tile
   */
  isOnGoal(position: { x: number; z: number }): boolean {
    if (!this.goalEntry) return false;
    return this.goalEntry.tile.isPositionOnTile(position);
  }

  /**
   * Update animations and goal detection
   * @param deltaSeconds - Time since last frame
   * @param martyPosition - Current position of Marty (optional)
   */
  update(deltaSeconds: number, martyPosition?: { x: number; z: number }): void {
    // Update all tile animations
    for (const tile of this.tiles) {
      tile.update(deltaSeconds);
    }

    // Tile enter event (fires once when entering any tile)
    if (martyPosition) {
      const activeEntry = this.getTileEntryAtPosition(martyPosition);
      if (!activeEntry) {
        this.lastTileKey = null;
      } else {
        const activePos = activeEntry.tile.getPosition();
        const activeKey = `${activeEntry.type}:${activePos.x}:${activePos.z}`;

        if (activeKey !== this.lastTileKey) {
          this.lastTileKey = activeKey;
          this.trigger('tileTriggered', { type: activeEntry.type, tile: activeEntry.tile });
        }
      }
    }

    // Goal detection
    if (this.goalReached || !martyPosition || !this.goalEntry) return;

    if (this.isOnGoal(martyPosition)) {
      this.timeOnGoal += deltaSeconds;
      
      if (this.timeOnGoal >= this.goalReachedDuration) {
        this.goalReached = true;
        this.trigger('goalReached');
      }
    } else {
      this.timeOnGoal = 0;
    }
  }

  /**
   * Get goal position if set
   */
  getGoalPosition(): THREE.Vector3 | null {
    return this.goalEntry?.tile.getPosition() ?? null;
  }

  /**
   * Check if goal has been reached
   */
  hasReachedGoal(): boolean {
    return this.goalReached;
  }

  /**
   * Reset goal state (for replaying level)
   */
  resetGoal(): void {
    this.goalReached = false;
    this.timeOnGoal = 0;
  }

  /**
   * Clear all tiles
   */
  clear(): void {
    for (const tile of this.tiles) {
      tile.dispose();
    }
    this.tiles = [];
    this.tileEntries = [];
    this.goalEntry = null;
    this.startPosition = null;
    this.goalReached = false;
    this.timeOnGoal = 0;
    this.lastTileKey = null;
  }

  private getTileEntryAtPosition(position: { x: number; z: number }): { tile: Tile; type: TileTypeName } | null {
    for (const entry of this.tileEntries) {
      if (entry.tile.isPositionOnTile(position)) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.clear();
    this.scene.remove(this.container);
  }
}
