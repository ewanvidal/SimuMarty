import Editor from '@monaco-editor/react';
import { BlocklyEditor } from './BlocklyEditor';
import { useAppStore } from '../stores/appStore.ts';

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
