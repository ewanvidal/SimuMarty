import { create } from 'zustand';
import { BLOCKLY_INITIAL_WORKSPACE } from '../components/blocklyConfig';
import {
  DEFAULT_ENVIRONMENT_ID,
  DEFAULT_LEVEL_ID,
  ENVIRONMENT_PRESETS,
  getLevelConfig,
  type EnvironmentId,
} from '../shared/constants/environmentPresets.ts';

type EditorMode = 'monaco' | 'blockly';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
}

interface AppState {
  // Environment and Level
  selectedEnvironment: EnvironmentId;
  selectedLevel: string;
  scenePresetId: string | null;
  activeLessonId: string | null;
  tutorialModalVisible: boolean;
  setEnvironment: (environment: EnvironmentId) => void;
  setLevel: (level: string) => void;
  openTutorialModal: () => void;
  closeTutorialModal: () => void;

  // Panel Layout
  experienceExpanded: boolean;
  toggleExperienceExpanded: () => void;

  // Editor State
  editorMode: EditorMode;
  monacoCode: string;
  blocklyXml: string;
  currentCode: string;
  setEditorMode: (mode: EditorMode) => void;
  toggleEditorMode: () => void;
  setMonacoCode: (code: string) => void;
  setBlocklyXml: (xml: string) => void;
  setCurrentCode: (code: string) => void;
  updateCode: (code: string, xml?: string) => void;

  // Settings
  showSettings: boolean;
  toggleSettings: () => void;
  enableShadows: boolean;
  timeScale: number;
  cameraFollow: boolean;
  debugConsoleOpen: boolean;
  setEnableShadows: (value: boolean) => void;
  setTimeScale: (value: number) => void;
  setCameraFollow: (value: boolean) => void;
  setDebugConsoleOpen: (value: boolean) => void;

  // Console
  consoleLogs: LogEntry[];
  addConsoleLog: (type: LogEntry['type'], message: string) => void;
  clearConsoleLogs: () => void;

  // Level Editor
  levelEditorOpen: boolean;
  selectedTileColor: string | null;
  toggleLevelEditor: () => void;
  setSelectedTileColor: (color: string | null) => void;

  // WebSocket
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
}

const resolveLevelSelection = (
  environmentId: EnvironmentId,
  requestedLevelId?: string,
) => {
  const environmentPreset =
    ENVIRONMENT_PRESETS[environmentId] ?? ENVIRONMENT_PRESETS[DEFAULT_ENVIRONMENT_ID];

  const fallbackLevelId = requestedLevelId ?? environmentPreset.defaultLevelId ?? DEFAULT_LEVEL_ID;
  const levelPreset =
    getLevelConfig(environmentId, fallbackLevelId) ??
    getLevelConfig(environmentId, environmentPreset.defaultLevelId) ??
    environmentPreset.levels[0];

  return {
    levelId: levelPreset?.id ?? environmentPreset.defaultLevelId ?? DEFAULT_LEVEL_ID,
    scenePresetId: levelPreset?.scenePresetId ?? null,
    lessonId: levelPreset?.lessonId ?? null,
  };
};

const initialEnvironment: EnvironmentId = DEFAULT_ENVIRONMENT_ID;
const initialLevel = resolveLevelSelection(initialEnvironment, DEFAULT_LEVEL_ID);

const DEFAULT_CODE = `# Write your Python code here to control Marty
# Click the "Run Code" button to execute
# Example: Make Marty walk, turn and wave

marty.walk(2)
marty.turnRight(30)
marty.wave()

# Available commands:
# marty.walk(steps)      # Walk a number of steps
# marty.turnRight(angle) # Turn right by angle in degrees
# marty.turnLeft(angle)  # Turn left by angle in degrees
# marty.wave()           # Wave gesture
# marty.kick()           # Kick
# marty.dance()          # Dance animation
# marty.slideLeft()      # Slide to the left
# marty.slideRight()     # Slide to the right
# marty.stop()           # Stop all motion

# Examples:
# marty.walk(4)
# marty.turnRight(90)
# marty.turnLeft(45)
# marty.kick()
# marty.dance()
# marty.slideRight()
# marty.set_joint('left_arm', 25)
# marty.set_joint('left_eye', -10, move_time=800)
`;

