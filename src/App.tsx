import { useEffect } from 'react';
import { ExperienceCanvas } from './components/ExperienceCanvas.tsx';
import { CodeEditor } from './components/CodeEditor.tsx';
import { ControlBar } from './components/ControlBar.tsx';
import { webSocketService } from './services/WebSocketService.ts';
import { useAppStore } from './stores/appStore.ts';
import { TutorialModal } from './components/TutorialModal.tsx';
import { DebugConsole } from './components/DebugConsole.tsx';
import './App.css';

function App() {
  const { setWsConnected, experienceExpanded, addConsoleLog } = useAppStore();

  // Calculate panel widths based on layout
  const experienceWidth = experienceExpanded ? '75%' : '50%';
  const codeWidth = experienceExpanded ? '25%' : '50%';

  useEffect(() => {
    // Intercept console logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = (...args) => {
      originalLog(...args);
      addConsoleLog('log', args.map(String).join(' '));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addConsoleLog('warn', args.map(String).join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      addConsoleLog('error', args.map(String).join(' '));
    };

    console.info = (...args) => {
      originalInfo(...args);
      addConsoleLog('info', args.map(String).join(' '));
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, [addConsoleLog]);

  useEffect(() => {
    // Subscribe to connection events
    const unsubscribeConnected = webSocketService.on('connected', () => {
      setWsConnected(true);
    });

    const unsubscribeDisconnected = webSocketService.on('disconnected', () => {
      setWsConnected(false);
    });

    const unsubscribeError = webSocketService.on('error', () => {
      // Silently ignore connection errors
    });

    const unsubscribeCommand = webSocketService.on('command', (data) => {
      const commandData = data as { status?: string; message?: string };
      if (commandData.status === 'error') {
        console.error(`Error: ${commandData.message || 'Unknown error'}`);
      }
    });

    // Attempt to connect
    webSocketService.connect().catch(() => {
      // Silently ignore connection errors
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
        <div
          style={{
            width: experienceWidth,
            height: '100%',
            transition: 'width 0.3s ease',
          }}
        >
          <ExperienceCanvas />
        </div>

        <div
          style={{
            width: codeWidth,
            height: '100%',
            transition: 'width 0.3s ease',
          }}
        >
          <CodeEditor />
        </div>
      </div>

      <TutorialModal />
      <DebugConsole />
    </div>
  );
}

export default App;
