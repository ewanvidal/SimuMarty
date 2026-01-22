import type { TutorialLesson } from '../../../shared/constants/tutorialLessons.ts';

/**
 * TutorialManager
 * Manages tutorial lesson metadata and state.
 * Level building is handled by LevelBuilder.
 */
export class TutorialManager {
  private currentLessonId?: string;
  private currentLesson?: TutorialLesson;

  constructor() {}

  /**
   * Load a tutorial lesson by ID
   */
  loadLessonById(lessonId: string, lessons: Record<string, TutorialLesson>): void {
    const lesson = lessons[lessonId];
    if (lesson) {
      this.currentLessonId = lessonId;
      this.currentLesson = lesson;
    }
  }

  /**
   * Get current lesson ID
   */
  getCurrentLessonId(): string | undefined {
    return this.currentLessonId;
  }

  /**
   * Get current lesson data
   */
  getCurrentLesson(): TutorialLesson | undefined {
    return this.currentLesson;
  }

  /**
   * Clear current lesson
   */
  clearLesson(): void {
    this.currentLessonId = undefined;
    this.currentLesson = undefined;
  }

  /**
   * Update (placeholder for future needs)
   */
  update(): void {
    // Nothing to update - LevelBuilder handles tile animations
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clearLesson();
  }
}
