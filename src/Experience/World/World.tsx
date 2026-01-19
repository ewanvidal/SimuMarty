import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';
import Environment from './Environment.tsx';
import Floor from './Floor.tsx';
import Marty from './Marty.tsx';
import Labyrinth from './Labyrinth.tsx';
import SceneDirector from './SceneDirector.ts';
import { TutorialManager } from './tutorial/TutorialManager.ts';
import { TUTORIAL_LESSONS } from '../../shared/constants/tutorialLessons.ts';
import { LevelBuilder } from './LevelBuilder.ts';
import { lesson1Map, lesson1MartyConfig } from '../../shared/constants/lessons/lesson1.ts';
import { lesson2Map, lesson2MartyConfig } from '../../shared/constants/lessons/lesson2.ts';
import { lesson3Map, lesson3MartyConfig, lesson3Obstacles } from '../../shared/constants/lessons/lesson3.ts';

/**
 * World
 * Contains all the 3D objects in the scene
 */
export default class World {
  experience: Experience;
  scene: THREE.Scene;
  resources: Resources;
  floor?: Floor;
  labyrinth?: Labyrinth;
  marty?: Marty;
  environment?: Environment;
  sceneDirector?: SceneDirector;
  tutorialManager?: TutorialManager;
  levelBuilder?: LevelBuilder;
  pendingScenePresetId: string | null = null;
  pendingLessonId: string | null = null;


  constructor() {
    this.experience = (
      window as unknown as { experience: Experience }
    ).experience;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    // Wait for resources to be ready
    this.resources.on('ready', () => {
      // Setup world objects
      this.floor = new Floor();
      // this.labyrinth = new Labyrinth(); // Disabled for now
      this.marty = new Marty();
      this.environment = new Environment();
      this.sceneDirector = new SceneDirector({
        floor: this.floor,
        environment: this.environment,
        marty: this.marty,
        camera: this.experience.camera,
      });
      this.tutorialManager = new TutorialManager();
      this.levelBuilder = new LevelBuilder(this.scene);
      
      this.sceneDirector.applyScenePreset(this.pendingScenePresetId);
      
      // Load pending tutorial if any
      if (this.pendingLessonId) {
        this.loadTutorialLesson(this.pendingLessonId);
      }
    });
  }

  update() {
    if (this.marty) {
      this.marty.update();
    }
    if (this.labyrinth) {
      this.labyrinth.update();
    }
    // Update tutorial manager (if needed for future features)
    if (this.tutorialManager) {
      this.tutorialManager.update();
    }
    // Update level builder goal detection
    if (this.levelBuilder && this.marty) {
      const deltaSeconds = this.experience.time.delta / 1000;
      const pos = this.marty.getPosition();
      this.levelBuilder.update(deltaSeconds, { x: pos.x, z: pos.z });
    }
  }

  dispose() {
    this.floor?.dispose();
    this.labyrinth?.dispose();
    this.marty?.dispose();
    this.environment?.dispose();
    this.tutorialManager?.dispose();
    this.levelBuilder?.dispose();
  }

  applyScenePreset(presetId?: string | null) {
    this.pendingScenePresetId = presetId ?? null;
    if (this.sceneDirector) {
      this.sceneDirector.applyScenePreset(this.pendingScenePresetId);
    }
  }

  /**
   * Load tutorial-specific objects for a lesson
   * @param lessonId - The tutorial lesson ID to load
   */
  loadTutorialLesson(lessonId: string | null): void {
    this.pendingLessonId = lessonId;
    
    if (!this.tutorialManager || !this.levelBuilder) return;
    
    // Clear previous level construction
    this.levelBuilder.clear();

    if (!lessonId) {
      this.tutorialManager.clearLesson();
      return;
    }
    
    // 1. Load the basic tutorial configuration (text, state)
    this.tutorialManager.loadLessonById(lessonId, TUTORIAL_LESSONS);

    // 2. If this lesson has a specific Level Map, build it
    if (lessonId === 'movement-basics') {
      this.levelBuilder.build(lesson1Map);
      
      // Place Marty at start position and apply rotation
      const startPos = this.levelBuilder.getStartPosition();
      if (startPos && this.marty) {
        this.marty.setPosition(startPos.x, startPos.y, startPos.z);
        this.marty.setRotationY(lesson1MartyConfig.rotationY);
      }
      
      // Listen for goal reached event
      this.levelBuilder.on('goalReached', () => {
        console.log('🎉 Goal reached! Marty completed the level!');
        // Could trigger UI notification, next lesson, etc.
      });
    } else if (lessonId === 'turning-and-orientation') {
      this.levelBuilder.build(lesson2Map);
      
      // Place Marty at start position and apply rotation
      const startPos = this.levelBuilder.getStartPosition();
      if (startPos && this.marty) {
        this.marty.setPosition(startPos.x, startPos.y, startPos.z);
        this.marty.setRotationY(lesson2MartyConfig.rotationY);
      }
      
      // Listen for goal reached event
      this.levelBuilder.on('goalReached', () => {
        console.log('🎉 Goal reached! Marty completed the level!');
        // Could trigger UI notification, next lesson, etc.
      });
    } else if (lessonId === 'sensors-and-obstacles') {
      this.levelBuilder.build(lesson3Map, lesson3Obstacles);
      
      // Place Marty at start position and apply rotation
      const startPos = this.levelBuilder.getStartPosition();
      if (startPos && this.marty) {
        this.marty.setPosition(startPos.x, startPos.y, startPos.z);
        this.marty.setRotationY(lesson3MartyConfig.rotationY);
      }
      
      // Listen for goal reached event
      this.levelBuilder.on('goalReached', () => {
        console.log('🎉 Goal reached! Marty completed the level!');
      });
    }
  }

  /**
   * Check if Marty has reached the tutorial goal

   * @returns True if goal is reached
   */
  checkTutorialGoalReached(): boolean {
    if (!this.levelBuilder || !this.marty) return false;
    return this.levelBuilder.hasReachedGoal();
  }

  /**
   * Clear tutorial objects from scene
   */
  clearTutorial(): void {
    this.pendingLessonId = null;
    this.tutorialManager?.clearLesson();
    this.levelBuilder?.clear();
  }
}
