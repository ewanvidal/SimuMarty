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

    console.log('🐛 Debug constructor - hash:', window.location.hash, 'active:', this.active);

    if (this.active) {
      this.ui = new GUI();
      console.log('🐛 Debug UI created:', this.ui);
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
