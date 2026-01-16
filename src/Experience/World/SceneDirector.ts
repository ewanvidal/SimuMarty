import Floor from './Floor.tsx';
import Environment from './Environment.tsx';
import Marty from './Marty.tsx';
import type Camera from '../Camera.tsx';
import { SCENE_PRESETS, type ScenePreset } from '../../shared/constants/scenePresets.ts';

interface SceneDirectorDeps {
  floor?: Floor;
  environment?: Environment;
  marty?: Marty;
  camera?: Camera;
}

export default class SceneDirector {
  private floor?: Floor;
  private environment?: Environment;
  private marty?: Marty;
  private camera?: Camera;

  constructor(deps: SceneDirectorDeps) {
    this.floor = deps.floor;
    this.environment = deps.environment;
    this.marty = deps.marty;
    this.camera = deps.camera;
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
    console.log('[SceneDirector] Applying preset:', preset?.id, 'marty config:', preset?.marty);
    this.floor?.applyPreset(preset?.floor ?? null);
    this.environment?.applyPreset(preset?.lighting ?? null);
    this.marty?.applyTransformPreset(preset?.marty);
    
    // Update camera target to follow Marty's new position
    const martyPos = preset?.marty?.position ?? [0, 0, 0];
    this.camera?.setTarget(martyPos[0], martyPos[1], martyPos[2]);
  }
}