export const useAppStore = create<AppState>((set) => ({
  // Environment and Level
  selectedEnvironment: initialEnvironment,
  selectedLevel: initialLevel.levelId,
  scenePresetId: initialLevel.scenePresetId,
  activeLessonId: initialLevel.lessonId,
  tutorialModalVisible: Boolean(initialLevel.lessonId),
  setEnvironment: (environment) => {
    set(() => {
      const levelState = resolveLevelSelection(environment);
      return {
        selectedEnvironment: environment,
        selectedLevel: levelState.levelId,
        scenePresetId: levelState.scenePresetId,
        activeLessonId: levelState.lessonId,
        tutorialModalVisible: Boolean(levelState.lessonId),
      };
    });
  },
  setLevel: (level) => {
    set((state) => {
      const levelState = resolveLevelSelection(state.selectedEnvironment, level);
      return {
        selectedLevel: levelState.levelId,
        scenePresetId: levelState.scenePresetId,
        activeLessonId: levelState.lessonId,
        tutorialModalVisible: Boolean(levelState.lessonId),
      };
    });
  },
  openTutorialModal: () => set({ tutorialModalVisible: true }),
  closeTutorialModal: () => set({ tutorialModalVisible: false }),

  // Panel Layout
  experienceExpanded: false,
  toggleExperienceExpanded: () => set((state) => ({ experienceExpanded: !state.experienceExpanded })),
  // Editor State
  editorMode: 'monaco',
  monacoCode: DEFAULT_CODE,
  blocklyXml: BLOCKLY_INITIAL_WORKSPACE,
  currentCode: DEFAULT_CODE,
  setEditorMode: (mode) => set({ editorMode: mode }),
  toggleEditorMode: () =>
    set((state) => ({
      editorMode: state.editorMode === 'monaco' ? 'blockly' : 'monaco',
    })),
  setMonacoCode: (code) => set({ monacoCode: code }),
  setBlocklyXml: (xml) => set({ blocklyXml: xml }),
  setCurrentCode: (code) => set({ currentCode: code }),
  updateCode: (code, xml) =>
    set((state) => ({
      currentCode: code,
      monacoCode: code,
      blocklyXml: xml || state.blocklyXml,
    })),

  // Settings
  showSettings: false,
  toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
  enableShadows: true,
  timeScale: 1.0,
  cameraFollow: true,
  debugConsoleOpen: false,
  setEnableShadows: (value) => set({ enableShadows: value }),
  setTimeScale: (value) => {
    set({ timeScale: value });
    // Update the experience time scale directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (experience?.time) {
      experience.time.timeScale = value;
    }
  },
  setCameraFollow: (value) => {
    set({ cameraFollow: value });
    // Update the experience camera follow directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (experience?.camera) {
      experience.camera.followTarget = value;
    }
  },
  setDebugConsoleOpen: (value) => set({ debugConsoleOpen: value }),

  // Console
  consoleLogs: [],
  addConsoleLog: (type, message) =>
    set((state) => ({
      consoleLogs: [
        ...state.consoleLogs,
        {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          type,
          message,
        },
      ].slice(-100), // Keep last 100 logs
    })),
  clearConsoleLogs: () => set({ consoleLogs: [] }),

  // Level Editor
  levelEditorOpen: false,
  selectedTileColor: null,
  toggleLevelEditor: () => set((state) => ({ levelEditorOpen: !state.levelEditorOpen })),
  setSelectedTileColor: (color) => set({ selectedTileColor: color }),

  // WebSocket
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
}));
