import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import EventEmitter from '../Utils/EventEmitter';
import { Tile, TileTypes, TILE_SIZE, type TileTypeName, createTile } from './Tile';
import type Physics from './Physics';

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
/** Obstacle definition for level building */
export interface ObstacleConfig {
  row: number;
  col: number;
  type: 'fence' | 'wall' | 'box' | 'maze-wall';
  /** Optional offset in grid units (e.g., -0.5 to place at tile edge) */
  offsetX?: number;
  offsetZ?: number;
  /** Width in grid units (default: 1) */
  width?: number;
  /** Depth in grid units (default: 1) */
  depth?: number;
}

export class LevelBuilder extends EventEmitter {
  private scene: THREE.Scene;
  private physics: Physics | null = null;
  private container: THREE.Group;
  private tiles: Tile[] = [];
  private tileEntries: Array<{ tile: Tile; type: TileTypeName }> = [];
  private obstacles: THREE.Object3D[] = [];
  private obstacleBodies: CANNON.Body[] = [];
  
  // Custom tile size for the current build
  private currentTileSize: number = TILE_SIZE;
  // Editor tile size (smaller for non-labyrinth environments)
  private editorTileSize: number = TILE_SIZE * 1;

  // Map dimensions (stored for obstacle placement)
  private mapRows: number = 0;
  private mapCols: number = 0;
  
  // Level offset (for aligning START tile with Marty spawn)
  private levelOffsetX: number = 0;
  private levelOffsetZ: number = 0;
  
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

  /**
   * Set physics world for obstacle collisions
   */
  setPhysics(physics: Physics): void {
    this.physics = physics;
  }

  // Store start position for Marty placement
  private startPosition: THREE.Vector3 | null = null;
  private startRotationY: number = 0;

  // Placement mode state
  private placementModeEnabled: boolean = false;
  private eraserModeEnabled: boolean = false;
  private placementColor: THREE.Color = new THREE.Color(1, 1, 1);
  private gridHelper: THREE.GridHelper | null = null;
  private hoverIndicator: THREE.Mesh | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private placementPlane: THREE.Mesh | null = null;

