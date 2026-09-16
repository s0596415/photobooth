const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// 32 Byte Key als Hex-String in der .env (64 Hex-Zeichen)
const KEY = Buffer.from(process.env.IMAGE_ENCRYPTION_KEY, 'hex');

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12); // GCM empfiehlt 12 Byte IV
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encrypted, iv, authTag };
}

function decryptBuffer(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

module.exports = { encryptBuffer, decryptBuffer };