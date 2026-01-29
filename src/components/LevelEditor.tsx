import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.ts';
import './LevelEditor.css';

/** Special mode for erasing tiles */
const ERASER_MODE = '__ERASER__';

/** Preset tile colors with display name and hex color */
const PRESET_TILES = [
  { id: 'start', name: 'Start', color: '#ef4444' },
  { id: 'goal', name: 'Goal', color: '#22c55e' },
  { id: 'path', name: 'Path', color: '#ffffff' },
  { id: 'purple', name: 'Purple', color: '#a855f7' },
  { id: 'blue', name: 'Blue', color: '#3b82f6' },
  { id: 'yellow', name: 'Yellow', color: '#eab308' },
  { id: 'orange', name: 'Orange', color: '#f97316' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4' },
];

export function LevelEditor() {
  const { t } = useTranslation();
  const {
    selectedEnvironment,
    levelEditorOpen,
    toggleLevelEditor,
    selectedTileColor,
    setSelectedTileColor,
  } = useAppStore();

  const [customColor, setCustomColor] = useState({ r: 128, g: 128, b: 128 });
  const [customTiles, setCustomTiles] = useState<Array<{ id: string; color: string }>>([]);

  // Auto-deselect after placing a tile
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    const levelBuilder = experience?.world?.levelBuilder;
    
    if (!levelBuilder) return;
    
    const handleTilePlaced = () => {
      // Only auto-deselect in placement mode, not eraser mode
      if (selectedTileColor && selectedTileColor !== ERASER_MODE) {
        setSelectedTileColor(null);
        levelBuilder.disablePlacementMode();
      }
    };
    
    levelBuilder.on('tilePlaced', handleTilePlaced);
    
    return () => {
      levelBuilder.off('tilePlaced', handleTilePlaced);
    };
  }, [selectedTileColor, setSelectedTileColor]);

  // Don't show in tutorial environment
  if (selectedEnvironment === 'tutorial') {
    return null;
  }

  const handlePresetClick = (color: string) => {
    if (selectedTileColor === color) {
      setSelectedTileColor(null);
      disableGridMode();
    } else {
      setSelectedTileColor(color);
      enableGridMode(color);
    }
  };

  /** Handle eraser mode toggle */
  const handleEraserClick = () => {
    if (selectedTileColor === ERASER_MODE) {
      setSelectedTileColor(null);
      disableGridMode();
    } else {
      setSelectedTileColor(ERASER_MODE);
      enableEraserMode();
    }
  };

  const handleCustomColorAdd = () => {
    const color = `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})`;
    const id = `custom-${Date.now()}`;
    setCustomTiles([...customTiles, { id, color }]);
  };

  const handleCustomTileClick = (color: string) => {
    if (selectedTileColor === color) {
      setSelectedTileColor(null);
      disableGridMode();
    } else {
      setSelectedTileColor(color);
      enableGridMode(color);
    }
  };

  const enableGridMode = (color: string) => {
    // Parse color to RGB
    let r = 255, g = 255, b = 255;
    
    if (color.startsWith('#')) {
      // Hex color
      const hex = color.slice(1);
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else if (color.startsWith('rgb')) {
      // RGB color
      const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        r = parseInt(match[1]);
        g = parseInt(match[2]);
        b = parseInt(match[3]);
      }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (experience?.world?.levelBuilder) {
      experience.world.levelBuilder.enablePlacementMode({ r, g, b });
    }
  };

  const disableGridMode = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (experience?.world?.levelBuilder) {
      experience.world.levelBuilder.disablePlacementMode();
    }
  };

  /** Enable eraser mode to delete tiles on click */
  const enableEraserMode = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (experience?.world?.levelBuilder) {
      experience.world.levelBuilder.enableEraserMode();
    }
  };

  const handleClearLevel = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (experience?.world?.levelBuilder) {
      experience.world.levelBuilder.clear();
    }
  };

  return (
    <div className={`level-editor ${levelEditorOpen ? 'open' : ''}`}>
      <button 
        className="level-editor-toggle"
        onClick={toggleLevelEditor}
        title={levelEditorOpen ? t('levelEditor.toggleClose') : t('levelEditor.toggleOpen')}
      >
        {levelEditorOpen ? '◀' : '▶'} {t('levelEditor.title')}
      </button>

      {levelEditorOpen && (
        <div className="level-editor-content">
          <h3>{t('levelEditor.tilePalette')}</h3>
          
          <div className="tile-section">
            <h4>{t('levelEditor.presetTiles')}</h4>
            <div className="tile-grid">
              {PRESET_TILES.map((tile) => (
                <button
                  key={tile.id}
                  className={`tile-button ${selectedTileColor === tile.color ? 'selected' : ''}`}
                  style={{ backgroundColor: tile.color }}
                  onClick={() => handlePresetClick(tile.color)}
                  title={tile.name}
                >
                  <span className="tile-label">{tile.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="tile-section">
            <h4>{t('levelEditor.tools')}</h4>
            <button
              className={`tool-button eraser-btn ${selectedTileColor === ERASER_MODE ? 'selected' : ''}`}
              onClick={handleEraserClick}
              title={t('levelEditor.eraserTooltip')}
            >
              {t('levelEditor.eraser')}
            </button>
          </div>

          <div className="tile-section">
            <h4>{t('levelEditor.customTiles')}</h4>
            <div className="custom-color-picker">
              <div className="color-inputs">
                <label>
                  R
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={customColor.r}
                    onChange={(e) => setCustomColor({ ...customColor, r: parseInt(e.target.value) })}
                  />
                  <span>{customColor.r}</span>
                </label>
                <label>
                  G
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={customColor.g}
                    onChange={(e) => setCustomColor({ ...customColor, g: parseInt(e.target.value) })}
                  />
                  <span>{customColor.g}</span>
                </label>
                <label>
                  B
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={customColor.b}
                    onChange={(e) => setCustomColor({ ...customColor, b: parseInt(e.target.value) })}
                  />
                  <span>{customColor.b}</span>
                </label>
              </div>
              <div className="color-preview-row">
                <div
                  className="color-preview"
                  style={{ backgroundColor: `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})` }}
                />
                <button className="add-color-btn" onClick={handleCustomColorAdd}>
                  + {t('levelEditor.add')}
                </button>
              </div>
            </div>

            {customTiles.length > 0 && (
              <div className="tile-grid custom-tiles">
                {customTiles.map((tile) => (
                  <button
                    key={tile.id}
                    className={`tile-button ${selectedTileColor === tile.color ? 'selected' : ''}`}
                    style={{ backgroundColor: tile.color }}
                    onClick={() => handleCustomTileClick(tile.color)}
                    title={t('levelEditor.custom')}
                  >
                    <span className="tile-label">{t('levelEditor.custom')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="tile-section">
            <h4>{t('levelEditor.actions')}</h4>
            <button className="action-btn clear-btn" onClick={handleClearLevel}>
              {t('levelEditor.clearLevel')}
            </button>
            {selectedTileColor && (
              <button 
                className="action-btn deselect-btn" 
                onClick={() => {
                  setSelectedTileColor(null);
                  disableGridMode();
                }}
              >
                {t('levelEditor.deselect')}
              </button>
            )}
          </div>

          <div className="editor-hint">
            {selectedTileColor === ERASER_MODE ? (
              <p>{t('levelEditor.hintEraser')}</p>
            ) : selectedTileColor ? (
              <p>{t('levelEditor.hintPlace')}</p>
            ) : (
              <p>{t('levelEditor.hintSelect')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
