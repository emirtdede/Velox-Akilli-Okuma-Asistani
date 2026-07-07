/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { app, BrowserWindow, utilityProcess } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let splashWindow;
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
  } else {
    console.log('Starting server in production mode using Electron utilityProcess...');
    serverProcess = utilityProcess.fork(path.join(__dirname, 'dist/server.cjs'), [], {
      env: { 
        ...env, 
        NODE_ENV: 'production', 
        IS_ELECTRON: 'true'
      },
      stdio: 'pipe'
    });

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

    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
    });
  }
}

function createWindow() {
  // Load window state config
  const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
  let windowState = {
    width: 1280,
    height: 850,
    isMaximized: false
  };

  try {
    if (fs.existsSync(stateFilePath)) {
      windowState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load window state:', e);
  }

  let width = windowState.width || 1280;
  let height = windowState.height || 850;
  // Ensure size is not smaller than minimum
  if (width < 1000) width = 1280;
  if (height < 650) height = 850;

  // 1. Create a transparent, frameless splash window
  splashWindow = new BrowserWindow({
    width: 350,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const logoHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: transparent;
    }
    .logo-box {
      width: 140px;
      height: 140px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 12px 30px rgba(79, 57, 246, 0.45));
      animation: pulse 2s infinite ease-in-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.92); opacity: 0.6; }
      50% { transform: scale(1.06); opacity: 1; }
      100% { transform: scale(0.92); opacity: 0.6; }
    }
  </style>
</head>
<body>
  <div class="logo-box">
    <svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="432.5 433.8 1180.0 1180.0" preserveAspectRatio="xMidYMid meet">
      <g transform="translate(0.000000,2048.000000) scale(0.100000,-0.100000)" fill="#4f39f6" stroke="none">
        <path d="M14730 14373 c-1150 -63 -2187 -414 -2960 -1003 -352 -269 -699 -626 -955 -985 -202 -283 -401 -652 -530 -980 -33 -83 -45 -105 -51 -90 -33 96 -134 326 -215 490 -341 691 -857 1268 -1483 1657 -646 402 -1428 636 -2291 688 -200 12 -584 12 -540 0 17 -4 125 -31 241 -59 373 -90 645 -189 994 -362 237 -118 424 -230 624 -373 347 -248 692 -584 932 -906 98 -132 98 -135 7 -48 -364 345 -961 687 -1533 878 -667 223 -1297 281 -2060 188 l-185 -23 85 -8 c444 -42 762 -104 1135 -224 1015 -326 1855 -936 2442 -1773 254 -362 445 -716 823 -1525 300 -643 481 -990 686 -1318 82 -130 274 -410 321 -466 l29 -33 106 148 c321 449 486 750 923 1679 348 740 533 1088 756 1422 325 485 706 874 1134 1158 308 205 618 356 1025 500 91 32 171 63 177 69 11 10 437 901 560 1171 25 55 53 108 61 118 14 16 9 17 -94 15 -60 -1 -134 -3 -164 -5z m-753 -730 c-6 -16 -62 -138 -123 -273 l-111 -245 -44 -8 c-614 -110 -1071 -283 -1513 -574 -493 -324 -862 -707 -1157 -1201 -46 -77 -85 -139 -87 -137 -7 7 148 328 225 468 194 349 410 636 692 918 424 424 869 706 1426 904 203 72 591 173 672 174 32 1 32 0 20 -26z m-3676 -2924 c86 -26 159 -126 159 -219 0 -67 -209 -1375 -218 -1365 -6 5 -136 785 -182 1089 -50 328 -49 353 23 431 61 67 134 89 218 64z"/>
        <path d="M15865 12963 c-22 -1 -103 -8 -180 -13 -633 -49 -1335 -231 -1851 -480 -724 -348 -1245 -855 -1704 -1655 -122 -213 -325 -620 -560 -1120 -451 -963 -666 -1335 -1022 -1772 -32 -39 -58 -76 -58 -82 0 -14 152 -145 235 -201 129 -87 276 -151 445 -192 36 -8 120 -13 245 -13 166 1 202 4 285 24 357 89 628 288 846 621 150 230 231 392 587 1176 141 308 305 663 365 790 575 1199 1118 1936 1806 2451 223 166 516 339 746 440 l75 33 -110 -2 c-60 -1 -128 -3 -150 -5z"/>
        <path d="M5295 12613 c-234 -7 -562 -49 -820 -107 l-150 -33 80 -18 c777 -171 1459 -646 1988 -1382 312 -434 541 -875 1059 -2033 227 -506 316 -698 474 -1010 305 -606 559 -986 869 -1295 199 -200 384 -335 610 -445 161 -79 278 -120 455 -158 117 -25 141 -27 375 -27 235 0 258 2 380 28 468 100 885 358 1232 762 106 123 248 313 240 321 -3 3 -22 -3 -44 -14 -88 -45 -285 -101 -428 -123 -116 -17 -332 -14 -450 6 -191 32 -431 126 -600 236 -258 168 -559 479 -814 844 -279 401 -459 730 -829 1515 -485 1031 -676 1372 -981 1753 -129 160 -349 383 -491 497 -582 465 -1343 706 -2155 683z"/>
      </g>
    </svg>
  </div>
</body>
</html>`;
  splashWindow.loadURL(`data:text/html;base64,${Buffer.from(logoHtml).toString('base64')}`);

  // 2. Create the main window but keep it hidden, centered
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    minWidth: 1000,
    minHeight: 650,
    center: true, // Centers the window on the screen
    show: false,
    backgroundColor: '#0c0a09',
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

  startServer();

  // Once mainWindow is fully loaded and ready to draw, close splash and show main window
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.destroy();
        splashWindow = null;
      }
      if (mainWindow) {
        if (windowState.isMaximized) {
          mainWindow.maximize();
        } else {
          mainWindow.show();
        }
        mainWindow.focus();
      }
    }, 600); // Small delay to guarantee assets and UI are fully compiled
  });

  // Load fail handler to prevent white screens and resolve splash
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; 
    console.error(`Page failed to load: ${errorDescription} (${errorCode})`);
    
    if (splashWindow) {
      splashWindow.destroy();
      splashWindow = null;
    }
    if (mainWindow) {
      mainWindow.show();
    }

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

  // Save window state on close
  mainWindow.on('close', () => {
    try {
      const isMaximized = mainWindow.isMaximized();
      const bounds = mainWindow.getBounds();
      const stateToSave = {
        width: bounds.width,
        height: bounds.height,
        isMaximized: isMaximized
      };
      fs.writeFileSync(stateFilePath, JSON.stringify(stateToSave), 'utf8');
    } catch (e) {
      console.error('Failed to save window state:', e);
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
      if (!app.isPackaged) {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        } else {
          serverProcess.kill('SIGINT');
        }
      } else {
        serverProcess.kill();
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
