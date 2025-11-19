const QRCode = require('qrcode');

const url = 'http://192.168.178.72:8080/foto';

QRCode.toFile('qr.png', url, { width: 300 }, function (err) {
  if (err) throw err;
  console.log('QR-Code erstellt: qr.png');
});
