const QRCode = require('qrcode');
const path = require('path');

const iosUrl = 'https://igpubinfo-max.github.io/Khmer-Food-Tourism/';
const apkUrl = 'https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/download/v1.5.0/KhmerFoodTourism-v1.5.0.apk';

async function generate() {
  await QRCode.toFile('C:/Users/igpub/Desktop/KhmerFoodTourism_iOS_Safari_QR.png', iosUrl, {
    width: 600,
    margin: 2,
    color: { dark: '#064E3B', light: '#FFFFFF' }
  });
  console.log('Saved KhmerFoodTourism_iOS_Safari_QR.png to Desktop');

  await QRCode.toFile('C:/Users/igpub/Desktop/KhmerFoodTourism_Android_APK_QR.png', apkUrl, {
    width: 600,
    margin: 2,
    color: { dark: '#064E3B', light: '#FFFFFF' }
  });
  console.log('Saved KhmerFoodTourism_Android_APK_QR.png to Desktop');
}

generate().catch(console.error);
