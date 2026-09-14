const API_BASE_URL = 'https://photobooth-4r1k.onrender.com';

// --- STATE & GLOBALS ---
let state = {
    screen: 'start',
    selectedLayout: null,
    photos: [],
    stream: null,
    countdown: null,
    background: '#ffffff',
    backgroundImage: null,
    colorMode: 'color',
    finalUrl: null,
    addDate: false
};
    
const layouts = {
    1: { cols: 1, rows: 3, count: 3 },
    2: { cols: 1, rows: 4, count: 4 },
    3: { cols: 1, rows: 1, count: 1 },
    4: { cols: 2, rows: 2, count: 4 }
};

const backgrounds = [
    { name: 'Schleifen', image: 'bilder/1.png' },
    { name: 'Tannenbaum', image: 'bilder/2.png' },
    { name: 'Christmas Tree', image: 'bilder/3.png' },
    { name: 'Schnee', image: 'bilder/4.jpeg' },
    { name: 'Schlittschuhe', image: 'bilder/5.png' },
    { name: 'Schneeflocken Rand', image: 'bilder/7.jpeg' },
    { name: 'Schneeflocken', image: 'bilder/8.jpeg' },
];

const colors = ['#ffffff', '#bcdbf1ff', '#e4c5e9ff', '#c9f5cdff', '#fae9cdff', '#e49cb4ff'];

const screens = {
    start: document.getElementById('start-screen'),
    camera: document.getElementById('camera-screen'),
    customize: document.getElementById('customize-screen'),
    download: document.getElementById('download-screen')
};

const video = document.getElementById('video');
const countdownOverlay = document.getElementById('countdown');
const previewGrid = document.getElementById('preview-grid');
const photostripCanvas = document.getElementById('photostrip-canvas');
const finalCanvas = document.getElementById('final-canvas');
const spinner = document.getElementById('spinner');

// --- HILFSFUNKTIONEN ---

function createSnowflakes() {
    const container = document.getElementById('snowflakes');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = '❄';
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.top = Math.random() * 100 + '%';
        snowflake.style.fontSize = (Math.random() * 20 + 10) + 'px';
        container.appendChild(snowflake);
    }
}

function showScreen(screenName) {
    for (const key in screens) {
        if (screens[key]) {
             screens[key].classList.remove('active');
        }
    }
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
    state.screen = screenName;
}

// Nur die verbesserte startCamera-Funktion behalten!
async function startCamera() {
    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        state.stream = mediaStream;
        video.srcObject = mediaStream;

        // Autoplay-Fix
        video.play().catch(e => console.error("Video Playback Startfehler (wegen Autoplay-Regeln):", e));
    } catch (err) {
        console.error("Kamerafehler:", err);
        alert('Kamerazugriff verweigert. Bitte erlaube den Kamerazugriff.');
        showScreen('start');
    } finally {
        spinner.classList.remove('active');
    }
}

function updatePreviewGrid() {
    const layout = layouts[state.selectedLayout];
    if (!layout) return;
    
    previewGrid.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
    previewGrid.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;
    previewGrid.innerHTML = '';
    
    for (let i = 0; i < layout.count; i++) {
        const slot = document.createElement('div');
        slot.className = 'preview-slot';
        if (state.photos[i]) {
            const img = document.createElement('img');
            img.src = state.photos[i];
            slot.appendChild(img);
        }
        previewGrid.appendChild(slot);
    }
}

function updatePhotoCounter(initial = false) {
    const layout = layouts[state.selectedLayout];
    if (!layout) return;
    
    const counter = document.getElementById('photo-counter');
    if (initial) {
        counter.textContent = `(${layout.count} Foto${layout.count > 1 ? 's' : ''})`;
    } else {
        const current = state.photos.length < layout.count ? state.photos.length + 1 : layout.count;
        counter.textContent = `(${current}/${layout.count})`;
    }
}

