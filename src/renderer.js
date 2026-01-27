// CDN used for PeerJS in index.html.
// Native crypto.randomUUID used only for file IDs now.
// CDN used for PeerJS in index.html.
// Native crypto.randomUUID used only for file IDs now.
const uuidv4 = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for environments where crypto.randomUUID is not available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Fun words for Peer ID
// Fun words for Peer ID - Expanded
const adjectives = [
    'Hizli', 'Guclu', 'Neseli', 'Parlak', 'Sakin', 'Cesur', 'Mavi', 'Yesil', 'Kirmizi', 'Turuncu',
    'Zeki', 'Komik', 'Cilgin', 'Dev', 'Minik', 'Ucan', 'Yuzen', 'DansEden', 'Sarkici', 'Sihirli',
    'Gizemli', 'Efsane', 'Muhtesem', 'Harika', 'Supur', 'Tatli', 'Ekshi', 'Acik', 'Koyu', 'Neon'
];
const nouns = [
    'Patates', 'Kedi', 'Kaplan', 'Ejderha', 'Kartal', 'Aslan', 'Balik', 'Kus', 'Robot', 'Roket',
    'Uzayli', 'Hayalet', 'Panda', 'Kopek', 'Tavsan', 'Gunes', 'Ay', 'Yildiz', 'Gezegen', 'KuyrukluYildiz',
    'Ninja', 'Korsan', 'Sovalye', 'Prenses', 'Buyucu', 'Joker', 'Kral', 'Kralice', 'Elmas', 'Altin'
];

function generateFunId() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

// --- DOM Elements ---
const views = {
    home: document.getElementById('view-home'),
    sender: document.getElementById('view-sender'),
    receiver: document.getElementById('view-receiver')
};

const btns = {
    goSender: document.getElementById('btn-go-sender'),
    goReceiver: document.getElementById('btn-go-receiver'),
    back: document.querySelectorAll('.back-btn'),
    copyId: document.getElementById('copy-id-btn'),
    refreshId: document.getElementById('refresh-id-btn'),
    showQr: document.getElementById('show-qr-btn'),
    scanQr: document.getElementById('scan-qr-btn'),
    themeToggle: document.getElementById('theme-toggle-btn'),
    radioCloud: document.getElementById('mode-cloud'),
    radioLan: document.getElementById('mode-lan'),
    connect: document.getElementById('connect-btn')
};

