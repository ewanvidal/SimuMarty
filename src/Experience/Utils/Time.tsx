import EventEmitter from './EventEmitter.tsx';

/**
 * Time
 * Handles animation loop timing
 */
export default class Time extends EventEmitter {
  start: number;
  current: number;
  elapsed: number;
  delta: number;
  timeScale: number;

  constructor() {
    super();

    // Setup
    this.start = Date.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 16; // ~60fps default
    this.timeScale = 1;

    // Start the tick loop
    window.requestAnimationFrame(() => this.tick());
  }

  private tick() {
    const currentTime = Date.now();
    // Calculate raw delta time in ms
    const rawDelta = currentTime - this.current;
    
    this.current = currentTime;
    
    // Apply timeScale to delta
    this.delta = rawDelta * this.timeScale;
    
    // Accumulate elapsed time using the scaled delta
    // Note: this means 'elapsed' is "simulated time" not wall-clock time
    this.elapsed += this.delta;

    this.trigger('tick');

    window.requestAnimationFrame(this.tick.bind(this));
  }

  /**
   * Wait for a duration in milliseconds, respecting timeScale
   * @param duration Duration in milliseconds (simulated time)
   */
  wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      let remaining = duration;
      
      const handler = () => {
        // Determine the delta to subtract. 
        // We use this.delta which is the scaled delta of the current frame.
        remaining -= this.delta;

        if (remaining <= 0) {
          this.off('tick', handler);
          resolve();
        }
      };

      this.on('tick', handler);
    });
  }
}