function applyColorMode(ctx, canvas) {
    if (state.colorMode === "color") return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    switch (state.colorMode) {
        case "bw":
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = gray; data[i + 1] = gray; data[i + 2] = gray;
            }
            break;
        case "sepia":
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            }
            break;
        case "vintage":
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.1 + 10);
                data[i + 1] = Math.min(255, data[i + 1] * 1.05 + 5);
                data[i + 2] = Math.max(0, data[i + 2] * 0.9 - 10);
            }
            break;
    }
    ctx.putImageData(imageData, 0, 0);
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    
    applyColorMode(ctx, canvas);

    const photoData = canvas.toDataURL('image/png');
    state.photos.push(photoData);
    
    updatePreviewGrid();

    if (state.photos.length !== layouts[state.selectedLayout].count) {
        updatePhotoCounter();
    }

    const layout = layouts[state.selectedLayout];
    if (state.photos.length === layout.count) {
        document.getElementById('capture-btn').style.display = 'none';
        document.getElementById('camera-actions').style.display = 'flex';
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Bild konnte nicht geladen werden: ${src}`, { cause: err }));
        img.src = src;
    });
}

// --- GENERIERUNG DES FOTOSTREIFENS ---
async function generatePhotostrip(canvas) {
    const layout = layouts[state.selectedLayout];
    const photoWidth = (layout.cols === 2) ? 250 : 400;
    const photoHeight = (layout.cols === 2) ? 250 : 300;
    const padding = 20;
    const footerHeight = 100;

    canvas.width = layout.cols * photoWidth + (layout.cols + 1) * padding;
    canvas.height = layout.rows * photoHeight + (layout.rows + 1) * padding + footerHeight; 
    
    const ctx = canvas.getContext('2d');

    // 1. Hintergrund zeichnen
    try {
        if (state.backgroundImage) {
            const bgImg = await loadImage(state.backgroundImage);
            const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
            const bw = bgImg.width * scale, bh = bgImg.height * scale;
            const bx = (canvas.width - bw) / 2, by = (canvas.height - bh) / 2;
            ctx.drawImage(bgImg, bx, by, bw, bh);
        } else {
            ctx.fillStyle = state.background || '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } catch (err) {
        console.error("Hintergrund konnte nicht geladen werden:", err);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Fotos zeichnen
    const photoBlockWidth = layout.cols * photoWidth + (layout.cols - 1) * padding;
    const photoBlockHeight = layout.rows * photoHeight + (layout.rows - 1) * padding;
    const remainingHeight = canvas.height - footerHeight;
    const startX = (canvas.width - photoBlockWidth) / 2;
    const startY = (remainingHeight - photoBlockHeight) / 2; 

    try {
        const loadedImages = await Promise.all(state.photos.map(loadImage));
        
        loadedImages.forEach((img, idx) => {
            const col = idx % layout.cols;
            const row = Math.floor(idx / layout.cols);
            
            const x = startX + col * (photoWidth + padding);
            const y = startY + row * (photoHeight + padding);
            
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;
            ctx.drawImage(img, x, y, photoWidth, photoHeight);
            ctx.restore();
        });
    } catch (err) {
        console.error("Fotos konnten nicht geladen werden:", err);
    }
}

function setupCustomization() {
    const bgGrid = document.getElementById('bg-grid');
    bgGrid.innerHTML = '';
    const colorGrid = document.getElementById('color-grid');
    colorGrid.innerHTML = '';

    // Hintergrundbilder
    backgrounds.forEach((bg, index) => {
        const div = document.createElement('div');
        const isSelected = (!state.backgroundImage && index === 0) || (state.backgroundImage === bg.image);
        div.className = 'bg-option' + (isSelected ? ' selected' : '');
        div.style.backgroundImage = `url(${bg.image})`;
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center'; 
        div.title = bg.name;

        div.addEventListener('click', async () => { 
            document.querySelectorAll('.bg-option, .color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');

            state.backgroundImage = bg.image;
            state.background = null;
            await generatePhotostrip(photostripCanvas);
        });
        bgGrid.appendChild(div);
    });

    // Farben
    colors.forEach(color => {
        const div = document.createElement('div');
        const isSelected = !state.backgroundImage && state.background === color;
        div.className = 'color-option' + (isSelected ? ' selected' : '');
        div.style.backgroundColor = color;
        div.dataset.color = color;

        div.addEventListener('click', async () => { 
            document.querySelectorAll('.bg-option, .color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');

            state.background = color;
            state.backgroundImage = null;
            await generatePhotostrip(photostripCanvas);
        });
        colorGrid.appendChild(div);
    });

    if (!state.backgroundImage && !state.background) {
        colorGrid.firstChild.classList.add('selected');
        state.background = colors[0];
    } else if (state.backgroundImage) {
        document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    }
}


// --- START & KAMERA EVENT LISTENERS ---

document.querySelectorAll('.layout-card').forEach(card => {
    card.addEventListener('click', function () {
        document.querySelectorAll('.layout-card').forEach(otherCard => {
            otherCard.classList.remove('selected');
        });
        this.classList.add('selected');
        state.selectedLayout = parseInt(this.dataset.layout);
        document.getElementById('start-btn').style.display = 'flex';
    });
});

document.getElementById('start-btn').addEventListener('click', () => {
    showScreen('camera');
    spinner.classList.add('active');
    startCamera();
    updatePreviewGrid();
    updatePhotoCounter(true);
});

document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        state.colorMode = this.dataset.mode;
        document.getElementById('filter-hint-text').classList.add('active');
    });
});

document.getElementById('capture-btn').addEventListener('click', async () => {
    const layout = layouts[state.selectedLayout];
    const captureBtn = document.getElementById('capture-btn');
    captureBtn.disabled = true;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const isMultiPhotoLayout = (layout.count > 1);

    for (let i = 0; i < layout.count; i++) {
        const isLastPhoto = (i === layout.count - 1);
        updatePhotoCounter();

        let count = 3;
        countdownOverlay.textContent = count;
        countdownOverlay.classList.remove('is-hint');
        countdownOverlay.classList.add('active');

        while (count > 0) {
            await sleep(1000);
            count--;
            if (count > 0) countdownOverlay.textContent = count;
        }

        countdownOverlay.textContent = '📷';
        countdownOverlay.classList.remove('is-hint');
        await sleep(500);

        countdownOverlay.classList.remove('active');
        takePhoto();

        if (isMultiPhotoLayout && !isLastPhoto) {
            countdownOverlay.textContent = 'Super! Mach dich bereit für das nächste Foto...';
            countdownOverlay.classList.add('is-hint'); 
            countdownOverlay.classList.add('active');
            await sleep(2500);
            countdownOverlay.classList.remove('active');
            countdownOverlay.classList.remove('is-hint');
        } else if (isLastPhoto) {
            countdownOverlay.textContent = 'Fertig! Sieh dir deine Fotos an.';
            countdownOverlay.classList.add('is-hint');
            countdownOverlay.classList.add('active');
        }
    }
});

document.getElementById('retake-btn').addEventListener('click', () => {
    state.photos = [];
    updatePreviewGrid();
    updatePhotoCounter(true);

    const captureBtn = document.getElementById('capture-btn');
    captureBtn.style.display = 'block';
    captureBtn.disabled = false;

    document.getElementById('camera-actions').style.display = 'none';
    countdownOverlay.classList.remove('active');
    countdownOverlay.classList.remove('is-hint');
});

// --- NAVIGATION: Camera -> Customize ---
document.getElementById('next-btn').addEventListener('click', async () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }
    showScreen('customize');
    setupCustomization();
    await generatePhotostrip(photostripCanvas);
});

// --- ZEICHEN-LOGIK & NAVIGATION ---
const drawingScreen = document.getElementById('drawing-screen');
const drawingCanvas = document.getElementById('drawing-canvas');
const ctxDraw = drawingCanvas ? drawingCanvas.getContext('2d') : null;

let currentPenColor = '#bf953f'; // Standard: Gold
let isDrawing = false;
let drawHistory = [];

// Navigation: Customize -> Drawing Screen
const customizeNextBtn = document.getElementById('customize-next-btn');
if (customizeNextBtn) {
    customizeNextBtn.addEventListener('click', () => {
        document.getElementById('customize-screen').classList.remove('active');
        drawingScreen.classList.add('active');

        const photoCanvas = document.getElementById('photostrip-canvas');
        drawingCanvas.width = photoCanvas.width;
        drawingCanvas.height = photoCanvas.height;

        const guestNotice = document.getElementById('guest-login-notice');
        const penControls = document.getElementById('pen-controls');

        if (isGast) {
            if (guestNotice) guestNotice.style.display = 'none';
            if (penControls) penControls.style.display = 'block';
        } else {
            if (guestNotice) guestNotice.style.display = 'block';
            if (penControls) penControls.style.display = 'none';
        }

        ctxDraw.drawImage(photoCanvas, 0, 0);
        drawHistory = [ctxDraw.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height)];
    });
}

// Stiftfarben-Wechsel
document.querySelectorAll('.pen-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.pen-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const colorType = e.target.getAttribute('data-color');
        currentPenColor = (colorType === 'gold') ? '#bf953f' : '#00f0ff';
    });
});

// Malen-Funktionalität
if (drawingCanvas) {
    function startDrawing(e) {
        if (!isGast) return;
        isDrawing = true;
        draw(e);
    }

    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            ctxDraw.beginPath();
            drawHistory.push(ctxDraw.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
        }
    }

    function draw(e) {
        if (!isDrawing || !isGast) return;
        
        const rect = drawingCanvas.getBoundingClientRect();
        const scaleX = drawingCanvas.width / rect.width;
        const scaleY = drawingCanvas.height / rect.height;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctxDraw.lineWidth = 6;
        ctxDraw.lineCap = 'round';
        ctxDraw.strokeStyle = currentPenColor;

        ctxDraw.lineTo(x, y);
        ctxDraw.stroke();
        ctxDraw.beginPath();
        ctxDraw.moveTo(x, y);
    }

    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mousemove', draw);

    drawingCanvas.addEventListener('touchstart', startDrawing);
    drawingCanvas.addEventListener('touchend', stopDrawing);
    drawingCanvas.addEventListener('touchmove', draw);
}

document.getElementById('undo-draw-btn')?.addEventListener('click', () => {
    if (drawHistory.length > 1) {
        drawHistory.pop();
        ctxDraw.putImageData(drawHistory[drawHistory.length - 1], 0, 0);
    }
});

// --- NAVIGATION: Drawing -> Download (Inklusive Galerie-Save & Upload) ---
document.getElementById('drawing-next-btn')?.addEventListener('click', async () => {
    const finalCanvas = document.getElementById('final-canvas');
    finalCanvas.width = drawingCanvas.width;
    finalCanvas.height = drawingCanvas.height;
    finalCanvas.getContext('2d').drawImage(drawingCanvas, 0, 0);

    drawingScreen.classList.remove('active');
    const downloadScreen = document.getElementById('download-screen');
    downloadScreen.classList.add('active');

    // Bild in Galerie speichern
    savePhotoToGallery(finalCanvas);

    const qrTarget = document.getElementById('qr-code-target');
    const downloadBtn = document.getElementById('download-btn');
    const qrBtn = document.getElementById('qr-btn');
    
    // KORREKTUR: Buttons sofort anzeigen!
    downloadBtn.style.display = 'block';
    qrBtn.style.display = 'block';
    qrTarget.innerHTML = "Bild wird für QR-Code vorbereitet... ⏳";

    const uploadURL = `${API_BASE_URL}/upload`; 
    try {
        const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));
        const formData = new FormData();
        formData.append('file', blob, 'fiw-photobooth.png');

        const response = await fetch(uploadURL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Server-Fehler: ${response.statusText}`);

        const result = await response.json();
        if (!result.url) throw new Error("Server hat keine gültige URL zurückgegeben.");

        state.finalUrl = result.url;
        qrTarget.innerHTML = ""; // Text leeren, wenn Upload fertig
    } catch (err) {
        console.error("Upload-Fehler:", err);
        // Buttons bleiben sichtbar, aber Fehler wird im QR-Bereich angezeigt
        qrTarget.innerHTML = `<strong>Fehler beim Upload:</strong> QR-Code derzeit nicht verfügbar.<br>(${err.message})`;
        state.finalUrl = null;
    }
});

