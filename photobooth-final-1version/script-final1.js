// 1. Das "state"-Objekt ist "let", da es beim Neustart komplett überschrieben wird.
let state = {
    screen: 'start',
    selectedLayout: null,
    photos: [],
    stream: null,
    countdown: null,
    background: '#ffffff', // Lila Hintergrund wurde durch weiß ersetzt
    colorMode: 'color' // NEU: von V1
};

// 2. Alle "globalen" Variablen, die sich nie ändern, sind jetzt "const".
const layouts = {
    1: { cols: 1, rows: 3, count: 3 },
    2: { cols: 1, rows: 4, count: 4 },
    3: { cols: 1, rows: 1, count: 1 }, // V2 "Instax"
    4: { cols: 2, rows: 2, count: 4 }  // NEU: V1 "2x2 Grid"
};

// Link mit bildern als Hintergrund
const backgrounds = [
    { name: 'Snowflakes', image: 'Bilder/1.png' },
    { name: 'Christmas Tree', image: 'Bilder/2.png'},
    { name: 'Snow', image: 'Bilder/3.png' },
    { name: 'Snow', image: 'Bilder/4.png' },
    { name: 'Snow', image: 'Bilder/5.png' },
];


const colors = ['#ffffff', '#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', '#fce4ec'];

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
    if (!container) return; // Sicherheitshalber
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
        showScreen('start'); // Bei Fehler zurück zum Startbildschirm
    } finally {
        spinner.classList.remove('active'); // Spinner verstecken
    }
}

