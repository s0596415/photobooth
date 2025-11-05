// 1. Das "state"-Objekt ist "let", da es beim Neustart komplett überschrieben wird.
let state = {
    screen: 'start',
    selectedLayout: null,
    photos: [],
    stream: null,
    countdown: null,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
};

// 2. Alle "globalen" Variablen, die sich nie ändern, sind jetzt "const".
const layouts = {
    1: { cols: 1, rows: 3, count: 3 },
    2: { cols: 1, rows: 4, count: 4 },
    3: { cols: 2, rows: 2, count: 4 }
};

const backgrounds = [
    { name: 'Snowflakes', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { name: 'Frosty Blue', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { name: 'Pine Forest', gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
    { name: 'Winter Sky', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
    { name: 'Christmas', gradient: 'linear-gradient(135deg, #d31027 0%, #ea384d 100%)' }
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
        screens[key].classList.remove('active');
    }
    screens[screenName].classList.add('active');
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

// NEUE updatePhotoCounter für die "Sequenz"-Logik
function updatePhotoCounter(initial = false) {
    const layout = layouts[state.selectedLayout];
    const counter = document.getElementById('photo-counter');
    const captureBtn = document.getElementById('capture-btn');
    
    if (initial) {
        // HINWEIS: Ändert den Text auf "Starte Sequenz"
        captureBtn.firstChild.textContent = 'Starte Foto-Sequenz '; 
        counter.textContent = `(${layout.count} Fotos)`;
    } else {
        // Aktualisiert den Zähler während der Sequenz
        counter.textContent = `(${state.photos.length + 1}/${layout.count})`;
    }
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const photoData = canvas.toDataURL('image/png');
    state.photos.push(photoData);
    
    updatePreviewGrid();
    // updatePhotoCounter() wird jetzt von der Sequenzschleife aufgerufen
    // Aber wir rufen es hier auf, falls es das letzte Foto ist
    if (state.photos.length !== layouts[state.selectedLayout].count) {
        updatePhotoCounter();
    }

    const layout = layouts[state.selectedLayout];
    if (state.photos.length === layout.count) {
        document.getElementById('capture-btn').style.display = 'none';
        document.getElementById('camera-actions').style.display = 'flex';
    }
}

function setupCustomization() {
    const bgGrid = document.getElementById('bg-grid');
    bgGrid.innerHTML = '';
    
    backgrounds.forEach((bg, index) => {
        const div = document.createElement('div');
        div.className = 'bg-option' + (index === 0 ? ' selected' : '');
        div.style.background = bg.gradient;
        div.title = bg.name;
        div.dataset.gradient = bg.gradient;

        div.addEventListener('click', () => {
            document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('selected'));
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            state.background = div.dataset.gradient;
            generatePhotostrip(photostripCanvas);
        });
        bgGrid.appendChild(div);
    });

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

function generatePhotostrip(canvas) {
    const layout = layouts[state.selectedLayout];
    const photoWidth = 400;
    const photoHeight = 300;
    const padding = 20;

    canvas.width = layout.cols * photoWidth + (layout.cols + 1) * padding;
    canvas.height = layout.rows * photoHeight + (layout.rows + 1) * padding;

    const ctx = canvas.getContext('2d');

    if (state.background.startsWith('linear-gradient')) {
        const colorMatches = state.background.match(/#[a-f0-9]{6}/gi);
        if (colorMatches && colorMatches.length >= 2) {
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, colorMatches[0]);
            grad.addColorStop(1, colorMatches[colorMatches.length - 1]);
            ctx.fillStyle = grad;
        }
    } else {
        ctx.fillStyle = state.background;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let idx = 0; idx < state.photos.length; idx++) {
        const photo = state.photos[idx];
        const img = new Image();
        img.src = photo;
        
        img.onload = () => {
            const col = idx % layout.cols;
            const row = Math.floor(idx / layout.cols);
            const x = col * photoWidth + (col + 1) * padding;
            const y = row * photoHeight + (row + 1) * padding;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - 5, y - 5, photoWidth + 10, photoHeight + 10);
            ctx.restore();

            ctx.drawImage(img, x, y, photoWidth, photoHeight);
        };
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

// NEUER start-btn Listener
document.getElementById('start-btn').addEventListener('click', () => {
    showScreen('camera');
    spinner.classList.add('active');
    startCamera();
    updatePreviewGrid();
    updatePhotoCounter(true); // Ruft den "Hinweis"-Text auf
});

// ERSETZE DEINE "capture-btn"-Funktion KOMPLETT HIERMIT:

document.getElementById('capture-btn').addEventListener('click', async () => {
    const layout = layouts[state.selectedLayout];
    const captureBtn = document.getElementById('capture-btn');
    
    captureBtn.disabled = true; 
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < layout.count; i++) {
        const isLastPhoto = (i === layout.count - 1); // Prüfen, ob es das letzte Foto ist
        
        // Text für den Start des Countdowns anpassen
        if (isLastPhoto) {
            captureBtn.firstChild.textContent = 'Letztes Foto! Lächeln! '; // Spezieller Text für den letzten Schuss
        } else {
            captureBtn.firstChild.textContent = 'Fertig machen... ';
        }
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
        
        // --- HIER IST DEINE HINWEIS-LOGIK ---
        if (!isLastPhoto) { // Hinweis nur anzeigen, wenn es NICHT das letzte Foto ist
            countdownOverlay.textContent = 'Super! Mach dich bereit für das nächste Foto...';
            countdownOverlay.classList.add('is-hint'); 
            countdownOverlay.classList.add('active'); 
            
            await sleep(2500); 
            
            countdownOverlay.classList.remove('active');
            countdownOverlay.classList.remove('is-hint');
        } else {
            // Dies ist das letzte Foto.
            // Der Button wird von takePhoto() deaktiviert und die Kamera-Aktionen eingeblendet.
            // Hier könnten wir einen finalen Hinweistext anzeigen, 
            // der länger bleibt, z.B. "Fertig! Sieh dir deine Fotos an."
            countdownOverlay.textContent = 'Fertig!';
            countdownOverlay.classList.add('is-hint');
            countdownOverlay.classList.add('active');
            
            // Dieses Overlay bleibt aktiv, bis der Benutzer auf "Weiter" oder "Neu" klickt.
            // Es wird beim Screenwechsel automatisch entfernt.
        }
        // --- ENDE DER HINWEIS-LOGIK ---
    }

    // Der Button wird nur wieder aktiviert, wenn die Sequenz durchläuft UND dann
    // später "Neu aufnehmen" geklickt wird.
    // Beim letzten Foto bleibt er disabled, bis die Kamera-Aktionen verwendet werden.
    // captureBtn.disabled = false; // Diese Zeile entfernen, da die Buttons jetzt von takePhoto gesteuert werden
});

// KORRIGIERTER retake-btn Listener
document.getElementById('retake-btn').addEventListener('click', () => {
    state.photos = [];
    updatePreviewGrid();
    updatePhotoCounter(true); // Setzt den "Hinweis"-Text zurück

    const captureBtn = document.getElementById('capture-btn');
    captureBtn.style.display = 'block';
    captureBtn.disabled = false; // <-- DAS IST DIE KORREKTUR

    document.getElementById('camera-actions').style.display = 'none';

    // Blendet den "Fertig!"-Hinweis aus, falls er noch aktiv ist
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
    link.download = 'winter-photobooth.png';
    link.href = dataUrl;
    link.click();
});

document.getElementById('qr-btn').addEventListener('click', () => {
    const qrContainer = document.getElementById('qr-container');
    const qrDate = document.getElementById('qr-date');
    const qrTarget = document.getElementById('qr-code-target');

    qrDate.textContent = new Date().toLocaleString('de-DE');
    qrTarget.innerHTML = ''; 

    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.7);

    try {
        const qr = new QRious({
            element: qrTarget,
            value: dataUrl,
            size: 250,
            level: 'L'
        });
    } catch (e) {
        console.error("QR-Code-Fehler:", e);
        qrTarget.innerHTML = '<p style="color: red; font-size: 0.9rem;">Fehler: Das Bild ist zu groß, um einen QR-Code zu erstellen.</p>';
    }

    qrContainer.classList.add('active');
});

document.getElementById('restart-btn').addEventListener('click', () => {
    state = {
        screen: 'start',
        selectedLayout: null,
        photos: [],
        stream: null,
        countdown: null,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
    
    document.querySelectorAll('.layout-card').forEach(card => {
        card.classList.remove('selected');
    });

    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('capture-btn').style.display = 'block';
    document.getElementById('camera-actions').style.display = 'none';
    document.getElementById('qr-container').classList.remove('active');
    showScreen('start');
});

// --- "Zurück"-Button Event Listeners ---

document.getElementById('back-to-start').addEventListener('click', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null; 
    }
    state.photos = [];
    updatePreviewGrid(); 
    // WICHTIG: Diese Zeile ist repariert und nicht mehr auskommentiert
    document.getElementById('capture-btn').style.display = 'block'; 
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