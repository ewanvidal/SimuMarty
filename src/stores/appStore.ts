import { create } from 'zustand';
import { BLOCKLY_INITIAL_WORKSPACE } from '../components/blocklyConfig';

type EditorMode = 'monaco' | 'blockly';

interface AppState {
  // Environment and Level
  selectedEnvironment: string;
  selectedLevel: string;
  setEnvironment: (environment: string) => void;
  setLevel: (level: string) => void;

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
  debugGrid: boolean;
  enableShadows: boolean;
  showFPS: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
  setDebugGrid: (value: boolean) => void;
  setEnableShadows: (value: boolean) => void;
  setShowFPS: (value: boolean) => void;
  setGraphicsQuality: (quality: 'low' | 'medium' | 'high') => void;

  // WebSocket
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
}

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
`;

export const useAppStore = create<AppState>((set) => ({
  // Environment and Level
  selectedEnvironment: 'labyrinth',
  selectedLevel: 'level1',
  setEnvironment: (environment) => {
    set({ selectedEnvironment: environment });
    console.log('Environment changed to:', environment);
  },
  setLevel: (level) => {
    set({ selectedLevel: level });
    console.log('Level changed to:', level);
  },

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
  debugGrid: true,
  enableShadows: true,
  showFPS: false,
  graphicsQuality: 'high',
  setDebugGrid: (value) => set({ debugGrid: value }),
  setEnableShadows: (value) => set({ enableShadows: value }),
  setShowFPS: (value) => set({ showFPS: value }),
  setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),

  // WebSocket
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
}));
