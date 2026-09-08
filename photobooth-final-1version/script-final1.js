const API_BASE_URL = 'https://photobooth-4r1k.onrender.com';

// 1. Das "state"-Objekt ist "let"
let state = {
    screen: 'start',
    selectedLayout: null,
    photos: [],
    stream: null,
    countdown: null,
    background: '#ffffff', // Standard-Hintergrund
    backgroundImage: null, // Für Bild-Hintergründe
    colorMode: 'color',
    finalUrl: null // Für Server-Upload
};
    
// 2. Alle "globalen" Variablen, die sich nie ändern, sind jetzt "const".
const layouts = {
    1: { cols: 1, rows: 3, count: 3 },
    2: { cols: 1, rows: 4, count: 4 },
    3: { cols: 1, rows: 1, count: 1 },
    4: { cols: 2, rows: 2, count: 4 }
};

// Link mit Bildern als Hintergrund
const backgrounds = [
    { name: 'Schleifen', image: 'bilder/1.png' },
    { name: 'Tannenbaum', image: 'bilder/2.png' },
    { name: 'Christmas Tree', image: 'bilder/3.png' },
    { name: 'Schnee', image: 'bilder/4.jpeg' },
    { name: 'Schlittschuhe', image: 'bilder/5.png' },
    //{ name: 'Tannenbaum', image: 'bilder/6.png' },
    { name: 'Schneeflocken Rand', image: 'bilder/7.jpeg' },
    { name: 'Schneeflocken', image: 'bilder/8.jpeg' },
];

const colors = ['#ffffff', '#bcdbf1ff', '#e4c5e9ff', '#c9f5cdff', '#fae9cdff', '#e49cb4ff'];

// 3. Alle DOM-Element-Referenzen sind ebenfalls "const".
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

// --- FUNCTIONS ---

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

