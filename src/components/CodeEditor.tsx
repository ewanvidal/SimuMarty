import Editor from '@monaco-editor/react';
import { BlocklyEditor } from './BlocklyEditor';
import { useAppStore } from '../stores/appStore.ts';

interface CodeEditorProps {
  defaultCode?: string;
  onCodeChange?: (code: string | undefined) => void;
  onRun?: (code: string) => void;
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

type EditorMode = 'monaco' | 'blockly';

export const CodeEditor = ({
  defaultCode = DEFAULT_CODE,
  onCodeChange,
  onRun,
}: CodeEditorProps) => {
  const [editorMode, setEditorMode] = useState<EditorMode>('monaco');

  // Sauvegarder le code de Monaco et le XML de Blockly séparément
  const [monacoCode, setMonacoCode] = useState<string>(defaultCode);
  const [blocklyXml, setBlocklyXml] = useState<string>(
    BLOCKLY_INITIAL_WORKSPACE,
  );

  // Code actuel à exécuter (selon le mode)
  const [currentCode, setCurrentCode] = useState<string>(defaultCode);
  const fileInputRef = useRef<HTMLInputElement>(null);
export const CodeEditor = () => {
  const { editorMode, monacoCode, blocklyXml, updateCode } = useAppStore();

  const handleMonacoChange = (value: string | undefined) => {
    const code = value || '';
    updateCode(code);
  };

  const handleBlocklyChange = (code: string, xml: string) => {
    updateCode(code, xml);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {editorMode === 'monaco' ? (
        <Editor
          height='100%'
          defaultLanguage='python'
          value={monacoCode}
          onChange={handleMonacoChange}
          theme='vs-dark'
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            folding: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
          }}
        />
      ) : (
        <BlocklyEditor
          initialXml={blocklyXml}
          onCodeChange={handleBlocklyChange}
        />
      )}
    </div>
  );
};
