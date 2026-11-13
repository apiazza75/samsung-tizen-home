/* Servizio di Milano Home come app nativa Tizen: è il punto d'ingresso dichiarato in config.xml (<tizen:service>).
   Fa tre cose e poi lascia il lavoro agli stessi file del modulo TizenBrew:
   1) dice al core che gira da app nativa (MH_NATIVE): porta 8096, pagina del pacchetto, ritorno al launcher con un launch;
   2) sceglie una cartella dati scrivibile e ci mette il core incluso nel pacchetto, così il primo avvio non ha bisogno della rete;
   3) esegue boot.js (copia di service.js): core dalla cache su disco subito, aggiornamento dall'ultimo commit di main in sottofondo.
   ES5 per il Node della TV. */
'use strict';
var fs = require('fs');
var path = require('path');
var started = false;
function log(m) { console.log('MilanoHome nativa: ' + m); }
function read(f) { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } }
function writable(d) {
  try { try { fs.mkdirSync(d); } catch (e) {} var f = path.join(d, '.mh-prova'); fs.writeFileSync(f, '1'); fs.unlinkSync(f); return true; } catch (e) { return false; }
}
function start() {
  if (started) return; started = true;
  var pkg = 'MilanoHome';
  try { pkg = tizen.application.getCurrentApplication().appInfo.packageId || pkg; } catch (e) {}
  global.MH_NATIVE = { app: pkg + '.Launcher' };
  var ref = null;
  try { ref = JSON.parse(read(path.join(__dirname, 'bundled.json'))).ref; } catch (e) {}
  var core = read(path.join(__dirname, 'service-core.js'));
  // cartella dati: quella condivisa usata anche da TizenBrew (in una sottocartella nostra), altrimenti una temporanea
  var dirs = process.env.MH_DATA_DIR ? [process.env.MH_DATA_DIR] : ['/home/owner/share/milanohome-native', '/tmp/milanohome-native'], dir = null;
  for (var i = 0; i < dirs.length && !dir; i++) if (writable(dirs[i])) dir = dirs[i];
  if (!dir) {
    // nessuna cartella scrivibile: eseguo il core del pacchetto così com'è (niente aggiornamenti automatici del servizio)
    log('nessuna cartella dati scrivibile: core del pacchetto, senza aggiornamenti');
    global.MH_REF = ref; global.MH_BOOT = null;
    try { require('./service-core.js'); } catch (e) { log('core non avviato: ' + e.message); }
    return;
  }
  process.env.MH_DATA_DIR = dir;
  // a ogni pacchetto nuovo (o cache assente) il core incluso sostituisce quello in cache; poi boot.js lo allinea a main
  var mark = path.join(dir, 'milanohome-seed.txt'), coreFile = path.join(dir, 'milanohome-core.js');
  if (ref && core && core.length > 1000 && (read(mark) !== ref || !fs.existsSync(coreFile))) {
    try { fs.writeFileSync(coreFile, core); fs.writeFileSync(path.join(dir, 'milanohome-core.json'), JSON.stringify({ ref: ref, at: Date.now() })); fs.writeFileSync(mark, ref); log('core del pacchetto in cache (' + ref.slice(0, 7) + ')'); }
    catch (e) { log('core del pacchetto non salvato: ' + e.message); }
  }
  try { require('./boot.js'); } catch (e) { log('bootstrap non avviato: ' + e.message); }
}
module.exports.onStart = function () { start(); };
module.exports.onRequest = function () { start(); };
module.exports.onExit = function () { log('servizio chiuso dal sistema'); };