async function startCamera() {
    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        state.stream = mediaStream;
        video.srcObject = mediaStream;
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
    if (state.colorMode === "color") {
        return; // Nichts tun
    }

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
    
    ctx.scale(-1, 1); // Spiegelung
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    
    applyColorMode(ctx, canvas); // Filter anwenden

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

// NEU: Helferfunktion, um ein Bild zu laden (gibt ein Promise zurück)
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Keine crossOrigin-Einstellung, um lokale/CORS-Probleme zu vermeiden.
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Bild konnte nicht geladen werden: ${src}`, { cause: err }));
        img.src = src;
    });
}

async function startCamera() {
    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        state.stream = mediaStream;
        video.srcObject = mediaStream;

        // WICHTIG: Füge 'muted' im HTML-Video-Tag hinzu, um Autoplay-Fehler zu vermeiden.
        // Außerdem hier .play() aufrufen, um sicherzustellen, dass die Wiedergabe startet,
        // sobald der Stream bereit ist, um den Fehler "The play method is not allowed..." 
        // zu umgehen, wenn 'muted' gesetzt ist.
        video.play().catch(e => console.error("Video Playback Startfehler (wegen Autoplay-Regeln):", e));

    } catch (err) {
        console.error("Kamerafehler:", err);
        alert('Kamerazugriff verweigert. Bitte erlaube den Kamerazugriff.');
        showScreen('start');
    } finally {
        spinner.classList.remove('active');
    }
}

// --- KORRIGIERTE GENERIERUNG DES FOTOSTREIFENS (ASYNC) ---
async function generatePhotostrip(canvas) {
    const layout = layouts[state.selectedLayout];
    const photoWidth = (layout.cols === 2) ? 250 : 400;
    const photoHeight = (layout.cols === 2) ? 250 : 300;
    const padding = 20;
    const footerHeight = 100; // Platz für QR-Code/Datum/Branding

    // Canvas Breite basiert auf Spalten, Padding
    canvas.width = layout.cols * photoWidth + (layout.cols + 1) * padding;
    // Canvas Höhe basiert auf Zeilen, Padding UND Footer/Header
    canvas.height = layout.rows * photoHeight + (layout.rows + 1) * padding + footerHeight; 
    
    const ctx = canvas.getContext('2d');

    // --- 1. HINTERGRUND ZEICHNEN ---
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

    // --- 2. FOTOS ZEICHNEN ---
    const photoBlockWidth = layout.cols * photoWidth + (layout.cols - 1) * padding;
    const photoBlockHeight = layout.rows * photoHeight + (layout.rows - 1) * padding;
    
    // KORRIGIERTE Y-STARTPUNKT BERECHNUNG:
    // Die Fotos werden jetzt nur im oberen Bereich des Canvas zentriert,
    // um Platz für den Footer (100px) zu lassen.
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
    


// --- CUSTOMIZATION (HINTERGRUND + FARBEN) ---
function setupCustomization() {
    const bgGrid = document.getElementById('bg-grid');
    bgGrid.innerHTML = '';
    const colorGrid = document.getElementById('color-grid');
    colorGrid.innerHTML = '';

    // --- HINTERGRUNDBILDER ---
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

    // --- FARBOPTIONEN ---
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


// --- EVENT LISTENERS ---

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
        document
            .querySelectorAll(".mode-btn")
            .forEach((b) => b.classList.remove("active"));
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
            if (count > 0) {
                countdownOverlay.textContent = count;
            }
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

document.getElementById('next-btn').addEventListener('click', async () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }
    showScreen('customize');
    setupCustomization();
    await generatePhotostrip(photostripCanvas);
});

// KORRIGIERTER 'customize-next-btn' LISTENER
document.getElementById('customize-next-btn').addEventListener('click', async () => {
    showScreen('download');

    const qrTarget = document.getElementById('qr-code-target');
    const downloadBtn = document.getElementById('download-btn');
    const qrBtn = document.getElementById('qr-btn');

    // Buttons verstecken, bis alles fertig ist
    downloadBtn.style.display = 'none';
    qrBtn.style.display = 'none';

    // Warten, bis generatePhotostrip() FERTIG ist
    await generatePhotostrip(finalCanvas);
    // Ab hier ist der finalCanvas garantiert voll gezeichnet!

    // Buttons jetzt anzeigen
    downloadBtn.style.display = 'block';
    qrBtn.style.display = 'block';

    // --- START: Upload-Logik ---
// KORREKTUR: Verwenden Sie Backticks (`) statt Anführungszeichen (')
const uploadURL = `${API_BASE_URL}/upload`; 
//                               ^        ^
   

    try {
        const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));
        const formData = new FormData();
        formData.append('file', blob, 'fiw-photobooth.png');

        const response = await fetch(uploadURL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`Server-Fehler: ${response.statusText}`);

        const result = await response.json();
        if (!result.url) throw new Error("Server hat keine gültige URL zurückgegeben.");

        state.finalUrl = result.url;
        qrTarget.innerHTML = ""; // Lade-Text entfernen

    } catch (err) {
        console.error("Upload-Fehler (beim Generieren):", err);
        qrTarget.innerHTML = `<strong>Fehler:</strong> Bild konnte nicht hochgeladen werden.<br>(${err.message})`;
        state.finalUrl = null;
    }
    // --- ENDE: Upload-Logik ---
});

document.getElementById('download-btn').addEventListener('click', () => {
    const dataUrl = finalCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'fiw-winter-photobooth.png';
    link.href = dataUrl;
    link.click();
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
        value: state.finalUrl, // BENUTZT DIE SERVER-URL
        size: 250,
        level: "L"
    });

    qrTarget.appendChild(qrCanvas);
    qrContainer.classList.add("active");
});


// KORRIGIERTE 'restart-btn' FUNKTION
document.getElementById('restart-btn').addEventListener('click', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }

    // --- KORREKTER STATE-RESET ---
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
        addDate: false // Datum-State auch zurücksetzen
    };
    // --- ENDE STATE-RESET ---
    
    document.querySelectorAll('.layout-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Filter-Schalter zurücksetzen
    document.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.mode === "color");
    });

    // Datum-Schalter zurücksetzen
    const dateToggle = document.getElementById('date-toggle');
    if (dateToggle) dateToggle.checked = false;

    document.getElementById('start-btn').style.display = 'none';

    const captureBtn = document.getElementById('capture-btn');
    captureBtn.style.display = 'block';
    captureBtn.disabled = false;

    document.getElementById('camera-actions').style.display = 'none';
    document.getElementById('qr-container').classList.remove('active');

    countdownOverlay.classList.remove('active');
    countdownOverlay.classList.remove('is-hint');

    document.getElementById('filter-hint-text').classList.remove('active');

    showScreen('start');
});

