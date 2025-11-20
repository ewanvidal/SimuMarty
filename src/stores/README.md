# State Management with Zustand

This application uses [Zustand](https://github.com/pmndrs/zustand) for centralized state management.

## Store Location

`src/stores/appStore.ts`

## State Structure

The store manages the following state:

### Environment & Level
- `selectedEnvironment`: Current 3D environment
- `selectedLevel`: Current difficulty level
- Actions: `setEnvironment()`, `setLevel()`

### Code Editor
- `editorMode`: 'monaco' | 'blockly'
- `monacoCode`: Python code content
- `blocklyXml`: Blockly workspace XML
- `currentCode`: Current code to execute
- Actions: `setEditorMode()`, `toggleEditorMode()`, `updateCode()`, etc.

### Settings
- `showSettings`: Settings panel visibility
- `debugGrid`: Show debug grid toggle
- `enableShadows`: Enable shadows toggle
- `showFPS`: Show FPS counter toggle
- `graphicsQuality`: 'low' | 'medium' | 'high'
- Actions: `toggleSettings()`, `setDebugGrid()`, `setEnableShadows()`, etc.

### WebSocket
- `wsConnected`: WebSocket connection status
- Actions: `setWsConnected()`

## Usage

```typescript
import { useAppStore } from '../stores/appStore.ts';

function MyComponent() {
  const { selectedEnvironment, setEnvironment } = useAppStore();
  
  // Use state and actions directly
  const handleChange = () => {
    setEnvironment('playground');
  };
  
  return <div>{selectedEnvironment}</div>;
}
```

## Benefits

- No prop drilling - any component can access global state
- Type-safe with TypeScript
- Minimal boilerplate
- Excellent performance with automatic re-render optimization
- Easy to debug with browser devtools