const dom = {
    myPeerId: document.getElementById('my-peer-id'),
    qrContainer: document.getElementById('qr-container'),
    qrReader: document.getElementById('qr-reader'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    senderFileList: document.getElementById('sender-file-list'),
    receiverFileList: document.getElementById('receiver-file-list'),
    remotePeerIdInput: document.getElementById('remote-peer-id'),
    connectionStatus: document.getElementById('connection-status'),
    discoveryArea: document.getElementById('lan-discovery-area'),
    discoveryList: document.getElementById('discovered-devices-list')
};

// --- State ---
let peer = null;
let isLanMode = false;
let localIp = null;
let conn = null;
let activePoll = null; // Interval ID for receiver polling
let myFiles = []; // Array of File objects (Sender only)

// --- Navigation ---
function showView(viewName) {
    // Hide all views
    Object.values(views).forEach(el => {
        el.classList.remove('active');
        // Wait for animation to finish before hiding (optional, but for now just simple toggle)
        setTimeout(() => {
            if (!el.classList.contains('active')) el.classList.add('hidden');
        }, 400); // Check CSS transition time
    });

    // Show target
    const target = views[viewName];
    target.classList.remove('hidden');

    // Force reflow
    void target.offsetWidth;

    target.classList.add('active');

    // Cleanup other view states
    if (viewName !== 'receiver') closeScanner();
    if (viewName !== 'sender') {
        dom.qrContainer.style.display = 'none';
        dom.qrContainer.innerHTML = '';
        btns.showQr.classList.remove('active-state');
    }
}

// ... existing code ...

// --- QR and Scanner Robustness ---
let html5QrcodeScanner = null;

function generateQrCode(text) {
    if (typeof QRCode === 'undefined') return;

    dom.qrContainer.innerHTML = '';
    let qrData = text || dom.myPeerId.innerText || "TransferX";

    // If LAN mode, wrap in JSON with IP info
    if (isLanMode && localIp && peer) {
        qrData = JSON.stringify({
            id: peer.id,
            mode: 'lan',
            ip: localIp,
            port: 9000
        });
    }

    new QRCode(dom.qrContainer, {
        text: qrData,
        width: 210,
        height: 210,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L // Low error correction for denser data
    });

    // Append Logo Overlay
    const logo = document.createElement('div');
    logo.className = 'qr-logo-overlay';
    logo.innerText = 'TX';
    dom.qrContainer.appendChild(logo);
}

btns.showQr.addEventListener('click', () => {
    const isHidden = dom.qrContainer.style.display === 'none';

    if (isHidden) {
        dom.qrContainer.style.display = 'block';
        const currentId = dom.myPeerId.innerText;
        if (currentId && currentId !== "Oluşturuluyor..." && currentId !== "Yenileniyor...") {
            generateQrCode(currentId);
        } else {
            dom.qrContainer.innerHTML = '<div style="padding:20px; color:#666; font-size:0.8rem;">Kimlik bekleniyor...</div>';
        }
        btns.showQr.classList.add('active-state');
    } else {
        dom.qrContainer.style.display = 'none';
        dom.qrContainer.innerHTML = '';
        btns.showQr.classList.remove('active-state');
    }
});

btns.scanQr.addEventListener('click', () => {
    if (dom.qrReader.style.display === 'none') {
        dom.qrReader.style.display = 'block';
        dom.qrReader.innerHTML = ''; // Start clean

        try {
            if (typeof Html5QrcodeScanner === 'undefined') {
                alert("Kamera kütüphanesi yüklenemedi.");
                return;
            }

            html5QrcodeScanner = new Html5QrcodeScanner(
                "qr-reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    rememberLastUsedCamera: true
                }
            );

            html5QrcodeScanner.render(onScanSuccess, (err) => {
                // Ignore silent scan failures during search
            });

            btns.scanQr.classList.add('active-state');
        } catch (e) {
            console.error("Scanner Start Error:", e);
            alert("Kamera başlatılamadı: " + e);
            dom.qrReader.style.display = 'none';
        }
    } else {
        closeScanner();
    }
});

function closeScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
            dom.qrReader.style.display = 'none';
            btns.scanQr.classList.remove('active-state');
            html5QrcodeScanner = null;
        }).catch(err => {
            console.error("Clear Error:", err);
            dom.qrReader.style.display = 'none';
            btns.scanQr.classList.remove('active-state');
            html5QrcodeScanner = null;
        });
    } else {
        dom.qrReader.style.display = 'none';
        btns.scanQr.classList.remove('active-state');
    }
}

function onScanSuccess(decodedText, decodedResult) {
    if (decodedText && decodedText.length > 2) {
        let peerIdToConnect = decodedText;
        let lanConfig = null;

        // Check if JSON (LAN Mode)
        try {
            if (decodedText.startsWith('{')) {
                const data = JSON.parse(decodedText);
                if (data.mode === 'lan' && data.ip) {
                    peerIdToConnect = data.id;
                    lanConfig = {
                        host: data.ip,
                        port: data.port || 9000,
                        path: '/myapp'
                    };
                    console.log("Discovered LAN Peer:", lanConfig);
                }
            }
        } catch (e) {
            console.warn("Scan parse error, assuming legacy ID:", e);
        }

        dom.remotePeerIdInput.value = peerIdToConnect;
        closeScanner();

        // Auto connect
        setTimeout(() => {
            if (lanConfig) {
                // We need to re-init our peer to match the target's network
                // OR just connect if we can reach it.
                // Issue: If I am on WAN and scan LAN, I might not reach.
                // Best practice: Switch me to LAN mode momentarily or use a temp connection.
                // For simplicity: We will force a connection attempt using a new Peer instance pointing to that server
                // BUT PeerJS client connects to ONE server. So we must reconnect our client to THAT server.
                connectToLanPeer(peerIdToConnect, lanConfig);
            } else {
                connectToPeer(peerIdToConnect);
            }
        }, 500);

        // Visual indicator
        dom.remotePeerIdInput.style.borderColor = "#2ecc71";
        setTimeout(() => dom.remotePeerIdInput.style.borderColor = "", 2000);
    }
}

