export type TutorialMediaType = 'video' | 'image' | 'youtube';

export interface TutorialMedia {
  type: TutorialMediaType;
  src: string;
  poster?: string;
  caption?: string;
}

export interface TutorialLesson {
  id: string;
  title: string;
  summary: string;
  goal: string;
  objectives: string[];
  steps: string[];
  scenePresetId: string;
  estimatedTime: string;
  media?: TutorialMedia;
  tips?: string[];
}

export const DEFAULT_TUTORIAL_LESSON_ID = 'movement-basics';

export const TUTORIAL_LESSONS: Record<string, TutorialLesson> = {
  'movement-basics': {
    id: 'movement-basics',
    title: 'Lesson 1 · Movement Basics',
    summary:
      'Discover how the walk and turn commands move Marty to reach a colored tile.',
    goal: 'Walk forward three squares and stop on the highlighted tile.',
    objectives: [
      'Use the `walk` command with a custom step count',
      'Chain two commands in the right order',
      "Watch the debug grid to understand Marty's stride",
    ],
    steps: [
      'Write `marty.walk(x)` in the code editor or use the Blockly equivalent.',
      "Run the code and observe Marty's movement and balance.",
    ],
    scenePresetId: 'tutorial-grid-basic',
    estimatedTime: '5 min',
    media: {
      type: 'youtube',
      src: 'https://www.youtube.com/watch?v=J0yDapyiE34',
      caption: 'Walk command demo.',
    },
    tips: [
      'Shorter step values can help with precision when aligning to markers.',
    ],
  },
  'turning-and-orientation': {
    id: 'turning-and-orientation',
    title: 'Lesson 2 · Turning & Orientation',
    summary: 'Learn how to rotate Marty precisely using degree-based turns.',
    goal: 'Rotate Marty to face the cone and walk to it without leaving the grid.',
    objectives: [
      'Use `turnLeft` and `turnRight` with degree parameters',
      'Combine rotation and walking to reach the target',
    ],
    steps: [
      'Combine `marty.turnRight/Left(x)` and `marty.walk(x)` to face and approach the green tile.',
      'Experiment with smaller angles to understand partial rotations.',
    ],
    scenePresetId: 'tutorial-grid-basic',
    estimatedTime: '7 min',
    media: {
      type: 'youtube',
      src: 'https://www.youtube.com/watch?v=wWB82axdpa4',
      caption: 'Target cone objective preview.',
    },
    tips: [
      'Remember that 360° turns bring Marty back to the initial orientation.',
    ],
  },
  'sensors-and-obstacles': {
    id: 'sensors-and-obstacles',
    title: 'Lesson 3 · Sensors & Obstacles',
    summary:
      'Use the obstacle sensor to stop before barriers and plan a detour.',
    goal: 'Approach the fence, detect it, and trigger a safe turn to avoid a collision.',
    objectives: [
      'Read distance data with `marty.getObstacleDistance()`',
      'Branch logic using Python conditionals',
      'Validate the result by watching the on-screen visualizers',
    ],
    steps: [
      'Start with a loop that moves Marty forward until a fence is detected.',
      'Log the distance value and break when the value is under 1.5.',
      'Add a turn and an extra walk command to go around the barrier.',
    ],
    scenePresetId: 'tutorial-obstacle-course',
    estimatedTime: '10 min',
    media: {
      type: 'youtube',
      src: 'https://www.youtube.com/watch?v=98VN88fS1dw', // TODO: Remplacer par le lien YouTube réel
      caption: 'Sensor-based stop before obstacle.',
    },
    tips: [
      'Use `print()` to track values inside the console for quick debugging.',
      'Combine color and distance sensors for more complex missions.',
    ],
  },
};
