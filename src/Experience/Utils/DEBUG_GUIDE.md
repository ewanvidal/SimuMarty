# Debug Mode Guide

## Comment activer le Debug UI

1. **Ouvrir votre application** dans le navigateur

   ```
   http://localhost:5173
   ```

2. **Ajouter `#debug` à l'URL**

   ```
   http://localhost:5173/#debug
   ```

3. **Rafraîchir la page** (F5 ou Ctrl+R)

4. **L'interface lil-gui devrait apparaître** en haut à droite de l'écran

## Vérification dans la console

Ouvrez la console du navigateur (F12) et cherchez ces messages :

```
🐛 Debug constructor - hash: #debug active: true
🐛 Debug UI created: [GUI object]
🤖 Marty constructor
🤖 Debug active: true
🤖 Debug UI: [GUI object]
🤖 Debug folder created: [GUI folder]
```

Si vous voyez `active: false`, cela signifie que le hash `#debug` n'est pas
détecté.

## Contrôles disponibles

Dans le panneau **marty** vous trouverez :

### Animations

- **playWalking** - Lance l'animation de marche
- **playWaving** - Lance l'animation de salut
- **stopAnimation** - Arrête l'animation en cours
- **timeScale** (0.1 - 2) - Vitesse de l'animation
- **crossFadeDuration** (0.1 - 2s) - Durée du fondu entre animations

### Mouvement

- **moveSpeed** (0.1 - 3) - Vitesse de déplacement
- **moveFrames** (1 - 60) - Frames de mouvement par cycle
- **cycleFrames** (1 - 180) - Durée totale d'un cycle

### Lumières (panneau **sunLight**)

- **intensity** - Intensité du soleil
- **x, y, z** - Position de la lumière

### Ambient Light

- **ambientIntensity** - Intensité de la lumière ambiante

## Dépannage

### L'UI n'apparaît pas

1. Vérifiez que `#debug` est bien dans l'URL
2. Rafraîchissez la page avec Ctrl+F5 (force refresh)
3. Vérifiez la console pour les messages de debug
4. Assurez-vous que `lil-gui` est bien installé :
   ```bash
   npm list lil-gui
   ```

### L'UI apparaît mais est vide

Si le panneau lil-gui s'affiche mais ne contient rien :

- Vérifiez que Marty charge correctement (messages dans la console)
- Vérifiez que les animations sont disponibles dans le modèle GLTF

### Pour désactiver le debug

Supprimez `#debug` de l'URL et rafraîchissez :

```
http://localhost:5173/
```
