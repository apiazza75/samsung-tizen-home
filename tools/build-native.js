#!/usr/bin/env node
/* Assembla Milano Home come app nativa Tizen (.wgt), senza TizenBrew sotto.
     node tools/build-native.js [--ref <sha>] [--out <cartella>] [--no-zip]
   Produce out/native/ (i file del pacchetto) e dist/QuietHome-unsigned.wgt. Il pacchetto va poi FIRMATO: la TV installa solo
   pacchetti firmati (vedi docs/NATIVE-APP.md). Contenuto:
     index.html      il bootstrap di app/index.html, con native.js e bundled.js caricati prima
     native.js       segnala la modalità nativa, registra i tasti, avvia il servizio
     bundled.js      launcher.html + icons.js del commit <ref>: primo avvio senza rete
     wall*.jpg      sfondi, locali (il font è già dentro il launcher)
     service/        service.js (ingresso), boot.js (= service.js del modulo), service-core.js, bundled.json {ref}
   Solo moduli di Node; per lo zip usa il comando `zip` (presente su macOS e Linux). */
'use strict';
var fs = require('fs'), path = require('path'), cp = require('child_process');
var ROOT = path.join(__dirname, '..');
var args = process.argv.slice(2);
function opt(name) { var i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
var OUT = path.resolve(opt('--out') || path.join(ROOT, 'out', 'native'));
var ref = opt('--ref');
if (!ref) { try { ref = cp.execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); } catch (e) {} }
if (!/^[0-9a-f]{40}$/.test(ref || '')) { console.error('Serve il commit da incorporare: --ref <sha di 40 cifre> (o eseguire dentro il repository git)'); process.exit(1); }
var read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); };
var version = JSON.parse(read('package.json')).version;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'service'), { recursive: true });
var put = function (rel, data) { fs.writeFileSync(path.join(OUT, rel), data); };
var copy = function (from, to) { fs.copyFileSync(path.join(ROOT, from), path.join(OUT, to)); };

put('config.xml', read('native/config.xml').replace('@VERSION@', version));
copy('native/icon.png', 'icon.png');
copy('native/native.js', 'native.js');
var index = read('app/index.html'), marker = '</head>';
if (index.split(marker).length !== 2) throw new Error('app/index.html: atteso un solo </head>');
put('index.html', index.replace(marker, '<script src="native.js"></script>\n<script src="bundled.js"></script>\n</head>'));
var launcher = read('app/launcher.html'), icons = read('app/icons.js'), tag = '<script src="icons.js"></script>';
if (launcher.indexOf(tag) < 0) throw new Error('app/launcher.html: manca ' + tag);
var html = launcher.replace(tag, function () { return '<script>' + icons + '</script>'; });
// dentro un <script> la stringa non deve contenere "</script" né "<!--": le barre e i punti esclamativi si scrivono come escape JSON
var json = JSON.stringify({ ref: ref, html: html }).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\u0021--');
// lingue: dentro bundled.js, così il primo avvio senza rete è già nella lingua della TV
var langs = {}; fs.readdirSync(path.join(ROOT, 'app/lang')).forEach(function (f) { if (/\.json$/.test(f)) langs[f.replace('.json', '')] = JSON.parse(read('app/lang/' + f)); });
put('bundled.js', 'window.MH_BUNDLED=' + json + ';\nwindow.MH_LANGS=' + JSON.stringify(langs).replace(/<\//g, '<\\/') + ';\n');
['wall1.jpg', 'wall2.jpg', 'wall3.jpg', 'wall4.jpg'].forEach(function (f) { copy('app/' + f, f); });
copy('native/service.js', 'service/service.js');
copy('service.js', 'service/boot.js');
copy('service-core.js', 'service/service-core.js');
put('service/bundled.json', JSON.stringify({ ref: ref, version: version }));

var size = 0; (function walk(d) { fs.readdirSync(d).forEach(function (n) { var p = path.join(d, n), s = fs.statSync(p); if (s.isDirectory()) walk(p); else size += s.size; }); })(OUT);
console.log('Pacchetto nativo ' + version + ' (' + ref.slice(0, 7) + ') in ' + OUT + ' · ' + Math.round(size / 1024) + ' KB');
if (args.indexOf('--no-zip') < 0) {
  var dist = path.join(ROOT, 'dist'), wgt = path.join(dist, 'QuietHome-unsigned.wgt');
  fs.mkdirSync(dist, { recursive: true }); fs.rmSync(wgt, { force: true });
  cp.execFileSync('zip', ['-q', '-r', '-X', wgt, '.'], { cwd: OUT });
  console.log('Creato ' + path.relative(ROOT, wgt) + ' (' + Math.round(fs.statSync(wgt).size / 1024) + ' KB), NON firmato');
}
