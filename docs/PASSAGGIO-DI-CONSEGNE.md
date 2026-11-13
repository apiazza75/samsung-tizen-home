# Passaggio di consegne · Milano Home · 31 ottobre 2026

Progetto: launcher "Milano Home" per Samsung Tizen, modulo TizenBrew. Repository apiazza75/samsung-tizen-home.
Lingua di lavoro: italiano. L'utente vuole: prima verificare e progettare, poi implementare, poi verificare con prove eseguite,
poi consegnare UNA volta (niente fix a tentativi, niente "prova questo e vediamo"). Le modifiche vanno sempre unite su main,
non lasciate in PR. Il nome del modulo sulla TV NON deve più cambiare.

## Aggiornamento del 13 novembre 2026: app nativa, firma e installazione in corso
- main = 3.0.1 (vedi sotto); la 3.0.0 è entrata con la PR #11 (commit 3c8a253): collaudo completo rieseguito prima del merge (ES5, servizio, launcher, 42 verifiche
  dell'app nativa), Action di purge riuscita. Il modulo TizenBrew sulla TV passa da solo alla 3.0.0 alla prossima apertura.
- Pacchetto costruito da main: `node tools/build-native.js` → dist/MilanoHome-unsigned.wgt (1101 KB, ref 3c8a253), NON firmato.
- Decisioni dell'utente (13/11, in ordine): prima Tizen Studio, poi, saputo che su Mac arm64 richiede Rosetta 2, **niente
  Rosetta: si usa `reisxd/tizen.js`** (percorso letto nei sorgenti, in docs/APP-NATIVA.md). Il lavoro continua in una sessione
  LOCALE di Claude Code sul Mac, che esegue i comandi da sé: l'utente non vuole più fare da tramite a ogni comando. Resta la
  regola iniziale: conferma esplicita prima di OGNI modifica alla TV (le letture non la richiedono).
- Mac: macOS 27.0.1, arm64, IP 192.168.1.30 (en0); git e Node (Homebrew) presenti; niente Java, niente Tizen Studio, niente sdb,
  niente Rosetta. TV: QE75QN90AATXZT, in rete locale; IP visto nella Diagnostica del 31/10: 192.168.1.41 (da riverificare).
- Passi per la sessione locale, nell'ordine:
  1) LETTURA: `curl http://<TV>:8001/api/v2/` → annotare developerMode e developerIP (potrebbe anche spiegare perché l'autoavvio
     di TizenBrew non parte, punto 6 più sotto);
  2) preparare gli strumenti in una cartella fuori dal repository (`npm i github:reisxd/tizen.js adbhost`) e uno script Node per
     DUID, copia file e installazione, ricalcato su `tizenbrew-installer-service` (Buxton2.js, FilePusher.js,
     PackageInstallation.js); provarlo a secco dove possibile;
  3) MODIFICA ALLA TV (la fa l'utente dal telecomando, dopo conferma): IP del computer = 192.168.1.30, riavvio;
  4) LETTURA: DUID;
  5) certificato Samsung (l'utente accede al suo account e incolla il JSON), chiavi fuori dal repository;
  6) ricostruire il pacchetto da main (`node tools/build-native.js`) e firmarlo; controllare il contenuto del `.wgt` firmato;
  7) MODIFICA ALLA TV (dopo conferma): device-profile.xml;
  8) MODIFICA ALLA TV (dopo conferma): installazione;
  9) le cinque verifiche sulla TV elencate in APP-NATIVA.md, una alla volta;
  10) MODIFICA ALLA TV (dopo conferma): IP del computer rimesso com'era, riavvio; verificare che TizenBrew funzioni ancora.