function connectToLanPeer(targetId, config) {
    console.log("Connecting to LAN peer...");
    dom.connectionStatus.innerText = "LAN Bağlantısı...";

    // We must destroy current peer and connect to the local server of the SENDER
    // Because the Sender IS the server in this architecture (Local PeerServer runs on Sender)
    if (peer) peer.destroy();

    // My ID doesn't matter much as receiver, but let's generate one
    peer = new Peer(generateFunId(), {
        host: config.host,
        port: config.port,
        path: config.path,
        debug: 2
    });

    peer.on('open', (id) => {
        console.log('Connected to Local Server with ID:', id);
        connectToPeer(targetId);
    });

    peer.on('error', err => {
        alert("LAN Bağlantı Hatası: " + err);
        dom.connectionStatus.innerText = "Hata";
    });
}

function onScanFailure(error) {
    // console.warn(`Code scan error = ${error}`);
}

btns.goSender.addEventListener('click', () => {
    initPeer();
    showView('sender');
});

btns.goReceiver.addEventListener('click', () => {
    initPeer();
    showView('receiver');
});

btns.back.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        showView(target);
        // Clean up connections if needed
    });
});

// --- PeerJS Logic ---
async function initPeer() {
    if (peer) return;

    let peerConfig = { debug: 2 };
    let myId = generateFunId();

    if (isLanMode) {
        // Start Local Server if needed
        if (typeof window.electronAPI === 'undefined') {
            console.warn("Electron API bulunamadı. LAN modu devre dışı bırakılıyor.");
            isLanMode = false;
            alert("Yerel Ağ modu sadece masaüstü uygulamasında kullanılabilir. Global moda dönülüyor.");
            btns.radioCloud.checked = true;
            handleModeChange();
            return;
        }

        try {
            await window.electronAPI.startLocalServer();
            localIp = await window.electronAPI.getLocalIp();
            console.log("Local Mode Active. IP:", localIp);

            peerConfig = {
                host: localIp,
                port: 9000,
                path: '/myapp',
                debug: 2
            };
        } catch (e) {
            console.error("Local Server Error:", e);
            alert("Yerel sunucu başlatılamadı: " + e);
            return;
        }
    }

    console.log("Generated ID:", myId);

    peer = new Peer(myId, peerConfig);

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        dom.myPeerId.innerText = id;

        // Start Broadcasting if LAN
        if (isLanMode) {
            const machineName = "Cihaz " + Math.floor(Math.random() * 100); // Simple name for now
            if (window.electronAPI) window.electronAPI.startDiscovery(id, machineName);
        }

        // If QR was waiting for this ID, update it now
        if (dom.qrContainer.style.display !== 'none') {
            generateQrCode(id); // Handles object generation internally if LAN
        }
    });

    peer.on('connection', (c) => {
        // I am the Host (Sender), someone connected
        console.log("Bağlantı geldi:", c.peer);
        setupConnection(c);
    });

    peer.on('error', (err) => {
        console.error(err);
        alert("Hata: " + err.type);
    });
}

// LAN Toggle Handler
function handleModeChange() {
    isLanMode = btns.radioLan.checked;

    // Update description text
    const desc = document.getElementById('mode-desc');
    if (desc) {
        desc.innerText = isLanMode
            ? "Aynı ağdaki cihazlar arasında internetsiz transfer."
            : "Global sunucular üzerinden transfer.";
    }

    // Web/Mobile Check: Block LAN mode if API missing
    if (isLanMode && typeof window.electronAPI === 'undefined') {
        alert("Yerel Ağ modu sadece TransferX Masaüstü uygulamasında çalışır. Web sürümünde sadece Global sunucular kullanılabilir.");
        btns.radioCloud.checked = true;
        // Recursive call will handle the rest because checked changed? 
        // No, manual reset needed to avoid loop or inconsistency
        btns.radioLan.checked = false;
        isLanMode = false;
        if (desc) desc.innerText = "Global sunucular üzerinden transfer.";
        // Don't return, let it proceed to clean up UI as if cloud mode was selected
    }

    // Toggle Discovery UI
    if (dom.discoveryArea) {
        dom.discoveryArea.style.display = isLanMode ? 'block' : 'none';
        if (!isLanMode) {
            dom.discoveryList.innerHTML = `
                <div class="empty-state" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                    <div class="loader" style="margin: 0 auto 10px;"></div>
                    Cihaz aranıyor...
                </div>`;
            discoveredPeers.clear();
            try { if (window.electronAPI) window.electronAPI.stopDiscovery(); } catch (e) { }
        }
    }

    // If peer exists, destroy and recreate
    if (peer) {
        peer.destroy();
        peer = null;
        dom.myPeerId.innerText = "Mod Değişiyor...";
        setTimeout(() => initPeer(), 500);
    }
}

