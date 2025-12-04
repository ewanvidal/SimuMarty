import Floor from './Floor.tsx';
import Environment from './Environment.tsx';
import Marty from './Marty.tsx';
import { SCENE_PRESETS, type ScenePreset } from '../../shared/constants/scenePresets.ts';

interface SceneDirectorDeps {
  floor?: Floor;
  environment?: Environment;
  marty?: Marty;
}

export default class SceneDirector {
  private floor?: Floor;
  private environment?: Environment;
  private marty?: Marty;

  constructor(deps: SceneDirectorDeps) {
    this.floor = deps.floor;
    this.environment = deps.environment;
    this.marty = deps.marty;
  }

  applyScenePreset(presetId?: string | null) {
    if (!presetId) {
      this.applyPreset(undefined);
      return;
    }

    const preset = SCENE_PRESETS[presetId];
    if (!preset) {
      console.warn(`Unknown scene preset: ${presetId}`);
      this.applyPreset(undefined);
      return;
    }

    this.applyPreset(preset);
  }

  private applyPreset(preset?: ScenePreset) {
    this.floor?.applyPreset(preset?.floor ?? null);
    this.environment?.applyPreset(preset?.lighting ?? null);
    this.marty?.applyTransformPreset(preset?.marty);
  }
}
