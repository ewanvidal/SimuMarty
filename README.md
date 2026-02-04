SimuMarty 🤖

Simulateur Web 3D du Robot Marty avec React Three Fiber

    Projet de fin d'études - Polytech Dijon 2025-2026
    Natthan GUILLOT & Ewan VIDAL

📋 Description du Projet

SimuMarty est une application web moderne de simulation robotique éducative
permettant aux étudiants d'apprendre la programmation robotique sur un modèle
virtuel 3D du robot Marty. Le projet répond aux défis de l'enseignement de la
robotique : coûts élevés, maintenance complexe, disponibilité limitée et risques
de dommages des équipements physiques.

Le projet est divisé en deux composants complémentaires : 🔧 MartyEngine -
Moteur de Simulation 3D et Physique

Développé par Natthan GUILLOT

Cœur de la simulation robotique comprenant :

    Modèle 3D complet du robot Marty avec rigging et animations Blender
    Moteur physique réaliste (gravité, collisions, équilibre)
    Système de cinématique inverse pour mouvements naturels
    API REST compatible avec le robot Marty réel
    Communication WebSocket temps réel

🎨 MartyStudio - Interface de Programmation 3D Interactive

Développé par Ewan VIDAL

Interface utilisateur immersive comprenant :

    Environnements 3D pédagogiques (labyrinthes, parcours d'obstacles)
    Éditeur de code avec Monaco Editor et programmation visuelle Blockly
    Système de caméra avancé avec vues multiples
    Exercices progressifs et tutoriels interactifs
    Debugger visuel avec visualisation 3D des trajectoires

🚀 Technologies Stack Technique

    Frontend Framework : React 18+ avec TypeScript
    3D Rendering : React Three Fiber (Three.js + React)
    3D Modeling : Blender 3.6+
    Physics Engine : Rapier.js / Cannon.js
    Build Tool : Vite 5+
    Styling : Classic CSS
    Code Editor : Monaco Editor
    Visual Programming : Blockly
    State Management : Zustand / React Context
    API : REST + WebSocket

Bibliothèques Principales

```json
{
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "@react-three/rapier": "^1.x",
  "@monaco-editor/react": "^4.x",
  "blockly": "^10.x",
  "three": "^0.160.x",
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "vite": "^5.x"
}
```

📁 Structure du Projet

```
simumarty/
├── src/
│   ├── engine/                    # MartyEngine (Natthan)
│   │   ├── models/               # Modèles 3D GLTF/GLB
│   │   ├── components/           # Composants React Three Fiber
│   │   │   ├── Robot.tsx        # Composant principal du robot
│   │   │   ├── Articulation.tsx # Contrôle des articulations
│   │   │   └── Physics.tsx      # Système physique
│   │   ├── api/                 # API REST et WebSocket
│   │   │   ├── routes.ts        # Endpoints API
│   │   │   ├── websocket.ts     # Communication temps réel
│   │   │   └── martyCompat.ts   # Compatibilité Marty réel
│   │   ├── animations/          # Système d'animations
│   │   ├── kinematics/          # Cinématique inverse
│   │   └── state/               # Gestion d'état du robot
│   │
│   ├── studio/                   # MartyStudio (Ewan)
│   │   ├── environments/        # Modèles 3D environnements
│   │   ├── components/          # Composants UI
│   │   │   ├── Scene3D.tsx     # Scène principale 3D
│   │   │   ├── CodeEditor.tsx  # Éditeur Monaco
│   │   │   ├── BlocklyEditor.tsx # Éditeur visuel
│   │   │   ├── ControlPanel.tsx # Panneau de contrôle
│   │   │   └── Timeline.tsx    # Timeline d'exécution
│   │   ├── camera/             # Système de caméra
│   │   ├── exercises/          # Exercices pédagogiques
│   │   ├── interpreter/        # Interpréteur de code
│   │   └── ui/                 # Composants UI réutilisables
│   │
│   ├── shared/                  # Code partagé
│   │   ├── types/              # Types TypeScript communs
│   │   ├── utils/              # Utilitaires partagés
│   │   └── constants/          # Constantes globales
│   │
│   ├── App.tsx                 # Application principale
│   └── main.tsx                # Point d'entrée
│
├── public/
│   ├── models/                 # Assets 3D
│   └── textures/               # Textures
│
├── blender/                    # Fichiers sources Blender
│   ├── marty_robot.blend      # Modèle du robot
│   └── environments/          # Environnements sources
│
├── docs/                       # Documentation
│   ├── API.md                 # Documentation API
│   ├── ARCHITECTURE.md        # Architecture du projet
│   └── EXERCISES.md           # Guide des exercices
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

🎯 Fonctionnalités Principales MartyEngine

    ✅ Modèle 3D haute qualité du robot Marty
    ✅ Animations réalistes (marche, rotation, gestes)
    ✅ Contrôle précis de 8+ articulations
    ✅ Physique réaliste avec détection de collisions
    ✅ Cinématique inverse pour mouvements naturels
    ✅ API REST compatible robot Marty réel
    ✅ Communication WebSocket temps réel

MartyStudio

    ✅ Scène 3D interactive avec environnements variés
    ✅ Éditeur de code JavaScript/Python avec autocomplétion
    ✅ Programmation visuelle par blocs (Blockly)
    ✅ Système de caméra avec vues multiples
    ✅ Debugger visuel avec breakpoints
    ✅ Visualisation des trajectoires en temps réel
    ✅ 15+ exercices progressifs
    ✅ Tutoriel interactif pour débutants
    ✅ Sauvegarde et partage de projets
    ✅ Mode sombre/clair
    ✅ Interface responsive (desktop/tablette)

## 🚀 Quick Start

### Méthode 1 : Script de lancement (recommandé)

**Linux/macOS** :
```bash
./start.sh
```

**Windows** :
```cmd
start.bat
```

Ces scripts lancent automatiquement le serveur WebSocket Python et l'application web.

**Prérequis** :
- Node.js 18+
- Python 3.9+
- `pip install websockets`

---

### Méthode 2 : Exécutable Windows (.exe)

Si une release est disponible, téléchargez `SimuMarty-1.0.0-portable.exe` depuis les [Releases](https://github.com/ewanvidal/SimuMarty/releases).

> ⚠️ **Windows Smart App Control** : L'application n'est pas signée numériquement. Si Windows bloque l'exécution :
> - Cliquez sur **"Plus d'infos"** puis **"Exécuter quand même"**
> - Ou : Clic droit sur le fichier → **Propriétés** → cochez **"Débloquer"** → **Appliquer**
> - Ou : Désactivez Smart App Control dans `Sécurité Windows → Contrôle des applications`

**Prérequis** : Python 3.9+ avec le module `websockets` (`pip install websockets`)

---

## 🔧 Installation Développeur

```bash
# Cloner le repository
git clone https://github.com/ewanvidal/SimuMarty.git
cd SimuMarty

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
```

L'application sera accessible sur http://localhost:5173

---

## 📦 Build

```bash
# Build web pour production
npm run build

# Build Electron (.exe Windows)
npm run electron:build
```

L'exécutable sera généré dans `release/SimuMarty-1.0.0-portable.exe`

🎓 Contexte Académique

Établissement : Polytech Dijon Promotion : 70 Année : 2025-2026 Type : Projet de
fin d'études Équipe

Natthan GUILLOT (Natthan)

    📧 natthan.guillot@u-bourgogne.fr
    🔧 Responsable : MartyEngine (Moteur 3D et API)

Ewan VIDAL (Ewan)

    📧 ewan.vidal@u-bourgogne.fr
    🎨 Responsable : MartyStudio (Interface et UX)

Encadrement

    Professeur 1 : Charles MEUNIER
    Professeur 2 : Barthelemy HEYRMAN

🎯 Objectifs Pédagogiques

Ce projet vise à :

- Démocratiser l'apprentissage de la robotique
- Offrir une alternative économique aux robots physiques
- Permettre l'expérimentation sans risque de dommage
- Faciliter l'accès à distance à l'enseignement robotique
- Développer des compétences en : Développement web moderne (React, TypeScript),
  Graphisme 3D (Blender, Three.js), Architecture logicielle, Travail
  collaboratif (Git, Jira)

Ce projet est développé dans un cadre académique à Polytech Dijon. Tous droits
réservés © 2025-2026 Natthan GUILLOT & Ewan VIDAL

📞 Contact

Pour toute question sur le projet :

    📧 natthan.guillot@u-bourgogne.fr
    📧 ewan.vidal@u-bourgogne.fr

Repository : github.com/ewanvidal/simumarty

Made with ❤️ by Natthan & Ewan - Polytech Dijon 2025-2026