// --- KORRIGIERTER DOWNLOAD BUTTON ---
document.getElementById('download-btn').addEventListener('click', () => {
    try {
        const dataUrl = finalCanvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = 'fiw-winter-photobooth.png';
        link.href = dataUrl;
        
        // WICHTIG: Der Link muss für manche Browser kurz ins Dokument eingefügt werden!
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (err) {
        console.error("Download-Fehler (Tainted Canvas):", err);
        alert("Fehler beim Herunterladen! Der Browser blockiert das Bild aus Sicherheitsgründen (CORS). Nutze den QR-Code oder wende dich an den Admin.");
    }
});

document.getElementById("qr-btn").addEventListener("click", () => {
    const qrContainer = document.getElementById("qr-container");
    const qrDate = document.getElementById("qr-date");
    const qrTarget = document.getElementById("qr-code-target");

    qrDate.textContent = new Date().toLocaleString("de-DE");

    if (!state.finalUrl) {
        if (qrTarget.innerHTML === "") {
            qrTarget.innerHTML = `<strong>Fehler:</strong> Bild-URL nicht gefunden. Upload fehlgeschlagen?`;
        }
        qrContainer.classList.add("active");
        return;
    }

    qrTarget.innerHTML = "";
    const qrCanvas = document.createElement("canvas");
    new QRious({
        element: qrCanvas,
        value: state.finalUrl,
        size: 250,
        level: "L"
    });

    qrTarget.appendChild(qrCanvas);
    qrContainer.classList.add("active");
});

// --- ZURÜCK / RESTART BUTTONS ---
document.getElementById('restart-btn').addEventListener('click', () => {
    if (state.stream) state.stream.getTracks().forEach(track => track.stop());

    state = {
        screen: 'start',
        selectedLayout: null,
        photos: [],
        stream: null,
        countdown: null,
        background: '#ffffff',
        backgroundImage: null,
        colorMode: 'color',
        finalUrl: null,
        addDate: false 
    };
    
    document.querySelectorAll('.layout-card').forEach(card => card.classList.remove('selected'));
    document.querySelectorAll(".mode-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === "color"));
    
    const dateToggle = document.getElementById('date-toggle');
    if (dateToggle) dateToggle.checked = false;

    document.getElementById('start-btn').style.display = 'none';
    const captureBtn = document.getElementById('capture-btn');
    captureBtn.style.display = 'block';
    captureBtn.disabled = false;

    document.getElementById('camera-actions').style.display = 'none';
    document.getElementById('qr-container').classList.remove('active');
    countdownOverlay.classList.remove('active', 'is-hint');
    document.getElementById('filter-hint-text').classList.remove('active');

    showScreen('start');
});

document.getElementById('back-to-start').addEventListener('click', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
    state.photos = [];
    updatePreviewGrid();

    const captureBtn = document.getElementById('capture-btn');
    captureBtn.style.display = 'block';
    captureBtn.disabled = false;
    document.getElementById('camera-actions').style.display = 'none';
    document.getElementById('filter-hint-text').classList.remove('active'); 

    showScreen('start');
});

document.getElementById('back-to-camera').addEventListener('click', () => {
    showScreen('camera');
    spinner.classList.add('active');
    startCamera();
    updatePhotoCounter(true);
});

/* // KORRIGIERTER: "Zurück zur Gestaltung" Button
document.getElementById('back-to-customize')?.addEventListener('click', async () => {
    // 1. Den Zeichnen-Screen manuell schließen (falls er offen war)
    const drawingScreen = document.getElementById('drawing-screen');
    if (drawingScreen) {
        drawingScreen.classList.remove('active');
    }

    // 2. Die normale Navigation nutzen, um alle anderen Screens (wie Download) sauber auszublenden
    showScreen('customize');

    // 3. Wichtig: Den Fotostreifen für die Gestaltungs-Ansicht neu generieren!
    const photostripCanvas = document.getElementById('photostrip-canvas');
    if (photostripCanvas) {
        await generatePhotostrip(photostripCanvas);
    }
}); */

// --- LOGIN & AUTH ---
const authBtn = document.getElementById('auth-btn');
const loginModal = document.getElementById('login-modal');
const closeBtn = document.querySelector('.close-btn');
const statusBadge = document.getElementById('user-status-badge');
const loginForm = document.getElementById('login-form');

const ADMIN_HASH = '$2b$10$r/GjfuJv4Vk/NSH9LYXIJ.T0anlWDaQ8vYvzF2NO1l7nfaDPtNPPO';
const GAST_HASH = '$2b$10$0bPjzvfJBNDedUkdrb/.auj4yNLEXdlXgrN23aYFXT8xgiYzlcP3W';
let isGast = false; 

if (authBtn) {
    authBtn.addEventListener('click', () => {
        if (authBtn.innerText === 'Login') {
            loginModal.style.display = 'flex'; 
        } else {
            authBtn.innerText = 'Login';
            statusBadge.style.display = 'none';
            statusBadge.innerText = '';
            document.getElementById('admin-settings-btn').style.display = 'none';
            document.getElementById('guest-gallery-btn').style.display = 'none';
            alert('Erfolgreich ausgeloggt!');
        }
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const bcrypt = dcodeIO.bcrypt;

        if (user === 'admin' && bcrypt.compareSync(pass, ADMIN_HASH)) {
            currentUser = 'admin';
            document.getElementById('admin-settings-btn').style.display = 'inline-block';
            document.getElementById('guest-gallery-btn').style.display = 'none';
            isGast = false;
            loginModal.style.display = 'none'; 
            statusBadge.innerText = ' 🛠️ Admin';
            statusBadge.style.display = 'block';
            authBtn.innerText = 'Logout';
            alert('Erfolgreich als Admin eingeloggt! 🛠️');
        } 
        else if (user === 'gast' && bcrypt.compareSync(pass, GAST_HASH)) {
            currentUser = 'gast';
            document.getElementById('admin-settings-btn').style.display = 'none';
            document.getElementById('guest-gallery-btn').style.display = 'inline-block';
            isGast = true;
            loginModal.style.display = 'none'; 
            statusBadge.innerText = '👤 Gast';
            statusBadge.style.display = 'block';
            authBtn.innerText = 'Logout';

            const guestNotice = document.getElementById('guest-login-notice');
            const penControls = document.getElementById('pen-controls');
            if (guestNotice) guestNotice.style.display = 'none';
            if (penControls) penControls.style.display = 'block';
            
            alert('Erfolgreich als Gast eingeloggt! ❄️');
        } else {
            alert('Falscher Benutzername oder Passwort!');
        }
        
        loginForm.reset();
    });
}

// --- ADMIN FEATURE: Layout Toggles ---
document.addEventListener('DOMContentLoaded', () => {
    const defaultLayoutSettings = {
        layout1: true, layout2: true, layout3: true, layout4: true
    };

    function getLayoutSettings() {
        const saved = localStorage.getItem('photobooth_layouts');
        return saved ? JSON.parse(saved) : defaultLayoutSettings;
    }

    function updateGuestLayouts() {
        const settings = getLayoutSettings();
        for (let i = 1; i <= 4; i++) {
            const card = document.querySelector(`.layout-card[data-layout="${i}"]`);
            const isActive = settings[`layout${i}`];
            
            if (card) {
                if (isActive) card.classList.remove('layout-hidden');
                else card.classList.add('layout-hidden');
            }
            
            const checkbox = document.querySelector(`.layout-toggle-cb[data-layout="${i}"]`);
            if (checkbox) checkbox.checked = isActive;
        }
    }

    const checkboxes = document.querySelectorAll('.layout-toggle-cb');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const layoutId = this.getAttribute('data-layout');
            const settings = getLayoutSettings();
            
            settings[`layout${layoutId}`] = this.checked;
            localStorage.setItem('photobooth_layouts', JSON.stringify(settings));
            updateGuestLayouts();
        });
    });

    const adminSettingsBtn = document.getElementById('admin-settings-btn');
    const adminModal = document.getElementById('admin-modal');
    const closeAdminBtn = document.getElementById('close-admin-btn');

    if (adminSettingsBtn && adminModal && closeAdminBtn) {
        adminSettingsBtn.addEventListener('click', () => adminModal.style.display = 'flex');
        closeAdminBtn.addEventListener('click', () => adminModal.style.display = 'none');
    }

    updateGuestLayouts();
});

