const fs = require('fs');
const path = require('path');

const wallets = [
  { id: 'freighter', file: 'freighter.png', type: 'image/png' },
  { id: 'lobstr', file: 'lobstr.png', type: 'image/png' },
  { id: 'albedo', file: 'albedo.png', type: 'image/png' },
  { id: 'rabet', file: 'rabet.webp', type: 'image/webp' }
];

const sourceDir = path.join(__dirname, 'public/images');
const targetDir = path.join(__dirname, 'public/assets/wallets');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const wallet of wallets) {
  const sourcePath = path.join(sourceDir, wallet.file);
  if (fs.existsSync(sourcePath)) {
    const base64Data = fs.readFileSync(sourcePath).toString('base64');
    const svgContent = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image width="48" height="48" preserveAspectRatio="xMidYMid meet" xlink:href="data:${wallet.type};base64,${base64Data}"/>
</svg>`;
    fs.writeFileSync(path.join(targetDir, `${wallet.id}.svg`), svgContent);
  }
}

const xbullSource = path.join(sourceDir, 'xbull.svg');
if (fs.existsSync(xbullSource)) {
  let content = fs.readFileSync(xbullSource, 'utf8');
  content = content.replace(/width="[^"]*"/, 'width="48"').replace(/height="[^"]*"/, 'height="48"');
  fs.writeFileSync(path.join(targetDir, 'xbull.svg'), content);
}
console.log('Logos generated.');
