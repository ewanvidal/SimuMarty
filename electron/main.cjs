const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;
let pythonProcess = null;

// WebSocket server port
const WS_PORT = 8765;

// Determine if we're in development or production
const isDev = !app.isPackaged;

/**
 * Find Python executable using simple file existence checks
 * Avoids execSync which can trigger security software
 */
function findPythonExecutable() {
  const possiblePaths = [
    // Windows Python Launcher (most reliable on Windows)
    'py',
    // Standard Python commands
    'python',
    'python3',
    // Common Windows installation paths
    path.join(
      process.env.LOCALAPPDATA || '',
      'Programs',
      'Python',
      'Python312',
      'python.exe',
    ),
    path.join(
      process.env.LOCALAPPDATA || '',
      'Programs',
      'Python',
      'Python311',
      'python.exe',
    ),
    path.join(
      process.env.LOCALAPPDATA || '',
      'Programs',
      'Python',
      'Python310',
      'python.exe',
    ),
    path.join(
      process.env.LOCALAPPDATA || '',
      'Programs',
      'Python',
      'Python39',
      'python.exe',
    ),
    // System-wide installations
    'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe',
    'C:\\Python310\\python.exe',
  ];

  // For full paths, check if file exists
  for (const pythonPath of possiblePaths) {
    if (pythonPath.includes('\\') || pythonPath.includes('/')) {
      if (fs.existsSync(pythonPath)) {
        return pythonPath;
      }
    } else {
      // For commands like 'python', 'py', we'll just return them and let spawn handle it
      return pythonPath;
    }
  }

  return 'python'; // Default fallback
}

/**
 * Start the WebSocket server as a child process
 * Clean approach: just spawn the process, let it handle port conflicts itself
 */
function startWebSocketServer() {
  // If there's already a process running, don't start another
  if (pythonProcess !== null) {
    console.log('WebSocket server process already exists');
    return;
  }

  const pythonExecutable = findPythonExecutable();

  // Determine the path to the websocket server
  let websocketServerPath;
  if (isDev) {
    websocketServerPath = path.join(
      __dirname,
      '..',
      'python_marty',
      'websocket_server.py',
    );
  } else {
    // In production, look for the bundled Python script
    websocketServerPath = path.join(
      process.resourcesPath,
      'python_marty',
      'websocket_server.py',
    );
  }

  console.log(`Starting WebSocket server from: ${websocketServerPath}`);
  console.log(`Using Python: ${pythonExecutable}`);

  // Check if the file exists
  if (!fs.existsSync(websocketServerPath)) {
    console.error(
      `WebSocket server script not found at: ${websocketServerPath}`,
    );
    return;
  }

  // Start the Python WebSocket server
  // Using -u for unbuffered output
  pythonProcess = spawn(pythonExecutable, ['-u', websocketServerPath], {
    cwd: path.dirname(websocketServerPath),
    stdio: ['ignore', 'pipe', 'pipe'], // Don't need stdin
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    },
    // Detached: false ensures the child is killed when parent exits
    detached: false,
  });

  console.log(`WebSocket server started with PID: ${pythonProcess.pid}`);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[WS Server] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    // Don't log as error if it's just info
    if (
      msg.includes('error') ||
      msg.includes('Error') ||
      msg.includes('ERROR')
    ) {
      console.error(`[WS Server Error] ${msg}`);
    } else {
      console.log(`[WS Server] ${msg}`);
    }
  });

  pythonProcess.on('close', (code) => {
    console.log(`WebSocket server exited with code ${code}`);
    pythonProcess = null;
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start WebSocket server:', err.message);
    pythonProcess = null;
  });
}

/**
 * Stop the WebSocket server gracefully
 * Clean approach: just kill our own child process, no system-wide scanning
 */
function stopWebSocketServer() {
  if (pythonProcess === null) {
    return;
  }

  console.log('Stopping WebSocket server...');

  try {
    // On Windows, killing the process should work
    // On Unix, SIGTERM is graceful shutdown
    pythonProcess.kill();
  } catch (e) {
    // Process may already be dead
  }

  pythonProcess = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    backgroundColor: '#1e1e1e',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Wait for WebSocket server to be ready using net.Socket
 * This is a clean way to check - no shell commands
 */
async function waitForWebSocketServer(maxAttempts = 10, delayMs = 500) {
  const net = require('net');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);

        socket.once('connect', () => {
          socket.destroy();
          resolve();
        });

        socket.once('error', () => {
          socket.destroy();
          reject();
        });

        socket.once('timeout', () => {
          socket.destroy();
          reject();
        });

        socket.connect(WS_PORT, '127.0.0.1');
      });

      console.log(`WebSocket server ready (attempt ${attempt})`);
      return true;
    } catch {
      console.log(
        `Waiting for WebSocket server... (${attempt}/${maxAttempts})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.warn('WebSocket server may not be available');
  return false;
}

// App ready
app.whenReady().then(async () => {
  startWebSocketServer();

  // Wait for server to be ready (max 5 seconds)
  await waitForWebSocketServer(10, 500);

  createWindow();
});

// All windows closed
app.on('window-all-closed', () => {
  stopWebSocketServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS: re-create window on dock click
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean shutdown handlers
app.on('before-quit', stopWebSocketServer);
app.on('will-quit', stopWebSocketServer);
