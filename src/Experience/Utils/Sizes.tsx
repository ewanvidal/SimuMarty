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

    console.log('📐 Sizes initialized - width:', this.width, 'height:', this.height, 'pixelRatio:', this.pixelRatio);

    // Resize event
    window.addEventListener('resize', this.handleResize.bind(this));
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

    console.log('📐 Sizes resized - width:', this.width, 'height:', this.height);

    this.trigger('resize');
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize.bind(this));
    super.dispose();
  }
}