function updatePreviewGrid() {
    const layout = layouts[state.selectedLayout];
    if (!layout) return; // Abbruch, wenn kein Layout gewählt
    
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

// ANGEPASST: updatePhotoCounter (V2) - Funktioniert jetzt mit dem <div> von V1
function updatePhotoCounter(initial = false) {
    const layout = layouts[state.selectedLayout];
    if (!layout) return;
    
    const counter = document.getElementById('photo-counter');
    const captureBtn = document.getElementById('capture-btn');
    
    if (initial) {
        counter.textContent = `(${layout.count} Foto${layout.count > 1 ? 's' : ''})`;
    } else {
        const current = state.photos.length < layout.count ? state.photos.length + 1 : layout.count;
        counter.textContent = `(${current}/${layout.count})`;
    }
}

// NEU: S/W-Filterfunktion von V1
function applyColorMode(ctx, canvas) {
    if (state.colorMode === "bw") {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray =
                data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
    }
}

// GEMERGT: takePhoto (V2-Logik + V1-Spiegelung & S/W-Filter)
function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // NEU: Spiegelung von V1
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    
    // NEU: S/W-Filterung von V1
    applyColorMode(ctx, canvas);

    const photoData = canvas.toDataURL('image/png');
    state.photos.push(photoData);
    
    updatePreviewGrid();

    // V2-Logik beibehalten
    if (state.photos.length !== layouts[state.selectedLayout].count) {
        updatePhotoCounter();
    }

    const layout = layouts[state.selectedLayout];
    if (state.photos.length === layout.count) {
        document.getElementById('capture-btn').style.display = 'none';
        document.getElementById('camera-actions').style.display = 'flex';
    }
}
//Laura: Funktion angepasst
function setupCustomization() {
    const bgGrid = document.getElementById('bg-grid');
    bgGrid.innerHTML = '';

    backgrounds.forEach((bg, index) => {
        const div = document.createElement('div');
        div.className = 'bg-option' + (index === 0 ? ' selected' : '');
        div.style.backgroundImage = `url(${bg.image})`; // Bild im Kreis
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center';
        div.title = bg.name;
        div.dataset.background = bg.image; // <- hier auf Bild setzen

        div.addEventListener('click', () => {
            document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            state.background = div.dataset.background; // <- Bild wird nun als Hintergrund genutzt
            generatePhotostrip(photostripCanvas);
        });

        bgGrid.appendChild(div);
    });

    // Farben bleiben gleich
    const colorGrid = document.getElementById('color-grid');
    colorGrid.innerHTML = '';
    colors.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-option';
        div.style.backgroundColor = color;
        div.dataset.color = color;

        div.addEventListener('click', () => {
            document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('selected'));
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            state.background = div.dataset.color;
            generatePhotostrip(photostripCanvas);
        });
        colorGrid.appendChild(div);
    });
}
// --- GENERIEREN DES FOTOSTREIFENS ---
function generatePhotostrip(canvas) {
    const layout = layouts[state.selectedLayout]; // aktuelles Layout laden
    const photoWidth = (layout.cols === 2) ? 250 : 400;  // Breite der Fotos (kleiner bei 2x2)
    const photoHeight = (layout.cols === 2) ? 250 : 300; // Höhe der Fotos
    const padding = 20; // Abstand zwischen den Fotos

    // Canvas-Größe berechnen (inkl. Padding + extra Platz unten für Instax-Stil)
    canvas.width = layout.cols * photoWidth + (layout.cols + 1) * padding;
    canvas.height = layout.rows * photoHeight + (layout.rows + 1) * padding + 100;
    const ctx = canvas.getContext('2d');

    // --- FUNKTION ZUM ZEICHNEN DER FOTOS ---
    function drawPhotos() {
        // Gesamtgröße des Fotoblocks
        const photoBlockWidth = layout.cols * photoWidth + (layout.cols - 1) * padding;
        const photoBlockHeight = layout.rows * photoHeight + (layout.rows - 1) * padding;

        // Startposition für zentrierten Block auf dem Canvas
        const startX = (canvas.width - photoBlockWidth) / 2;
        const startY = (canvas.height - photoBlockHeight - 100) / 2; // extra unten für Instax

        state.photos.forEach((photo, idx) => {
            const img = new Image();
            img.src = photo;
            const col = idx % layout.cols;             // Spalte des Fotos
            const row = Math.floor(idx / layout.cols); // Reihe des Fotos

            img.onload = () => {
                const x = startX + col * (photoWidth + padding); // X-Position
                const y = startY + row * (photoHeight + padding); // Y-Position

                // Schatten für Fotostreifen
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 5;
                ctx.restore();

                ctx.drawImage(img, x, y, photoWidth, photoHeight); // Foto zeichnen
            };
        });
    }

    // --- HINTERGRUND HANDHABEN ---
    if (state.backgroundImage) {
        // Wenn ein Hintergrundbild gewählt wurde
        const bgImg = new Image();
        bgImg.src = state.backgroundImage;
        bgImg.onload = () => {
            // Bild proportional skalieren, sodass es das Canvas ausfüllt
            const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
            const bw = bgImg.width * scale;
            const bh = bgImg.height * scale;
            const bx = (canvas.width - bw) / 2; // zentrieren horizontal
            const by = (canvas.height - bh) / 2; // zentrieren vertikal
            ctx.drawImage(bgImg, bx, by, bw, bh);

            drawPhotos(); // Fotos erst nach Laden des Hintergrunds
        };
    } else {
        // Wenn Farbe oder Gradient als Hintergrund
        if (state.background?.startsWith('linear-gradient')) {
            const colorMatches = state.background.match(/#[a-f0-9]{6}/gi);
            if (colorMatches && colorMatches.length >= 2) {
                const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                grad.addColorStop(0, colorMatches[0]);
                grad.addColorStop(1, colorMatches[colorMatches.length - 1]);
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = state.background; // fallback
            }
        } else {
            ctx.fillStyle = state.background || '#f8f8f8ff'; // Farbe auswählen oder weiß
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Hintergrund füllen
        drawPhotos(); // Fotos zeichnen
    }
}

// --- CUSTOMIZATION (HINTERGRUND + FARBEN) ---
function setupCustomization() {
    const bgGrid = document.getElementById('bg-grid'); // Container für Hintergrundbilder
    bgGrid.innerHTML = ''; // alte Optionen löschen
    const colorGrid = document.getElementById('color-grid'); // Container für Farben
    colorGrid.innerHTML = ''; // alte Optionen löschen

    // --- HINTERGRUNDBILDER ---
    backgrounds.forEach((bg, index) => {
        const div = document.createElement('div');
        div.className = 'bg-option' + (index === 0 ? ' selected' : ''); // erste ausgewählt
        div.style.backgroundImage = `url(${bg.image})`;
        div.style.backgroundSize = 'cover';   // Bild skalieren
        div.style.backgroundPosition = 'center'; // zentrieren
        div.title = bg.name;

        div.addEventListener('click', () => {
            document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('selected'));
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');

            state.backgroundImage = bg.image;   // Bild wählen
            state.background = null;             // Farbe deaktivieren
            generatePhotostrip(photostripCanvas);
        });

        bgGrid.appendChild(div);
    });

    // --- FARBOPTIONEN ---
    colors.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-option';
        div.style.backgroundColor = color;
        div.dataset.color = color;

        div.addEventListener('click', () => {
            document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('selected'));
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');

            state.background = color;          // Farbe wählen
            state.backgroundImage = null;       // Bild deaktivieren
            generatePhotostrip(photostripCanvas);
        });

        colorGrid.appendChild(div);
    });
}

// --- EVENT LISTENERS ---

document.querySelectorAll('.layout-card').forEach(card => {
    card.addEventListener('click', function() { 
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
    updatePhotoCounter(true); // Ruft den "Hinweis"-Text auf
});

// NEU: Event-Listener für S/W-Schalter (von V1)
document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
        document
            .querySelectorAll(".mode-btn")
            .forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        state.colorMode = this.dataset.mode;
    });
});


