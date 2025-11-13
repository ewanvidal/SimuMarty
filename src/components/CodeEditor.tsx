import { useState } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  defaultCode?: string;
  onCodeChange?: (code: string | undefined) => void;
  onRun?: (code: string) => void;
}

const DEFAULT_CODE = `# Write your Python code here to control Marty
# Click the "Run Code" button to execute

# Example: Make Marty walk and wave
marty.walk(2)
marty.wave()

# More examples:
# marty.walk(4)      # Walk 4 steps (2 animation cycles)
# marty.walk(3)      # Walk 3 steps (1.5 cycles)
# marty.stop()       # Stop all motion
`;

export const CodeEditor = ({
  defaultCode = DEFAULT_CODE,
  onCodeChange,
  onRun,
}: CodeEditorProps) => {
  const [code, setCode] = useState<string>(defaultCode);

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || '');
    if (onCodeChange) {
      onCodeChange(value);
    }
  };

  const handleRunCode = () => {
    if (onRun) {
      onRun(code);
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
          gap: '10px',
          alignItems: 'center',
        }}
      >
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
        <span style={{ color: '#ccc', fontSize: '12px' }}>Python Editor</span>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1 }}>
        <Editor
          height='100%'
          defaultLanguage='python'
          value={code}
          onChange={handleEditorChange}
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
      </div>
    </div>
  );
};
