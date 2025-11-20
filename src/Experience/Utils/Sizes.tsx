import EventEmitter from './EventEmitter.tsx';

/**
 * Sizes
 * Handles viewport dimensions and resize events
 */
export default class Sizes extends EventEmitter {
  width: number;
  height: number;
  pixelRatio: number;
  canvas?: HTMLCanvasElement;
  resizeObserver?: ResizeObserver;
  resizeTimeout?: number;

  constructor(canvas?: HTMLCanvasElement) {
    super();

    this.canvas = canvas;

    // Setup - use canvas parent size if available, otherwise window
    if (canvas && canvas.parentElement) {
      const rect = canvas.parentElement.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
    } else {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    }

    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Resize event
    window.addEventListener('resize', this.handleResize.bind(this));

    // ResizeObserver for parent container changes (e.g., panel width changes)
    if (canvas && canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        // Use requestAnimationFrame for smooth resizing
        if (this.resizeTimeout) {
          cancelAnimationFrame(this.resizeTimeout);
        }
        this.resizeTimeout = requestAnimationFrame(() => {
          this.handleResize();
        });
      });
      this.resizeObserver.observe(canvas.parentElement);
    }
  }

  private handleResize() {
    // Update dimensions from canvas parent if available
    if (this.canvas && this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
    } else {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    }

    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.trigger('resize');
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize.bind(this));
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.resizeTimeout) {
      cancelAnimationFrame(this.resizeTimeout);
    }
    super.dispose();
  }
}
