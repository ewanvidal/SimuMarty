import { ExperienceCanvas } from './components/ExperienceCanvas.tsx';
import { CodeEditor } from './components/CodeEditor.tsx';
import './App.css';

function App() {
  const handleCodeChange = (code: string | undefined) => {
    // Handle code changes if needed
    console.log('Code changed:', code);
  };

  const handleRunCode = (code: string) => {
    // Handle code execution
    console.log('Running code:', code);
    // TODO: Send code to Python backend for execution
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* 3D Experience View */}
      <div style={{ width: '50%', height: '100%' }}>
        <ExperienceCanvas />
      </div>

      {/* Code Editor */}
      <div style={{ width: '50%', height: '100%' }}>
        <CodeEditor 
          onCodeChange={handleCodeChange}
          onRun={handleRunCode}
        />
      </div>
    </div>
  );
}

export default App;