  /**
   * Build level from a 2D map array
   * @param map - 2D array where: 0=void, 1=path, 3=goal, 9=start
   * @param config - Optional configuration (e.g., obstacles, scale, startAt)
   */
  build(map: number[][], config?: { obstacles?: ObstacleConfig[]; tileSize?: number; startAt?: { x: number; z: number } }): void {
    this.clear();

    const obstacles = config?.obstacles;
    this.currentTileSize = config?.tileSize ?? TILE_SIZE;
    // Editor uses smaller tiles except for labyrinth (larger tile size)
    this.editorTileSize = this.currentTileSize > TILE_SIZE ? this.currentTileSize : TILE_SIZE * 1;

    const rows = map.length;
    const cols = map[0].length;
    
    // Store dimensions for obstacle placement
    this.mapRows = rows;
    this.mapCols = cols;
    
    // Find the START tile position in the map first (before applying offsets)
    let startRow = 0;
    let startCol = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (map[row][col] === MapCode.START) {
          startRow = row;
          startCol = col;
          break;
        }
      }
    }
    
    // Calculate base offset (centered level)
    const baseOffsetX = (cols * this.currentTileSize) / 2;
    const baseOffsetZ = (rows * this.currentTileSize) / 2;
    
    // Calculate where START would be with centered level
    const startXCentered = startCol * this.currentTileSize - baseOffsetX;
    const startZCentered = startRow * this.currentTileSize - baseOffsetZ;
    
    // If startAt is provided, calculate additional offset to move START to that position
    let levelOffsetX = 0;
    let levelOffsetZ = 0;
    if (config?.startAt) {
      levelOffsetX = config.startAt.x - startXCentered;
      levelOffsetZ = config.startAt.z - startZCentered;
    }

    const tilesToCreate: Array<{ type: TileTypeName; x: number; z: number; code: number }> = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const code = map[row][col];
        if (code === MapCode.VOID) continue;

        // Position tiles so their centers align with floor texture grid
        const x = col * this.currentTileSize - baseOffsetX + levelOffsetX;
        const z = row * this.currentTileSize - baseOffsetZ + levelOffsetZ;

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
    
    // Store level offset for obstacle building
    this.levelOffsetX = levelOffsetX;
    this.levelOffsetZ = levelOffsetZ;

    for (const tileDef of tilesToCreate) {
      const tile = createTile(this.container, TileTypes[tileDef.type], { x: tileDef.x, z: tileDef.z }, this.currentTileSize);
      this.tiles.push(tile);
      this.tileEntries.push({ tile, type: tileDef.type });

      if (tileDef.code === MapCode.GOAL) {
        this.goalEntry = { tile, type: tileDef.type };
      }
    }
    
    // Build obstacles if provided
    if (obstacles) {
      this.buildObstacles(obstacles);
    }
  }
  
  /**
   * Build obstacles from configuration
   */
  private buildObstacles(obstacles: ObstacleConfig[]): void {
    const offsetX = (this.mapCols * this.currentTileSize) / 2 - this.levelOffsetX;
    const offsetZ = (this.mapRows * this.currentTileSize) / 2 - this.levelOffsetZ;

    const mazeWallGeometries: THREE.BufferGeometry[] = [];
    const mazeWallPhysicsShapes: { shape: CANNON.Box; offset: CANNON.Vec3 }[] = [];
    
    for (const obs of obstacles) {
      // Base position from grid (with level offset applied)
      let x = obs.col * this.currentTileSize - offsetX;
      let z = obs.row * this.currentTileSize - offsetZ;
      
      // Apply optional offsets (in grid units, converted to world units)
      if (obs.offsetX !== undefined) {
        x += obs.offsetX * this.currentTileSize;
      }
      if (obs.offsetZ !== undefined) {
        z += obs.offsetZ * this.currentTileSize;
      }
      
      let mesh: THREE.Mesh | null = null;
      let bodyHalfExtents: CANNON.Vec3 | null = null;
      let bodyY: number = 0;
      
      switch (obs.type) {
        case 'fence': {
          // Fence: horizontal barrier blocking path (wide on Z, thin on X)
          const geometry = new THREE.BoxGeometry(this.currentTileSize * 0.1, this.currentTileSize, this.currentTileSize);
          const material = new THREE.MeshStandardMaterial({ color: '#8B4513' }); // Brown wood color
          mesh = new THREE.Mesh(geometry, material);
          mesh.name = 'obstacle_fence';
          bodyY = geometry.parameters.height / 2;
          mesh.position.set(x, bodyY, z);
          bodyHalfExtents = new CANNON.Vec3(this.currentTileSize * 0.05, this.currentTileSize / 2, this.currentTileSize / 2);
          break;
        }
        case 'wall': {
          // Wall: taller obstacle
          const geometry = new THREE.BoxGeometry(this.currentTileSize, this.currentTileSize * 2, this.currentTileSize * 0.15);
          const material = new THREE.MeshStandardMaterial({ color: '#696969' });
          mesh = new THREE.Mesh(geometry, material);
          mesh.name = 'obstacle_wall';
          bodyY = this.currentTileSize;
          mesh.position.set(x, bodyY, z);
          bodyHalfExtents = new CANNON.Vec3(this.currentTileSize / 2, this.currentTileSize, this.currentTileSize * 0.075);
          break;
        }
        case 'box': {
          // Box: cubic obstacle
          const geometry = new THREE.BoxGeometry(this.currentTileSize * 0.8, this.currentTileSize * 0.8, this.currentTileSize * 0.8);
          const material = new THREE.MeshStandardMaterial({ color: '#D2691E' });
          mesh = new THREE.Mesh(geometry, material);
          mesh.name = 'obstacle_box';
          bodyY = this.currentTileSize * 0.4;
          mesh.position.set(x, bodyY, z);
          bodyHalfExtents = new CANNON.Vec3(this.currentTileSize * 0.4, this.currentTileSize * 0.4, this.currentTileSize * 0.4);
          break;
        }
        case 'maze-wall': {
          // Collect geometry and physics data for merging later
          const w = obs.width ?? 1;
          const d = obs.depth ?? 1;
          const width = w * this.currentTileSize;
          const depth = d * this.currentTileSize;
          const height = this.currentTileSize * 2;

          const xCenterOffset = ((w - 1) * this.currentTileSize) / 2;
          const zCenterOffset = ((d - 1) * this.currentTileSize) / 2;
          const xPos = x + xCenterOffset;
          const zPos = z + zCenterOffset;
          const yPos = height / 2;

          const geometry = new THREE.BoxGeometry(width, height, depth);
          geometry.translate(xPos, yPos, zPos);
          mazeWallGeometries.push(geometry);

          if (this.physics) {
            mazeWallPhysicsShapes.push({
              shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
              offset: new CANNON.Vec3(xPos, yPos, zPos),
            });
          }
          break;
        }
      }
      
      if (mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.container.add(mesh);
        this.obstacles.push(mesh);

        // Add physics body if physics is enabled
        if (this.physics && bodyHalfExtents) {
          const shape = new CANNON.Box(bodyHalfExtents);
          const body = new CANNON.Body({
            mass: 0, // Static
            shape: shape,
            position: new CANNON.Vec3(x, bodyY, z),
          });
          this.physics.addBody(body);
          this.obstacleBodies.push(body);
        }
      }
    }

    // Create the single merged mesh for maze walls
    if (mazeWallGeometries.length > 0) {
      const mergedGeometry = BufferGeometryUtils.mergeGeometries(mazeWallGeometries);
      const material = new THREE.MeshStandardMaterial({ 
        color: '#555555',
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const mergedMesh = new THREE.Mesh(mergedGeometry, material);
      mergedMesh.castShadow = false;
      mergedMesh.receiveShadow = false;
      mergedMesh.renderOrder = 1;

      this.container.add(mergedMesh);
      this.obstacles.push(mergedMesh);

      // Create a single physics body with all the merged shapes
      if (this.physics && mazeWallPhysicsShapes.length > 0) {
        const body = new CANNON.Body({ mass: 0 }); // Static
        for (const shapeData of mazeWallPhysicsShapes) {
          body.addShape(shapeData.shape, shapeData.offset);
        }
        this.physics.addBody(body);
        this.obstacleBodies.push(body);
      }

      // Dispose of the individual geometries used for merging
      mazeWallGeometries.forEach(g => g.dispose());
    }
  }

  /**
   * Generates a random labyrinth and builds it.
   * Uses Recursive Backtracker algorithm.
   * @param rows - Number of rows (should be odd for best results)
   * @param cols - Number of columns (should be odd for best results)
   */
  generateMaze(rows: number = 21, cols: number = 21): void {
    // Ensure odd dimensions
    if (rows % 2 === 0) rows++;
    if (cols % 2 === 0) cols++;

    const map: number[][] = [];
    // Initialize with walls (VOID)
    for (let r = 0; r < rows; r++) {
      map[r] = [];
      for (let c = 0; c < cols; c++) {
        map[r][c] = MapCode.VOID;
      }
    }

    const stack: { r: number; c: number }[] = [];
    const startR = 1;
    const startC = 1;

    // Start at (1,1)
    map[startR][startC] = MapCode.PATH;
    stack.push({ r: startR, c: startC });

    // Directions for neighbors (distance 2)
    const directions = [
      { dr: -2, dc: 0 }, // Up
      { dr: 2, dc: 0 },  // Down
      { dr: 0, dc: -2 }, // Left
      { dr: 0, dc: 2 },  // Right
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1]; // Peek
      const neighbors: { r: number; c: number; dr: number; dc: number }[] = [];

      // Find unvisited neighbors
      for (const dir of directions) {
        const nr = current.r + dir.dr;
        const nc = current.c + dir.dc;

        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1) {
          if (map[nr][nc] === MapCode.VOID) {
            neighbors.push({ r: nr, c: nc, dr: dir.dr, dc: dir.dc });
          }
        }
      }

      if (neighbors.length > 0) {
        // Choose random neighbor
        const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
        
        // Remove wall between
        const wallR = current.r + chosen.dr / 2;
        const wallC = current.c + chosen.dc / 2;
        map[wallR][wallC] = MapCode.PATH;
        
        // Mark neighbor visited
        map[chosen.r][chosen.c] = MapCode.PATH;
        
        stack.push({ r: chosen.r, c: chosen.c });
      } else {
        stack.pop();
      }
    }

    // Set Start and Goal
    map[startR][startC] = MapCode.START;
    
    // Find a valid goal position (roughly opposite corner)
    // Actually, let's just find the furthest point from start in terms of path distance if we wanted to be fancy,
    // but for now, bottom-right-ish is fine.
    // Ensure the goal is on a path tile.
    let goalR = rows - 2;
    let goalC = cols - 2;
    // Backtrack until we find a path if it's void (shouldn't be if fully connected and odd dimensions, but strictly speaking)
    while(map[goalR][goalC] !== MapCode.PATH) {
       goalC--;
       if (goalC < 1) {
          goalC = cols - 2;
          goalR--;
       }
    }
    map[goalR][goalC] = MapCode.GOAL;

    // Generate optimized obstacles (Greedy Meshing)
    // Combine adjacent VOID cells into larger rectangular blocks to reduce draw calls
    // and eliminate ugly internal faces when using transparency.
    const obstacles: ObstacleConfig[] = [];
    const visited = map.map((row) => row.map(() => false));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (map[r][c] === MapCode.VOID && !visited[r][c]) {
          // Find maximum width of this rectangle
          let width = 1;
          while (
            c + width < cols &&
            map[r][c + width] === MapCode.VOID &&
            !visited[r][c + width]
          ) {
            width++;
          }

          // Find maximum depth for this width
          let depth = 1;
          while (r + depth < rows) {
            let rowFull = true;
            for (let i = 0; i < width; i++) {
              if (
                map[r + depth][c + i] !== MapCode.VOID ||
                visited[r + depth][c + i]
              ) {
                rowFull = false;
                break;
              }
            }
            if (rowFull) {
              depth++;
            } else {
              break;
            }
          }

          // Mark cells as visited
          for (let dr = 0; dr < depth; dr++) {
            for (let dc = 0; dc < width; dc++) {
              visited[r + dr][c + dc] = true;
            }
          }

          obstacles.push({
            row: r,
            col: c,
            type: 'maze-wall',
            width: width,
            depth: depth,
          });
        }
      }
    }

    this.build(map, {
      obstacles,
      tileSize: TILE_SIZE * 1.5
    });
  }

  /**
   * Get start position for Marty placement
   */
  getStartPosition(): THREE.Vector3 | null {
    return this.startPosition?.clone() ?? null;
  }

  /**
   * Get start rotation for Marty (in degrees)
   */
  getStartRotation(): number {
    return this.startRotationY;
  }

  /**
   * Set start rotation for Marty (in degrees)
   */
  setStartRotation(rotationY: number): void {
    this.startRotationY = rotationY;
  }

  /**
   * Add a tile of any type at position
   */
  addTile(type: TileTypeName, x: number, z: number): Tile {
    const tile = createTile(this.container, TileTypes[type], { x, z }, this.currentTileSize);
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
    
    // Dispose obstacles
    for (const obs of this.obstacles) {
      if (obs instanceof THREE.Mesh) {
        obs.geometry.dispose();
        if (Array.isArray(obs.material)) {
          obs.material.forEach((m) => m.dispose());
        } else {
          obs.material.dispose();
        }
      }
      this.container.remove(obs);
    }
    this.obstacles = [];

    // Dispose obstacle physics bodies
    if (this.physics) {
      for (const body of this.obstacleBodies) {
        this.physics.world.removeBody(body);
      }
    }
    this.obstacleBodies = [];
  }

  private getTileEntryAtPosition(position: { x: number; z: number }): { tile: Tile; type: TileTypeName } | null {
    for (const entry of this.tileEntries) {
      if (entry.tile.isPositionOnTile(position)) {
        return entry;
      }
    }
    return null;
  }

  // ================== Placement Mode ==================

  /**
   * Enable placement mode with a specific color
   */
  enablePlacementMode(color: { r: number; g: number; b: number }): void {
    this.placementModeEnabled = true;
    this.placementColor.setRGB(color.r / 255, color.g / 255, color.b / 255);

    // Ensure grid helper covers the whole map
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
      this.gridHelper = null;
    }

    const mapSize = Math.max(this.mapRows, this.mapCols, 10) * this.editorTileSize; // At least 10 tiles coverage
    const gridSize = Math.max(2, mapSize); // At least 2 meters
    const divisions = Math.round(gridSize / this.editorTileSize); // Use editorTileSize for grid divisions
    
    this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x222222);
    this.gridHelper.position.y = 0.002; // Slightly above floor
    // Offset grid by half tile in labyrinth mode so grid lines align with tile edges
    if (this.editorTileSize > TILE_SIZE) {
      const offset = this.editorTileSize / 2;
      this.gridHelper.position.x = offset;
      this.gridHelper.position.z = offset;
    }
    this.scene.add(this.gridHelper);
    this.gridHelper.visible = true;

    // Recreate hover indicator to match current tile size
    if (this.hoverIndicator) {
      this.scene.remove(this.hoverIndicator);
      this.hoverIndicator.geometry.dispose();
      (this.hoverIndicator.material as THREE.Material).dispose();
      this.hoverIndicator = null;
    }

    // Use editorTileSize for hover indicator
    const indicatorSize = this.editorTileSize * 0.98;
    const geometry = new THREE.PlaneGeometry(indicatorSize, indicatorSize);
    const material = new THREE.MeshBasicMaterial({
      color: this.placementColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    this.hoverIndicator = new THREE.Mesh(geometry, material);
    this.hoverIndicator.rotation.x = -Math.PI / 2;
    this.hoverIndicator.position.y = 0.001;
    this.hoverIndicator.visible = false;
    this.scene.add(this.hoverIndicator);
    
    // Update color
    (this.hoverIndicator.material as THREE.MeshBasicMaterial).color.copy(this.placementColor);


    // Create invisible placement plane for raycasting
    if (this.placementPlane) {
      this.scene.remove(this.placementPlane);
      this.placementPlane.geometry.dispose();
      (this.placementPlane.material as THREE.Material).dispose();
      this.placementPlane = null;
    }

    const planeSize = Math.max(gridSize, 20);
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.placementPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.placementPlane.rotation.x = -Math.PI / 2;
    this.placementPlane.position.y = 0;
    this.scene.add(this.placementPlane);
  }

  /**
   * Disable placement mode
   */
  disablePlacementMode(): void {
    this.placementModeEnabled = false;
    this.eraserModeEnabled = false;
    
    if (this.gridHelper) {
      this.gridHelper.visible = false;
    }
    if (this.hoverIndicator) {
      this.hoverIndicator.visible = false;
    }
  }

  /**
   * Enable eraser mode to delete tiles on click
   */
  enableEraserMode(): void {
    this.eraserModeEnabled = true;
    this.placementModeEnabled = false;

    // Show grid helper for alignment
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
      this.gridHelper = null;
    }

    const mapSize = Math.max(this.mapRows, this.mapCols, 10) * this.editorTileSize;
    const gridSize = Math.max(2, mapSize);
    const divisions = Math.round(gridSize / this.editorTileSize); // Use editorTileSize for grid divisions
    
    this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x222222);
    this.gridHelper.position.y = 0.002;
    // Offset grid by half tile in labyrinth mode so grid lines align with tile edges
    if (this.editorTileSize > TILE_SIZE) {
      const offset = this.editorTileSize / 2;
      this.gridHelper.position.x = offset;
      this.gridHelper.position.z = offset;
    }
    this.scene.add(this.gridHelper);
    this.gridHelper.visible = true;

    // Create eraser indicator (red) - use editorTileSize
    if (this.hoverIndicator) {
      this.scene.remove(this.hoverIndicator);
      this.hoverIndicator.geometry.dispose();
      (this.hoverIndicator.material as THREE.Material).dispose();
      this.hoverIndicator = null;
    }

    const indicatorSize = this.editorTileSize * 0.98;
    const geometry = new THREE.PlaneGeometry(indicatorSize, indicatorSize);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    this.hoverIndicator = new THREE.Mesh(geometry, material);
    this.hoverIndicator.rotation.x = -Math.PI / 2;
    this.hoverIndicator.position.y = 0.001;
    this.hoverIndicator.visible = false;
    this.scene.add(this.hoverIndicator);

    // Create invisible placement plane for raycasting
    if (this.placementPlane) {
      this.scene.remove(this.placementPlane);
      this.placementPlane.geometry.dispose();
      (this.placementPlane.material as THREE.Material).dispose();
      this.placementPlane = null;
    }

    const planeSize = Math.max(gridSize, 20);
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.placementPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.placementPlane.rotation.x = -Math.PI / 2;
    this.placementPlane.position.y = 0;
    this.scene.add(this.placementPlane);
  }

  /**
   * Check if eraser mode is active
   */
  isEraserModeEnabled(): boolean {
    return this.eraserModeEnabled;
  }

  /**
   * Check if placement mode is active
   */
  isPlacementModeEnabled(): boolean {
    return this.placementModeEnabled;
  }

  /**
   * Update hover indicator position based on mouse
   */
  updatePlacementHover(normalizedMouse: { x: number; y: number }, camera: THREE.Camera): void {
    if ((!this.placementModeEnabled && !this.eraserModeEnabled) || !this.hoverIndicator || !this.placementPlane) return;

    this.raycaster.setFromCamera(new THREE.Vector2(normalizedMouse.x, normalizedMouse.y), camera);
    const intersects = this.raycaster.intersectObject(this.placementPlane);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      // Snap to grid using editorTileSize
      const halfTile = this.editorTileSize / 2;
      const snappedX = Math.round((point.x - halfTile) / this.editorTileSize) * this.editorTileSize + halfTile;
      const snappedZ = Math.round((point.z - halfTile) / this.editorTileSize) * this.editorTileSize + halfTile;
      
      this.hoverIndicator.position.x = snappedX;
      this.hoverIndicator.position.z = snappedZ;
      this.hoverIndicator.visible = true;
    } else {
      this.hoverIndicator.visible = false;
    }
  }

  /**
   * Place a tile at the hover position with the current color (or delete if eraser mode)
   */
  placeTileAtHover(): void {
    if (!this.hoverIndicator || !this.hoverIndicator.visible) return;

    const x = this.hoverIndicator.position.x;
    const z = this.hoverIndicator.position.z;

    // Eraser mode: just remove tile
    if (this.eraserModeEnabled) {
      this.removeTileAt(x, z);
      return;
    }

    // Placement mode: replace or add tile
    if (!this.placementModeEnabled) return;

    // Check if there's already a tile at this position
    const existingEntry = this.getTileEntryAtPosition({ x, z });
    if (existingEntry) {
      this.removeTileAt(x, z);
    }

    // Add new tile with custom color
    this.addColoredTile(x, z, this.placementColor);
    
    // Emit event so UI can auto-deselect
    this.trigger('tilePlaced');
  }

  /**
   * Remove tile at a specific position
   */
  removeTileAt(x: number, z: number): void {
    // Use half editor tile size as tolerance for position matching
    const tolerance = this.editorTileSize / 2;
    const index = this.tileEntries.findIndex(entry => {
      const pos = entry.tile.getPosition();
      return Math.abs(pos.x - x) < tolerance && Math.abs(pos.z - z) < tolerance;
    });

    if (index !== -1) {
      const entry = this.tileEntries[index];
      entry.tile.dispose();
      this.tiles.splice(this.tiles.indexOf(entry.tile), 1);
      this.tileEntries.splice(index, 1);

      // Clear goal if it was the goal tile
      if (this.goalEntry === entry) {
        this.goalEntry = null;
      }
      // Clear start position if it was the start tile
      if (entry.type === 'START') {
        this.startPosition = null;
      }
    }
  }

  /**
   * Add a colored tile at position
   */
  addColoredTile(x: number, z: number, color: THREE.Color): Tile {
    // Create custom tile type for the color
    const customType = {
      name: 'Custom',
      color: `#${color.getHexString()}`,
      animated: false,
    };
    
    // Use editorTileSize for manually placed tiles
    const tile = createTile(this.container, customType, { x, z }, this.editorTileSize);
    this.tiles.push(tile);
    this.tileEntries.push({ tile, type: 'PATH' }); // Treat custom tiles as PATH type
    return tile;
  }

  /**
   * Clear all custom tiles (keep nothing)
   */
  clearAllTiles(): void {
    this.clear();
    // Reset map dimensions
    this.mapRows = 0;
    this.mapCols = 0;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.clear();
    this.scene.remove(this.container);

    // Dispose placement mode objects
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
      this.gridHelper = null;
    }
    if (this.hoverIndicator) {
      this.scene.remove(this.hoverIndicator);
      this.hoverIndicator.geometry.dispose();
      (this.hoverIndicator.material as THREE.Material).dispose();
      this.hoverIndicator = null;
    }
    if (this.placementPlane) {
      this.scene.remove(this.placementPlane);
      this.placementPlane.geometry.dispose();
      (this.placementPlane.material as THREE.Material).dispose();
      this.placementPlane = null;
    }
  }
}
