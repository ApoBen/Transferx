const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Security best practice
      contextIsolation: true, // Security best practice
    },
    authHideMenuBar: true,
    // Modern look
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1a',
      symbolColor: '#ffffff'
    }
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());

// --- Local PeerServer & LAN Logic ---
const { PeerServer } = require('peer');
const os = require('os');
const http = require('http');

let localPeerServer = null;

// Get Local WLAN/Ethernet IP
ipcMain.handle('get-local-ip', () => {
  const interfaces = os.networkInterfaces();
  for (const key in interfaces) {
    // Filter for common name patterns (Wi-Fi, Ethernet) to prioritize valid LAN IPs
    // But mostly just look for IPv4, not internal (127.0.0.1)
    for (const iface of interfaces[key]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
});

// Start Local PeerServer
ipcMain.handle('start-local-server', async () => {
  if (localPeerServer) return { success: true, message: 'Server already running' };

  try {
    // PeerServer internal logic uses a dedicated HTTP server usually, 
    // or we can attach it. The library 'peer' exports PeerServer function.
    // Port 9000 is standard for PeerJS local examples.
    localPeerServer = PeerServer({ port: 9000, path: '/myapp' });

    return { success: true, port: 9000, path: '/myapp' };
  } catch (err) {
    console.error("Failed to start local server:", err);
    return { success: false, error: err.message };
  }
});
