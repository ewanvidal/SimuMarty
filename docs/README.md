# Documentation API SimuMarty

Documentation complète des APIs REST et WebSocket de MartyEngine.

## 📁 Fichiers

### Spécifications API

- **`api-rest.yaml`** - Spécification OpenAPI 3.0 pour l'API REST
- **`api-websocket.yaml`** - Spécification AsyncAPI 2.5 pour l'API WebSocket
- **`api-viewer.html`** - Visualiseur interactif de l'API REST (Swagger UI)
- **`api-websocket-viewer.html`** - Visualiseur interactif de l'API WebSocket (AsyncAPI)

## 🚀 Utilisation

### Visualiser les API localement

#### Option 1 : Serveur HTTP simple

```bash
# Depuis le dossier docs/
python -m http.server 8080

# Ou avec Node.js
npx http-server -p 8080
```

Puis ouvrez :
- REST API : http://localhost:8080/api-viewer.html
- WebSocket API : http://localhost:8080/api-websocket-viewer.html

#### Option 2 : Live Server (VS Code)

1. Installez l'extension "Live Server"
2. Clic droit sur `api-viewer.html` ou `api-websocket-viewer.html`
3. Sélectionnez "Open with Live Server"

### Génération de code client

#### REST API (depuis `api-rest.yaml`)

```bash
# JavaScript/TypeScript
npx @openapitools/openapi-generator-cli generate \
  -i api-rest.yaml \
  -g typescript-axios \
  -o ../src/generated/api-client

# Python
openapi-generator generate \
  -i api-rest.yaml \
  -g python \
  -o ./client-python
```

#### WebSocket API (depuis `api-websocket.yaml`)

```bash
# Générer la documentation
npm install -g @asyncapi/cli
asyncapi generate fromTemplate api-websocket.yaml @asyncapi/html-template -o ./asyncapi-docs
```

## 📚 Compatibilité avec MartyPy

Les deux APIs sont **100% compatibles** avec l'API officielle **MartyPy v3.6+** :

### API REST

Basée sur les endpoints RIC (Robotical Interface Controller) :
- ✅ Endpoints : `/traj/walk`, `/traj/kick`, `/traj/lean`, etc.
- ✅ Paramètres : `WalkParams`, `KickParams`, `LeanParams`
- ✅ Réponses : `RicResponse`, `PowerStatus`, `RobotStatus`
- ✅ Articulations : 9 servos (IDs 0-8) avec noms exacts MartyPy

### API WebSocket

Basée sur ROS Serial topics de MartyPy :
- ✅ Topics : `smartServos`, `accel`, `powerStatus`, `robotStatus`, `addOns`
- ✅ Fréquence : 10 Hz par défaut (configurable)
- ✅ Messages : `JointInfo`, `AccelerometerReading`, `PowerStatus`
- ✅ Commandes : Format endpoint + params identique à REST

## 🔗 Référence Types TypeScript

Les types TypeScript correspondants se trouvent dans `../src/shared/types/` :

```typescript
import type {
  // Robot Marty
  JointID,
  JointInfo,
  RobotStatus,
  PowerStatus,
  WalkParams,
  KickParams,

  // API REST
  ApiEndpoint,
  RicResponse,

  // WebSocket
  WebSocketMessageType,
  CommandMessage,
  ServosStateMessage,
  RobotStatusMessage,
  AccelMessage,
  PowerStatusMessage,
} from '@/shared/types';
```

## 📖 Structure des APIs

### REST API - Endpoints principaux

| Endpoint                    | Méthode | Description                      |
|-----------------------------|---------|----------------------------------|
| `/robot/state`              | GET     | État complet du robot            |
| `/robot/move`               | POST    | Envoyer une commande             |
| `/robot/joints/{jointId}`   | PUT     | Contrôler une articulation       |
| `/robot/stop`               | POST    | Arrêt d'urgence                  |
| `/robot/reset`              | POST    | Réinitialiser                    |
| `/simulation/start`         | POST    | Démarrer simulation              |
| `/simulation/status`        | GET     | Statut simulation                |
| `/health`                   | GET     | Santé service + métriques système|

### WebSocket API - Channels principaux

| Channel                | Direction       | Description                      |
|------------------------|-----------------|----------------------------------|
| `system/connect`       | Server → Client | Connexion établie                |
| `system/heartbeat`     | Bidirectionnel  | Keep-alive                       |
| `robot/command`        | Client → Server | Envoyer commande                 |
| `robot/ack`            | Server → Client | Accusé réception                 |
| `robot/servos`         | Server → Client | État servos (10 Hz)              |
| `robot/status`         | Server → Client | Statut robot (10 Hz)             |
| `robot/accel`          | Server → Client | Accéléromètre (10 Hz)            |
| `robot/power`          | Server → Client | Batterie (1 Hz)                  |
| `robot/addons`         | Server → Client | Add-ons (10 Hz)                  |
| `system/status`        | Server → Client | Métriques système (1 Hz)         |
| `system/error`         | Server → Client | Notifications d'erreur           |

## 🧪 Exemples

### REST - Faire marcher le robot

```bash
curl -X POST http://localhost:5173/api/robot/move \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "traj/step",
    "params": {
      "numSteps": 4,
      "startFoot": "auto",
      "turn": 15,
      "stepLength": 30,
      "moveTime": 1500
    }
  }'
```

### WebSocket - Recevoir état servos

```javascript
const ws = new WebSocket('ws://localhost:5173/ws');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'smartServos') {
    console.log('Servos:', msg.payload);
    // payload = array of 9 JointInfo
  }
};
```

### WebSocket - Envoyer commande

```javascript
ws.send(JSON.stringify({
  type: 'command',
  payload: {
    endpoint: 'traj/kick',
    params: {
      side: 'right',
      twist: 5,
      moveTime: 2500
    }
  },
  timestamp: Date.now()
}));
```

## 🔧 Développement

### Valider les spécifications

```bash
# Valider OpenAPI
npx @openapitools/openapi-generator-cli validate -i api-rest.yaml

# Valider AsyncAPI
asyncapi validate api-websocket.yaml
```

### Convertir YAML → JSON

```bash
# REST API
npx js-yaml api-rest.yaml > api-rest.json

# WebSocket API
npx js-yaml api-websocket.yaml > api-websocket.json
```

## 📞 Support

Pour questions ou problèmes :
- GitHub Issues : [SimuMarty Issues](https://github.com/ewanvidal/SimuMarty/issues)
- Documentation types : `../src/shared/types/README.md`
- MartyPy officiel : https://github.com/robotical/martypy
