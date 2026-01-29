import { useEffect, useRef, useState, useCallback } from 'react';
import Experience from '../Experience/Experience.tsx';
import { useAppStore } from '../stores/appStore.ts';
import { SCENE_PRESETS, DEFAULT_SCENE_PRESET_ID } from '../shared/constants/scenePresets.ts';
import { LevelEditor } from './LevelEditor.tsx';
import './ExperienceCanvas.css';

/**
 * ExperienceCanvas
 * React component that wraps the Three.js Experience
 */
export function ExperienceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const experienceRef = useRef<Experience | null>(null);
  const [experienceReady, setExperienceReady] = useState(false);
  const scenePresetId = useAppStore((state) => state.scenePresetId);
  const activeLessonId = useAppStore((state) => state.activeLessonId);
  const selectedEnvironment = useAppStore((state) => state.selectedEnvironment);
  const selectedLevel = useAppStore((state) => state.selectedLevel);

  const handleReset = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experience = (window as any).experience;
    if (!experience?.world) return;
    
    const { marty, levelBuilder } = experience.world;
    
    // Stop any running code/animations
    if (marty?.controller) {
      marty.controller.stopExecution();
    }
    
    // Reset Marty to start position and rotation
    if (marty && levelBuilder) {
      const startPos = levelBuilder.getStartPosition();
      const startRotation = levelBuilder.getStartRotation();
      if (startPos) {
        marty.setPosition(startPos.x, startPos.y ?? 0, startPos.z);
      } else {
        // Default position from current scene preset
        const currentPresetId = scenePresetId || DEFAULT_SCENE_PRESET_ID;
        const preset = SCENE_PRESETS[currentPresetId];
        const defaultPos = preset?.marty?.position || [0.05, 0, 0.05];
        marty.setPosition(defaultPos[0], defaultPos[1], defaultPos[2]);
      }
      marty.setRotationY(startRotation);
    }
  }, [scenePresetId]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    // Prevent double initialization in React Strict Mode
    if (experienceRef.current) {
      return;
    }

    // Initialize the experience
    experienceRef.current = new Experience(canvasRef.current);
    setExperienceReady(true);

    // Cleanup on unmount
    return () => {
      experienceRef.current?.dispose();
      experienceRef.current = null;
      setExperienceReady(false);
    };
  }, []);

  // Apply scene preset when it changes
  useEffect(() => {
    if (!experienceReady || !experienceRef.current) {
      return;
    }
    experienceRef.current.loadScenePreset(scenePresetId ?? null);
  }, [scenePresetId, experienceReady]);

  // Load level when environment or level changes
  useEffect(() => {
    if (!experienceReady || !experienceRef.current) {
      return;
    }
    experienceRef.current.loadLevel(selectedEnvironment, selectedLevel);
  }, [selectedEnvironment, selectedLevel, experienceReady]);

  // Load tutorial lesson objects when lesson changes
  useEffect(() => {
    if (!experienceReady || !experienceRef.current) {
      return;
    }
    experienceRef.current.loadTutorialLesson(activeLessonId ?? null);
  }, [activeLessonId, experienceReady]);

  return (
    <div className='experience-container'>
      <canvas ref={canvasRef} className='experience-canvas' />
      <button 
        className='reset-button' 
        onClick={handleReset}
        title='Reset Marty to start position'
      >
        🔄 Reset
      </button>
      <LevelEditor />
    </div>
  );
}
