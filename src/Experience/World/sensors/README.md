# Marty Robot Sensors

This directory contains the virtual sensor components for the Marty robot simulation.

## Overview

The Marty robot is equipped with three types of virtual sensors/components:

1. **Ground Color Sensor** - Detects the color of the ground beneath the robot
2. **Obstacle Sensor** - Detects walls and obstacles using raycasting
3. **Foot Light** - Focused spotlight to illuminate the ground for color detection

## Components

### FootLight.tsx

A focused spotlight attached to the robot's foot to illuminate the ground beneath the color sensor.

**Features:**
- Narrow beam angle for focused ground illumination
- Low intensity to avoid washing out colors (sensor would see only white 255 RGB otherwise)
- Attached to foot bone so light moves with the robot
- Configurable intensity, color, angle, and distance
- Shadow casting enabled (feet block the light from passing through)
- Optional debug helper for visualization

**Implementation:**
- SpotLight with narrow angle (~15°) for focused beam
- Low intensity (0.25 default) to preserve color detection accuracy
- Positioned inside the foot sole (simulating hole in the sole)
- Target positioned on ground directly below the foot
- Updates position every frame to follow foot bone movement

**Usage:**
```typescript
const footLight = new FootLight(
  footBone,        // Parent bone (LegL003 or LegR003)
  scene,           // Three.js scene
  {
    intensity: 0.25,      // Low to avoid washing out colors
    color: 0xffffff,      // Pure white for accurate detection
    angle: Math.PI / 12,  // ~15 degrees narrow beam
    penumbra: 0.2,        // Soft edge
    distance: 0.3,        // Short range
    heightOffset: -0.01,  // Inside the foot sole
    showHelper: false     // Set true for debugging
  }
);

// Update every frame
footLight.update();

// Adjust intensity dynamically
footLight.setIntensity(0.3);

// Enable/disable
footLight.setEnabled(false);
```

### GroundColorSensor.tsx

A virtual camera-based sensor that points downward to detect ground colors.

**Features:**
- 1x1 pixel render target for precise color sampling
- World space positioning (independent of parent transforms)
- Helper object for tracking parent position
- Configurable FOV, height, and range
- Built-in color detection helpers (red, blue, green)
- Custom color range matching
- Automatic position updates

**Implementation:**
- Camera positioned in world space to avoid transform issues
- Helper object attached to robot tracks position in local space
- Camera updates its world position each frame via helper object
- Points downward (-90° rotation on X-axis)

**Usage:**
```typescript
const sensor = new GroundColorSensor(
  robotModel,      // Parent object (robot)
  scene,          // Three.js scene
  renderer,       // WebGL renderer
  {
    fov: 10,              // Field of view
    sensorHeight: -0.001, // Position below robot feet
    nearPlane: 0.0001,    // Near clipping plane
    farPlane: 10          // Far clipping plane
  }
);

// Get color
const color = sensor.getColor(); // { r, g, b }

// Check specific colors
if (sensor.isRed()) { /* ... */ }
if (sensor.isBlue()) { /* ... */ }
if (sensor.isGreen()) { /* ... */ }

// Custom color matching
if (sensor.isColorInRange({ r: 255, g: 128, b: 0 }, 30)) {
  console.log('Orange detected!');
}
```

### ObstacleSensor.tsx

A raycaster-based sensor that detects obstacles ahead of the robot.

**Features:**
- Configurable detection range
- Multi-direction scanning capability
- Detailed obstacle information (distance, position, normal)
- Custom direction raycasting

**Usage:**
```typescript
const sensor = new ObstacleSensor(
  robotModel,      // Parent object (robot)
  scene,          // Three.js scene
  {
    maxRange: 10,         // Maximum detection range
    sensorHeight: 0.1,    // Height above ground
    sensorOffset: new THREE.Vector3(0, 0, 0.5) // Forward offset
  }
);

// Simple distance check
const distance = sensor.getDistance(); // number or Infinity

// Check if obstacle within threshold
if (sensor.isObstacleWithin(2)) {
  console.log('Obstacle too close!');
}

// Get detailed info
const info = sensor.getObstacleInfo();
if (info) {
  console.log('Distance:', info.distance);
  console.log('Hit point:', info.point);
  console.log('Object:', info.object);
}

// Custom direction
const leftDistance = sensor.castInDirection(
  new THREE.Vector3(-1, 0, 0)
);
```

## Integration with Marty

The sensors are automatically initialized in the `Marty` class:

```typescript
// In Marty.tsx
private setupSensors() {
  // Ground Color Sensor
  this.sensors.groundColorSensor = new GroundColorSensor(
    this.model,
    this.scene,
    this.experience.renderer.instance,
    {
      fov: 10,
      sensorHeight: -0.001, // Just below robot feet
      nearPlane: 0.0001,
      farPlane: 10,
    }
  );

  // Obstacle Sensor
  this.sensors.obstacleSensor = new ObstacleSensor(
    this.model,
    this.scene,
    { maxRange: 10, sensorHeight: 0.1 }
  );

  // Foot Light - attached to left foot bone for ground illumination
  const leftFootBone = this.boneNodes.find(b => b.name === 'LegL003');
  if (leftFootBone) {
    this.sensors.footLight = new FootLight(
      leftFootBone.object,
      this.scene,
      {
        intensity: 0.25,      // Low intensity for accurate color detection
        color: 0xffffff,      // Pure white
        angle: Math.PI / 12,  // ~15 degrees focused beam
        penumbra: 0.2,
        distance: 0.3,
        heightOffset: -0.01,  // Inside the foot sole (hole)
      }
    );
  }
}
```

## WebSocket API

Sensors can be queried remotely via the WebSocket API:

```typescript
import { webSocketService } from '../../services/WebSocketService';

// Connect
await webSocketService.connect();

// Query sensors
const color = await webSocketService.getGroundColor();
const obstacle = await webSocketService.getObstacleDistance();
```

## Debug Tools

The debug panel includes sensor testing tools:

1. Open the browser dev tools
2. Find the "Sensors" folder in the debug UI
3. Use the test buttons to:
   - Test ground color detection
   - Test obstacle distance
   - Test multi-direction scan
   - Adjust detection range

## Technical Details

### Ground Color Sensor

- Uses Three.js `WebGLRenderTarget` for offscreen rendering
- Reads pixel data using `readRenderTargetPixels()`
- Camera positioned in world space (added to scene, not parent)
- Helper object attached to parent tracks position
- Camera rotated -90° (pointing down)
- Position updated automatically via `update()` method
- Minimal performance impact (1x1 render target)

### Obstacle Sensor

- Uses Three.js `Raycaster` for collision detection
- Casts rays from robot position in specified directions
- Filters out the robot itself from intersections
- Returns `Infinity` for no detection (consistent with physics)

## Performance Considerations

- **Ground Color Sensor**: Very lightweight (1x1 pixel render)
- **Obstacle Sensor**: Negligible overhead (raycasting is fast)
- Both sensors are query-based (not continuous polling)
- Recommend max 10 queries/second for smooth operation

## Cleanup

Both sensors implement proper cleanup in their `dispose()` methods:

```typescript
sensor.dispose(); // Removes cameras, releases resources
```

This is automatically called when the Marty instance is disposed.
