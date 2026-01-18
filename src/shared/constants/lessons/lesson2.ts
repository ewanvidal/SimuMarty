// Tile Types: 0=Void, 1=Path, 3=Goal, 9=Start
// A Parkour path requiring Left and Right turns

export const lesson2Map: number[][] = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0], // Row 3
  [0, 0, 1, 0, 1, 0, 0], // Row 4
  [0, 0, 1, 0, 1, 0, 0], // Row 5
  [9, 1, 1, 0, 1, 1, 3], // Row 6: Start -> ... -> Goal
];

/** Marty's initial transform for this lesson */
export const lesson2MartyConfig = {
  /** Rotation in degrees (0 = facing +Z, 90 = facing +X, etc.) */
  rotationY: 90, // Face East (toward +X)
};
