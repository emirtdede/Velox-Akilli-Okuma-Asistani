/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let serverProcess;
let serverStarted = false;

function startServer() {
  const isDev = !app.isPackaged;
  const env = { ...process.env };
  
  // Set default port if not defined
  const port = process.env.PORT || '3000';
  env.PORT = port;

  if (isDev) {
    console.log('Starting server in development mode...');
    serverProcess = spawn('npx', ['tsx', 'server.ts'], {
      cwd: __dirname,
      shell: true,
      env: { ...env, NODE_ENV: 'development' }
    });
  } else {
    console.log('Starting server in production mode...');
    serverProcess = spawn('node', [path.join(__dirname, 'dist/server.cjs')], {
      cwd: __dirname,
      shell: true,
      env: { ...env, NODE_ENV: 'production' }
    });
  }

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Server Output]: ${output}`);
    
    // Check if the server is ready
    if (!serverStarted && (output.includes('Server listening') || output.includes('listening on'))) {
      serverStarted = true;
      const portMatch = output.match(/:(\d+)/);
      const activePort = portMatch ? portMatch[1] : port;
      console.log(`Server is ready. Loading URL http://localhost:${activePort}`);
      if (mainWindow) {
        mainWindow.loadURL(`http://localhost:${activePort}`);
      }
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data.toString()}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: "Velox - Akıllı Okuma Asistanı",
    icon: app.isPackaged
      ? path.join(__dirname, 'dist/transparent.png')
      : path.join(__dirname, 'public/transparent.png')
  });

  mainWindow.loadURL('data:text/html,<html><body style="background:#1e1e2e;color:#cdd6f4;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><div><h2>Velox Yükleniyor...</h2></div></body></html>');

  startServer();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // Ensure server process is terminated
  if (serverProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
      } else {
        serverProcess.kill('SIGINT');
      }
    } catch (e) {
      console.error('Failed to kill server process:', e);
    }
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
