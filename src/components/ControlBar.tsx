import { useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.ts';
import { webSocketService } from '../services/WebSocketService.ts';
import {
  ENVIRONMENT_PRESETS,
  type EnvironmentId,
  type LevelOption,
} from '../shared/constants/environmentPresets.ts';
import './ControlBar.css';

export function ControlBar() {
  const { t, i18n } = useTranslation();
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
    enableShadows,
    setEnableShadows,
    timeScale,
    setTimeScale,
    openTutorialModal,
    debugConsoleOpen,
    setDebugConsoleOpen,
    cameraFollow,
    setCameraFollow,
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

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (experience) {
      if (experience.renderer) {
        experience.renderer.setShadows(enableShadows);
      }
      // Note: timeScale is handled directly in the setter in appStore
      // but we can also sync it here just in case
      if (experience.time) {
        experience.time.timeScale = timeScale;
      }
      if (experience.camera) {
        experience.camera.followTarget = cameraFollow;
      }
    }
  }, [enableShadows, timeScale, cameraFollow]);

  return (
    <>
      <div className='control-bar'>
        <div className='control-bar-section'>
          <div className='control-group'>
            <label htmlFor='environment-picker'>{t('controlBar.environment')}</label>
            <select
              id='environment-picker'
              value={selectedEnvironment}
              onChange={handleEnvironmentChange}
              className='control-select'
            >
              {environmentOptions.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {t(`environments.${environment.id}.label`, environment.label)}
                </option>
              ))}
            </select>
          </div>

          <div className='control-group'>
            <label htmlFor='level-picker'>{t('controlBar.level')}</label>
            <select
              id='level-picker'
              value={levelSelectValue}
              onChange={handleLevelChange}
              className='control-select'
              disabled={levelOptions.length === 0}
            >
              {levelOptions.length === 0 && <option value='none'>{t('controlBar.noLevels')}</option>}
              {levelOptions.map((level) => {
                const label = t(`environments.${selectedEnvironment}.levels.${level.id}.label`, level.label);
                const description = level.description;
                const fullLabel = description ? `${label} · ${description}` : label;
                return (
                  <option key={level.id} value={level.id}>
                    {fullLabel}
                  </option>
                );
              })}
            </select>
          </div>
          
          {selectedEnvironment === 'labyrinth' && (
            <button
              className="control-button"
              onClick={handleGenerateMaze}
              title={t('controlBar.generateMaze')}
              style={{ marginLeft: '10px' }}
            >
              <span className="icon">{t('controlBar.generateMaze')}</span>
            </button>
          )}
        </div>

        <div className='control-bar-section'>
          <button
            onClick={toggleExperienceExpanded}
            className='control-button'
            title={experienceExpanded ? t('controlBar.resetLayout') : t('controlBar.expandLayout')}
          >
            <img src='/layout.png' alt='Layout' style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div className='control-bar-section'>
          <button onClick={handleSaveJson} className='control-button'>
             {t('controlBar.saveJson')}
          </button>

          <button onClick={triggerImport} className='control-button'>
             {t('controlBar.importJson')}
          </button>

          <input
            ref={fileInputRef}
            type='file'
            accept='application/json'
            style={{ display: 'none' }}
            onChange={handleImportJson}
          />

          <button onClick={handleRunCode} className='control-button button-primary'>
            {t('controlBar.runCode')}
          </button>

          <button onClick={toggleEditorMode} className='control-button button-secondary'>
            {editorMode === 'monaco' ? t('controlBar.switchToBlockly') : t('controlBar.switchToCode')}
          </button>

          <button onClick={toggleSettings} className='control-button' title={t('controlBar.settings')}>
            {t('controlBar.settings')}
          </button>

          {isTutorialEnvironment && hasTutorialLesson && (
            <button onClick={openTutorialModal} className='control-button' title={t('controlBar.viewLessonBrief')}>
              {t('controlBar.lessonBriefing')}
            </button>
          )}
        </div>
      </div>

      {showSettings && (
        <div className='settings-panel'>
          <div className='settings-header'>
            <h3>{t('settings.title')}</h3>
            <button onClick={toggleSettings} className='close-button'>
              ✕
            </button>
          </div>
          <div className='settings-content'>
            <div className='setting-item'>
              <label>{t('settings.language')}</label>
              <select
                value={i18n.resolvedLanguage || i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className='control-select'
                style={{ width: '100%', marginBottom: '10px' }}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
            <div className='setting-item'>
              <label>{t('settings.timeScale')}: {timeScale.toFixed(1)}x</label>
              <input
                type='range'
                min='0.1'
                max='20'
                step='0.1'
                value={timeScale}
                onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                className='setting-slider'
              />
            </div>
            <div className='setting-item'>
              <label>
                <input
                  type='checkbox'
                  checked={enableShadows}
                  onChange={(e) => setEnableShadows(e.target.checked)}
                />
                {t('settings.enableShadows')}
              </label>
            </div>
            <div className='setting-item'>
              <label>
                <input
                  type='checkbox'
                  checked={cameraFollow}
                  onChange={(e) => setCameraFollow(e.target.checked)}
                />
                {t('settings.cameraFollow')}
              </label>
            </div>
            <div className='setting-item'>
              <label>
                <input
                  type='checkbox'
                  checked={debugConsoleOpen}
                  onChange={(e) => setDebugConsoleOpen(e.target.checked)}
                />
                {t('settings.showDebugConsole')}
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
