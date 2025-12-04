import { useMemo } from 'react';
import { TUTORIAL_LESSONS } from '../shared/constants/tutorialLessons.ts';
import { useAppStore } from '../stores/appStore.ts';
import './TutorialModal.css';

export function TutorialModal() {
  const tutorialModalVisible = useAppStore((state) => state.tutorialModalVisible);
  const activeLessonId = useAppStore((state) => state.activeLessonId);
  const closeTutorialModal = useAppStore((state) => state.closeTutorialModal);

  const lesson = useMemo(() => {
    if (!activeLessonId) return undefined;
    return TUTORIAL_LESSONS[activeLessonId];
  }, [activeLessonId]);

  if (!tutorialModalVisible || !lesson) {
    return null;
  }

  const media = lesson.media;

  return (
    <div className='tutorial-modal-backdrop' role='dialog' aria-modal='true'>
      <div className='tutorial-modal-window'>
        <header className='tutorial-modal-header'>
          <div>
            <p className='tutorial-meta'>{lesson.estimatedTime}</p>
            <h2 className='tutorial-title'>{lesson.title}</h2>
            <p className='tutorial-summary'>{lesson.summary}</p>
          </div>
          <button className='tutorial-close-button' onClick={closeTutorialModal} aria-label='Close tutorial'>
            ✕
          </button>
        </header>

        {media && (
          <div className='tutorial-media'>
            {media.type === 'video' ? (
              <video
                controls
                loop
                playsInline
                poster={media.poster}
                src={media.src}
                className='tutorial-media-content'
              />
            ) : (
              <img src={media.src} alt={media.caption || lesson.title} className='tutorial-media-content' />
            )}
            {media.caption && <p className='tutorial-media-caption'>{media.caption}</p>}
          </div>
        )}

        <section className='tutorial-section'>
          <h3>Goal</h3>
          <p>{lesson.goal}</p>
        </section>

        <section className='tutorial-section'>
          <h3>Objectives</h3>
          <ul>
            {lesson.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </section>

        <section className='tutorial-section'>
          <h3>Steps</h3>
          <ol>
            {lesson.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>

        {lesson.tips && lesson.tips.length > 0 && (
          <section className='tutorial-section'>
            <h3>Tips</h3>
            <ul>
              {lesson.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
