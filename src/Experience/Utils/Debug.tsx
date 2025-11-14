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
    } else {
      console.log('🐛 Debug UI not active. Add #debug to URL to enable.');
    }
  }

  dispose() {
    if (this.ui) {
      this.ui.destroy();
    }
  }
}
