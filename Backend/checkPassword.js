require('dotenv').config();
const bcrypt = require('bcryptjs');

const passwort = process.argv[2];
if (!passwort) {
  console.log('Nutzung: node checkPassword.js <passwort>');
  process.exit(1);
}

const hash = process.env.GALLERY_PASSWORD_HASH;
console.log('Hash aus .env:', hash);
console.log('Länge (muss 60 sein):', hash ? hash.length : 'FEHLT!');
console.log('Passt zusammen:', bcrypt.compareSync(passwort, hash));