// LAN Discovery Handling
const discoveredPeers = new Map();

if (window.electronAPI && window.electronAPI.onLanDiscovered) {
    window.electronAPI.onLanDiscovered((peerData) => {
        if (discoveredPeers.has(peerData.id)) return;

        discoveredPeers.set(peerData.id, peerData);
        updateDiscoveryList();
    });
}

function updateDiscoveryList() {
    if (discoveredPeers.size === 0) return;

    // Clear empty state if we have items
    if (dom.discoveryList.querySelector('.empty-state')) {
        dom.discoveryList.innerHTML = '';
    }

    discoveredPeers.forEach(p => {
        // Check if already in DOM
        if (document.getElementById(`peer-${p.id}`)) return;

        const div = document.createElement('div');
        div.className = 'file-item';
        div.id = `peer-${p.id}`;
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <div class="file-preview" style="background: var(--accent); color: white;">
                💻
            </div>
            <div class="file-info">
                <span class="file-name" style="font-size:1rem;">${p.name || 'Bilinmeyen Cihaz'}</span>
                <span class="file-size">${p.ip}</span>
            </div>
            <div class="actions">
                <button class="download-btn" style="padding: 6px 15px; font-size: 0.8rem;">Bağlan</button>
            </div>
        `;
        div.addEventListener('click', () => {
            // Connect logic
            const config = {
                host: p.ip,
                port: 9000,
                path: '/myapp'
            };
            // Switch to Receiver View
            btns.goReceiver.click();

            // Wait for view transition
            setTimeout(() => {
                dom.remotePeerIdInput.value = p.id;
                connectToLanPeer(p.id, config);
            }, 500);
        });
        dom.discoveryList.appendChild(div);
    });
}

btns.radioCloud.addEventListener('change', handleModeChange);
btns.radioLan.addEventListener('change', handleModeChange);

function connectToPeer(id) {
    if (!peer) return;
    console.log("Bağlanılıyor:", id);
    dom.connectionStatus.innerText = "Bağlanılıyor...";
    const c = peer.connect(id);
    setupConnection(c);
}

function setupConnection(c) {
    conn = c;

    conn.on('open', () => {
        console.log("Bağlantı Kuruldu!");
        if (dom.connectionStatus) dom.connectionStatus.innerHTML = "Bağlandı! <span style='color:#0f0'>●</span>";

        // Listen for errors on the connection itself
        conn.on('error', (err) => {
            console.error("Connection Error:", err);
            alert("Bağlantı Hatası: " + err);
        });

        if (!views.sender.classList.contains('hidden')) {
            // I am Sender - Push my list immediately to the new receiver
            sendCurrentFileList();
        } else {
            // I am Receiver - Request list AND start polling
            requestList();
            // Poll for new files every 3 seconds
            if (activePoll) clearInterval(activePoll);
            activePoll = setInterval(requestList, 3000);
        }
    });

    conn.on('data', (data) => {
        handleData(data);
    });

    conn.on('close', () => {
        if (dom.connectionStatus) dom.connectionStatus.innerText = "Bağlantı Kesildi";
        conn = null;
        if (activePoll) clearInterval(activePoll);
    });
}

function requestList() {
    if (conn) conn.send({ type: 'GET_LIST' });
}

function handleData(data) {
    console.log("Data alındı:", data.type);

    if (data.type === 'GET_LIST') {
        sendCurrentFileList();
    }

    if (data.type === 'FILE_LIST') {
        renderRemoteFiles(data.files);
    }

    if (data.type === 'REQUEST_FILE') {
        sendFile(data.id);
    }

    if (data.type === 'FILE_CHUNK') {
        // Receiving file chunks - simplified for MVP
        // In a real app we would buffer and save to disk via Main process
        // For now, let's just log or accumulate in memory (Small files only for Alpha)
        console.log(`Received chunk for ${data.fileId}`);
        handleFileChunk(data);
    }
}

// --- File Handling (Sender) ---
dom.dropzone.addEventListener('click', () => dom.fileInput.click());

dom.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropzone.classList.add('drag-over');
});

dom.dropzone.addEventListener('dragleave', () => {
    dom.dropzone.classList.remove('drag-over');
});

dom.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.dropzone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});

dom.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

async function handleFiles(files) {
    for (const file of files) {
        try {
            file.id = uuidv4();

            // Generate thumbnail if image
            if (file.type.startsWith('image/')) {
                file.thumbnail = await generateThumbnail(file);
            }

            myFiles.push(file);

            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <div class="file-preview">
                    ${file.thumbnail ? `<img src="${file.thumbnail}" alt="Preview">` : getFileIcon(file.type)}
                </div>
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatBytes(file.size)}</span>
                </div>
                <div class="status-badge">Hazır</div>
            `;
            dom.senderFileList.appendChild(div);
        } catch (err) {
            console.error("Dosya ekleme hatası:", err);
        }
    }
    if (conn && conn.open) {
        sendCurrentFileList();
    }
}

