# Experience Architecture

Cette architecture suit le pattern Three.js class-based popularisé par Bruno Simon, adapté pour TypeScript et React.

## Structure

```
src/Experience/
├── Experience.ts           # Classe principale qui orchestre tout
├── Camera.ts              # Gestion de la caméra et des contrôles
├── Renderer.ts            # Configuration du WebGL renderer
├── sources.ts             # Définition des assets à charger
├── Utils/
│   ├── Debug.ts          # Interface de debug (lil-gui)
│   ├── EventEmitter.ts   # Système d'événements personnalisés
│   ├── Resources.ts      # Chargement des assets (modèles, textures)
│   ├── Sizes.ts          # Gestion des dimensions du viewport
│   └── Time.ts           # Boucle d'animation et timing
└── World/
    ├── World.ts          # Container pour tous les objets 3D
    ├── Environment.ts    # Lumières et environnement
    ├── Floor.ts          # Sol
    └── Marty.ts          # Le robot Marty
```

## Principes

### 1. Singleton Pattern
L'instance `Experience` est accessible globalement via `window.experience`, permettant à toutes les classes d'y accéder facilement.

### 2. Event-Driven
- `Sizes` émet un événement `resize` lors du redimensionnement
- `Time` émet un événement `tick` à chaque frame
- `Resources` émet un événement `ready` quand tous les assets sont chargés

### 3. Separation of Concerns
Chaque classe a une responsabilité unique :
- **Experience** : orchestration générale
- **Camera** : gestion de la caméra
- **Renderer** : rendu WebGL
- **World** : contient les objets 3D
- **Utils** : services partagés

## Utilisation

### Dans un composant React

```tsx
import { useEffect, useRef } from 'react';
import Experience from './Experience/Experience';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const experienceRef = useRef<Experience | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialiser l'expérience
    experienceRef.current = new Experience(canvasRef.current);

    // Cleanup
    return () => {
      experienceRef.current?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="webgl" />;
}
```

### Ajouter des assets

Dans `sources.ts` :

```typescript
export const sources: Source[] = [
  {
    name: 'martyModel',
    type: 'gltfModel',
    path: '/models/marty.glb'
  },
  {
    name: 'floorTexture',
    type: 'texture',
    path: '/textures/floor/color.jpg'
  }
];
```

### Ajouter un nouvel objet 3D

1. Créer une classe dans `World/` (ex: `Labyrinth.ts`)
2. L'instancier dans `World.ts` après le chargement des ressources
3. Appeler sa méthode `update()` si nécessaire

### Debug

Ajouter `#debug` à l'URL pour activer l'interface de debug (lil-gui).

## Avantages

✅ **Modulaire** : Chaque fonctionnalité est isolée
✅ **Maintenable** : Code organisé et facile à comprendre
✅ **Scalable** : Facile d'ajouter de nouveaux objets/fonctionnalités
✅ **TypeScript** : Type-safe avec auto-complétion
✅ **Performance** : Une seule boucle d'animation pour tout
✅ **Clean Disposal** : Libération propre des ressources

## Installation des dépendances

```bash
npm install three @types/three lil-gui
```

## Prochaines étapes

- [ ] Charger le modèle 3D de Marty
- [ ] Ajouter le labyrinthe
- [ ] Implémenter les animations du robot
- [ ] Connecter avec l'API WebSocket
- [ ] Ajouter les contrôles de simulation
