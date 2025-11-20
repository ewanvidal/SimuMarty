import { useEffect } from 'react';
import { ExperienceCanvas } from './components/ExperienceCanvas.tsx';
import { CodeEditor } from './components/CodeEditor.tsx';
import { ControlBar } from './components/ControlBar.tsx';
import { webSocketService } from './services/WebSocketService.ts';
import { useAppStore } from './stores/appStore.ts';
import './App.css';

function App() {
  const { setWsConnected, experienceExpanded } = useAppStore();

  // Calculate panel widths based on layout
  const experienceWidth = experienceExpanded ? '75%' : '50%';
  const codeWidth = experienceExpanded ? '25%' : '50%';

  useEffect(() => {
    // Subscribe to connection events
    const unsubscribeConnected = webSocketService.on('connected', () => {
      setWsConnected(true);
    });

    const unsubscribeDisconnected = webSocketService.on('disconnected', () => {
      setWsConnected(false);
    });

    const unsubscribeError = webSocketService.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    const unsubscribeCommand = webSocketService.on('command', (data) => {
      const commandData = data as { status?: string; message?: string };
      if (commandData.status === 'success') {
        console.log('Command executed successfully');
      } else if (commandData.status === 'error') {
        console.error(`Error: ${commandData.message || 'Unknown error'}`);
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
  }, [setWsConnected]);

  return (
    <div
      className='App'
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
    >
      <ControlBar />

      <div style={{ width: '100%', flex: 1, display: 'flex' }}>
        <div style={{ width: experienceWidth, height: '100%', transition: 'width 0.3s ease' }}>
          <ExperienceCanvas />
        </div>

        <div style={{ width: codeWidth, height: '100%', transition: 'width 0.3s ease' }}>
          <CodeEditor />
        </div>
      </div>
    </div>
  );
}

export default App;
