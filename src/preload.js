const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
    startLocalServer: () => ipcRenderer.invoke('start-local-server'),
    startDiscovery: (peerId, name) => ipcRenderer.invoke('start-udp-broadcast', peerId, name),
    stopDiscovery: () => ipcRenderer.invoke('stop-udp-broadcast'),
    onLanDiscovered: (callback) => ipcRenderer.on('lan-peer-discovered', (event, data) => callback(data))
});

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency])
    }
});
