# Types TypeScript Partagés - SimuMarty

Types TypeScript basés sur l'API officielle **MartyPy v3.6+** pour le robot
Marty V2.

##  Références

- [MartyPy GitHub Repository](https://github.com/robotical/martypy)
- [Marty V2 Python Function Reference](https://userguides.robotical.io/martyv2/documentation/python_function_reference)
- [RIC (Robotical Interface Controller) API](https://userguides.robotical.io/martyv2/userguides/python/marty_python_wifi_overview)

##  Organisation

### 1. `marty.types.ts`

**Types de base du robot Marty** - Basé sur `martypy.Marty` et
`martypy.ClientGeneric`

- **Constantes** :
  - `JointID` : IDs des 9 servos (0-8)
  - `JointStatus` : Flags de statut des articulations
  - `StopType` : Types d'arrêt du robot
  - `Side` : Directions (left, right, forward, back, auto)
  - `EyePose` : Poses prédéfinies des yeux
  - `AccelAxis` : Axes de l'accéléromètre

- **Interfaces** :
  - `JointInfo` : Informations sur une articulation
  - `RobotStatus` : État global du robot
  - `PowerStatus` : État batterie et alimentation
  - `WalkParams`, `KickParams`, `LeanParams`, etc. : Paramètres des commandes de
    mouvement

### 2. `api.types.ts`

**Types pour l'API REST et WebSocket** - Basé sur RIC (Robotical Interface
Controller)

- **Endpoints REST** : `/traj/walk`, `/traj/kick`, `/led/{name}/color`, etc.
- **Réponses RIC** : `RicResponse`, `HwStatusResponse`, `SystemInfo`
- **ROS Serial** : Topics, publications périodiques (servos, accel, power,
  status)
- **Connexion** : Configuration WiFi/USB/Exp/Test

### 3. `sensors.types.ts`

**Types pour les capteurs et add-ons**

- **Add-ons** : IR Foot, Color Sensor, Distance, Disco LEDs (eyes, arms, feet)
- **Disco LEDs** : Couleurs, patterns, régions
- **Capteurs** : Color sensor, IR, distance

### 4. `simulator.types.ts`

**Types spécifiques au simulateur 3D** (non présents dans MartyPy)

- **Environnements** : Empty, Classroom, Maze, Obstacle Course, Playground
- **Physique** : Matériaux, collisions, gravité
- **Caméra** : Modes (free, follow, orbit, first-person, etc.)
- **Objets 3D** : Position, rotation, géométrie, propriétés physiques

##  Utilisation

```typescript
// Import depuis le point d'entrée principal
import type {
  JointID,
  WalkParams,
  RobotStatus,
  ApiEndpoint,
  DiscoColor,
  EnvironmentType,
} from '@/shared/types';

// Exemple d'utilisation
const walkCommand: WalkParams = {
  numSteps: 4,
  startFoot: 'auto',
  turn: 15,
  stepLength: 30,
  moveTime: 1500,
};

// Accès aux constantes
const leftKneeId = JointID.LEFT_KNEE; // 2
const redColor = DiscoColor.RED; // 'red'
```

## 📡 Formats de Données Échangées

### Communication MartyEngine ↔ MartyStudio

La communication entre **MartyEngine** (moteur de simulation 3D) et **MartyStudio** (interface utilisateur) utilise **JSON** via **WebSocket**.

#### Format de Message Générique

```typescript
interface WebSocketMessage {
  type: string;           // Type de message (voir RosSerialMessage)
  payload: unknown;       // Données spécifiques au type
  timestamp: number;      // Timestamp en ms
}
```

#### Messages du Studio → Engine (Commandes)

```json
{
  "type": "command",
  "payload": {
    "endpoint": "traj/walk",
    "params": {
      "numSteps": 4,
      "turn": 15,
      "stepLength": 30,
      "moveTime": 1500
    }
  },
  "timestamp": 1729166400000
}
```

Types concernés :
- `ApiEndpoint` : endpoints REST disponibles
- `WalkParams`, `KickParams`, etc. : paramètres de commandes
- `RestParams` : paramètres génériques

#### Messages de l'Engine → Studio (État)

##### Publication périodique des servos (10 Hz par défaut)

```json
{
  "topic": "smartServos",
  "servos": [
    {
      "IDNo": 0,
      "name": "left hip",
      "pos": 45.2,
      "current": 120,
      "enabled": true,
      "commsOK": true,
      "flags": 129
    }
  ],
  "timestamp": 1729166400000
}
```

Type : `ServosPublication`

##### État du robot

```json
{
  "topic": "robotStatus",
  "status": {
    "flags": 0,
    "workQCount": 2,
    "isMoving": true,
    "isPaused": false,
    "isFwUpdating": false,
    "loopMsAvg": 12.5,
    "loopMsMax": 18.2
  },
  "timestamp": 1729166400000
}
```

Type : `RobotStatusPublication`

##### Accéléromètre

```json
{
  "topic": "accel",
  "x": 0.02,
  "y": 0.98,
  "z": 0.01,
  "timestamp": 1729166400000
}
```

Type : `AccelPublication`

##### Batterie et alimentation

```json
{
  "topic": "powerStatus",
  "power": {
    "battRemainCapacityPercent": 87,
    "battTempDegC": 28.5,
    "battCurrentMA": -150,
    "powerUSBIsConnected": false,
    "power5VIsOn": true
  },
  "timestamp": 1729166400000
}
```

Type : `PowerPublication`

#### Configuration de la Connexion

```typescript
const config: ConnectionConfig = {
  method: 'wifi',              // 'wifi' | 'usb' | 'exp' | 'test'
  locator: '192.168.1.100',    // IP ou port série
  blocking: false,             // Mode asynchrone
  subscribeRateHz: 10,         // 10 publications/seconde
};
```

#### Sérialisation JSON

**Toutes les communications utilisent JSON** :
- ✅ Sérialisation native avec `JSON.stringify()`
- ✅ Désérialisation avec `JSON.parse()`
- ✅ Types TypeScript garantissent la structure des données
- ✅ Validation optionnelle avec Zod/Yup (recommandé en production)

**Exemple d'envoi depuis MartyStudio** :

```typescript
import type { WalkParams, ApiEndpoint } from '@/shared/types';

const walkCmd: WalkParams = {
  numSteps: 4,
  startFoot: 'auto',
  turn: 15,
};

websocket.send(JSON.stringify({
  type: 'command',
  payload: {
    endpoint: ApiEndpoint.TRAJ_WALK,
    params: walkCmd,
  },
  timestamp: Date.now(),
}));
```

**Exemple de réception dans MartyEngine** :

```typescript
import type { ServosPublication } from '@/shared/types';

websocket.on('message', (data) => {
  const message = JSON.parse(data) as ServosPublication;
  
  if (message.topic === 'smartServos') {
    updateServoVisuals(message.servos);
  }
});
```

### Avantages du Format JSON

- 🔄 **Interopérable** : Compatible avec tout langage/framework
- 📝 **Lisible** : Facile à déboguer et inspecter
- 🚀 **Performant** : Parsing natif ultra-rapide en JavaScript
- 🔒 **Type-safe** : Les types TypeScript garantissent la structure
- 🧪 **Testable** : Mock et validation simplifiés

## ⚙️ Conventions TypeScript

### Compatibilité avec `tsconfig.json` strict

Notre configuration active :

- `verbatimModuleSyntax: true` → **Toujours utiliser `import type`**
- `erasableSyntaxOnly: true` → **Pas d'`enum`, uniquement `const` objects**

### Patterns utilisés

```typescript
// ✅ CORRECT : const object avec as const
export const Side = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

export type Side = (typeof Side)[keyof typeof Side];

// ✅ CORRECT : import type
import type { JointInfo } from './marty.types';

// ❌ INCORRECT : enum (non compatible)
enum Side {
  LEFT = 'left',
  RIGHT = 'right',
}

// ❌ INCORRECT : import sans type
import { JointInfo } from './marty.types';
```

### Règles de nommage

- **Types/Interfaces** : `PascalCase` (`RobotStatus`, `WalkParams`)
- **Constantes** : `PascalCase` pour les objets (`JointID`, `Side`)
- **Propriétés** : `camelCase` (`moveTime`, `numSteps`)
- **Valeurs** : `snake_case` ou descriptif (`'left_hip'`, `'traj/walk'`)

##  Différences SimuMarty vs Marty Réel

Les types dans `simulator.types.ts` sont **spécifiques au simulateur** et
n'existent pas sur le robot réel :

| Simulator         | Marty Réel             |
| ----------------- | ---------------------- |
| `EnvironmentType` | N/A (robot physique)   |
| `CameraMode`      | N/A (pas de caméra 3D) |
| `PhysicsMaterial` | N/A (physique réelle)  |

Tous les autres types (`marty.types.ts`, `api.types.ts`, `sensors.types.ts`)
correspondent exactement à l'API MartyPy.
