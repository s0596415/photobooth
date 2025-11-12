// 1. Das "state"-Objekt ist "let", da es beim Neustart komplett überschrieben wird.
let state = {
    screen: 'start',
    selectedLayout: null,
    photos: [],
    stream: null,
    countdown: null,
    background: '#ffffff', // Standard-Hintergrund
    backgroundImage: null, // NEU: Für Bild-Hintergründe
    colorMode: 'color',
    finalUrl: null // Für Server-Upload (falls benötigt)
};

// 2. Alle "globalen" Variablen, die sich nie ändern, sind jetzt "const".
const layouts = {
    1: { cols: 1, rows: 3, count: 3 },
    2: { cols: 1, rows: 4, count: 4 },
    3: { cols: 1, rows: 1, count: 1 }, // V2 "Instax"
    4: { cols: 2, rows: 2, count: 4 }  // NEU: V1 "2x2 Grid"
};

// Link mit bildern als Hintergrund
const backgrounds = [
    { name: 'Snowflakes', image: 'Bilder/1.png' },
    { name: 'Christmas Tree', image: 'Bilder/2.png'},
    { name: 'Snow', image: 'Bilder/3.png' },
    { name: 'Snow', image: 'Bilder/4.jpeg' },
    { name: 'Snow', image: 'Bilder/5.png' },
    { name: 'Snow', image: 'Bilder/6.png' },
    { name: 'Snow', image: 'Bilder/7.jpeg' },
    { name: 'Snow', image: 'Bilder/8.jpeg' },
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

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.scale(-1, 1); // Spiegelung
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    
    applyColorMode(ctx, canvas); // S/W-Filter

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

// --- GENERIEREN DES FOTOSTREIFENS ---
// (Diese Funktion ist die korrekte aus test-2.html und script-final1.js)
function generatePhotostrip(canvas) {
    const layout = layouts[state.selectedLayout];
    const photoWidth = (layout.cols === 2) ? 250 : 400;
    const photoHeight = (layout.cols === 2) ? 250 : 300;
    const padding = 20;

    canvas.width = layout.cols * photoWidth + (layout.cols + 1) * padding;
    canvas.height = layout.rows * photoHeight + (layout.rows + 1) * padding + 100;
    const ctx = canvas.getContext('2d');

    function drawPhotos() {
        const photoBlockWidth = layout.cols * photoWidth + (layout.cols - 1) * padding;
        const photoBlockHeight = layout.rows * photoHeight + (layout.rows - 1) * padding;
        const startX = (canvas.width - photoBlockWidth) / 2;
        const startY = (canvas.height - photoBlockHeight - 100) / 2;

        state.photos.forEach((photo, idx) => {
            const img = new Image();
            img.src = photo;
            const col = idx % layout.cols;
            const row = Math.floor(idx / layout.cols);

            img.onload = () => {
                const x = startX + col * (photoWidth + padding);
                const y = startY + row * (photoHeight + padding);
                
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 5;
                ctx.restore(); // Schatten wieder entfernen, damit er nicht auf das Bild gezeichnet wird
                
                ctx.drawImage(img, x, y, photoWidth, photoHeight);
            };
        });
    }

    // --- HINTERGRUND HANDHABEN ---
    if (state.backgroundImage) {
        // Wenn ein Hintergrundbild gewählt wurde
        const bgImg = new Image();
        bgImg.src = state.backgroundImage;
        bgImg.onload = () => {
            const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
            const bw = bgImg.width * scale;
            const bh = bgImg.height * scale;
            const bx = (canvas.width - bw) / 2;
            const by = (canvas.height - bh) / 2;
            ctx.drawImage(bgImg, bx, by, bw, bh);
            drawPhotos(); // Fotos erst nach Laden des Hintergrunds
        };
    } else {
        // Wenn Farbe als Hintergrund
        ctx.fillStyle = state.background || '#ffffff'; // Farbe auswählen oder weiß
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Hintergrund füllen
        drawPhotos(); // Fotos zeichnen
    }
}


// --- CUSTOMIZATION (HINTERGRUND + FARBEN) ---
// (Dies ist die KORRIGIERTE, NICHT-DOPPELTE Version der Funktion)
function setupCustomization() {
    const bgGrid = document.getElementById('bg-grid');
    bgGrid.innerHTML = '';
    const colorGrid = document.getElementById('color-grid');
    colorGrid.innerHTML = '';

    // --- HINTERGRUNDBILDER ---
    backgrounds.forEach((bg, index) => {
        const div = document.createElement('div');
        // Setze 'selected' auf das erste Element, wenn kein Hintergrundbild ausgewählt ist
        const isSelected = (!state.backgroundImage && index === 0) || (state.backgroundImage === bg.image);
        div.className = 'bg-option' + (isSelected ? ' selected' : '');
        div.style.backgroundImage = `url(${bg.image})`;
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center';
        div.title = bg.name;

        div.addEventListener('click', () => {
            document.querySelectorAll('.bg-option, .color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');

            state.backgroundImage = bg.image;   // Bild wählen
            state.background = null;             // Farbe deaktivieren
            generatePhotostrip(photostripCanvas);
        });
        bgGrid.appendChild(div);
    });

    // --- FARBOPTIONEN ---
    colors.forEach(color => {
        const div = document.createElement('div');
        // Setze 'selected', wenn diese Farbe aktiv ist (und kein Bild)
        const isSelected = !state.backgroundImage && state.background === color;
        div.className = 'color-option' + (isSelected ? ' selected' : '');
        div.style.backgroundColor = color;
        div.dataset.color = color;

        div.addEventListener('click', () => {
            document.querySelectorAll('.bg-option, .color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');

            state.background = color;          // Farbe wählen
            state.backgroundImage = null;       // Bild deaktivieren
            generatePhotostrip(photostripCanvas);
        });
        colorGrid.appendChild(div);
    });

    // Wähle Weiß (erste Farbe), wenn beim Start nichts ausgewählt ist
    if (!state.backgroundImage && !state.background) {
        colorGrid.firstChild.classList.add('selected');
        state.background = colors[0];
    } else if (state.backgroundImage) {
        // Stelle sicher, dass keine Farbe ausgewählt ist, wenn ein Bild aktiv ist
        document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    }
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
    updatePhotoCounter(true);
});

