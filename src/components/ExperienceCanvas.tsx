import { useEffect, useRef, useState } from 'react';
import Experience from '../Experience/Experience.tsx';
import { useAppStore } from '../stores/appStore.ts';
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
    </div>
  );
}
