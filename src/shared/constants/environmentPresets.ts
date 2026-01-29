import { DEFAULT_TUTORIAL_LESSON_ID } from './tutorialLessons.ts';

export type EnvironmentId =
  | 'labyrinth'
  | 'playground'
  | 'classroom'
  | 'outdoor'
  | 'tutorial';

export interface LevelOption {
  id: string;
  label: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert' | 'custom';
  scenePresetId?: string | null;
  lessonId?: string | null;
}

export interface EnvironmentPreset {
  id: EnvironmentId;
  label: string;
  defaultLevelId: string;
  levels: LevelOption[];
}

export const DEFAULT_ENVIRONMENT_ID: EnvironmentId = 'tutorial';
export const DEFAULT_LEVEL_ID = 'movement-basics';

export const ENVIRONMENT_PRESETS: Record<EnvironmentId, EnvironmentPreset> = {
  labyrinth: {
    id: 'labyrinth',
    label: 'Labyrinth',
    defaultLevelId: 'custom',
    levels: [
      {
        id: 'custom',
        label: 'Custom Layout',
        difficulty: 'custom',
        scenePresetId: 'labyrinth-default',
      },
      {
        id: 'level1',
        label: 'Level 1 · Easy',
        difficulty: 'easy',
        scenePresetId: 'labyrinth-default',
      },
      {
        id: 'level2',
        label: 'Level 2 · Medium',
        difficulty: 'medium',
        scenePresetId: 'labyrinth-default',
      },
      {
        id: 'level3',
        label: 'Level 3 · Hard',
        difficulty: 'hard',
        scenePresetId: 'labyrinth-default',
      },
      {
        id: 'level4',
        label: 'Level 4 · Expert',
        difficulty: 'expert',
        scenePresetId: 'labyrinth-default',
      },
    ],
  },
  playground: {
    id: 'playground',
    label: 'Playground',
    defaultLevelId: 'level1',
    levels: [
      {
        id: 'level1',
        label: 'Free Play',
        scenePresetId: 'playground-wide',
      },
      {
        id: 'level2',
        label: 'Checkpoint Run',
        scenePresetId: 'playground-wide',
      },
      {
        id: 'custom',
        label: 'Custom',
        scenePresetId: 'playground-wide',
      },
    ],
  },
  classroom: {
    id: 'classroom',
    label: 'Classroom',
    defaultLevelId: 'demo',
    levels: [
      {
        id: 'demo',
        label: 'Live Demo',
        scenePresetId: 'classroom-focused',
      },
      {
        id: 'group-work',
        label: 'Group Work',
        scenePresetId: 'classroom-focused',
      },
    ],
  },
  outdoor: {
    id: 'outdoor',
    label: 'Outdoor',
    defaultLevelId: 'sunny-day',
    levels: [
      {
        id: 'sunny-day',
        label: 'Sunny Day',
        scenePresetId: 'outdoor-sunny',
      },
      {
        id: 'long-track',
        label: 'Long Track',
        scenePresetId: 'outdoor-sunny',
      },
    ],
  },
  tutorial: {
    id: 'tutorial',
    label: 'Tutorial',
    defaultLevelId: DEFAULT_TUTORIAL_LESSON_ID,
    levels: [
      {
        id: 'movement-basics',
        label: 'Lesson 1 · Movement',
        description: '',
        difficulty: 'easy',
        scenePresetId: 'tutorial-grid-basic',
        lessonId: 'movement-basics',
      },
      {
        id: 'turning-and-orientation',
        label: 'Lesson 2 · Turning',
        description: '',
        difficulty: 'medium',
        scenePresetId: 'tutorial-grid-basic',
        lessonId: 'turning-and-orientation',
      },
      {
        id: 'sensors-and-obstacles',
        label: 'Lesson 3 · Sensors',
        description: '',
        difficulty: 'hard',
        scenePresetId: 'tutorial-obstacle-course',
        lessonId: 'sensors-and-obstacles',
      },
    ],
  },
};

export const getEnvironmentLevels = (environmentId: EnvironmentId): LevelOption[] => {
  return ENVIRONMENT_PRESETS[environmentId]?.levels ?? [];
};

export const getLevelConfig = (
  environmentId: EnvironmentId,
  levelId: string,
): LevelOption | undefined => {
  return getEnvironmentLevels(environmentId).find((level) => level.id === levelId);
};
