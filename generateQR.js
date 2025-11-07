const QRCode = require('qrcode');

const url = 'http://141.45.59.217:8080/foto';

QRCode.toFile('qr.png', url, { width: 300 }, function (err) {
  if (err) throw err;
  console.log('QR-Code erstellt: qr.png');
});
