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

  constructor() {
    super();

    // Setup
    this.start = Date.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 16; // ~60fps default

    this.tick();
  }

  private tick() {
    const currentTime = Date.now();
    this.delta = currentTime - this.current;
    this.current = currentTime;
    this.elapsed = this.current - this.start;

    this.trigger('tick');

    window.requestAnimationFrame(this.tick.bind(this));
  }
}
