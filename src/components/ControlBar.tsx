import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useAppStore } from '../stores/appStore.ts';
import { webSocketService } from '../services/WebSocketService.ts';
import {
  ENVIRONMENT_PRESETS,
  type EnvironmentId,
  type LevelOption,
} from '../shared/constants/environmentPresets.ts';
import './ControlBar.css';

export function ControlBar() {
  const {
    selectedEnvironment,
    selectedLevel,
    activeLessonId,
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
    timeScale,
    cameraFollow,
    setDebugGrid,
    setEnableShadows,
    setShowFPS,
    setGraphicsQuality,
    setTimeScale,
    setCameraFollow,
    openTutorialModal,
  } = useAppStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const environmentOptions = Object.values(ENVIRONMENT_PRESETS);
  const levelOptions: LevelOption[] =
    ENVIRONMENT_PRESETS[selectedEnvironment]?.levels ?? [];
  const levelIds = new Set(levelOptions.map((level) => level.id));
  const levelSelectValue = levelIds.has(selectedLevel)
    ? selectedLevel
    : levelOptions[0]?.id ?? 'none';
  const isTutorialEnvironment = selectedEnvironment === 'tutorial';
  const hasTutorialLesson = Boolean(activeLessonId);

  const handleEnvironmentChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setEnvironment(e.target.value as EnvironmentId);
  };

  const handleLevelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLevel(e.target.value);
  };

  const handleRunCode = () => {
    if (!wsConnected) {
      alert('WebSocket not connected! Please check if the server is running.');
      return;
    }
    webSocketService.executeCode(currentCode);
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
    } catch {
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
    } catch {
      window.alert('Failed to import JSON file. Please ensure it was exported from this editor.');
    } finally {
      event.target.value = '';
    }
  };

  const handleGenerateMaze = () => {
    // Access experience singleton globally
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (experience?.world?.levelBuilder && experience?.world?.marty) {
      // Force a re-load of the current level selection (or custom)
      experience.loadLevel(selectedEnvironment, 'custom');
      
      // Update store to match
      if (selectedLevel !== 'custom') {
        setLevel('custom');
      }
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
              {environmentOptions.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.label}
                </option>
              ))}
            </select>
          </div>

          <div className='control-group'>
            <label htmlFor='level-picker'>Level:</label>
            <select
              id='level-picker'
              value={levelSelectValue}
              onChange={handleLevelChange}
              className='control-select'
              disabled={levelOptions.length === 0}
            >
              {levelOptions.length === 0 && <option value='none'>No levels</option>}
              {levelOptions.map((level) => {
                const label = level.description
                  ? `${level.label} · ${level.description}`
                  : level.label;
                return (
                  <option key={level.id} value={level.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          
          {selectedEnvironment === 'labyrinth' && (
            <button
              className="control-button"
              onClick={handleGenerateMaze}
              title="Generate New Random Maze"
              style={{ marginLeft: '10px' }}
            >
              <span className="icon">Generate Random Maze</span>
            </button>
          )}
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

          {isTutorialEnvironment && hasTutorialLesson && (
            <button onClick={openTutorialModal} className='control-button' title='View lesson brief'>
              Lesson Briefing
            </button>
          )}
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
              <label>
                <input
                  type='checkbox'
                  checked={cameraFollow}
                  onChange={(e) => setCameraFollow(e.target.checked)}
                />
                Camera Follow Marty
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
            <div className='setting-item'>
              <label>Time Scale: {timeScale.toFixed(1)}x</label>
              <input
                type='range'
                min='0.1'
                max='15'
                step='0.1'
                value={timeScale}
                onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                className='setting-slider'
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
