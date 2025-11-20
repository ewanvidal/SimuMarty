import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import Editor from '@monaco-editor/react';
import { BlocklyEditor } from './BlocklyEditor';
import { BLOCKLY_INITIAL_WORKSPACE } from './blocklyConfig';

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

  const handleMonacoChange = (value: string | undefined) => {
    const newCode = value || '';
    setMonacoCode(newCode);
    setCurrentCode(newCode);
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  const handleBlocklyChange = (code: string, xml: string) => {
    setBlocklyXml(xml);
    setMonacoCode(code);
    setCurrentCode(code);
    if (onCodeChange) {
      onCodeChange(code);
    }
  };

  const handleRunCode = () => {
    if (onRun) {
      onRun(currentCode);
    }
  };

  const toggleEditorMode = () => {
    setEditorMode((prev) => (prev === 'monaco' ? 'blockly' : 'monaco'));
  };

  const buildJsonPayload = () => ({
    version: 1,
    updatedAt: new Date().toISOString(),
    editorMode,
    code: monacoCode,
    blocklyXml,
  });

  const handleSaveToJson = () => {
    try {
      const payload = buildJsonPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `marty-code-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      window.alert('Unable to save the code as JSON.');
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      if (
        typeof data.code !== 'string' ||
        typeof data.blocklyXml !== 'string'
      ) {
        throw new Error('Invalid JSON structure');
      }

      setMonacoCode(data.code);
      setBlocklyXml(data.blocklyXml);
      setCurrentCode(data.code);
      if (onCodeChange) {
        onCodeChange(data.code);
      }
    } catch (error) {
      console.error('Failed to import JSON:', error);
      window.alert(
        'Failed to import JSON file. Please ensure it was exported from this editor.',
      );
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Control Bar */}
      <div
        style={{
          padding: '10px',
          background: '#1e1e1e',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleSaveToJson}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = '#27ae60')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = '#2ecc71')
            }
          >
            💾 Save JSON
          </button>

          <button
            onClick={triggerImport}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e67e22',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = '#d35400')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = '#e67e22')
            }
          >
            📂 Import JSON
          </button>

          <input
            ref={fileInputRef}
            type='file'
            accept='application/json'
            style={{ display: 'none' }}
            onChange={handleImportJson}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleRunCode}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0e639c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = '#1177bb')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = '#0e639c')
            }
          >
            ▶ Run Code
          </button>

          <button
            onClick={toggleEditorMode}
            style={{
              padding: '8px 16px',
              backgroundColor: editorMode === 'blockly' ? '#6c5ce7' : '#00b894',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor =
                editorMode === 'blockly' ? '#5f4ed1' : '#00a584';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor =
                editorMode === 'blockly' ? '#6c5ce7' : '#00b894';
            }}
          >
            {editorMode === 'monaco'
              ? '🧩 Switch to Blockly'
              : '📝 Switch to Code'}
          </button>

          <span style={{ color: '#ccc', fontSize: '12px' }}>
            {editorMode === 'monaco' ? 'Python Editor' : 'Blockly Editor'}
          </span>
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
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
    </div>
  );
};
