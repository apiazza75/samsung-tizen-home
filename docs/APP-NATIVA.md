# Milano Home come app nativa Tizen (3.0.0)

Dalla 3.0.0 lo stesso codice gira in due modi:

- **modulo TizenBrew** (come finora): nessuna differenza di comportamento;
- **app nativa** (`.wgt`): Milano Home è un'app della TV a sé, con il suo servizio. Non passa più da TizenBrew, da jsDelivr né dal
  proxy `127.0.0.1:8081` per aprirsi: launcher, icone e sfondi sono dentro il pacchetto.

## Cosa cambia in modalità nativa

| | Modulo TizenBrew | App nativa |
|---|---|---|
| Apertura | TizenBrew → proxy → jsDelivr (3 KB) → cache | file del pacchetto, nessuna rete |
| Servizio | nella sandbox di TizenBrew, porta 8095 | servizio del pacchetto (`MilanoHome.Service`), porta 8096 |
| Sfondi | jsDelivr, poi cache su disco | file del pacchetto |
| Moduli TizenBrew (TizenTube) | via WebSocket di TizenBrew | letti da `tizenbrewConfig.json`, aperti con app control |
| Ritorno al launcher all'uscita da un'app | app control verso TizenBrew | `launch` di `MilanoHome.Launcher` |
| Aggiornamenti | automatici dall'ultimo commit di `main` | uguali (launcher e core); sfondi e `config.xml` solo con un pacchetto nuovo |

Le due modalità convivono sulla stessa TV (porte e cartelle dati diverse): si può provare la nativa senza togliere il modulo.

## Costruire il pacchetto

```bash
node tools/build-native.js          # out/native/ e dist/MilanoHome-unsigned.wgt
```

Il pacchetto incorpora launcher e core del commit corrente. Va costruito **dopo** che la 3.0.0 è su `main`: al primo avvio launcher e
servizio si allineano all'ultimo commit di `main`, che deve quindi conoscere la modalità nativa. La 3.0.0 è su `main` dal 13/11/2026
(commit `3c8a253`, PR #11).

## Firma e installazione (in corso dal 13/11/2026, non ancora provate sulla TV)

La TV installa solo pacchetti firmati e solo con la **Modalità sviluppatore** attiva (Apps → digitare 12345 → Developer mode On →
IP del computer → riavvio della TV). Il file prodotto da `tools/build-native.js` **non è firmato**.

**Strada scelta dall'utente (13/11): `reisxd/tizen.js`, senza Tizen Studio.** Il Mac è arm64 con macOS 27; Tizen Studio (fermo alla
6.1, aprile 2025) è solo x86_64 e richiederebbe Rosetta 2, che l'utente non vuole installare. Tutto ciò che segue gira in Node.

Letto nei sorgenti (`tizen.js` @45b0010, `TizenBrewInstaller` @579e2d2), **non ancora eseguito**:

