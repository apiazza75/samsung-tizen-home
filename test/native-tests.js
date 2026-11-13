/* Collaudo di Quiet Home come app nativa Tizen (pacchetto assemblato da tools/build-native.js), senza TizenBrew sotto.
   Servizio: native/service.js avviato come fa la TV (onStart) con un `tizen` finto, contro TV finta e rete finta.
   Launcher: index.html del pacchetto aperto da file:// in Chromium con un `tizen` finto nella pagina.
   Uso: node test/native-tests.js [cartella-screenshot]  (esce con 1 se qualcosa fallisce) */
'use strict';
const cp = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const NET = 'http://127.0.0.1:18090', TV = 'http://127.0.0.1:18001', SVC = 'http://127.0.0.1:8096', OLD = 'http://127.0.0.1:8095';
const SHA1 = '1111111111111111111111111111111111111111', SHA2 = '2222222222222222222222222222222222222222';
const BREW = 'xvvl3S1bvH.TizenBrewStandalone';
const SHOTS = process.argv[2] || path.join(os.tmpdir(), 'mh-shots'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const failures = [];
function ok(cond, what, extra) { if (cond) { pass++; console.log('  PASS ' + what); } else { fail++; failures.push(what); console.log('  FAIL ' + what + (extra !== undefined ? '  →  ' + JSON.stringify(extra).slice(0, 400) : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function req(method, url, headers) { return new Promise(resolve => { const r = http.request(url, { method, headers: headers || {} }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) {} resolve({ code: res.statusCode, body: b, json: j, headers: res.headers }); }); });
  r.on('error', e => resolve({ code: 0, error: e.message })); r.setTimeout(20000, () => { r.destroy(); resolve({ code: 0, error: 'timeout' }); }); r.end(); }); }
const get = (url, headers) => req('GET', url, headers);
const PAGE = { 'X-MH': '1', Origin: 'null' };
const children = [];
function spawn(name, args, env) { const c = cp.spawn(process.execPath, args, { env: Object.assign({}, process.env, env || {}), stdio: ['ignore', 'pipe', 'pipe'] }); c.log = '';
  c.stdout.on('data', d => { c.log += d; if (process.env.VERBOSE) process.stdout.write('[' + name + '] ' + d); }); c.stderr.on('data', d => { c.log += d; process.stdout.write('[' + name + ' ERR] ' + d); }); children.push(c); return c; }
async function waitPing(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await get(SVC + '/ping'); if (r.code === 200) return r.json; await sleep(250); } return null; }
async function waitDown(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await get(SVC + '/ping'); if (r.code !== 200) return true; await sleep(200); } return false; }
const launched = dir => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'launched.json'), 'utf8')); } catch (e) { return []; } };

