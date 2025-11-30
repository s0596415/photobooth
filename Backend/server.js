const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
// const os = require('os'); // [ÄNDERUNG: Entfernt]

const app = express();
// [ÄNDERUNG: Port nutzt die Umgebungsvariable von Render]
const PORT = process.env.PORT || 9090; 
const PUBLIC_DIR = path.join(__dirname, 'public');

// [ÄNDERUNG: CORS ist spezifischer konfiguriert, um das Frontend zuzulassen]
const ALLOWED_ORIGIN = 'https://photobooth-mu-nine.vercel.app'; // ERSETZEN!

app.use(cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST'],
}));

app.use(express.static(PUBLIC_DIR));

// Multer: Speichert jede Datei mit einem einzigartigen Zeitstempel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // !!! ACHTUNG: Die lokale Speicherung ist NICHT persistent auf Render/Vercel !!!
    // Für dauerhafte Speicherung muss dieser Block auf Cloudinary/S3 umgestellt werden.
    cb(null, PUBLIC_DIR); 
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const newFilename = `foto-${timestamp}${path.extname(file.originalname) || '.png'}`;
    req.newFilename = newFilename; 
    cb(null, newFilename);
  }
});
const upload = multer({ storage });

// [ÄNDERUNG: Die Funktion zur lokalen IP-Ermittlung wird entfernt]
/*
function getLocalIpAddress() {
    // ... Logik entfernt
    return 'localhost';
}
*/


app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen' });


  // Dynamische Adressgenerierung:
  // Hier müssen Sie beachten, dass die Datei nach dem Speichern nur kurz existiert!
  const baseHostUrl = `${req.protocol}://${req.get('host')}`;

  // Der finale Pfad ist BASE_URL / DATEINAME
  const fullUrl = `${baseHostUrl}/${req.newFilename}`;
  
  res.json({ url: fullUrl });

});

// [ÄNDERUNG: Lokale IP-Ausgabe entfernt, da sie in der Cloud nicht relevant ist]
// const localIp = getLocalIpAddress(); // Entfernt
app.listen(PORT, () => console.log(`📸 Photobooth Backend lauscht auf Port ${PORT}`));