document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
        document
            .querySelectorAll(".mode-btn")
            .forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        state.colorMode = this.dataset.mode;
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

document.getElementById('next-btn').addEventListener('click', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }
    showScreen('customize');
    setupCustomization();
    generatePhotostrip(photostripCanvas);
});

document.getElementById('customize-next-btn').addEventListener('click', async () => {
    showScreen('download');
    generatePhotostrip(finalCanvas);
    
    // --- START: NEUE UPLOAD-LOGIK ---
    const qrTarget = document.getElementById('qr-code-target');
    qrTarget.innerHTML = "Bild wird für QR-Code vorbereitet...";
    
    // Diese URL MUSS mit der IP in server.js übereinstimmen
    const uploadURL = "http://192.168.0.54:9090/upload"; 

    try {
        // Bild-Daten vom Canvas als "Blob" holen
        const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));
        const formData = new FormData();
        // WICHTIG: 'file' muss dem Namen in upload.single('file') entsprechen
        formData.append('file', blob, 'fiw-photobooth.png');

        const response = await fetch(uploadURL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`Server-Fehler: ${response.statusText}`);

        const result = await response.json();
        if (!result.url) throw new Error("Server hat keine gültige URL zurückgegeben.");

        // Speichere die finale URL im State
        state.finalUrl = result.url; 
        qrTarget.innerHTML = ""; // Lade-Status entfernen

    } catch (err) {
        console.error("Upload-Fehler:", err);
        qrTarget.innerHTML = `<strong>Fehler:</strong> Bild konnte nicht hochgeladen werden.<br>(${err.message})`;
        state.finalUrl = null;
    }
    // --- ENDE: NEUE UPLOAD-LOGIK ---
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
    
    // Prüfen, ob der Upload in Schritt 1 fehlgeschlagen ist
    if (!state.finalUrl) {
        // Zeige den Lade- oder Fehlertext an, der von Schritt B gesetzt wurde
        if (qrTarget.innerHTML === "") {
            qrTarget.innerHTML = `<strong>Fehler:</strong> Bild-URL nicht gefunden. Upload fehlgeschlagen?`;
        }
        qrContainer.classList.add("active");
        return; // Abbrechen
    }

    // Ziel leeren und QR-Code mit der URL aus dem State generieren
    qrTarget.innerHTML = ""; 
    const qrCanvas = document.createElement("canvas");
    new QRious({
        element: qrCanvas,
        value: state.finalUrl, // <-- BENUTZT DIE SERVER-URL
        size: 250,
        level: "L"
    });
    
    qrTarget.appendChild(qrCanvas);
    qrContainer.classList.add("active");
});


document.getElementById('restart-btn').addEventListener('click', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }

    // Setze den State komplett zurück
    state = {
        screen: 'start',
        selectedLayout: null,
        photos: [],
        stream: null,
        countdown: null,
        background: '#ffffff', // Zurück zu weiß
        backgroundImage: null, // Bild zurücksetzen
        colorMode: 'color',
        finalUrl: null
    };
    
    document.querySelectorAll('.layout-card').forEach(card => {
        card.classList.remove('selected');
    });

    // S/W-Schalter zurücksetzen
    document.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.mode === "color");
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

    showScreen('start');
});

document.getElementById('back-to-camera').addEventListener('click', () => {
    showScreen('camera');
    spinner.classList.add('active');
    startCamera(); 
    updatePhotoCounter(true);
});

document.getElementById('back-to-customize').addEventListener('click', () => {
    showScreen('customize');
    // Stelle sicher, dass der Canvas neu gezeichnet wird, falls sich was geändert hat
    generatePhotostrip(photostripCanvas); 
});

// --- INIT ---
createSnowflakes();