- ESITO della sessione locale (13/11): TV a 192.168.1.10 (cavo; non più .41), developerMode 1, IP del computer era 127.0.0.1.
  Strumenti in ~/.milanohome-tools (tizen.js @45b0010, adbhost, tv.js = DUID/copia/installazione, make-cert.js). L'utente ha
  messo l'IP del computer a 192.168.1.30 e riavviato: DUID RLCEPZPTZ35ZE. Certificato Samsung (Public, scade 13/11/2027) in
  ~/.milanohome-cert (author.p12, distributor.p12, password.txt: fuori dal repository, DA CONSERVARE); nessun problema TLS.
  Pacchetto da main (3c8a253) firmato con `tizenjs build` e INSTALLATO con `vd_appinstall MilanoHome` ("install completed");
  la TV lo elenca (MilanoHome.Launcher 3.0.0). Il formato di firma di tizen.js (URI con %2F, SHA-512) è quindi accettato da
  Tizen 6. device-profile.xml NON copiato sulla TV: non è servito (e il file prodotto da tizen.js è una copia del certificato).
  Restano: le cinque verifiche sulla TV; rimettere l'IP del computer a 127.0.0.1 e riavviare; verificare TizenBrew.
- Verifiche sulla TV (13/11): 1) installazione ok; 2) servizio ok v3.0.0 app nativa, moduli di TizenBrew letti; 5) tasti canale
  ok. Ispezione remota: `0 kill MilanoHome` poi `0 debug MilanoHome.Launcher` via sdb dà la porta CDP (~/.milanohome-tools/cdp.js).
  DIFETTO trovato e corretto nella 3.0.1: sulla TV /apps impiega ~12 s (8 s di attesa del canale Smart Hub che non risponde + ~4 s
  per 439 app), il launcher andava in timeout a 12 s senza riprovare e restava con la sola tile YouTube. Ora: 30 s, un secondo
  tentativo, moduli mostrati subito, cartella dati in Diagnostica ("dati: ...").
- 3.0.1 su main (PR #12, bb8c584) e VERIFICATA sulla TV via CDP: l'app nativa si è aggiornata da sola (launcher in cache al primo
  riavvio, attivo al secondo; servizio v3.0.1 "da rete"), riga con 7 tile (YouTube, Netflix, Prime Video, Disney+, DAZN, Spotify,
  RaiPlay), 441 app in cache; 3) cartella dati = /home/owner/share/milanohome-native (quella persistente).
- Ancora aperti: 4) TizenTube dalla tile YouTube, verificabile solo con l'IP del computer a 127.0.0.1; canale telecomando
  dall'app nativa: 8002/v2 → 101 e poi nessuna risposta per 30 s (sorgenti HDMI senza funzione); tasto Home → home Samsung
  (previsto, vedi "Passi successivi" in APP-NATIVA.md). Sul Mac i test richiedono `ifconfig lo0 alias 127.0.0.2 up` (sudo).
