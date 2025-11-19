const QRCode = require('qrcode');

const url = 'http://141.45.191.175:9090/foto';

QRCode.toFile('qr.png', url, { width: 300 }, function (err) {
  if (err) throw err;
  console.log('QR-Code erstellt: qr.png');
});