async function main() {
  // pacchetto assemblato con il commit SHA1 incorporato
  const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-native-pkg-'));
  cp.execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-native.js'), '--ref', SHA1, '--out', pkg, '--no-zip'], { stdio: 'pipe' });
  const files = ['config.xml', 'icon.png', 'index.html', 'native.js', 'bundled.js', 'wall1.jpg', 'service/service.js', 'service/boot.js', 'service/service-core.js', 'service/bundled.json'];
  ok(files.every(f => fs.existsSync(path.join(pkg, f))), 'pacchetto assemblato con tutti i file', files.filter(f => !fs.existsSync(path.join(pkg, f))));
  const cfg = fs.readFileSync(path.join(pkg, 'config.xml'), 'utf8');
  ok(/version="3\.2\.0"/.test(cfg) && cfg.indexOf('id="QuietHomeT.Launcher"') > 0 && cfg.indexOf('<tizen:service id="QuietHomeT.Service">') > 0 && cfg.indexOf('@VERSION@') < 0, 'config.xml: versione, app e servizio');
  ok(cfg.indexOf('privilege/tv.window') > 0 && cfg.indexOf('reload="disable"') > 0, 'config.xml: privilegio finestra TV (sorgenti, ritorno) e rilancio senza ricarica');

  spawn('tv', [path.join(__dirname, 'fake-tv.js'), 'ok']); spawn('net', [path.join(__dirname, 'fake-net.js')]);
  await sleep(900);
  const brewCfg = path.join(pkg, '..', path.basename(pkg) + '-brew.json');
  fs.writeFileSync(brewCfg, JSON.stringify({ modules: ['npm/@foxreis/tizentube', 'gh/apiazza75/samsung-tizen-home'], autoLaunchServiceList: [], autoLaunchModule: '' }));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-native-'));
  const env = { MH_CDN: NET + '/gh/apiazza75/samsung-tizen-home@', MH_API: NET + '/api/commits/main', MH_DATA_DIR: data, MH_TV_HOST: '127.0.0.1', MH_TV_PORT: '18001', MH_TV_PORT_TLS: '18002', MH_LAN_IP: '127.0.0.2',
    MH_HUB_DIR: path.join(data, 'no-such-dir'), MH_FAKE_PKG: 'QuietHomeT', MH_BREW_CONFIG: brewCfg };
  const startSvc = () => spawn('svc', [path.join(__dirname, 'sandbox.js'), path.join(pkg, 'service', 'service.js'), '--native'], env);

  console.log('\n[N1] primo avvio senza rete: il servizio parte dal core incluso nel pacchetto');
  await get(NET + '/__ctl?sha=' + SHA1 + '&offline=1');
  let svc = startSvc();
  let p = await waitPing(8000);
  ok(!!p, 'servizio nativo risponde sulla porta 8096', svc.log);
  if (p) {
    ok(p.native === true && p.v === '3.2.0', 'modalità nativa, versione 3.2.0', { native: p.native, v: p.v });
    ok(p.ref === SHA1 && p.boot && p.boot.source === 'cache', 'core del pacchetto, senza rete', { ref: p.ref, boot: p.boot });
    ok(p.self === 'QuietHomeT.Launcher', 'il launcher da riaprire è l\'app nativa', p.self);
  }
  ok((await get(OLD + '/ping')).code !== 200, 'la porta 8095 del modulo TizenBrew resta libera');
  let apps = await get(SVC + '/apps', PAGE);
  ok(apps.code === 200 && apps.json && apps.json.apps && apps.json.apps.length > 5, '/apps elenca le app della TV', apps.json && apps.json.apps && apps.json.apps.length);

  console.log('\n[N2] solo la pagina del pacchetto può agire sulla TV');
  let r = await get(SVC + '/launch?id=11101200001.Netflix&back=0');
  ok(r.code === 403, 'senza X-MH: rifiutato', r.code);
  r = await get(SVC + '/launch?id=11101200001.Netflix&back=0', { 'X-MH': '1', Origin: 'http://sito.example' });
  ok(r.code === 403, 'X-MH da un\'origine web: rifiutato', r.code);
  r = await req('OPTIONS', SVC + '/launch?id=x', { Origin: 'http://sito.example', 'Access-Control-Request-Headers': 'x-mh' });
  ok(r.code === 403 && !r.headers['access-control-allow-origin'], 'preflight da un\'origine web: rifiutata', { code: r.code, h: r.headers });
  r = await req('OPTIONS', SVC + '/launch?id=x', { Origin: 'null', 'Access-Control-Request-Headers': 'x-mh' });
  ok(r.code === 204 && r.headers['access-control-allow-origin'] === '*', 'preflight dalla pagina del pacchetto: accettata', r.code);
  r = await get(SVC + '/launch?id=11101200001.Netflix&back=0', PAGE);
  ok(r.code === 200 && launched(data).some(l => l.method === 'launch' && l.id === '11101200001.Netflix'), 'pagina del pacchetto (Origin null): app avviata', r.json);
  r = await get(SVC + '/launch?id=3201512006785.PrimeVideo&back=0', { 'X-MH': '1' });
  ok(r.code === 200, 'pagina del pacchetto senza Origin: app avviata', r.json);
  r = await get(SVC + '/key?key=KEY_MENU', PAGE);
  ok(r.code === 200, 'tasto inviato alla TV', r.json);

  console.log('\n[N3] moduli di TizenBrew letti dalla sua configurazione e aperti con app control');
  r = await get(SVC + '/modules', PAGE);
  const mods = (r.json && r.json.modules) || [];
  ok(mods.length === 2 && mods[0].fullName === 'npm/@foxreis/tizentube' && mods[0].name === '@foxreis/tizentube' && mods[0].appName === 'Tizentube' && mods[1].appName === 'Samsung-tizen-home', 'elenco dei moduli', mods);
  r = await get(SVC + '/module?name=' + encodeURIComponent('npm/@foxreis/tizentube'), PAGE);
  let last = launched(data).pop() || {};
  let payload = null; try { payload = JSON.parse(last.data[0].value[0]); } catch (e) {}
  ok(r.code === 200 && last.method === 'appcontrol' && last.id === BREW && payload && payload.moduleName === '@foxreis/tizentube' && payload.moduleType === 'npm', 'modulo aperto in TizenBrew con {moduleName, moduleType}', last);
  r = await get(SVC + '/module', PAGE); last = launched(data).pop() || {};
  ok(r.code === 200 && last.method === 'launch' && last.id === BREW, 'senza nome: apre TizenBrew', last);

  console.log('\n[N4] uscita da un\'app: torna in primo piano l\'app nativa');
  const before = launched(data).length;
  await get(SVC + '/launch?id=11101200001.Netflix&back=1', PAGE); await get(TV + '/__ctl?running=11101200001.Netflix:1'); await sleep(2600); await get(TV + '/__ctl?running=11101200001.Netflix:0'); await sleep(3400);
  const after = launched(data).slice(before + 1);
  ok(after.length === 1 && after[0].method === 'launch' && after[0].id === 'QuietHomeT.Launcher', 'riaperto QuietHomeT.Launcher con un launch', after);
  p = (await get(SVC + '/ping')).json;
  ok(p && p.lastReturn && p.lastReturn.method === 'launch' && !p.lastReturn.error, 'ritorno registrato in diagnostica', p && p.lastReturn);
  // come sulla TV vera: Netflix si interroga con l'id Smart Hub e dopo l'uscita resta "running" ma non più "visible"
  const b2 = launched(data).length;
  await get(SVC + '/launch?id=org.tizen.netflix-app&back=1', PAGE); await get(TV + '/__ctl?running=3201907018807:1'); await sleep(4600);
  ok(launched(data).length === b2 + 1, 'Netflix in primo piano: nessun ritorno', launched(data).slice(b2));
  await get(TV + '/__ctl?running=3201907018807:s'); await sleep(3400);
  const after2 = launched(data).slice(b2 + 1);
  ok(after2.length === 1 && after2[0].id === 'QuietHomeT.Launcher', 'Netflix sospesa dopo l\'uscita (running, non visible): Quiet Home torna', after2);

  console.log('\n[N5] main avanza: il servizio nativo si aggiorna da solo e resta nativo');
  const over = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-native-over-')); fs.mkdirSync(path.join(over, 'app'));
  fs.writeFileSync(path.join(over, 'service-core.js'), fs.readFileSync(path.join(ROOT, 'service-core.js'), 'utf8').replace("var VERSION = '3.2.0';", "var VERSION = '3.2.0-next';"));
  fs.writeFileSync(path.join(over, 'app', 'launcher.html'), fs.readFileSync(path.join(ROOT, 'app', 'launcher.html'), 'utf8').replace("var VERSION='3.2.0';", "var VERSION='3.2.0-next';"));
  await get(NET + '/__ctl?offline=0&sha=' + SHA2 + '&override=' + SHA2 + ':' + over);
  r = await get(SVC + '/update', PAGE);
  ok(r.json && r.json.action === 'updated' && r.json.ref === SHA2, '/update scarica ed esegue il core nuovo', r.json);
  await sleep(1500); p = await waitPing(8000);
  ok(p && p.v === '3.2.0-next' && p.ref === SHA2 && p.native === true, 'core nuovo sulla porta 8096, ancora nativo', p && { v: p.v, ref: p.ref, native: p.native });

  console.log('\n[N6] riavvio del servizio: resta il core aggiornato (il pacchetto non lo sovrascrive)');
  await get(SVC + '/shutdown'); svc.kill('SIGTERM'); await waitDown(5000);
  await get(NET + '/__ctl?offline=1');
  svc = startSvc(); p = await waitPing(8000);
  ok(p && p.ref === SHA2 && p.v === '3.2.0-next' && p.boot.source === 'cache', 'core aggiornato dalla cache, senza rete', p && { ref: p.ref, v: p.v, boot: p.boot });
  await get(NET + '/__ctl?offline=0&sha=' + SHA1);
  await get(SVC + '/shutdown'); svc.kill('SIGTERM'); await waitDown(5000);

  console.log('\n[N7] pacchetto nuovo (stesso servizio, cache di un altro pacchetto): il core incluso sostituisce quello in cache');
  fs.writeFileSync(path.join(data, 'milanohome-seed.txt'), 'pacchetto-precedente');
  await get(NET + '/__ctl?offline=1'); svc = startSvc(); p = await waitPing(8000);
  ok(p && p.ref === SHA1 && p.v === '3.2.0', 'riparte dal core del pacchetto installato', p && { ref: p.ref, v: p.v });
  await get(NET + '/__ctl?offline=0&sha=' + SHA1);

  /* ---------- launcher del pacchetto in Chromium, da file:// ---------- */
  const browser = await chromium.launch();
  const INIT = "window.MH_CDN='" + NET + "/gh/apiazza75/samsung-tizen-home@';window.MH_API='" + NET + "/api/commits/main';window.__tz={keys:[],svc:[],launched:[],src:{type:'HDMI',number:1,signal:null}};" +
    "Object.defineProperty(document,'hidden',{get:function(){return !!window.__hid;}});" +
    "window.tizen={ApplicationControl:function(op){this.operation=op;},application:{getCurrentApplication:function(){return{appInfo:{packageId:'QuietHomeT',id:'QuietHomeT.Launcher'}}}," +
    "launch:function(id,ok){window.__tz.launched.push(id);ok&&ok();}," +
    "launchAppControl:function(c,id,ok){window.__tz.svc.push({op:c.operation,id:id});ok&&ok();}}," +
    "tvwindow:{getSource:function(){return window.__tz.src;},setSource:function(s,ok){window.__tz.src={type:s.type,number:s.number,signal:null};ok&&ok(s,'MAIN');}}," +
    "systeminfo:{getPropertyValue:function(k,ok){ok({connected:[{type:'TV',number:1}],disconnected:[1,2,3,4].map(function(n){return{type:'HDMI',number:n};})});}}," +
    "tvinputdevice:{registerKey:function(k){window.__tz.keys.push(k);}}};";
  const watch = (page, errs) => { page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (/open-meteo|net::ERR_/.test(t)) return; errs.push('console: ' + t); }); };
  const state = page => page.evaluate(() => ({ ref: window.MH_REF, source: window.MH_SOURCE, native: !!window.MH_NATIVE, tz: window.__tz, base: !!document.querySelector('base'),
    cache: (function () { try { return JSON.parse(localStorage.getItem('mh_launcher') || 'null'); } catch (e) { return null; } })(),
    items: Array.from(document.querySelectorAll('#row .item')).map(e => ({ name: e.querySelector('.nm').textContent, svg: !!e.querySelector('.ico svg') })),
    menu: document.getElementById('panel').classList.contains('show') ? document.getElementById('ptitle').textContent : null,
    debug: document.getElementById('debug').classList.contains('show') ? document.getElementById('debug').textContent : null,
    wall: (document.querySelector('.wall.on') || {}).style ? document.querySelector('.wall.on').style.backgroundImage : '', toast: document.getElementById('toast').textContent }));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-native-prof-'));
  const ctx = await chromium.launchPersistentContext(profile, { viewport: { width: 1920, height: 1080 }, locale: 'it-IT' });
  await ctx.addInitScript(INIT);
  const errs = [];
  const open = async () => { const page = await ctx.newPage(); watch(page, errs); await page.goto('file://' + path.join(pkg, 'index.html')); await page.waitForSelector('#row .item', { timeout: 20000 }); await sleep(1500); return page; };

  console.log('\n[N8] launcher del pacchetto: parte dal file incluso, parla con il servizio nativo');
  let page = await open(); let s = await state(page);
  ok(s.native && s.source === 'package' && s.ref === SHA1, 'launcher dal pacchetto (' + s.source + ', ' + String(s.ref).slice(0, 7) + ')', { native: s.native, source: s.source });
  ok(s.tz.svc.length >= 1 && s.tz.svc[0].id === 'QuietHomeT.Service' && /operation\/service$/.test(s.tz.svc[0].op), 'servizio del pacchetto avviato dalla pagina', s.tz.svc);
  ok(s.tz.keys.indexOf('ChannelUp') >= 0 && s.tz.keys.indexOf('ChannelDown') >= 0, 'tasti canale registrati', s.tz.keys);
  ok(s.items.length >= 5 && s.items.every(i => i.svg), 'riga con ' + s.items.length + ' app e icone nostre', s.items.map(i => i.name));
  ok(s.items[0].name === 'YouTube', 'TizenTube (modulo di TizenBrew) in testa come YouTube', s.items.map(i => i.name));
  ok(!s.base && /wall\d\.jpg/.test(s.wall) && s.wall.indexOf('http') < 0, 'sfondo dal pacchetto, non dalla rete', s.wall);
  const hint = await page.evaluate(() => document.getElementById('hint').textContent);
  ok(/scegli · OK apri/.test(hint), 'lingua della TV (italiano) dal pacchetto, senza rete', hint);
  const n0 = launched(data).length;
  await page.keyboard.press('Enter'); await sleep(900);
  last = launched(data).slice(n0).pop() || {};
  ok(last.method === 'appcontrol' && last.id === BREW, 'Invio su YouTube: modulo aperto in TizenBrew', last);
  await page.keyboard.press('ArrowRight'); await sleep(300); await page.keyboard.press('Enter'); await sleep(900);
  last = launched(data).slice(n0).pop() || {};
  ok(last.method === 'launch' && /Netflix|PrimeVideo|Disney|Dazn|YouTube|Timvision/.test(last.id), 'Invio su un\'app: avviata dal servizio', last);
  await page.evaluate(() => { Array.from(document.querySelectorAll('#sections .card')).filter(c => /HDMI 2/.test(c.textContent))[0].click(); }); await sleep(600); s = await state(page);
  ok(s.tz.src.type === 'HDMI' && s.tz.src.number === 2 && s.tz.launched[0] === 'org.tizen.tv-viewer', 'HDMI 2: sorgente impostata con la finestra TV, poi visore di sistema', { src: s.tz.src, launched: s.tz.launched });
  await page.keyboard.press('ArrowUp'); await sleep(400); s = await state(page);
  ok(s.menu === 'Quiet Home 3.2.0', '↑ apre il menu', s.menu);
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await sleep(1500); s = await state(page);
  ok(s.debug && s.debug.indexOf('native app') > 0 && /service: ok v3\.2\.0/.test(s.debug) && /language it/.test(s.debug), 'diagnostica: app nativa, servizio ok', s.debug && s.debug.slice(0, 300));
  await page.screenshot({ path: path.join(SHOTS, 'n8-nativa-diagnostica.png') });
  await page.keyboard.press('Escape'); await sleep(300);
  await page.screenshot({ path: path.join(SHOTS, 'n8-nativa.png') });

  console.log('\n[N9] main avanza: launcher nuovo in cache, attivo alla riapertura, sempre con i file del pacchetto');
  await get(NET + '/__ctl?sha=' + SHA2);
  await page.evaluate(() => { window.MH_FORCE_UPDATE = true; });
  await page.close(); page = await open();
  let t0 = Date.now(); s = await state(page);
  while (Date.now() - t0 < 20000 && !(s.cache && s.cache.ref === SHA2)) { await sleep(500); s = await state(page); }
  ok(s.cache && s.cache.ref === SHA2 && s.cache.html.indexOf("VERSION='3.2.0-next'") > 0, 'launcher nuovo scaricato in cache', s.cache && s.cache.ref);
  await page.close(); page = await open(); s = await state(page);
  ok(s.source === 'cache' && s.ref === SHA2 && s.native, 'riapertura: launcher nuovo dalla cache', { source: s.source, ref: s.ref });
  ok(!s.base && /wall\d\.jpg/.test(s.wall) && s.wall.indexOf('http') < 0, 'sfondo ancora dal pacchetto', s.wall);
  await page.keyboard.press('ArrowUp'); await sleep(400); s = await state(page);
  ok(s.menu === 'Quiet Home 3.2.0-next', 'versione nuova in uso', s.menu);
  p = (await get(SVC + '/ping')).json;
  ok(p && p.ref === SHA2 && p.native === true, 'servizio allineato dal launcher e ancora nativo', p && { ref: p.ref, native: p.native });
  ok(errs.length === 0, 'nessun errore di pagina', errs);
  await page.close();

  console.log('\n[N10] servizio fermo: la pagina lo riavvia quando serve');
  await get(SVC + '/shutdown'); svc.kill('SIGTERM'); await waitDown(5000);
  page = await open(); s = await state(page);
  const starts = s.tz.svc.length;
  ok(s.items.length >= 1, 'il launcher si apre comunque (elenco dalla cache)', s.items.length);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); await sleep(2500); s = await state(page);
  ok(s.tz.svc.length > starts, 'nuova richiesta di avvio del servizio', { before: starts, after: s.tz.svc.length });
  await page.close(); await ctx.close(); await browser.close();

  console.log('\nRisultato: ' + pass + ' verifiche superate, ' + fail + ' fallite' + (fail ? '\n - ' + failures.join('\n - ') : '') + '\nScreenshot in ' + SHOTS);
  children.forEach(c => { try { c.kill('SIGTERM'); } catch (e) {} });
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); children.forEach(c => { try { c.kill('SIGTERM'); } catch (err) {} }); process.exit(1); });