function generateThumbnail(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 100;
                const MAX_HEIGHT = 100;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function getFileIcon(mime) {
    if (mime.startsWith('video/')) return '🎬';
    if (mime.startsWith('audio/')) return '🎵';
    if (mime.includes('pdf')) return '📕';
    if (mime.includes('zip') || mime.includes('rar')) return '📦';
    return '📄';
}

function sendFile(fileId) {
    const file = myFiles.find(f => f.id === fileId);
    if (!file) return;

    // VERY BASIC send (ArrayBuffer)
    // PeerJS handles small files well directly. Large files need chunking.
    // For this prototype, we send the whole blob if small, or warn.

    const reader = new FileReader();
    reader.onload = (e) => {
        const buffer = e.target.result;

        // Split into chunks if needed, but peerjs handles splitting usually. 
        // Let's send a header then data.
        conn.send({
            type: 'FILE_START',
            id: file.id,
            name: file.name,
            size: file.size,
            mime: file.type
        });

        conn.send({
            type: 'FILE_DATA',
            id: file.id,
            buffer: buffer // Sends as binary
        });

        conn.send({ type: 'FILE_END', id: file.id });
    };
    reader.readAsArrayBuffer(file);
}

// --- File Handling (Receiver) ---
function renderRemoteFiles(files) {
    // We do NOT clear innerHTML because it kills progress bars and event listeners.
    // Instead we reconcile the list.

    const listContainer = dom.receiverFileList;
    const existingIds = new Set();

    // Update existing or mark for removal
    Array.from(listContainer.children).forEach(child => {
        if (child.dataset.id) existingIds.add(child.dataset.id);
    });

    // Add new files
    files.forEach((f, index) => {
        if (existingIds.has(f.id)) return;

        const div = document.createElement('div');
        div.className = 'file-item';
        div.dataset.id = f.id;
        const delay = Math.min(index * 0.05, 0.5);
        div.style.animationDelay = `${delay}s`;

        div.innerHTML = `
            <div class="file-preview">
                ${f.thumbnail ? `<img src="${f.thumbnail}" alt="Preview">` : getFileIcon(f.type)}
            </div>
            <div class="file-info">
                <span class="file-name">${f.name}</span>
                <span class="file-size">${formatBytes(f.size)}</span>
            </div>
            <div class="actions">
                <button class="download-btn" data-id="${f.id}">İndir</button>
                <div class="progress-bar-container" style="display:none; width: 80px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow:hidden;">
                    <div class="progress-bar" style="width: 0%; height: 100%; background: var(--accent);"></div>
                </div>
                <span class="status-msg" style="font-size: 0.75em; display:none;"></span>
            </div>
        `;
        listContainer.appendChild(div);

        div.querySelector('.download-btn').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            e.target.style.display = 'none';
            const item = e.target.closest('.file-item');
            item.querySelector('.progress-bar-container').style.display = 'block';
            item.querySelector('.status-msg').style.display = 'inline';
            item.querySelector('.status-msg').innerText = "Bekleniyor...";
            requestFile(id);
        });
    });

    // Optional: Remove files that are no longer in the list (if sender deleted them)
    // For now we skip to avoid complexity with active downloads.
}

function requestFile(id) {
    conn.send({ type: 'REQUEST_FILE', id: id });
}

function sendCurrentFileList() {
    if (!conn) return;
    const list = myFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        id: f.id,
        thumbnail: f.thumbnail || null
    }));
    conn.send({ type: 'FILE_LIST', files: list });
}

