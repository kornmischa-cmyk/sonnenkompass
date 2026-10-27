// Prüft, ob die Offline-Liste in sw.js vollständig ist und nur existierende Dateien enthält.
// Fehlt eine Datei in ASSETS, startet die App offline nicht vollständig. Steht eine nicht
// existierende Datei drin, installiert sich der Service Worker gar nicht.
const fs = require('fs'), path = require('path');
const dir = __dirname, rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const norm = (p) => p.replace(/^\.\//, '');

const assets = JSON.parse('[' + rd('sw.js').match(/const ASSETS = \[([\s\S]*?)\];/)[1].replace(/,\s*$/, '') + ']').map(norm);
const needed = new Set();
for (const m of rd('index.html').matchAll(/(?:href|src)="([^"]+)"/g)) if (!/^https?:/.test(m[1])) needed.add(norm(m[1]));
for (const m of rd('style.css').matchAll(/url\("?([^")]+)"?\)/g)) needed.add(norm(m[1]));
for (const i of JSON.parse(rd('manifest.json')).icons) needed.add(norm(i.src));

let bad = 0;
for (const a of assets) if (a && !fs.existsSync(path.join(dir, a))) { console.log('fehlt auf der Platte:', a); bad++; }
for (const n of needed) if (!assets.includes(n)) { console.log('fehlt in sw.js ASSETS:', n); bad++; }
if (!assets.includes('')) { console.log('fehlt in sw.js ASSETS: ./'); bad++; }
console.log('assets', assets.length, 'referenziert', needed.size, bad ? 'FEHLER' : 'ok');
if (bad) process.exitCode = 1;
