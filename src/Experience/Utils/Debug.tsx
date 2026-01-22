import { GUI } from 'lil-gui';

/**
 * Debug
 * Handles debug UI with lil-gui
 */
export default class Debug {
  active: boolean;
  ui?: GUI;

  constructor() {
    this.active = window.location.hash === '#debug';

    if (this.active) {
      this.ui = new GUI();
    }
  }

  dispose() {
    if (this.ui) {
      this.ui.destroy();
    }
  }
}
