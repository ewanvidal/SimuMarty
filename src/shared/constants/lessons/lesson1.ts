// Tile Types: 0=Void, 1=Path, 3=Goal, 9=Start
// Simple path from Start (red) to Goal (green)

export const lesson1Map: number[][] = [
  [9, 1, 1, 1, 3], // Start → Path → Goal
];

/** Marty's initial transform for this lesson */
export const lesson1MartyConfig = {
  /** Rotation in degrees (0 = facing +Z, 90 = facing +X, etc.) */
  rotationY: 90, // Face the goal (toward +X in the map)
};
