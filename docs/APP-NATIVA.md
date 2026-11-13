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
IP del computer → riavvio della TV). Il file prodotto qui **non è firmato**.

**Strada scelta: Tizen Studio** (strumenti ufficiali Samsung) sul Mac, con certificato Samsung legato al DUID della TV:

1. Tizen Studio con *Samsung TV Extensions* e *Samsung Certificate Extension* (dalla 2.0.73 in su: le versioni precedenti non
   creano più certificati da settembre 2025). Su Mac con processore Apple non è supportato ufficialmente: gira con Rosetta.
2. Modalità sviluppatore sulla TV con l'IP del Mac, riavvio, `sdb connect <IP della TV>`, `sdb devices`.
3. Certificate Manager: profilo Samsung (account Samsung), certificato autore + distributore con il DUID della TV. Il certificato
   autore va **conservato**: un aggiornamento firmato da un autore diverso viene rifiutato finché non si disinstalla l'app.
4. `tizen package -t wgt -s <profilo> -- dist/MilanoHome-unsigned.wgt`, poi `tizen install -n <file firmato> -t <TV>`.

Attenzione all'**IP del computer nella Modalità sviluppatore**: TizenBrew lo vuole a `127.0.0.1` (lo usa per rilanciarsi in debug),
l'installazione dal Mac lo vuole all'IP del Mac. Prima di cambiarlo va annotato il valore attuale; a installazione fatta va rimesso
com'era, con un altro riavvio.

Strada scartata per ora: firma con `reisxd/tizen.js` e installazione con TizenBrew Installer Desktop. Letto nel suo codice
(`tizenbrew-installer-service/index.js`, `resignOrInstall`): sotto Tizen 7 l'installer **non firma**, copia il `.wgt` in
`/home/owner/share/tmp/sdk_tools/` e lancia `vd_appinstall`; la firma serve quindi comunque, e non è accertato che la QN90A accetti
un certificato distributore non Samsung.

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

## Passi successivi (non in questa versione)

- **Tasto Home e risveglio dallo standby su Milano Home**: documentato da altri su un AU8000 con lo stesso Tizen 6.0 / firmware 2310
  (`DavidNgugi/samsung-tv-unlock`, `docs/HOME-BUTTON.md`), non sulla QN90A. Va prima letto lo stato della TV, con backup, e solo dopo
  scritto qualcosa. Limite dichiarato: dopo un'accensione a freddo la TV parte comunque sul visore TV.
- **Rimozione delle app preinstallate**: solo con un elenco verificato sul modello e un backup (`ardazeytin/samsung-tizen-tv-debloat`
  elenca i pacchetti da non toccare).
