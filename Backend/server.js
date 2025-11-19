const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const os = require('os'); // Neu: Für die dynamische IP-Ermittlung beim Serverstart

const app = express();
const PORT = 9090;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.static(PUBLIC_DIR));

// Multer: Speichert jede Datei mit einem einzigartigen Zeitstempel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Speichert in /public
    cb(null, PUBLIC_DIR); 
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

// Hilfsfunktion zur Ermittlung der lokalen IP-Adresse (für das Konsolen-Log)
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            // Filtere nach IPv4 und schließe interne/loopback-Adressen aus
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}


app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen' });


  // Dynamische Adressgenerierung:
  // Wir verwenden req.protocol (http oder https) und req.get('host') (IP:PORT),
  // um die URL zu erzeugen, die der Client verwendet hat.
  const baseHostUrl = `${req.protocol}://${req.get('host')}`;

  // Der finale Pfad ist BASE_URL / DATEINAME
  // z.B. http://141.45.191.175:9090/foto-1678886400000.png
  const fullUrl = `${baseHostUrl}/${req.newFilename}`;
  
  res.json({ url: fullUrl });

});

/* // Direktlink für QR-Code
app.get('/foto', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'foto.jpg');
  if (!fs.existsSync(filePath)) return res.status(404).send('Noch kein Foto verfügbar');
  res.sendFile(filePath);
}); */

const localIp = getLocalIpAddress();
app.listen(PORT, () => console.log(`📸 Photobooth läuft: http://${localIp}:${PORT}`));