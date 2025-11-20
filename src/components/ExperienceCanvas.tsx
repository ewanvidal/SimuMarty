import { useEffect, useRef } from 'react';
import Experience from '../Experience/Experience.tsx';
import './ExperienceCanvas.css';

/**
 * ExperienceCanvas
 * React component that wraps the Three.js Experience
 */
export function ExperienceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const experienceRef = useRef<Experience | null>(null);

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

    // Cleanup on unmount
    return () => {
      experienceRef.current?.dispose();
      experienceRef.current = null;
    };
  }, []);

  return (
    <div className='experience-container'>
      <canvas ref={canvasRef} className='experience-canvas' />
    </div>
  );
}