1. **Stato della TV, sola lettura**: `curl http://<TV>:8001/api/v2/` restituisce `device.developerMode` ("1" = attiva) e
   `device.developerIP` (l'IP del computer impostato). Va letto e annotato prima di cambiare qualcosa.
2. **Collegamento**: il protocollo sdb è sulla porta 26101 della TV, che accetta solo l'IP impostato come computer. In Node lo parla
   la libreria `adbhost` (`createConnection({host, port: 26101})`), la stessa dell'installer.
3. **DUID**: flusso `shell:0 getduid` sulla connessione sdb (sola lettura).
4. **Certificato Samsung**: `tizenjs create-samsung-cert --name … --email … --password … --duidList <DUID> --privilege Public
   --output <cartella>`. Chiede di accedere all'account Samsung a
   `https://account.samsung.com/accounts/TDC/signInGate?clientId=v285zxnl3h&tokenType=TOKEN` e di incollare il JSON di risposta
   (`access_token`, `userId`); scrive `author.p12`, `distributor.p12`, `device-profile.xml`. Scarica le CA Samsung da
   `download.tizen.org` in `~/share/.samsung-cert`. I privilegi di `config.xml` sono tutti pubblici: basta `Public`.
5. **Firma**: `tizenjs build dist/MilanoHome-unsigned.wgt -t wgt -o dist/MilanoHome.wgt --author author.p12 --authorPwd …
   --distributor distributor.p12 --distributorPwd …` (toglie eventuali firme, aggiunge `author-signature.xml` e `signature1.xml`).
6. **Profilo del dispositivo** (modifica alla TV): `device-profile.xml` va copiato in
   `/home/owner/share/tmp/sdk_tools/device-profile.xml` (protocollo `sync:`, vedi `utils/FilePusher.js` dell'installer).
7. **Installazione** (modifica alla TV): `.wgt` copiato in `/home/owner/share/tmp/sdk_tools/package.wgt`, poi flusso
   `shell:0 vd_appinstall MilanoHome /home/owner/share/tmp/sdk_tools/package.wgt`; l'esito è nel testo restituito (l'installer
   considera finita l'operazione alla comparsa di "spend time").

Punti da tenere d'occhio, in ordine di probabilità:

- **TLS di `svdca.samsungqbe.com`** (servizio dei certificati): l'installer disattiva la verifica TLS per tutto il processo perché
  quel certificato è scaduto. Se `create-samsung-cert` fallisce per questo, fermarsi e chiedere all'utente prima di aggirare la
  verifica, e in ogni caso limitarla a quel solo comando.
- **Formato della firma**: `tizen.js` scrive i riferimenti con `encodeURIComponent` (`service%2Fservice.js`) e usa SHA-512. È lo
  stesso formato con cui l'installer rifirma TizenBrew (che ha a sua volta una cartella `service/`) su Tizen 7+; su Tizen 6 non è
  provato. Se l'installazione fallisce per la firma, è il primo sospetto.
- **Certificato Tizen "pubblico"** (`create-tizen-cert`, senza account Samsung): possibile ripiego, ma non è accertato che la QN90A
  accetti un distributore non Samsung.
- **IP del computer nella Modalità sviluppatore**: TizenBrew lo vuole a `127.0.0.1` (lo usa per rilanciarsi in debug),
  l'installazione dal Mac lo vuole all'IP del Mac (192.168.1.30). Si cambia dal telecomando, con riavvio; a installazione fatta va
  rimesso com'era, con un altro riavvio.
- **Chiavi**: `author.p12`, `distributor.p12` e la loro password restano **fuori dal repository** (per esempio in
  `~/.milanohome-cert/`). Il certificato autore va conservato: un aggiornamento firmato da un autore diverso viene rifiutato finché
  non si disinstalla l'app.

Strada ufficiale, non scelta: Tizen Studio con *Samsung Certificate Extension* ≥ 2.0.73 (su Mac arm64 solo con Rosetta 2), poi
`tizen package -t wgt -s <profilo> -- dist/MilanoHome-unsigned.wgt` e `tizen install -n <file firmato> -t <TV>`.

TizenBrew Installer Desktop da solo non basta: sotto Tizen 7 **non firma** (`resignOrInstall`), installa il `.wgt` così com'è, e
dalla sua interfaccia su computer installa solo da release GitHub, non da file locale.

## Cosa è collaudato e cosa no

Collaudato qui (`test/native-tests.js`, 42 verifiche): assemblaggio del pacchetto, avvio del servizio senza rete dal core incluso,
controllo d'accesso (intestazione `X-MH`, origini web rifiutate), moduli TizenBrew, ritorno al launcher, aggiornamento automatico di
servizio e launcher, riavvio del servizio dalla pagina, nessun errore di pagina.

Da verificare sulla TV (QE75QN90AATXZT, Tizen 6.0, firmware 2310), una cosa alla volta:

1. il pacchetto firmato si installa;
2. il servizio parte (`Diagnostica`: "servizio: ok v3.0.0 … app nativa");
3. la cartella `/home/owner/share/milanohome-native` è scrivibile dal servizio (altrimenti usa `/tmp/milanohome-native`, che si
   svuota a ogni riavvio della TV);
4. TizenTube si apre dalla tile YouTube (app control verso TizenBrew);
5. i tasti canale ▲▼ arrivano al launcher.

## Sorgenti HDMI e ritorno a Milano Home (dalla 3.0.2)

Dalla TV stessa il canale telecomando Samsung non risponde (misurato sulla QN90A), quindi l'app nativa usa le API della TV:

- **HDMI**: `tizen.tvwindow.setSource` sulla sorgente scelta e poi lancio del visore di sistema `org.tizen.tv-viewer`. Serve il
  privilegio `http://tizen.org/privilege/tv.window`.
- **Ritorno**: dopo aver aperto un'app la pagina osserva `tizen.tvwindow.getSource('MAIN').signal`: è `null` finché un'app è in
  primo piano e diventa `true`/`false` quando la TV torna al visore; a quel punto Milano Home si rilancia. Non scatta se nel
  frattempo è stata scelta un'altra sorgente, né se la sorgente di prima è il sintonizzatore senza antenna.
- `config.xml` dichiara anche un `app-control` con `reload="disable"`: il rilancio riporta la pagina in primo piano senza ricaricarla.
- **Home Samsung, Impostazioni TV e Spegni** passano ancora dal canale telecomando e dall'app nativa non funzionano.

## Passi successivi (non in questa versione)

- **Tasto Home e risveglio dallo standby su Milano Home**: documentato da altri su un AU8000 con lo stesso Tizen 6.0 / firmware 2310
  (`DavidNgugi/samsung-tv-unlock`, `docs/HOME-BUTTON.md`), non sulla QN90A. Va prima letto lo stato della TV, con backup, e solo dopo
  scritto qualcosa. Limite dichiarato: dopo un'accensione a freddo la TV parte comunque sul visore TV.
- **Rimozione delle app preinstallate**: solo con un elenco verificato sul modello e un backup (`ardazeytin/samsung-tizen-tv-debloat`
  elenca i pacchetti da non toccare).
