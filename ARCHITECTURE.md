# Architecture Three.js - Guide de Migration

## ✅ Structure créée

Votre projet dispose maintenant d'une architecture Three.js professionnelle et scalable :

```
src/Experience/
├── Experience.ts              # Classe principale
├── Camera.ts                  # Gestion caméra + OrbitControls
├── Renderer.ts                # WebGL renderer
├── sources.ts                 # Définition des assets
├── index.ts                   # Exports centralisés
├── README.md                  # Documentation détaillée
│
├── Utils/
│   ├── EventEmitter.ts       # Système d'événements
│   ├── Sizes.ts              # Gestion viewport/resize
│   ├── Time.ts               # Boucle d'animation
│   ├── Resources.ts          # Chargement assets (GLTF, textures)
│   └── Debug.ts              # Interface debug (lil-gui)
│
└── World/
    ├── World.ts              # Container objets 3D
    ├── Environment.ts        # Lumières + environment map
    ├── Floor.ts              # Sol
    └── Marty.ts              # Robot (placeholder)
```

## 🎯 Comment utiliser

### 1. Option Simple - Composant React

Utilisez le composant `ExperienceCanvas` :

```tsx
import { ExperienceCanvas } from './components/ExperienceCanvas';

function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ExperienceCanvas />
    </div>
  );
}
```

### 2. Voir l'exemple complet

Un exemple d'intégration avec l'éditeur Monaco est disponible dans :
- `src/App.example.tsx` - Split view avec 3D + éditeur

### 3. Remplacer votre App.tsx actuel

Si vous voulez utiliser la nouvelle architecture :

```bash
# Sauvegarder l'ancien
mv src/App.tsx src/App.old.tsx

# Utiliser le nouveau
mv src/App.example.tsx src/App.tsx
```

## 🔧 Personnalisation

### Ajouter des modèles 3D

Dans `src/Experience/sources.ts` :

```typescript
export const sources: Source[] = [
  {
    name: 'martyModel',
    type: 'gltfModel',
    path: '/models/marty.glb'
  },
  {
    name: 'labyrinthModel',
    type: 'gltfModel',
    path: '/models/labyrinth.glb'
  }
];
```

Puis dans `World/Marty.ts` :

```typescript
private setModel() {
  this.model = this.resources.items.martyModel.scene;
  this.model.scale.set(0.5, 0.5, 0.5);
  this.scene.add(this.model);
}
```

### Créer un nouvel objet 3D

1. Créer `src/Experience/World/Labyrinth.ts`
2. Suivre le même pattern que `Floor.ts` ou `Marty.ts`
3. L'instancier dans `World.ts` :

```typescript
import Labyrinth from './Labyrinth';

export default class World {
  labyrinth?: Labyrinth;
  
  constructor() {
    // ...
    this.resources.on('ready', () => {
      this.floor = new Floor();
      this.labyrinth = new Labyrinth();  // ✅
      this.marty = new Marty();
      this.environment = new Environment();
    });
  }
}
```

### Activer le Debug

Ajoutez `#debug` à l'URL :
```
http://localhost:5173/#debug
```

Une interface GUI (lil-gui) apparaîtra pour ajuster les paramètres en temps réel.

## 🎨 Avantages de cette architecture

| Avantage | Description |
|----------|-------------|
| **Modulaire** | Chaque classe a une responsabilité unique |
| **Type-safe** | TypeScript avec auto-complétion complète |
| **Performance** | Une seule boucle d'animation pour tout |
| **Scalable** | Facile d'ajouter des fonctionnalités |
| **Maintenable** | Code organisé et documenté |
| **Clean Disposal** | Libération propre des ressources |

## 📦 Dépendances installées

- ✅ `three` (déjà installé)
- ✅ `@types/three` (déjà installé)
- ✅ `lil-gui` (nouvellement installé)

## 🚀 Prochaines étapes suggérées

1. **Migrer vos composants existants**
   - Adapter `Floor.tsx` → `Experience/World/Floor.ts`
   - Adapter `Marty.tsx` → `Experience/World/Marty.ts`
   - Adapter `Labyrinth.tsx` → `Experience/World/Labyrinth.ts`

2. **Charger les vrais modèles**
   - Ajouter les chemins dans `sources.ts`
   - Utiliser les assets dans les classes World

3. **Ajouter l'interactivité**
   - Créer des méthodes pour contrôler Marty
   - Connecter avec l'API WebSocket
   - Synchroniser avec l'éditeur de code

4. **Optimiser**
   - Ajouter des contrôles debug
   - Implémenter le loading screen
   - Gérer les performances

## 💡 Comparaison React Three Fiber vs Vanilla Three.js

| Aspect | R3F (avant) | Vanilla (maintenant) |
|--------|-------------|----------------------|
| Performance | Bon | Excellent |
| Contrôle | Déclaratif | Impératif |
| Complexité | React hooks | Classes OOP |
| Debugging | Difficile | Plus facile |
| Animation | useFrame | RAF natif |

Cette architecture est **idéale pour** :
- ✅ Projets complexes avec beaucoup de logique 3D
- ✅ Besoins de performance maximale
- ✅ Code partagé avec des projets non-React
- ✅ Contrôle précis du rendu

## 📚 Ressources

- [Three.js Documentation](https://threejs.org/docs/)
- [Bruno Simon's Course](https://threejs-journey.com/)
- [Experience README](./src/Experience/README.md)

---

**Note** : Vos anciens composants React Three Fiber (`Floor.tsx`, `Marty.tsx`) sont toujours dans `src/components/` et peuvent coexister avec la nouvelle architecture si besoin.
