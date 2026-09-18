const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const router = express.Router();
const { connectDB } = require('../configure/db');
const { encryptBuffer, decryptBuffer } = require('../utils/crypto');

const upload = multer({ storage: multer.memoryStorage() });

// [NEU] Temporäre Zugriffstoken nach Passworteingabe (in-memory)
const galleryTokens = new Map(); // token -> Ablaufzeitpunkt
const TOKEN_LIFETIME_MS = 15 * 60 * 1000; // Token 15 Min gültig

// Alte Tokens regelmäßig aufräumen
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of galleryTokens) {
    if (expiry < now) galleryTokens.delete(token);
  }
}, 5 * 60 * 1000);

function requireGalleryAccess(req, res, next) {
  const token = req.headers['x-gallery-token'];
  const expiry = galleryTokens.get(token);
  if (!token || !expiry || expiry < Date.now()) {
    return res.status(401).json({ error: 'Zugriff verweigert, bitte Passwort erneut eingeben' });
  }
  next();
}

// [NEU] Galerie-Passwort prüfen
router.post('/gallery/unlock', async (req, res) => {
const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Passwort fehlt' });

  const valid = await bcrypt.compare(password, process.env.GALLERY_PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: 'Falsches Passwort' });

  const token = crypto.randomBytes(24).toString('hex');
  galleryTokens.set(token, Date.now() + TOKEN_LIFETIME_MS);

  res.json({ token, expiresInMs: TOKEN_LIFETIME_MS });
});

router.post('/upload-encrypted', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen' });

    const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);
    const db = await connectDB();

    const result = await db.collection('photos').insertOne({
      data: encrypted,
      iv,
      authTag,
      mimeType: req.file.mimetype,
      createdAt: new Date(), // wird vom TTL-Index ausgewertet
    });

    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Speichern fehlgeschlagen' });
  }
});

// [GEÄNDERT] Beide Routen jetzt hinter requireGalleryAccess
router.get('/gallery', requireGalleryAccess, async (req, res) => {
  try {
    const db = await connectDB();
    const photos = await db.collection('photos')
      .find({}, { projection: { _id: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(photos.map(p => ({ id: p._id, createdAt: p.createdAt })));
  } catch (err) {
    res.status(500).json({ error: 'Galerie konnte nicht geladen werden' });
  }
});

router.get('/gallery/:id', requireGalleryAccess, async (req, res) => {
  try {
    const db = await connectDB();
    const photo = await db.collection('photos').findOne({ _id: new ObjectId(req.params.id) });
    if (!photo) return res.status(404).end();

    const decrypted = decryptBuffer(photo.data.buffer, photo.iv.buffer, photo.authTag.buffer);

    res.set('Content-Type', photo.mimeType);
    res.set('Cache-Control', 'no-store');
    res.send(decrypted);
  } catch (err) {
    res.status(500).json({ error: 'Bild konnte nicht geladen werden' });
  }
});

module.exports = router;