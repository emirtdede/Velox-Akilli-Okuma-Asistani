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
      env: { ...env, NODE_ENV: 'development', IS_ELECTRON: 'true' }
    });
  } else {
    console.log('Starting server in production mode...');
    serverProcess = spawn('node', [path.join(__dirname, 'dist/server.cjs')], {
      cwd: __dirname,
      shell: true,
      env: { ...env, NODE_ENV: 'production', IS_ELECTRON: 'true' }
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

  mainWindow.loadURL('data:text/html,<html><body style="background:#0c0a09;color:#f5f5f4;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><div><h2>Velox Yükleniyor...</h2></div></body></html>');

  startServer();

  // Load fail handler to prevent white screens
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Ignore small aborted requests or redirects
    if (errorCode === -3) return; 
    console.error(`Page failed to load: ${errorDescription} (${errorCode})`);
    mainWindow.loadURL(`data:text/html,<html><body style="background:#0c0a09;color:#f5f5f4;font-family:sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;margin:0;padding:20px;text-align:center;">
      <div style="max-width: 500px; padding: 30px; border-radius: 20px; background: #1c1917; border: 1px solid #2e2a24; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <h2 style="color:#ef4444;margin-top:0;font-weight:900;">Velox - Başlatma Hatası</h2>
        <p style="font-size:14px;opacity:0.8;line-height:1.6;margin-bottom:20px;">Sunucu bağlantısı kurulamadı veya uygulama yüklenirken bir hata oluştu.</p>
        <div style="background:#0c0a09;padding:15px;border-radius:12px;font-family:monospace;font-size:11px;color:#a8a29e;text-align:left;line-height:1.5;word-break:break-all;margin-bottom:20px;border:1px solid #292524;">
          <strong>Hedef:</strong> ${validatedURL}<br>
          <strong>Hata:</strong> ${errorDescription} (${errorCode})
        </div>
        <button onclick="window.location.reload()" style="background:#4f46e5;color:white;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;font-size:13px;transition:all 0.2s;box-shadow:0 4px 12px rgba(79,70,229,0.3);" onmouseover="this.style.background='#4338ca'" onmouseout="this.style.background='#4f46e5'">Yeniden Dene</button>
      </div>
    </body></html>`);
  });

  // Safe developer shortcuts in development mode
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      mainWindow.webContents.reloadIgnoringCache();
      event.preventDefault();
    }
  });

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
