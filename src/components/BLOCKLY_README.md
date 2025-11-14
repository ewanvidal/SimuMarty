# Blockly Integration - Documentation

## Vue d'ensemble

L'éditeur de code supporte maintenant deux modes :

- **Monaco Editor** : Éditeur de code Python traditionnel
- **Blockly Editor** : Programmation visuelle par blocs

## Fonctionnalités

### Basculement entre les éditeurs

Un bouton permet de basculer entre les deux modes :

- 🧩 **Switch to Blockly** : Passer en mode visuel
- 📝 **Switch to Code** : Retour au mode texte

**Important** : Le code est conservé en mémoire lors du basculement entre les
modes.

### Blocs Marty disponibles

#### Catégorie "Marty"

- **marty.walk(steps)** : Fait marcher Marty un nombre de pas donné
- **marty.wave()** : Fait saluer Marty
- **marty.stop()** : Arrête tous les mouvements de Marty

#### Catégories standard Blockly

1. **Logic** : Conditions, comparaisons, opérateurs logiques
2. **Loops** :
   - Répéter N fois
   - Boucles while/until
   - Boucles for avec compteur
3. **Math** : Nombres et opérations mathématiques
4. **Variables** : Création et utilisation de variables

## Utilisation

### Mode Blockly

1. Cliquez sur "Switch to Blockly"
2. Sélectionnez une catégorie dans la barre de gauche
3. Glissez-déposez les blocs dans l'espace de travail
4. Connectez les blocs pour créer votre programme
5. Cliquez sur "Run Code" pour exécuter

### Exemple de programme

```
Répéter 3 fois
  └─ marty.walk(2)
  └─ marty.wave()
```

Ce programme fera marcher Marty 2 pas puis saluer, 3 fois de suite.

## Architecture technique

### Composants

- **CodeEditor.tsx** : Composant principal gérant le basculement
- **BlocklyEditor.tsx** : Wrapper React pour Blockly
- **BlocklyEditor.css** : Styles personnalisés pour Blockly

### Gestion de l'état

- `monacoCode` : Code Python stocké pour Monaco
- `blocklyXml` : État XML des blocs Blockly
- `currentCode` : Code actuellement actif (selon le mode)

### Génération de code

Blockly génère automatiquement le code Python équivalent aux blocs visuels, qui
peut ensuite être exécuté de la même manière que le code écrit manuellement.

## Dépendances

- `blockly` : ^11.x (bibliothèque principale)
- Générateur Python intégré pour la conversion blocs → code
