const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.static(PUBLIC_DIR));

// Multer: überschreibt immer foto.jpg
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PUBLIC_DIR),
  filename: (req, file, cb) => cb(null, 'foto.jpg')
});
const upload = multer({ storage });

// Upload-Endpunkt
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen' });
  res.json({ ok: true, path: '/foto.jpg' });
});

// Direktlink für QR-Code
app.get('/foto', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'foto.jpg');
  if (!fs.existsSync(filePath)) return res.status(404).send('Noch kein Foto verfügbar');
  res.sendFile(filePath);
});

app.listen(PORT, () => console.log(`📸 Photobooth läuft: http://0.0.0.0:${PORT}`));
