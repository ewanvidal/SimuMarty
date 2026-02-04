import * as THREE from 'three';
import type Experience from '../Experience.tsx';
import type Resources from '../Utils/Resources.tsx';
import Environment from './Environment.tsx';
import Floor from './Floor.tsx';
import Marty from './Marty.tsx';
import SceneDirector from './SceneDirector.ts';
import { TutorialManager } from './tutorial/TutorialManager.ts';
import { TUTORIAL_LESSONS } from '../../shared/constants/tutorialLessons.ts';
import { LevelBuilder } from './LevelBuilder.ts';
import { lesson1Map } from '../../shared/constants/lessons/lesson1.ts';
import { lesson2Map } from '../../shared/constants/lessons/lesson2.ts';
import {
  lesson3Map,
  lesson3Obstacles,
} from '../../shared/constants/lessons/lesson3.ts';
import {
  SCENE_PRESETS,
  DEFAULT_SCENE_PRESET_ID,
} from '../../shared/constants/scenePresets.ts';

/**
 * World
 * Contains all the 3D objects in the scene
 */
export default class World {
  experience: Experience;
  scene: THREE.Scene;
  resources: Resources;
  floor?: Floor;
  marty?: Marty;
  environment?: Environment;
  sceneDirector?: SceneDirector;
  tutorialManager?: TutorialManager;
  levelBuilder?: LevelBuilder;
  pendingScenePresetId: string | null = null;
  pendingLessonId: string | null = null;
  pendingLevelSelection: { envId: string; levelId: string } | null = null;

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

      // Inject physics from Marty into LevelBuilder for obstacle collisions
      if (this.marty?.physics) {
        this.levelBuilder.setPhysics(this.marty.physics);
      }

      this.sceneDirector.applyScenePreset(
        this.pendingScenePresetId || DEFAULT_SCENE_PRESET_ID,
      );

      // Load pending tutorial if any
      if (this.pendingLessonId) {
        this.loadTutorialLesson(this.pendingLessonId);
      }

      // Load pending level selection if any
      if (this.pendingLevelSelection) {
        this.loadLevel(
          this.pendingLevelSelection.envId,
          this.pendingLevelSelection.levelId,
        );
      }

