// CDN used for PeerJS in index.html.
// Native crypto.randomUUID used only for file IDs now.
const uuidv4 = () => crypto.randomUUID();

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
    themeToggle: document.getElementById('theme-toggle-btn'),
    connect: document.getElementById('connect-btn')
};

const dom = {
    myPeerId: document.getElementById('my-peer-id'),
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
        el.classList.add('hidden');
    });

    // Show target
    const target = views[viewName];
    target.classList.remove('hidden');

    // Small delay to allow CSS transition if needed, but critical for display:none
    requestAnimationFrame(() => {
        target.classList.add('active');
    });
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
        if (dom.connectionStatus) dom.connectionStatus.innerText = "Bağlandı!";

        if (!views.sender.classList.contains('hidden')) {
            // I am Sender - Send list if requested (handled in data)
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
        // Send my file names
        const list = myFiles.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type,
            id: f.id // we add ID when dropping
        }));
        conn.send({ type: 'FILE_LIST', files: list });
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
    dom.receiverFileList.innerHTML = '';
    files.forEach(f => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `
            <div class="file-info">
                <span class="file-name">${f.name}</span>
                <span class="file-size">${formatBytes(f.size)}</span>
            </div>
            <button class="download-btn" data-id="${f.id}">İndir</button>
        `;
        dom.receiverFileList.appendChild(div);
    });

    // Attach listeners
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            requestFile(id);
        });
    });
}

function requestFile(id) {
    conn.send({ type: 'REQUEST_FILE', id: id });
}

let incomingBuffers = {}; // id -> [chunks]

function handleFileChunk(data) {
    // This function needs to be hooked up to 'FILE_DATA' and 'FILE_START' etc in handleData
    // See the 'handleData' simplified logic. 
    // We need to expand handleData to capture FILE_START, FILE_DATA, FILE_END
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
        activeDownloads[data.id] = { info: data, buffer: [] };
        console.log("İndirme başlıyor:", data.name);
    }
    else if (data.type === 'FILE_DATA') {
        if (activeDownloads[data.id]) {
            activeDownloads[data.id].buffer.push(data.buffer);
        }
    }
    else if (data.type === 'FILE_END') {
        const download = activeDownloads[data.id];
        if (download) {
            console.log("İndirme bitti, birleştiriliyor...", download.info.name);
            const blob = new Blob(download.buffer, { type: download.info.mime });
            downloadBlob(blob, download.info.name);
            delete activeDownloads[data.id];
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