- 3.0.2 (13/11, dopo la prova dell'utente: "navigazione che lagga, HDMI che non vanno, uscendo da un'app si torna a Samsung").
  Tutto MISURATO sulla TV via CDP, poi corretto, poi rimisurato con il launcher del ramo caricato con `index.html?ref=<sha>`:
  * FLUIDITÀ. Traccia di prestazioni (Tracing del CDP): sulla TV il disegno è software, su 2 thread. A ogni spostamento la tinta
    (gradiente CSS a tutto schermo) e i livelli "raggruppati" venivano ridisegnati per intero: ~18 ms a tile, 5,8 s di disegno per
    6 tasti, fotogrammi da 0,8-1,3 s. Il thread principale era libero (gestore del tasto: 5-10 ms). Correzione: tinta disegnata
    su un canvas 192x108 e mostrata come <img> (la ingrandisce il compositore: 3 tile invece di 120), `will-change` fisso sugli
    elementi animati così i livelli non cambiano forma, anello della selezione su un livello suo, niente transizioni di ombra o
    colore, nella griglia un riquadro di selezione che scorre sopra le card. Dopo: buco peggiore ~60 ms sulla riga, ~40 ms nella
    griglia. NON usare `transform:scale` su un elemento piccolo per "ingrandire" un gradiente: il livello viene disegnato comunque
    alla scala finale (provato).
  * HDMI. Dalla TV stessa il canale telecomando non funziona: 8002/v2 → 101 e silenzio per 30 s anche dopo "Consenti";
    127.0.0.1:8001/v3 si collega ma risponde "unrecognized method value : ms.remote.control". Nell'app nativa le sorgenti passano
    da `tizen.tvwindow.setSource` (privilegio `tv.window`) seguito dal lancio di `org.tizen.tv-viewer`: provato sulla TV (HDMI 2
    → sorgente HDMI 2, visore in primo piano). Al momento della prova nessun dispositivo HDMI era acceso: l'immagine vera la deve
    confermare l'utente. Home Samsung, Impostazioni TV e Spegni usano ancora il canale e quindi NON funzionano dall'app nativa.
  * RITORNO. L'API REST della TV (`/api/v2/applications/<id>`) dà running:false anche per l'app aperta (RaiPlay, la stessa Milano
    Home) e 404 per gli id tipo org.tizen.netflix-app: l'osservatore del servizio non può scattare. `addAppStatusChangeListener`
    non emette eventi; `getAppsUsageInfo` non è supportata sul profilo TV; `getAppsContext` elenca Netflix e YouTube anche da
    chiuse. Segnale usato dalla pagina: `tizen.tvwindow.getSource('MAIN').signal` è null con un'app in primo piano e diventa
    true/false quando la TV torna al visore. Provato: RaiPlay aperta dal launcher e chiusa da sdb → Milano Home torna in ~3 s.
    Limite: se la sorgente di prima è il sintonizzatore senza antenna, signal resta null. L'uscita "vera" dal menu di un'app la
    deve confermare l'utente. `reload="disable"` in config.xml: il rilancio non ricarica più la pagina (verificato).
  * Pacchetto: config.xml cambia (privilegio, app-control) quindi va REINSTALLATO; il launcher 3.0.2 su un pacchetto 3.0.0/3.0.1
    resta fluido ma per HDMI ripiega sul tasto e non ha il ritorno. Strumenti di misura usati (non nel repository): tracce e
    abbinamento livello → elemento con i domini Tracing, LayerTree e DOM del CDP.
- 3.0.3 (13/11, dopo la seconda prova dell'utente: "uscendo da Netflix o Prime Video con Indietro tenuto premuto resto sulla home
  Samsung"). Pacchetto 3.0.2 firmato e installato; la 3.0.3 cambia solo launcher e servizio, quindi arriva da sola (niente reinstallazione).
  MISURATO sulla TV: (1) i timer della pagina si fermano ~20 s dopo che la pagina è finita dietro un'altra app, nonostante
  `background-support="enable"`: il ritorno "dalla pagina" della 3.0.2 funzionava solo nelle prove brevi. (2) Con la sorgente
  sul sintonizzatore (`TV 1`, lo stato normale di questa TV) `tvwindow.getSource().signal` resta null anche col visore in primo
  piano; `getVideoResolution` e `getRect` non distinguono nulla. (3) L'API REST dice il vero se interrogata con l'id Smart Hub
  numerico: Netflix `3201907018807` → running/visible true da aperta, running true e visible false dopo il ritorno a Milano Home;
  RaiPlay `111399002034` true/true da aperta mentre con `5im3FztIhW.RaiTVtizen` resta false/false. (4) Il canale telecomando
  non risponde nemmeno dal Mac (8001 e 8002: nessun messaggio in 35 s), quindi l'elenco Smart Hub non si ottiene e gli id
  numerici stanno in una tabella a mano nel servizio. Correzione: il ritorno torna nel servizio (`watchApp` + `inFront`), la
  parte nella pagina è stata tolta. Non si è potuto premere "Indietro" da remoto: l'uscita vera la conferma l'utente.
- 3.0.4 (13/11): provando la 3.0.3 sulla TV il ritorno non partiva. MISURATO: dal servizio la callback di successo di
  `tizen.application.launch` non arriva mai anche se l'app si apre; `/launch` restava senza risposta (da qui il toast "Servizio
  non raggiungibile" dopo 8 s, a app già aperta) e `watchApp` non veniva chiamata. Ora `launchReply` osserva subito e risponde
  alla callback oppure dopo 1,5 s. Nota: l'API di GitHub ha un limite di 60 richieste l'ora per IP; con molti riavvii in un'ora
  `/update` risponde 403 e l'aggiornamento aspetta.
- Prima del 13/11 (sessione cloud): nessuna modifica alla TV. In questa sessione cloud l'esecuzione di `tizen.js` è stata bloccata (codice di terzi)
  e `download.tizen.org` / `developer.samsung.com` non erano raggiungibili: nulla di quel percorso è stato eseguito, solo letto.
- PR #12 (ramo claude/sweet-babbage-utar0a): questi documenti; in bozza, da completare con l'esito e unire alla fine.

## Stato del repository (al 31 ottobre 2026)
- main = 2.1.0: 2.0.0 (PR #5) + Action purge (PR #6, #9) + correzioni Codex 2.0.1 (PR #7) + 2.1.0 (canale v2/v3, ritorno con
  app control, prestazioni, orologio leggero, preferenze azzerate).
- Storia: 8c58710 = 1.5.0 · 9e90648 = 1.5.1 · f7a8fce = 1.6.0 · 9bdfd45 = documentazione · 2.0.0 (PR #5).
- File: app/index.html e service.js (bootstrap stabili, ora con cache), app/launcher.html (launcher vero, font incorporato),
  app/icons.js (set di icone nostro, 45 app + 6 di sistema), service-core.js (servizio vero), package.json (2.0.0), README.md,
  test/ (banco di prova completo), .github/workflows/purge-jsdelivr.yml.

## Fatti verificati (non ri-discutere, sono provati)
1. TizenBrew 2.x legge da jsDelivr SOLO tre file senza versione: package.json (servizio di TizenBrew, all'avvio, una volta sola:
   se la rete manca il modulo resta "Unknown Module" finché non si apre il Module Manager), app/index.html (proxy
   127.0.0.1:8081/module/..., a ogni apertura, SENZA cache e SENZA gestione errori: se jsDelivr non risponde la pagina resta
   vuota), service.js (serviceLauncher, all'avvio del servizio). Letto nel codice sorgente di TizenBrew (service-nextgen).
2. purge.jsdelivr.net accetta la purge (stato finished, provider CF+FY) ma NON basta per gli URL senza versione: il 31/10
   dopo i merge della 2.0.x jsDelivr ha continuato per più di 5 minuti a risolvere "main" a commit vecchi, diversi tra i
   nodi (service.js alla 1.5.1, index.html alla 1.6), e ripetere la purge produce solo "throttled". I tre file che TizenBrew
   legge senza versione si rinnovano entro 12 ore (s-maxage 43200). Gli URL @sha sono invece disponibili subito. L'Action
   ora purga una volta e riporta lo stato senza insistere. Conseguenza pratica: dopo un merge che tocca i bootstrap, la TV
   può usare il bootstrap vecchio per qualche ora; non è un problema perché carica comunque launcher e core dall'ultimo
   commit (scenario S8 dei test).
3. Module Manager: scrivere apiazza75/samsung-tizen-home senza gh/.
4. Sandbox di TizenBrew: vm context con le proprietà di global TRANNE global, module, services, inDebug, currentClient,
   currentModule; `new Function(...)` esegue nel realm principale (dove esiste `tizen`). test/sandbox.js è la replica esatta.
5b. Foto della 2.0.1 sulla TV (31/10 07:41): tutte e 4 le combinazioni (192.168.1.41 e 127.0.0.1, 8002 e 8001) chiuse dalla TV
   DOPO la stretta di mano con "codice 1005 notack". Spiegazione trovata nel codice di darksider4all/yet-another-samsung-ha-
   integration (misurato su un Samsung 2024): 1005 "notack" = richiesta di accoppiamento mai accettata/mostrata (ms.channel.timeOut)
   o token non più valido; sullo stesso firmware il canale /api/v3/channels/samsung.remote.control accettava i tasti senza
   accoppiamento, mentre su un firmware successivo il v2 funzionava e il v3 rispondeva ms.error ai tasti. La 2.1.0 prova v2 e v3
   su tutte le combinazioni, dimentica il token rifiutato, scarta il canale che rifiuta i tasti. DA VERIFICARE sulla TV con la
   Diagnostica 2.1.0 ("tentativi canale: host:porta/api → esito [eventi]"). Se anche il v3 chiude con 1005: i tasti HDMI/Spegni/
   Home/Menu restano senza funzione; idee successive: launch delle app di sistema (Impostazioni, Home) via tizen.application.launch
   e sorgenti HDMI come app Tizen (da cercare nei 439 id della Diagnostica), oppure tizen.tvwindow (privilegio non in TizenBrew).
5c. Uscita da un'app (2.0.1): il servizio rilanciava TizenBrew con tizen.application.launch; la TV aveva chiuso TizenBrew, che
   ripartiva sulla pagina dei moduli ("parte un caricamento, la home non si riapre"). La 2.1.0 usa launchAppControl con
   {moduleName:'apiazza75/samsung-tizen-home', moduleType:'gh'} (chiave 'module'), il meccanismo con cui TizenBrew apre un modulo
   su richiesta di un'altra app (UI: AppControlData → servizio: CanLaunchModules{type:'appControl'}); ripiego sul launch semplice.
   Passa dallo stesso rilancio in debug (ADB/CDP) dell'autoavvio: se sulla TV l'autoavvio non funziona, potrebbe non funzionare
   nemmeno questo. "ritorno a Milano Home: ..." in Diagnostica dice quale via è stata usata.
5d. L'utente riferisce interfaccia lenta sulla 2.0.1: la 2.1.0 toglie backdrop-filter e filter:blur, riduce ombre e transizioni
   (160-220 ms); /apps risponde subito per 2 minuti dopo un fallimento del canale. Orologio a peso 500 (era 700).
5. La TV dell'utente: Tizen 6 (2021), Node v12.4.0 nel servizio, 439 app Tizen. Foto della Diagnostica 1.6.0 del 30/10:
   servizio ok, "Smart Hub: non disponibile (connessione chiusa dalla TV / connessione chiusa dalla TV)" = su 8001 e 8002 la
   stretta di mano WebSocket riesce (101) e poi la TV chiude senza inviare ms.channel.connect. Nell'elenco dispositivi della TV
   "Milano Home" NON compare (ci sono "device 2" e "device 3" senza dettagli, tutti consentiti); "Notifica di accesso" =
   solo la prima volta. Ipotesi principale: la TV non accetta il canale telecomando da 127.0.0.1. La 2.0.0 prova anche l'IP
   di rete della TV (os.networkInterfaces) e registra codice/motivo di chiusura: la Diagnostica 2.0.0 dirà quale combinazione
   funziona ("canale ok su <host>:<porta>") o perché no ("tentativi canale: ...").
6. Autoavvio TizenBrew (letto nel codice): avviene solo dopo il rilancio in modalità debug (ADB → CDP → CanLaunchModules
   {type:'autolaunch'}); la UI lo salta se è stato premuto ↑. Per la 2.0.5 il flusso è corretto; sulla TV dell'utente non parte:
   da chiarire versione di TizenBrew e cosa mostra. Samsung "Esecuzione automatica ultima app" richiede anche "Esecuzione
   automatica Smart Hub" attiva (fonte: community Samsung) e la TV spenta con l'app in primo piano.
7. Icone: tutte nostre (app/icons.js); Smart Hub solo come ripiego (cartella FirstScreen letta direttamente, poi canale).

## Architettura 2.0.0 (collaudata)
- index.html: launcher (con icons.js incorporato) in localStorage `mh_launcher` {ref, html}; se c'è parte subito; se no lo
  scarica (sha di main → jsDelivr@sha, altrimenti @main) con ritentativi 3/5/10/20/30 s; Invio riprova. `?ref=` bypassa.
- launcher.html: dopo 4 s controlla main; se nuovo scarica launcher+icons in cache (attivi alla prossima apertura) e chiama
  /update sul servizio; VERSION, window.MH_REF, MH_SOURCE (cache|rete), MH_CDN, MH_API. Menu ↑ → "Svuota la cache del
  launcher e ricarica" e "Riprova il collegamento con la TV" (/hubreset).
- service.js: core in /home/owner/share/milanohome-core.js (+ .json {ref}); esegue subito dalla cache; check con backoff
  2/5/10/30/60/120 s; espone MH_BOOT {update(cb), info()} al core; il core nuovo prende la porta 8095 chiedendo /shutdown
  al vecchio. Il core 2.0 funziona anche sotto il bootstrap 1.5.1 (/update → 'unsupported').
- service-core.js: /ping (v, ref, lan, boot, hub{apps,error,dir,dirError,chan,channelError,attempts}), /apps (hub da canale
  o da cartella), /hub, /hubicon, /icon, /asset?name= (sfondi/font con cache su disco, scaldata all'avvio), /update, /launch,
  /key, /hubreset, /shutdown. Canale: combinazioni [state.chan, lan:8002, lan:8001, 127.0.0.1:8002, 127.0.0.1:8001];
  si ferma su unauthorized/timeout (per non riaprire l'avviso "Consenti"). Variabili per i test: MH_TV_HOST, MH_TV_PORT,
  MH_TV_PORT_TLS, MH_LAN_IP, MH_HUB_DIR, MH_DATA_DIR, MH_CDN, MH_API.

## Collaudi (test/run.sh): tutti superati prima di ogni merge (2.1.0: 81 verifiche del servizio in 13 scenari, 41 del launcher)
- Sintassi ES5 (acorn) di servizio, core, icone, index e launcher.
- test/service-tests.js: 66 verifiche in 9 scenari (prima installazione; aggiornamento a caldo; avvio senza rete con cache;
  senza rete e senza cache; canale loopback chiuso/LAN ok; canale chiuso ovunque + cartella icone; unauthorized; bootstrap
  1.5.1 + core 2.0; attesa "Consenti" e riuso del token). Superati anche con Node 12.22 (MH_NODE=...).
- test/launcher-tests.js: 35 verifiche in 5 scenari (prima apertura; GitHub/jsDelivr giù con cache; main avanza → launcher
  e servizio aggiornati; prima installazione senza rete con ritorno della rete; demo file://). Screenshot 1920x1080 ispezionati.

## Sulla TV, da fare (uno alla volta, chiedendo l'esito)
1. Riavviare TizenBrew (o la TV): il servizio rinnova service.js (2.0, purgato) e scarica il core 2.0; aprire Milano Home
   due volte (la prima scarica il launcher 2.0 in cache, la seconda lo usa). In alternativa alla prima apertura: menu ↑ →
   "Svuota la cache del launcher e ricarica".
2. Diagnostica (menu ↑): attesa "commit <sha 2.0.0> da cache", "servizio: ok v2.0.0", riga "Smart Hub: ... canale ok su
   <host>:<porta>" oppure "tentativi canale: ..." con i motivi. Chiedere una foto.
3. Se il canale resta chiuso su tutte e 4 le combinazioni: le icone sono comunque nostre; restano senza funzione i tasti
   HDMI/Home/Spegni/Impostazioni. Prossima idea da verificare: launch diretto delle app di sistema per Home/Impostazioni
   (tizen.application.launch) e sorgenti HDMI come app Tizen, oppure tizen.tvwindow (privilegio non concesso a TizenBrew).
4. Avvio automatico: chiedere versione di TizenBrew e comportamento; Samsung: entrambe le "Esecuzione automatica" attive.

## Note
- jsDelivr: hash intero immutabile; purge POST https://purge.jsdelivr.net/ {"path":[...]}.
- Origine della pagina: http://127.0.0.1:8081 (document.write + <base>): isTV e fromPage valgono.
- App ID TizenBrew: xvvl3S1bvH.TizenBrewStandalone; WS 8081: GetModules=4, LaunchModule=5, ModuleAction=10.
- Vincoli: ES5 nel servizio; CSS/JS per Chromium 76. I due bootstrap vanno toccati il meno possibile (ogni modifica richiede
  purge + riavvio di TizenBrew per service.js).
