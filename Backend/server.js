const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 9090;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.static(PUBLIC_DIR));

/*// Multer: überschreibt immer foto.jpg
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PUBLIC_DIR),
  filename: (req, file, cb) => cb(null, 'foto.jpg')
}); */

// Multer: Speichert jede Datei mit einem einzigartigen Zeitstempel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PUBLIC_DIR); // Speichert in /public
  },
  filename: (req, file, cb) => {
    // Erzeugt einen neuen Namen, z.B. foto-1678886400000.png
    const timestamp = Date.now();
    const newFilename = `foto-${timestamp}${path.extname(file.originalname) || '.png'}`;

    // WICHTIG: Speichere den neuen Dateinamen im 'req'-Objekt,
    // damit wir ihn im nächsten Schritt an den Client senden können.
    req.newFilename = newFilename; 

    cb(null, newFilename);
  }
});
const upload = multer({ storage });

// Upload-Endpunkt
/* app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen' });
  res.json({ ok: true, path: '/foto.jpg' });
}); */

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen' });

  // KORREKTUR: Verwende die IP UND den PORT für die Basis-URL
  // Stellen Sie sicher, dass dies die öffentlich erreichbare Adresse ist!
  const PUBLIC_HOST = "141.45.191.175"; // NUR die IP (oder Hostname)
  const ipAddress = `http://${PUBLIC_HOST}:${PORT}`; // Z.B. http://141.45.32.235:9090


  // Der finale Pfad ist BASE_URL / DATEINAME
  const fullUrl = `${ipAddress}/${req.newFilename}`; 
  res.json({ url: fullUrl });
});

/* // Direktlink für QR-Code
app.get('/foto', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'foto.jpg');
  if (!fs.existsSync(filePath)) return res.status(404).send('Noch kein Foto verfügbar');
  res.sendFile(filePath);
}); */

app.listen(PORT, () => console.log(`📸 Photobooth läuft: http://0.0.0.0:${PORT}`));
