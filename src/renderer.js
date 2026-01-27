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
    connectionStatus: document.getElementById('connection-status')
};

// --- State ---
let peer = null;
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

let qrCodeObj = null;
btns.showQr.addEventListener('click', () => {
    const isHidden = dom.qrContainer.style.display === 'none';

    if (isHidden) {
        dom.qrContainer.style.display = 'block';
        dom.qrContainer.innerHTML = '';

        try {
            if (typeof kjua === 'undefined') {
                throw new Error("Kjua library not loaded");
            }

            // Generate QR with kjua (supports logos/images)
            const qrEl = kjua({
                render: 'canvas',
                crisp: true,
                minVersion: 1,
                ecLevel: 'H', // High error correction for logo
                size: 200,
                fill: '#000000',
                back: '#ffffff',
                text: dom.myPeerId.innerText || "TransferX",
                rounded: 10,
                quiet: 1,
                mode: 'label',
                label: 'TX',
                fontname: 'Outfit',
                fontcolor: '#1c1c1e'
            });

            dom.qrContainer.appendChild(qrEl);
            btns.showQr.classList.add('active-state');
        } catch (e) {
            console.error("QR Gen Error:", e);
            alert("QR Kod kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.");
        }
    } else {
        dom.qrContainer.style.display = 'none';
        dom.qrContainer.innerHTML = '';
        btns.showQr.classList.remove('active-state');
    }
});

let html5QrScanner = null;
btns.scanQr.addEventListener('click', async () => {
    if (dom.qrReader.style.display === 'none') {
        dom.qrReader.style.display = 'block';
        dom.qrReader.innerHTML = ''; // Clear previous

        try {
            if (typeof Html5Qrcode === 'undefined') {
                throw new Error("Html5Qrcode library not loaded");
            }

            html5QrScanner = new Html5Qrcode("qr-reader");

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            // Start scanning with prioritized back camera
            await html5QrScanner.start(
                { facingMode: "environment" },
                config,
                onScanSuccess
            );

            btns.scanQr.classList.add('active-state');
        } catch (e) {
            console.error("Scanner Error:", e);
            alert("Kamera erişim hatası: " + e + "\nLütfen kamera izinlerini kontrol edin ve başka bir uygulamanın kamerayı kullanmadığından emin olun.");
            dom.qrReader.style.display = 'none';
        }
    } else {
        closeScanner();
    }
});

function closeScanner() {
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => {
            dom.qrReader.style.display = 'none';
            btns.scanQr.classList.remove('active-state');
            html5QrScanner = null;
        }).catch(err => {
            console.error("Stop Error:", err);
            dom.qrReader.style.display = 'none';
            btns.scanQr.classList.remove('active-state');
            html5QrScanner = null;
        });
    } else {
        dom.qrReader.style.display = 'none';
        btns.scanQr.classList.remove('active-state');
    }
}

function onScanSuccess(decodedText, decodedResult) {
    console.log(`Code matched = ${decodedText}`, decodedResult);
    if (decodedText && decodedText.length > 2) {
        dom.remotePeerIdInput.value = decodedText;
        closeScanner();
        btns.connect.focus();
        // Visual feedback
        dom.remotePeerIdInput.style.borderColor = 'var(--success)';
        setTimeout(() => dom.remotePeerIdInput.style.borderColor = '', 2000);
    }
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
function initPeer() {
    if (peer) return;

    const myId = generateFunId();
    console.log("Generated ID:", myId);

    peer = new Peer(myId, {
        debug: 2
    });

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        dom.myPeerId.innerText = id;
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

function handleFiles(files) {
    for (const file of files) {
        try {
            file.id = uuidv4();
            myFiles.push(file);

            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatBytes(file.size)}</span>
                </div>
                <div>Hazır</div>
            `;
            dom.senderFileList.appendChild(div);
        } catch (err) {
            console.error("Dosya ekleme hatası:", err);
            alert("Dosya eklenirken hata: " + err.message);
        }
    }
    // Push update to all peers if connected
    if (conn && conn.open) {
        sendCurrentFileList();
    }
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
        if (existingIds.has(f.id)) {
            // Already exists, maybe update status if needed, but skip for now
            return;
        }

        const div = document.createElement('div');
        div.className = 'file-item';
        div.dataset.id = f.id; // Store ID for preventing re-render
        // Stagger animation: max 10 items stagger to prevent huge delays
        const delay = Math.min(index * 0.05, 0.5);
        div.style.animationDelay = `${delay}s`;

        div.innerHTML = `
            <div class="file-info">
                <span class="file-name">${f.name}</span>
                <span class="file-size">${formatBytes(f.size)}</span>
            </div>
            <div class="actions">
                <button class="download-btn" data-id="${f.id}">İndir</button>
                <div class="progress-bar-container" style="display:none; width: 100px; height: 5px; background: #333; margin-top:5px; border-radius: 3px;">
                    <div class="progress-bar" style="width: 0%; height: 100%; background: #0f0; border-radius: 3px;"></div>
                </div>
                <span class="status-msg" style="font-size: 0.8em; margin-left: 5px; display:none;"></span>
            </div>
        `;
        listContainer.appendChild(div);

        // Attach listener specifically for this new button
        div.querySelector('.download-btn').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            // Disable button
            e.target.disabled = true;
            e.target.innerText = "İsteniyor...";
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
        id: f.id
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
        setTimeout(() => initPeer(), 100); // Short delay to ensure cleanup
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

