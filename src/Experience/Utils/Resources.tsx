import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import EventEmitter from './EventEmitter.tsx';
import type { Source } from '../sources.tsx';

/**
 * Resources
 * Handles loading of all assets
 */
export default class Resources extends EventEmitter {
  sources: Source[];
  items: { [key: string]: GLTF | THREE.Texture | THREE.CubeTexture } = {};
  toLoad: number;
  loaded: number = 0;
  loaders: {
    gltfLoader?: GLTFLoader;
    textureLoader?: THREE.TextureLoader;
    cubeTextureLoader?: THREE.CubeTextureLoader;
  } = {};

  constructor(sources: Source[]) {
    super();

    this.sources = sources;
    this.toLoad = this.sources.length;

    this.setLoaders();
    this.startLoading();

    // If no sources, trigger ready immediately (asynchronously to allow listeners to register)
    if (this.toLoad === 0) {
      setTimeout(() => {
        this.trigger('ready');
      }, 0);
    }
  }

  private setLoaders() {
    this.loaders.gltfLoader = new GLTFLoader();
    this.loaders.textureLoader = new THREE.TextureLoader();
    this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader();
  }

  private startLoading() {
    // Load each source
    for (const source of this.sources) {
      if (source.type === 'gltfModel' && this.loaders.gltfLoader) {
        this.loaders.gltfLoader.load(source.path as string, (file) => {
          this.sourceLoaded(source, file);
        });
      } else if (source.type === 'texture' && this.loaders.textureLoader) {
        this.loaders.textureLoader.load(source.path as string, (file) => {
          this.sourceLoaded(source, file);
        });
      } else if (
        source.type === 'cubeTexture' &&
        this.loaders.cubeTextureLoader
      ) {
        this.loaders.cubeTextureLoader.load(source.path as string[], (file) => {
          this.sourceLoaded(source, file);
        });
      }
    }
  }

  private sourceLoaded(
    source: Source,
    file: GLTF | THREE.Texture | THREE.CubeTexture,
  ) {
    this.items[source.name] = file;
    this.loaded++;

    if (this.loaded === this.toLoad) {
      this.trigger('ready');
    }
  }

  dispose() {
    // Dispose of loaded resources
    for (const key in this.items) {
      const item = this.items[key];
      if ('dispose' in item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    super.dispose();
  }
}