// "Zurück"-Button Event Listeners
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

// KORRIGIERT: "await" hinzugefügt
document.getElementById('back-to-customize').addEventListener('click', async () => {
    showScreen('customize');
    await generatePhotostrip(photostripCanvas);
});

// --- LOGIN MODAL LOGIK ---

const authBtn = document.getElementById('auth-btn');
const loginModal = document.getElementById('login-modal');
const closeBtn = document.querySelector('.close-btn');
const statusBadge = document.getElementById('user-status-badge');
const loginForm = document.getElementById('login-form');

// 1. Klick auf den Button oben rechts (Öffnen oder Logout) LOGOUT!!!!!!
if (authBtn) {
    authBtn.addEventListener('click', () => {
        if (authBtn.innerText === 'Login') {
            loginModal.style.display = 'flex'; // Fenster öffnen
        } else {
            // LOGOUT durchführen
            authBtn.innerText = 'Login';
            statusBadge.style.display = 'none';
            statusBadge.innerText = '';
            document.getElementById('admin-settings-btn').style.display = 'none';
            alert('Erfolgreich ausgeloggt!');
        }
    });
}

// 2. Fenster schließen (Klick auf X oder daneben)
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
}
window.addEventListener('click', (event) => {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
});

// Unsere Hashes
const ADMIN_HASH = '$2b$10$r/GjfuJv4Vk/NSH9LYXIJ.T0anlWDaQ8vYvzF2NO1l7nfaDPtNPPO';
const GAST_HASH = '$2b$10$0bPjzvfJBNDedUkdrb/.auj4yNLEXdlXgrN23aYFXT8xgiYzlcP3W';

let isGast = false; //new

if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        
        // Zugriff auf das CDN-bcrypt Objekt
        const bcrypt = dcodeIO.bcrypt;

        // ADMIN LOGIN
        if (user === 'admin' && bcrypt.compareSync(pass, ADMIN_HASH)) {
            currentUser = 'admin';
            document.getElementById('admin-settings-btn').style.display = 'inline-block';
            isGast = false;
            loginModal.style.display = 'none'; 
            statusBadge.innerText = ' 🛠️ Admin';
            statusBadge.style.display = 'block';
            authBtn.innerText = 'Logout';
            alert('Erfolgreich als Admin eingeloggt! 🛠️');
        } 
        // GAST LOGIN
        else if (user === 'gast' && bcrypt.compareSync(pass, GAST_HASH)) {
            currentUser = 'gast';
            document.getElementById('admin-settings-btn').style.display = 'none';
            isGast = true;
            loginModal.style.display = 'none'; 
            statusBadge.innerText = '👤 Gast';
            statusBadge.style.display = 'block';
            authBtn.innerText = 'Logout';

            // ⚡ HIER IST DIE KORREKTUR: Bildschirm direkt freischalten! ⚡
            const guestNotice = document.getElementById('guest-login-notice');
            const penControls = document.getElementById('pen-controls');
            if (guestNotice) guestNotice.style.display = 'none';
            if (penControls) penControls.style.display = 'block';
            
            alert('Erfolgreich als Gast eingeloggt! ❄️');
        } 
        // FEHLER
        else {
            alert('Falscher Benutzername oder Passwort!');
        }
        
        loginForm.reset();
    });
}