// --- GAST FEATURE: Galerie (LocalStorage) ---
const galleryBtn = document.getElementById('guest-gallery-btn');
const galleryModal = document.getElementById('gallery-modal');
const closeGalleryBtn = document.getElementById('close-gallery-btn');
const galleryGrid = document.getElementById('gallery-grid');

if (galleryBtn && galleryModal && closeGalleryBtn) {
    galleryBtn.addEventListener('click', () => {
        loadGallery();
        galleryModal.style.display = 'flex'; 
    });

    closeGalleryBtn.addEventListener('click', () => {
        galleryModal.style.display = 'none';
    });
}

// Globaler Klick-Listener für beide Modals
window.addEventListener('click', (event) => {
    if (event.target === loginModal) loginModal.style.display = 'none';
    if (event.target === galleryModal) galleryModal.style.display = 'none';
});

/* function loadGallery() {
    const savedPhotos = JSON.parse(localStorage.getItem('photobooth_gallery')) || [];
    
    if (galleryGrid) {
        galleryGrid.innerHTML = ''; 

        if (savedPhotos.length === 0) {
            galleryGrid.innerHTML = '<p id="empty-gallery-msg" style="grid-column: 1 / -1; text-align: center; color: #666;">Noch keine Bilder vorhanden.</p>';
        } else {
            savedPhotos.reverse().forEach(photoData => {
                const img = document.createElement('img');
                img.src = photoData;
                img.style.width = '100%';
                img.style.borderRadius = '8px';
                img.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                galleryGrid.appendChild(img);
            });
        }
    }
} */

    // Lädt die Bilder aus dem Speicher und erstellt die Galerie inkl. Lösch-Button
