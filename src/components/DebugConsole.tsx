import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import './DebugConsole.css';

export function DebugConsole() {
  const { consoleLogs, debugConsoleOpen, setDebugConsoleOpen, clearConsoleLogs } = useAppStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when logs update
    if (debugConsoleOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, debugConsoleOpen]);

  if (!debugConsoleOpen) return null;

  return (
    <div className="debug-console">
      <div className="debug-console-header">
        <h3>Debug Console</h3>
        <div className="debug-console-actions">
          <button onClick={clearConsoleLogs} className="console-action-btn">
            Clear
          </button>
          <button onClick={() => setDebugConsoleOpen(false)} className="console-close-btn">
            ✕
          </button>
        </div>
      </div>
      <div className="debug-console-body">
        {consoleLogs.length === 0 ? (
          <div className="console-empty">No logs yet...</div>
        ) : (
          consoleLogs.map((log) => (
            <div key={log.id} className={`console-log log-${log.type}`}>
              <span className="log-time">[{log.timestamp}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