// GEMERGT: capture-btn Listener (V2-Logik, aber ohne Text-Updates für den Button)
document.getElementById('capture-btn').addEventListener('click', async () => {
    const layout = layouts[state.selectedLayout];
    const captureBtn = document.getElementById('capture-btn');
    
    captureBtn.disabled = true; 
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const isMultiPhotoLayout = (layout.count > 1);

    for (let i = 0; i < layout.count; i++) {
        const isLastPhoto = (i === layout.count - 1); 
        
        // V2-Text-Update-Logik (captureBtn.firstChild.textContent) entfernt,
        // da der runde Button keinen Text hat.
        
        updatePhotoCounter(); // Zähler aktualisieren
        
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
        } else if (isLastPhoto) { // Zeigt "Fertig" bei Multi-Foto und Einzelfoto
            countdownOverlay.textContent = 'Fertig! Sieh dir deine Fotos an.';
            countdownOverlay.classList.add('is-hint');
            countdownOverlay.classList.add('active');
        }
    }
});

// V2-Listener (korrigiert)
document.getElementById('retake-btn').addEventListener('click', () => {
    state.photos = [];
    updatePreviewGrid();
    updatePhotoCounter(true); // Setzt den "Hinweis"-Text zurück

    const captureBtn = document.getElementById('capture-btn');
    captureBtn.style.display = 'block';
    captureBtn.disabled = false; 

    document.getElementById('camera-actions').style.display = 'none';

    countdownOverlay.classList.remove('active');
    countdownOverlay.classList.remove('is-hint');
});

document.getElementById('next-btn').addEventListener('click', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }
    showScreen('customize');
    setupCustomization();
    generatePhotostrip(photostripCanvas);
});

document.getElementById('customize-next-btn').addEventListener('click', () => {
    showScreen('download');
    generatePhotostrip(finalCanvas);
});

document.getElementById('download-btn').addEventListener('click', () => {
    const dataUrl = finalCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'fiw-winter-photobooth.png';
    link.href = dataUrl;
    link.click();
});

// KORRIGIERTER QR-Code-Listener (von V1-Reparatur)
document.getElementById("qr-btn").addEventListener("click", () => {
    const qrContainer = document.getElementById("qr-container");
    const qrDate = document.getElementById("qr-date");
    const qrTarget = document.getElementById("qr-code-target");

    qrDate.textContent = new Date().toLocaleString("de-DE");
    qrTarget.innerHTML = "";

    // JPEG für kleinere Dateigröße bei QR-Codes
    const dataUrl = finalCanvas.toDataURL("image/jpeg", 0.7);

    try {
        const qrCanvas = document.createElement("canvas");
        new QRious({
            element: qrCanvas,
            value: dataUrl,
            size: 250,
            level: "L", // 'L' (Low) für maximale Datenkapazität
        });
        qrTarget.appendChild(qrCanvas);
    } catch (e) {
        console.error("QR-Code-Fehler:", e);
        qrTarget.innerHTML =
            '<p style="color: red; font-size: 0.9rem;">Fehler: Das Bild ist zu groß für einen QR-Code. Versuche einen einfacheren Hintergrund.</p>';
    }

    qrContainer.classList.add("active");
});


// KORRIGIERTER restart-btn Listener (V2)
document.getElementById('restart-btn').addEventListener('click', () => {
    // Stoppt Stream, falls Benutzer von Kamera direkt neu startet (obwohl nicht sichtbar)
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }

    state = {
        screen: 'start',
        selectedLayout: null,
        photos: [],
        stream: null,
        countdown: null,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        colorMode: 'color' // Zustand zurücksetzen
    };
    
    document.querySelectorAll('.layout-card').forEach(card => {
        card.classList.remove('selected');
    });

    // S/W-Schalter zurücksetzen
    document.querySelectorAll(".mode-btn").forEach((btn) => {
        if (btn.dataset.mode === "color") {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    document.getElementById('start-btn').style.display = 'none';
    
    const captureBtn = document.getElementById('capture-btn');
    captureBtn.style.display = 'block';
    captureBtn.disabled = false; 

    document.getElementById('camera-actions').style.display = 'none';
    document.getElementById('qr-container').classList.remove('active');

    countdownOverlay.classList.remove('active');
    countdownOverlay.classList.remove('is-hint');

    showScreen('start');
});

// "Zurück"-Button Event Listeners (V2)
document.getElementById('back-to-start').addEventListener('click', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null; 
    }
    state.photos = [];
    updatePreviewGrid(); 
    
    const captureBtn = document.getElementById('capture-btn');
    captureBtn.style.display = 'block';
    captureBtn.disabled = false; // Wichtig
    document.getElementById('camera-actions').style.display = 'none';

    showScreen('start');
});

document.getElementById('back-to-camera').addEventListener('click', () => {
    showScreen('camera');
    spinner.classList.add('active');
    startCamera(); 
    updatePhotoCounter(true); // "Hinweis"-Text wiederherstellen
});

document.getElementById('back-to-customize').addEventListener('click', () => {
    showScreen('customize');
});

// --- INIT ---
createSnowflakes();