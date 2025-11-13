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
- **WebSocket** : Messages, types, erreurs, configuration
  - `WebSocketMessageType` : Types de messages (ack, heartbeat, smartServos,
    command, etc.)
  - `WebSocketMessage<T>` : Structure de base pour tous les messages
  - Messages spécifiques : `ConnectAckMessage`, `ServosStateMessage`,
    `CommandMessage`, etc.
  - `WebSocketErrorCode` : Codes d'erreur WebSocket
  - `WebSocketConfig` : Configuration de connexion WebSocket

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
  // Types WebSocket
  WebSocketMessage,
  WebSocketMessageType,
  ServosStateMessage,
  CommandMessage,
  AnyWebSocketMessage,
} from '@/shared/types';

// Exemple d'utilisation REST
const walkCommand: WalkParams = {
  numSteps: 4,
  startFoot: 'auto',
  turn: 15,
  stepLength: 30,
  moveTime: 1500,
};

// Exemple d'utilisation WebSocket
const commandMsg: CommandMessage = {
  type: WebSocketMessageType.COMMAND,
  payload: {
    endpoint: ApiEndpoint.TRAJ_KICK,
    params: { side: 'right', twist: 5, moveTime: 2500 },
  },
  timestamp: Date.now(),
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
    "endpoint": "traj/kick",
    "params": {
      "side": "right",
      "twist": 5,
      "moveTime": 2500
    }
  },
  "timestamp": 1729166400000
}
```

Types concernés :
- `WebSocketMessageType.COMMAND` : Type de message commande
- `CommandMessage` : Structure du message
- `ApiEndpoint` : Endpoints REST disponibles
- `WalkParams`, `KickParams`, etc. : Paramètres de commandes
- `RestParams` : Paramètres génériques

#### Messages de l'Engine → Studio (Télémétrie)

##### Accusé de réception (ack)

```json
{
  "type": "ack",
  "payload": {
    "status": "connected",
    "serverVersion": "1.0.0",
    "subscriptionRate": 10
  },
  "timestamp": 1729166400000
}
```

Type : `ConnectAckMessage`

##### Publication périodique des servos (10 Hz par défaut)

```json
{
  "type": "smartServos",
  "payload": [
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

Type : `ServosStateMessage`

##### État du robot (10 Hz)

```json
{
  "type": "robotStatus",
  "payload": {
    "flags": 0,
    "workQCount": 2,
    "isMoving": true,
    "isPaused": false,
    "isFwUpdating": false
  },
  "timestamp": 1729166400000
}
```

Type : `RobotStatusMessage`

##### Accéléromètre (10 Hz)

```json
{
  "type": "accel",
  "payload": {
    "x": 0.02,
    "y": 0.98,
    "z": 0.01
  },
  "timestamp": 1729166400000
}
```

Type : `AccelMessage`

##### Batterie et alimentation (1 Hz)

```json
{
  "type": "powerStatus",
  "payload": {
    "battRemainCapacityPercent": 87,
    "battTempDegC": 28.5,
    "battCurrentMA": -150,
    "powerUSBIsConnected": false,
    "power5VIsOn": true
  },
  "timestamp": 1729166400000
}
```

Type : `PowerStatusMessage`

##### Métriques système (1 Hz)

```json
{
  "type": "systemStatus",
  "payload": {
    "heapFree": 45120,
    "heapMin": 32768,
    "loopMsAvg": 12.5,
    "loopMsMax": 18.2,
    "cpuLoad": 35.7,
    "uptime": 3600
  },
  "timestamp": 1729166400000
}
```

Type : `SystemStatusMessage`

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
