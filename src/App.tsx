import { useEffect, useState } from 'react';
import { ExperienceCanvas } from './components/ExperienceCanvas.tsx';
import { CodeEditor } from './components/CodeEditor.tsx';
import { webSocketService } from './services/WebSocketService.ts';
import './App.css';

function App() {
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket on mount

    // Subscribe to connection events
    const unsubscribeConnected = webSocketService.on('connected', () => {
      setWsConnected(true);
    });

    const unsubscribeDisconnected = webSocketService.on('disconnected', () => {
      setWsConnected(false);
    });

    const unsubscribeError = webSocketService.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    const unsubscribeCommand = webSocketService.on('command', (data) => {
      const commandData = data as { status?: string; message?: string };
      if (commandData.status === 'success') {
        console.log('✅ Command executed successfully');
      } else if (commandData.status === 'error') {
        console.error(`❌ Error: ${commandData.message || 'Unknown error'}`);
      }
    });

    // Attempt to connect
    webSocketService.connect().catch((err) => {
      console.error('Failed to connect:', err);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
      unsubscribeCommand();
      webSocketService.disconnect();
    };
  }, []);

  const handleCodeChange = () => {
    // Handle code changes if needed (silent)
  };

  const handleRunCode = (code: string) => {
    if (!wsConnected) {
      alert('WebSocket not connected! Please check if the server is running.');
      return;
    }

    // Send code to Python backend for execution via WebSocket
    const success = webSocketService.executeCode(code);
    if (!success) {
      console.error('❌ Failed to send code');
    }
  };

  return (
    <div
      className='App'
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
    >
      {/* Main Content */}
      <div style={{ width: '100%', flex: 1, display: 'flex' }}>
        {/* 3D Experience View */}
        <div style={{ width: '50%', height: '100%' }}>
          <ExperienceCanvas />
        </div>

        {/* Code Editor */}
        <div style={{ width: '50%', height: '100%' }}>
          <CodeEditor onCodeChange={handleCodeChange} onRun={handleRunCode} />
        </div>
      </div>
    </div>
  );
}

export default App;