      // If no pending selections, load the default level (tutorial level1)
      if (!this.pendingLessonId && !this.pendingLevelSelection) {
        // Import the default from the store to load tutorial level1
        this.loadTutorialLesson('movement-basics');
      }
    });
  }

  update() {
    if (this.marty) {
      this.marty.update();
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
    this.marty?.dispose();
    this.environment?.dispose();
    this.tutorialManager?.dispose();
    this.levelBuilder?.dispose();
  }

  applyScenePreset(presetId?: string | null) {
    this.pendingScenePresetId = presetId ?? DEFAULT_SCENE_PRESET_ID;
    if (this.sceneDirector) {
      this.sceneDirector.applyScenePreset(this.pendingScenePresetId);
    }
  }

  /**
   * Load a specific level for an environment
   */
  loadLevel(environmentId: string, levelId: string): void {
    if (!this.levelBuilder) {
      this.pendingLevelSelection = { envId: environmentId, levelId };
      return;
    }

    // Tutorial environment is handled by loadTutorialLesson, skip here
    if (environmentId === 'tutorial') {
      return;
    }

    console.log(`Loading level: ${levelId} for environment: ${environmentId}`);

    // Always clear the previous construction when switching levels/environments
    this.levelBuilder.clear();

    // Disable Marty's shadow in Labyrinth mode (looks better with transparent walls and floor tiles)
    // and re-enable it for other environments.
    if (this.marty) {
      this.marty.setCastShadow(environmentId !== 'labyrinth');
    }

    if (environmentId === 'labyrinth') {
      if (levelId === 'level1') {
        this.levelBuilder.generateMaze(7, 7);
      } else if (levelId === 'level2') {
        this.levelBuilder.generateMaze(11, 11);
      } else if (levelId === 'level3') {
        this.levelBuilder.generateMaze(17, 17);
      } else if (levelId === 'level4') {
        this.levelBuilder.generateMaze(25, 25);
      } else {
        // Default or "custom" random maze
        this.levelBuilder.generateMaze(21, 21);
      }

      // After building the maze, teleport Marty to start
      const startPos = this.levelBuilder.getStartPosition();
      if (startPos && this.marty) {
        this.marty.setPosition(startPos.x, 0, startPos.z);
        this.marty.setRotationY(0);
      }
    } else {
      // Reset Marty to center of a tile for non-level-based environments
      // Use values from the current (or default) scene preset
      if (this.marty) {
        const presetId = this.pendingScenePresetId || DEFAULT_SCENE_PRESET_ID;
        const preset = SCENE_PRESETS[presetId];
        const defaultPos = preset?.marty?.position || [0.05, 0, 0.05];
        const defaultRot = preset?.marty?.rotationY ?? 0;

        this.marty.setPosition(defaultPos[0], defaultPos[1], defaultPos[2]);
        this.marty.setRotationY(defaultRot);
      }
    }
  }

  /**
   * Load tutorial-specific objects for a lesson
   * @param lessonId - The tutorial lesson ID to load
   */
  loadTutorialLesson(lessonId: string | null): void {
    this.pendingLessonId = lessonId;

    if (!this.tutorialManager || !this.levelBuilder) return;

    // Only handle tutorial clearing/loading if we have an active lesson
    // or if we are explicitly clearing a lesson while in the tutorial environment.
    // If lessonId is null and we aren't in tutorial mode, we should NOT clear the level builder
    // as it might have just built a non-tutorial level (like a labyrinth).
    if (!lessonId) {
      this.tutorialManager.clearLesson();
      return;
    }

    // Clear previous level construction
    this.levelBuilder.clear();

    // 1. Load the basic tutorial configuration (text, state)
    this.tutorialManager.loadLessonById(lessonId, TUTORIAL_LESSONS);

    // Get Marty spawn position from preset
    const presetId = this.pendingScenePresetId || DEFAULT_SCENE_PRESET_ID;
    const preset = SCENE_PRESETS[presetId];
    const martyPos = preset?.marty?.position ?? [0.05, 0, 0.05];
    const martyRotY = preset?.marty?.rotationY ?? 0;
    const startAt = { x: martyPos[0], z: martyPos[2] };

    // 2. If this lesson has a specific Level Map, build it with startAt so START tile aligns with Marty
    if (lessonId === 'movement-basics') {
      this.levelBuilder.build(lesson1Map, { startAt });
      this.levelBuilder.setStartRotation(martyRotY);

      // Place Marty using scene preset values
      if (this.marty) {
        this.marty.setPosition(martyPos[0], martyPos[1], martyPos[2]);
        this.marty.setRotationY(martyRotY);
      }

      // Listen for goal reached event
      this.levelBuilder.on('goalReached', () => {
        console.log('🎉 Goal reached! Marty completed the level!');
        // Could trigger UI notification, next lesson, etc.
      });
    } else if (lessonId === 'turning-and-orientation') {
      this.levelBuilder.build(lesson2Map, { startAt });
      this.levelBuilder.setStartRotation(martyRotY);

      // Place Marty using scene preset values
      if (this.marty) {
        this.marty.setPosition(martyPos[0], martyPos[1], martyPos[2]);
        this.marty.setRotationY(martyRotY);
      }

      // Listen for goal reached event
      this.levelBuilder.on('goalReached', () => {
        console.log('🎉 Goal reached! Marty completed the level!');
        // Could trigger UI notification, next lesson, etc.
      });
    } else if (lessonId === 'sensors-and-obstacles') {
      this.levelBuilder.build(lesson3Map, {
        obstacles: lesson3Obstacles,
        startAt,
      });
      this.levelBuilder.setStartRotation(martyRotY);

      // Place Marty using scene preset values
      if (this.marty) {
        this.marty.setPosition(martyPos[0], martyPos[1], martyPos[2]);
        this.marty.setRotationY(martyRotY);
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