/* ========================================================
   ADMIN FEATURE: Layout Toggles (LocalStorage)
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Standard-Einstellungen (Alle Layouts an)
    const defaultLayoutSettings = {
        layout1: true, layout2: true, layout3: true, layout4: true
    };

    // 1. Einstellungen aus dem LocalStorage laden
    function getLayoutSettings() {
        const saved = localStorage.getItem('photobooth_layouts');
        return saved ? JSON.parse(saved) : defaultLayoutSettings;
    }

    // 2. Ansicht für Gäste aktualisieren (Karten ein/ausblenden)
    function updateGuestLayouts() {
        const settings = getLayoutSettings();
        
        // Durchläuft die Layouts 1 bis 4
        for (let i = 1; i <= 4; i++) {
            const card = document.querySelector(`.layout-card[data-layout="${i}"]`);
            const isActive = settings[`layout${i}`];
            
            if (card) {
                // Wenn aktiv, entferne 'layout-hidden', sonst füge es hinzu
                if (isActive) {
                    card.classList.remove('layout-hidden');
                } else {
                    card.classList.add('layout-hidden');
                }
            }
            
            // Setze auch die Häkchen im Admin-Bereich passend
            const checkbox = document.querySelector(`.layout-toggle-cb[data-layout="${i}"]`);
            if (checkbox) checkbox.checked = isActive;
        }
    }

    // 3. Event-Listener für die Admin-Checkoxen
    const checkboxes = document.querySelectorAll('.layout-toggle-cb');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const layoutId = this.getAttribute('data-layout');
            const settings = getLayoutSettings();
            
            // Wert im Objekt aktualisieren
            settings[`layout${layoutId}`] = this.checked;
            
            // Im Browser speichern
            localStorage.setItem('photobooth_layouts', JSON.stringify(settings));
            
            // Startbildschirm live aktualisieren
            updateGuestLayouts();
        });
    });

    // 4. Admin Modal öffnen / schließen (UI Logik)
    const adminSettingsBtn = document.getElementById('admin-settings-btn');
    const adminModal = document.getElementById('admin-modal');
    const closeAdminBtn = document.getElementById('close-admin-btn');

    if (adminSettingsBtn && adminModal && closeAdminBtn) {
        adminSettingsBtn.addEventListener('click', () => {
            adminModal.style.display = 'flex'; // Öffnet das Modal
        });

        closeAdminBtn.addEventListener('click', () => {
            adminModal.style.display = 'none'; // Schließt das Modal
        });
    }

    // Beim Start einmal ausführen, damit abgewählte Layouts direkt weg sind
    updateGuestLayouts();
});


// ----------------------------------------------------
// ZEICHEN-LOGIK & BILD-ÜBERTRAGUNG
// ----------------------------------------------------
const drawingScreen = document.getElementById('drawing-screen');
const drawingCanvas = document.getElementById('drawing-canvas');
const ctxDraw = drawingCanvas ? drawingCanvas.getContext('2d') : null;

let currentPenColor = '#bf953f'; // Standard: Gold
let isDrawing = false;
let drawHistory = [];

// Beim Klick auf "Weiter zum Unterschreiben" im Customize-Screen
const customizeNextBtn = document.getElementById('customize-next-btn');
if (customizeNextBtn) {
    customizeNextBtn.addEventListener('click', () => {
        document.getElementById('customize-screen').classList.remove('active');
        drawingScreen.classList.add('active');

        const photoCanvas = document.getElementById('photostrip-canvas');
        drawingCanvas.width = photoCanvas.width;
        drawingCanvas.height = photoCanvas.height;

        // Hinweis-Box & Stift-Auswahl finden
        const guestNotice = document.getElementById('guest-login-notice');
        const penControls = document.getElementById('pen-controls');

        // Prüfen ob Gast angemeldet ist
        if (isGast) {
            if (guestNotice) guestNotice.style.display = 'none';
            if (penControls) penControls.style.display = 'block';
        } else {
            if (guestNotice) guestNotice.style.display = 'block';
            if (penControls) penControls.style.display = 'none';
        }

        // Bild von Customize auf das Zeichnen-Canvas kopieren
        ctxDraw.drawImage(photoCanvas, 0, 0);
        drawHistory = [ctxDraw.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height)];
    });
}

// Stiftfarben-Wechsel (Nur Gold & Blau)
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
        if (!isGast) return; // Wenn kein Gast -> Zeichnen sperren
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

// Buttons für Navigation
document.getElementById('back-to-customize')?.addEventListener('click', () => {
    drawingScreen.classList.remove('active');
    document.getElementById('customize-screen').classList.add('active');
});

document.getElementById('drawing-next-btn')?.addEventListener('click', () => {
    const finalCanvas = document.getElementById('final-canvas');
    finalCanvas.width = drawingCanvas.width;
    finalCanvas.height = drawingCanvas.height;
    finalCanvas.getContext('2d').drawImage(drawingCanvas, 0, 0);

    drawingScreen.classList.remove('active');
    document.getElementById('download-screen').classList.add('active');
});

document.getElementById('undo-draw-btn')?.addEventListener('click', () => {
    if (drawHistory.length > 1) {
        drawHistory.pop();
        ctxDraw.putImageData(drawHistory[drawHistory.length - 1], 0, 0);
    }
});

// --- INIT ---
createSnowflakes(); 