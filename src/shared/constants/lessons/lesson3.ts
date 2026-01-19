import type { ObstacleConfig } from '../../../Experience/World/LevelBuilder';

// Tile Types: 0=Void, 1=Path, 3=Goal, 9=Start
// Lesson 3: Obstacle Detection

export const lesson3Map: number[][] = [
  [9, 1, 1, 1, 1, 0, 0], // Start -> Path -> Path -> Path -> (Fence)
  [0, 0, 0, 0, 1, 0, 0], //                     Path (Turn Right)
  [0, 0, 0, 0, 3, 0, 0], //                     Goal
];

/** Marty's initial transform for this lesson */
export const lesson3MartyConfig = {
  rotationY: 90, // Face East
};

/**
 * Obstacle definitions for Lesson 3
 * Position is in grid coordinates (row, col)
 * Use offsetX/offsetZ to place at tile edges (-0.5 = left/top edge of tile)
 */
export const lesson3Obstacles: ObstacleConfig[] = [
  { row: 0, col: 5, type: 'fence', offsetX: -0.45 }, // At edge between col 4 and col 5
];
