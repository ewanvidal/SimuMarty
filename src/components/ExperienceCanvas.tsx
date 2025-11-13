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
    console.log('🔧 ExperienceCanvas useEffect - canvasRef.current:', canvasRef.current);
    
    if (!canvasRef.current) {
      console.error('❌ Canvas ref is null!');
      return;
    }

    // Prevent double initialization in React Strict Mode
    if (experienceRef.current) {
      console.log('⚠️ Experience already initialized, skipping');
      return;
    }

    // Initialize the experience
    console.log('🚀 Initializing Experience...');
    experienceRef.current = new Experience(canvasRef.current);
    console.log('✅ Experience instance created:', experienceRef.current);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Experience...');
      experienceRef.current?.dispose();
      experienceRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="experience-canvas" />;
}
