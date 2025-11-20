import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useAppStore } from '../stores/appStore.ts';
import { webSocketService } from '../services/WebSocketService.ts';
import './ControlBar.css';

export function ControlBar() {
  const {
    selectedEnvironment,
    selectedLevel,
    setEnvironment,
    setLevel,
    experienceExpanded,
    toggleExperienceExpanded,
    editorMode,
    toggleEditorMode,
    monacoCode,
    blocklyXml,
    currentCode,
    setEditorMode,
    setMonacoCode,
    setBlocklyXml,
    setCurrentCode,
    wsConnected,
    showSettings,
    toggleSettings,
    debugGrid,
    enableShadows,
    showFPS,
    graphicsQuality,
    setDebugGrid,
    setEnableShadows,
    setShowFPS,
    setGraphicsQuality,
  } = useAppStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEnvironment(e.target.value);
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLevel(e.target.value);
  };

  const handleRunCode = () => {
    if (!wsConnected) {
      alert('WebSocket not connected! Please check if the server is running.');
      return;
    }
    const success = webSocketService.executeCode(currentCode);
    if (!success) {
      console.error('Failed to send code');
    }
  };

  const handleSaveJson = () => {
    try {
      const payload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        editorMode,
        code: monacoCode,
        blocklyXml,
      };
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
    if (!file) {
      event.target.value = '';
      return;
    }

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      if (typeof data.code !== 'string' || typeof data.blocklyXml !== 'string') {
        throw new Error('Invalid JSON structure');
      }

      setMonacoCode(data.code);
      setBlocklyXml(data.blocklyXml);
      setCurrentCode(data.code);
      if (data.editorMode) {
        setEditorMode(data.editorMode);
      }
    } catch (error) {
      console.error('Failed to import JSON:', error);
      window.alert('Failed to import JSON file. Please ensure it was exported from this editor.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <>
      <div className='control-bar'>
        <div className='control-bar-section'>
          <div className='control-group'>
            <label htmlFor='environment-picker'>Environment:</label>
            <select
              id='environment-picker'
              value={selectedEnvironment}
              onChange={handleEnvironmentChange}
              className='control-select'
            >
              <option value='labyrinth'>Labyrinth</option>
              <option value='playground'>Playground</option>
              <option value='classroom'>Classroom</option>
              <option value='outdoor'>Outdoor</option>
            </select>
          </div>

          <div className='control-group'>
            <label htmlFor='level-picker'>Level:</label>
            <select
              id='level-picker'
              value={selectedLevel}
              onChange={handleLevelChange}
              className='control-select'
            >
              <option value='level1'>Level 1 - Easy</option>
              <option value='level2'>Level 2 - Medium</option>
              <option value='level3'>Level 3 - Hard</option>
              <option value='level4'>Level 4 - Expert</option>
              <option value='custom'>Custom</option>
            </select>
          </div>
        </div>

        <div className='control-bar-section'>
          <button
            onClick={toggleExperienceExpanded}
            className='control-button'
            title={experienceExpanded ? 'Reset to 50/50' : 'Expand 3D View to 75%'}
          >
            <img src='/layout.png' alt='Layout' style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div className='control-bar-section'>
          <button onClick={handleSaveJson} className='control-button'>
            Save JSON
          </button>

          <button onClick={triggerImport} className='control-button'>
            Import JSON
          </button>

          <input
            ref={fileInputRef}
            type='file'
            accept='application/json'
            style={{ display: 'none' }}
            onChange={handleImportJson}
          />

          <button onClick={handleRunCode} className='control-button button-primary'>
            Run Code
          </button>

          <button onClick={toggleEditorMode} className='control-button button-secondary'>
            {editorMode === 'monaco' ? 'Switch to Blockly' : 'Switch to Code'}
          </button>

          <button onClick={toggleSettings} className='control-button' title='Settings'>
            Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <div className='settings-panel'>
          <div className='settings-header'>
            <h3>Experience Settings</h3>
            <button onClick={toggleSettings} className='close-button'>
              ✕
            </button>
          </div>
          <div className='settings-content'>
            <div className='setting-item'>
              <label>
                <input
                  type='checkbox'
                  checked={debugGrid}
                  onChange={(e) => setDebugGrid(e.target.checked)}
                />
                Show Debug Grid
              </label>
            </div>
            <div className='setting-item'>
              <label>
                <input
                  type='checkbox'
                  checked={enableShadows}
                  onChange={(e) => setEnableShadows(e.target.checked)}
                />
                Enable Shadows
              </label>
            </div>
            <div className='setting-item'>
              <label>
                <input
                  type='checkbox'
                  checked={showFPS}
                  onChange={(e) => setShowFPS(e.target.checked)}
                />
                Show FPS Counter
              </label>
            </div>
            <div className='setting-item'>
              <label>Graphics Quality:</label>
              <select
                className='control-select'
                value={graphicsQuality}
                onChange={(e) => setGraphicsQuality(e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value='low'>Low</option>
                <option value='medium'>Medium</option>
                <option value='high'>High</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