function loadGallery() {
    const savedPhotos = JSON.parse(localStorage.getItem('photobooth_gallery')) || [];
    
    if (galleryGrid) {
        galleryGrid.innerHTML = ''; // Grid leeren

        if (savedPhotos.length === 0) {
            galleryGrid.innerHTML = '<p id="empty-gallery-msg" style="grid-column: 1 / -1; text-align: center; color: #666;">Noch keine Bilder vorhanden.</p>';
        } else {
            // Wir zählen rückwärts, damit die neuesten Bilder (am Ende des Arrays) zuerst angezeigt werden.
            // Gleichzeitig behalten wir so den korrekten Array-Index "i" für das Löschen!
            for (let i = savedPhotos.length - 1; i >= 0; i--) {
                const photoData = savedPhotos[i];

                // Container für Bild + Button
                const itemDiv = document.createElement('div');
                itemDiv.className = 'gallery-item';

                // Das Bild
                const img = document.createElement('img');
                img.src = photoData;

                // Der Lösch-Button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-photo-btn';
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.title = 'Bild löschen';

                // Lösch-Logik
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Möchtest du dieses Bild wirklich aus der Galerie löschen?')) {
                        // Aktuelle Liste holen
                        let currentPhotos = JSON.parse(localStorage.getItem('photobooth_gallery')) || [];
                        // Genau dieses eine Bild anhand seines originalen Index entfernen
                        currentPhotos.splice(i, 1);
                        // Wieder im Browser speichern
                        localStorage.setItem('photobooth_gallery', JSON.stringify(currentPhotos));
                        // Galerie sofort neu laden, damit das Bild verschwindet
                        loadGallery();
                    }
                });

                // Alles zusammensetzen
                itemDiv.appendChild(img);
                itemDiv.appendChild(deleteBtn);
                galleryGrid.appendChild(itemDiv);
            }
        }
    }
}

function savePhotoToGallery(canvas) {
    try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        let savedPhotos = JSON.parse(localStorage.getItem('photobooth_gallery')) || [];
        
        if (savedPhotos.length >= 20) {
            savedPhotos.shift(); 
        }
        
        savedPhotos.push(dataUrl);
        localStorage.setItem('photobooth_gallery', JSON.stringify(savedPhotos));
    } catch(e) {
        console.error("Bild konnte nicht in der Galerie gespeichert werden (Speicher voll?)", e);
    }
}

// --- INIT ---
createSnowflakes();