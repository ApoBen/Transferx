const { app, BrowserWindow, ipcMain } = require('electron');
// Sync Trigger: 2026-01-27 23:10
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
  const candidates = [];
  for (const key in interfaces) {
    // Ignore virtual and loopback interfaces
    if (key.toLowerCase().includes('virtual') || key.toLowerCase().includes('vbox') || key.toLowerCase().includes('vmware')) continue;

    for (const iface of interfaces[key]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (key.toLowerCase().includes('wi-fi') || key.toLowerCase().includes('wlan') || key.toLowerCase().includes('ethernet')) {
          return iface.address; // High priority match
        }
        candidates.push(iface.address);
      }
    }
  }
  return candidates.length > 0 ? candidates[0] : '127.0.0.1';
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

// --- UDP Discovery Logic ---
const dgram = require('dgram');
let udpSocket = null;
let broadcastInterval = null;
const UDP_PORT = 9001;

ipcMain.handle('start-udp-broadcast', (event, peerId, machineName) => {
  if (udpSocket) return; // Already running

  try {
    udpSocket = dgram.createSocket('udp4');

    udpSocket.on('error', (err) => {
      console.error(`UDP server error:\n${err.stack}`);
      udpSocket.close();
      udpSocket = null;
    });

    udpSocket.on('message', (msg, rinfo) => {
      const message = msg.toString();
      // Expected format: TransferX:<PeerID>:<MachineName>
      if (message.startsWith('TransferX:') && !message.includes(peerId)) {
        // Determine sender IP (rinfo.address)
        // Emit to renderer to show in list
        const parts = message.split(':');
        if (parts.length >= 3) {
          const foundPeerId = parts[1];
          const foundName = parts[2];

          // We found a peer!
          const mainWindow = typeof BrowserWindow !== 'undefined' ? BrowserWindow.getAllWindows()[0] : null;
          if (mainWindow) {
            mainWindow.webContents.send('lan-peer-discovered', {
              id: foundPeerId,
              name: foundName,
              ip: rinfo.address
            });
          }
        }
      }
    });

    udpSocket.bind(UDP_PORT, () => {
      udpSocket.setBroadcast(true);
      console.log("UDP Discovery started on port " + UDP_PORT);
    });

    // Broadcast my existence every 3 seconds
    broadcastInterval = setInterval(() => {
      if (udpSocket) {
        const message = Buffer.from(`TransferX:${peerId}:${machineName}`);
        udpSocket.send(message, 0, message.length, UDP_PORT, '255.255.255.255');
      }
    }, 3000);

  } catch (e) {
    console.error("UDP Start Error:", e);
  }
});

ipcMain.handle('stop-udp-broadcast', () => {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
  if (udpSocket) {
    udpSocket.close();
    udpSocket = null;
    console.log("UDP Discovery stopped.");
  }
});
