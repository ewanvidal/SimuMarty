/**
 * Event Emitter
 * Handles custom events throughout the experience
 */
export default class EventEmitter {
  private callbacks: { [key: string]: Array<(...args: unknown[]) => void> } =
    {};

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
    return this;
  }

  off(event: string, callback?: (...args: unknown[]) => void) {
    if (!this.callbacks[event]) return this;

    if (callback) {
      this.callbacks[event] = this.callbacks[event].filter(
        (cb) => cb !== callback,
      );
    } else {
      delete this.callbacks[event];
    }
    return this;
  }

  trigger(event: string, ...args: unknown[]) {
    if (!this.callbacks[event]) return this;

    this.callbacks[event].forEach((callback) => {
      callback(...args);
    });
    return this;
  }

  dispose() {
    this.callbacks = {};
  }
}
