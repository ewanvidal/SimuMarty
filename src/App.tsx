import { useEffect, useState } from 'react';
import { ExperienceCanvas } from './components/ExperienceCanvas.tsx';
import { CodeEditor } from './components/CodeEditor.tsx';
import { webSocketService } from './services/WebSocketService.ts';
import './App.css';

function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Disconnected');

  useEffect(() => {
    // Connect to WebSocket on mount

    // Subscribe to connection events
    const unsubscribeConnected = webSocketService.on('connected', () => {
      setWsConnected(true);
      setStatusMessage('Connected');
    });

    const unsubscribeDisconnected = webSocketService.on('disconnected', () => {
      setWsConnected(false);
      setStatusMessage('Disconnected - Reconnecting...');
    });

    const unsubscribeError = webSocketService.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      setStatusMessage('Error - Check console');
    });

    const unsubscribeCommand = webSocketService.on('command', (data) => {
      if (data.status === 'success') {
        setStatusMessage('Command executed successfully');
      } else if (data.status === 'error') {
        setStatusMessage(`Error: ${data.message || 'Unknown error'}`);
      }
    });

    // Attempt to connect
    webSocketService.connect().catch((err) => {
      console.error('Failed to connect:', err);
      setStatusMessage('Connection failed - Check if server is running');
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

  const handleCodeChange = (_code: string | undefined) => {
    // Handle code changes if needed (silent)
  };

  const handleRunCode = (code: string) => {
    if (!wsConnected) {
      alert('WebSocket not connected! Please check if the server is running.');
      setStatusMessage('Not connected - Cannot execute code');
      return;
    }

    // Send code to Python backend for execution via WebSocket
    const success = webSocketService.executeCode(code);
    if (success) {
      setStatusMessage('Executing code...');
    } else {
      setStatusMessage('Failed to send code');
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Status Bar */}
      <div
        style={{
          height: '30px',
          background: wsConnected ? '#0e7a0d' : '#a80000',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 15px',
          fontSize: '12px',
          fontWeight: 'bold',
          borderBottom: '1px solid #333',
        }}
      >
        <span>
          {wsConnected ? '🟢' : '🔴'} WebSocket: {statusMessage}
        </span>
        <span>SimuMarty - Robot Simulator</span>
      </div>

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