// Expanding handleData for file transfer reception
const activeDownloads = {};

// Override/Append to handleData logic
const originalHandleData = handleData;
handleData = function (data) {
    // Call original logic for list request etc
    if (['GET_LIST', 'FILE_LIST', 'REQUEST_FILE'].includes(data.type)) {
        originalHandleData(data);
        return;
    }

    if (data.type === 'FILE_START') {
        activeDownloads[data.id] = { info: data, buffer: [], received: 0 };
        console.log("İndirme başlıyor:", data.name);

        // Show progress bar
        const item = document.querySelector(`.file-item[data-id="${data.id}"]`);
        if (item) {
            const btn = item.querySelector('.download-btn');
            const progCont = item.querySelector('.progress-bar-container');
            const status = item.querySelector('.status-msg');

            if (btn) btn.style.display = 'none';
            if (progCont) progCont.style.display = 'block';
            if (status) {
                status.style.display = 'inline';
                status.innerText = "İndiriliyor...";
            }
        }
    }
    else if (data.type === 'FILE_DATA') {
        if (activeDownloads[data.id]) {
            const download = activeDownloads[data.id];
            download.buffer.push(data.buffer);
            download.received += data.buffer.byteLength || data.buffer.length;

            // Update UI
            updateProgress(data.id, download.received, download.info.size);
        }
    }
    else if (data.type === 'FILE_END') {
        const download = activeDownloads[data.id];
        if (download) {
            console.log("İndirme bitti, birleştiriliyor...", download.info.name);
            const blob = new Blob(download.buffer, { type: download.info.mime });
            downloadBlob(blob, download.info.name);
            delete activeDownloads[data.id];

            // Update UI
            const item = document.querySelector(`.file-item[data-id="${data.id}"]`);
            if (item) {
                const status = item.querySelector('.status-msg');
                const progCont = item.querySelector('.progress-bar-container');
                if (progCont) progCont.style.display = 'none';
                if (status) {
                    status.innerText = "Tamamlandı ✅";
                    status.style.color = '#0f0';
                }
            }
        }
    }
};

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

function updateProgress(id, current, total) {
    const item = document.querySelector(`.file-item[data-id="${id}"]`);
    if (!item) return;

    const percent = Math.floor((current / total) * 100);
    const bar = item.querySelector('.progress-bar');
    if (bar) bar.style.width = `${percent}%`;
}

// --- Utils ---
btns.copyId.addEventListener('click', () => {
    const id = dom.myPeerId.innerText;
    navigator.clipboard.writeText(id).then(() => {
        btns.copyId.innerText = "✅";
        setTimeout(() => btns.copyId.innerText = "📋", 2000);
    });
});

btns.refreshId.addEventListener('click', () => {
    if (peer) {
        peer.destroy();
        peer = null;
        dom.myPeerId.innerText = "Yenileniyor...";

        // Reset QR state
        dom.qrContainer.style.display = 'none';
        dom.qrContainer.innerHTML = '';
        btns.showQr.classList.remove('active-state');

        setTimeout(() => initPeer(), 100);
    }
});





// --- Theme Logic ---
function applyTheme(isAmoled) {
    if (isAmoled) {
        document.body.classList.add('amoled-theme');
        btns.themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('amoled-theme');
        btns.themeToggle.textContent = '🌑';
    }
    localStorage.setItem('theme', isAmoled ? 'amoled' : 'dark');
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'amoled') {
    applyTheme(true);
}

btns.themeToggle.addEventListener('click', () => {
    const isAmoled = !document.body.classList.contains('amoled-theme');
    applyTheme(isAmoled);
});

btns.connect.addEventListener('click', () => {
    const id = dom.remotePeerIdInput.value;
    if (id) connectToPeer(id);
});

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- Particle Cursor Effect ---
const canvas = document.getElementById('cursor-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        // Strictly White/Silver Particles (Monochromatic)
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.2})`;
        this.life = 100;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.size *= 0.95;
        this.life -= 2;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 100;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

if (!isTouchDevice) {
    window.addEventListener('mousemove', (e) => {
        for (let i = 0; i < 3; i++) {
            particles.push(new Particle(e.clientX, e.clientY));
        }
    });

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0 || particles[i].size <= 0.2) {
                particles.splice(i, 1);
                i--;
            }
        }
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
} else {
    canvas.style.display = 'none';
}

