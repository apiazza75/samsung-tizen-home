# Handover · Quiet Home · 31 October 2026

Note: the project was called Milano Home until version 3.0.4; identifiers such as `MilanoHome` in the history below are the names used at the time.

Project: "Quiet Home" launcher for Samsung Tizen, TizenBrew module. Repository apiazza75/samsung-tizen-home.
Working language: Italian. The user wants: first verify and design, then implement, then verify with tests actually run,
then deliver ONCE (no trial-and-error fixes, no "try this and let's see"). Changes must always be merged into main,
not left in a PR. The name of the module on the TV must NOT change any more.

## Update of 13 November 2026: native app, signing and installation in progress
- main = 3.0.1 (see below); 3.0.0 came in with PR #11 (commit 3c8a253): full test run repeated before the merge (ES5, service, launcher, 42 checks
  of the native app), purge Action succeeded. The TizenBrew module on the TV moves to 3.0.0 by itself at the next opening.
- Package built from main: `node tools/build-native.js` → dist/MilanoHome-unsigned.wgt (1101 KB, ref 3c8a253), NOT signed.
- The user's decisions (13/11, in order): first Tizen Studio, then, on learning that on Mac arm64 it requires Rosetta 2, **no
  Rosetta: `reisxd/tizen.js` is used** (route read in the sources, in docs/NATIVE-APP.md). The work continues in a LOCAL
  Claude Code session on the Mac, which runs the commands itself: the user no longer wants to act as go-between for every command. The
  initial rule stays: explicit confirmation before EVERY change to the TV (reads do not require it).
- Mac: macOS 27.0.1, arm64, IP 192.168.1.30 (en0); git and Node (Homebrew) present; no Java, no Tizen Studio, no sdb,
  no Rosetta. TV: QE75QN90AATXZT, on the local network; IP seen in the Diagnostics screen (`Diagnostica`) of 31/10: 192.168.1.41 (to be re-verified).
- Steps for the local session, in order:
  1) READ: `curl http://<TV>:8001/api/v2/` → note down developerMode and developerIP (it might also explain why TizenBrew's
     autostart does not start, point 6 further down);
  2) prepare the tools in a folder outside the repository (`npm i github:reisxd/tizen.js adbhost`) and a Node script for
     DUID, file copy and installation, modelled on `tizenbrew-installer-service` (Buxton2.js, FilePusher.js,
     PackageInstallation.js); dry-run it where possible;
  3) CHANGE TO THE TV (done by the user from the remote control, after confirmation): computer IP = 192.168.1.30, restart;
  4) READ: DUID;
  5) Samsung certificate (the user signs in to their account and pastes the JSON), keys outside the repository;
  6) rebuild the package from main (`node tools/build-native.js`) and sign it; check the contents of the signed `.wgt`;
  7) CHANGE TO THE TV (after confirmation): device-profile.xml;
  8) CHANGE TO THE TV (after confirmation): installation;
  9) the five checks on the TV listed in NATIVE-APP.md, one at a time;
  10) CHANGE TO THE TV (after confirmation): computer IP put back as it was, restart; verify that TizenBrew still works.
- OUTCOME of the local session (13/11): TV at 192.168.1.10 (cable; no longer .41), developerMode 1, the computer IP was 127.0.0.1.
  Tools in ~/.milanohome-tools (tizen.js @45b0010, adbhost, tv.js = DUID/copy/installation, make-cert.js). The user
  set the computer IP to 192.168.1.30 and restarted: DUID RLCEPZPTZ35ZE. Samsung certificate (Public, expires 13/11/2027) in
  ~/.milanohome-cert (author.p12, distributor.p12, password.txt: outside the repository, TO BE KEPT); no TLS problem.
  Package from main (3c8a253) signed with `tizenjs build` and INSTALLED with `vd_appinstall MilanoHome` ("install completed");
  the TV lists it (MilanoHome.Launcher 3.0.0). The tizen.js signature format (URIs with %2F, SHA-512) is therefore accepted by
  Tizen 6. device-profile.xml NOT copied to the TV: it was not needed (and the file produced by tizen.js is a copy of the certificate).
  Remaining: the five checks on the TV; put the computer IP back to 127.0.0.1 and restart; verify TizenBrew.
- Checks on the TV (13/11): 1) installation ok; 2) service ok v3.0.0 native app, TizenBrew modules read; 5) channel keys
  ok. Remote inspection: `0 kill MilanoHome` then `0 debug MilanoHome.Launcher` via sdb gives the CDP port (~/.milanohome-tools/cdp.js).
  DEFECT found and fixed in 3.0.1: on the TV /apps takes ~12 s (8 s waiting for the Smart Hub channel, which does not respond, + ~4 s
  for 439 apps), the launcher timed out at 12 s without retrying and was left with only the YouTube tile. Now: 30 s, a second
  attempt, modules shown immediately, data folder in Diagnostics ("dati: ...", i.e. "data: ...").
- 3.0.1 on main (PR #12, bb8c584) and VERIFIED on the TV via CDP: the native app updated itself (launcher in cache at the first
  restart, active at the second; service v3.0.1 "da rete", i.e. "from network"), row with 7 tiles (YouTube, Netflix, Prime Video, Disney+, DAZN, Spotify,
  RaiPlay), 441 apps in cache; 3) data folder = /home/owner/share/milanohome-native (the persistent one).
- Still open: 4) TizenTube from the YouTube tile, verifiable only with the computer IP at 127.0.0.1; remote control channel
  from the native app: 8002/v2 → 101 and then no response for 30 s (HDMI sources without function); Home key → Samsung home
  (expected, see "Next steps" in NATIVE-APP.md). On the Mac the tests require `ifconfig lo0 alias 127.0.0.2 up` (sudo).
- 3.0.2 (13/11, after the user's trial: "navigazione che lagga, HDMI che non vanno, uscendo da un'app si torna a Samsung", i.e.
  "navigation that lags, HDMI inputs that don't work, leaving an app takes you back to Samsung").
  Everything MEASURED on the TV via CDP, then fixed, then measured again with the branch's launcher loaded with `index.html?ref=<sha>`:
  * SMOOTHNESS. Performance trace (CDP Tracing): on the TV painting is done in software, on 2 threads. At every move the tint
    (full-screen CSS gradient) and the "grouped" layers were repainted in full: ~18 ms per tile, 5.8 s of painting for
    6 key presses, frames of 0.8-1.3 s. The main thread was free (key handler: 5-10 ms). Fix: tint painted
    on a 192x108 canvas and shown as an <img> (the compositor enlarges it: 3 tiles instead of 120), fixed `will-change` on the
    animated elements so the layers do not change shape, selection ring on a layer of its own, no shadow or
    colour transitions, in the grid a selection frame that slides over the cards. After: worst gap ~60 ms on the row, ~40 ms in the
    grid. Do NOT use `transform:scale` on a small element to "enlarge" a gradient: the layer is painted at the final scale
    anyway (tried).
  * HDMI. From the TV itself the remote control channel does not work: 8002/v2 → 101 and silence for 30 s even after "Consenti" (Allow);
    127.0.0.1:8001/v3 connects but answers "unrecognized method value : ms.remote.control". In the native app the sources go
    through `tizen.tvwindow.setSource` (`tv.window` privilege) followed by the launch of `org.tizen.tv-viewer`: tried on the TV (HDMI 2
    → HDMI 2 source, viewer in the foreground). At the time of the trial no HDMI device was switched on: the actual picture must be
    confirmed by the user. Samsung Home, TV Settings and Power off still use the channel and therefore do NOT work from the native app.
  * RETURN. The TV's REST API (`/api/v2/applications/<id>`) gives running:false even for the open app (RaiPlay, Quiet Home
    itself) and 404 for ids such as org.tizen.netflix-app: the service's watcher cannot fire. `addAppStatusChangeListener`
    emits no events; `getAppsUsageInfo` is not supported on the TV profile; `getAppsContext` lists Netflix and YouTube even when
    closed. Signal used by the page: `tizen.tvwindow.getSource('MAIN').signal` is null with an app in the foreground and becomes
    true/false when the TV goes back to the viewer. Tried: RaiPlay opened from the launcher and closed from sdb → Quiet Home returns in ~3 s.
    Limit: if the previous source is the tuner without an antenna, signal stays null. The "real" exit from an app's menu must be
    confirmed by the user. `reload="disable"` in config.xml: the relaunch no longer reloads the page (verified).
  * Package: config.xml changes (privilege, app-control) so it must be REINSTALLED; the 3.0.2 launcher on a 3.0.0/3.0.1 package
    stays smooth but for HDMI falls back on the key and does not have the return. Measurement tools used (not in the repository): traces and
    layer → element matching with the CDP Tracing, LayerTree and DOM domains.
- 3.0.3 (13/11, after the user's second trial: "uscendo da Netflix o Prime Video con Indietro tenuto premuto resto sulla home
  Samsung", i.e. "leaving Netflix or Prime Video with Back held down I stay on the Samsung home"). Package 3.0.2 signed and installed; 3.0.3 changes only launcher and service, so it arrives by itself (no reinstallation).
  MEASURED on the TV: (1) the page's timers stop ~20 s after the page has ended up behind another app, despite
  `background-support="enable"`: the 3.0.2 return "from the page" worked only in short trials. (2) With the source
  on the tuner (`TV 1`, the normal state of this TV) `tvwindow.getSource().signal` stays null even with the viewer in the
  foreground; `getVideoResolution` and `getRect` do not distinguish anything. (3) The REST API tells the truth if queried with the numeric Smart Hub
  id: Netflix `3201907018807` → running/visible true when open, running true and visible false after the return to Quiet Home;
  RaiPlay `111399002034` true/true when open, while with `5im3FztIhW.RaiTVtizen` it stays false/false. (4) The remote control channel
  does not respond from the Mac either (8001 and 8002: no message in 35 s), so the Smart Hub list cannot be obtained and the numeric
  ids are in a hand-written table in the service. Fix: the return goes back into the service (`watchApp` + `inFront`), the
  part in the page has been removed. It was not possible to press "Indietro" (Back) remotely: the real exit is confirmed by the user.
- 3.0.4 (13/11): trying 3.0.3 on the TV, the return did not start. MEASURED: from the service the success callback of
  `tizen.application.launch` never arrives even though the app opens; `/launch` was left without a response (hence the toast "Servizio
  non raggiungibile", i.e. "Service unreachable", after 8 s, with the app already open) and `watchApp` was not called. Now `launchReply` starts watching immediately and replies
  on the callback or after 1.5 s. Note: the GitHub API has a limit of 60 requests per hour per IP; with many restarts in an hour
  `/update` answers 403 and the update waits.
- 13/11, after 3.0.4. TRIED on the TV: Netflix opened from the service, 60 s, then TV viewer in the foreground → Quiet Home returns in
  2 s (via `visible`). Mediaset Infinity (outside the table) opened, 50 s, closed with `0 kill` → Quiet Home returns in 2 s (via
  contexts). The user mostly uses Mediaset Infinity (`g3zzYA7yO8.InfinityNew`), NOW (`jcz0WrZYdy.NOWTV`) and Crunchyroll.
  Crunchyroll added to the table (`3202302030097`, name and version confirmed by the TV's API). For Mediaset Infinity and NOW
  the Smart Hub id is not found in the public lists (the two for "NOW TV" give 404): they rely on the exit closing them.
  To be confirmed with the remote control; if they stay suspended their numeric id is needed.
- Before 13/11 (cloud session): no change to the TV. In this cloud session the execution of `tizen.js` was blocked (third-party code)
  and `download.tizen.org` / `developer.samsung.com` were not reachable: nothing on that route was executed, only read.
- PR #12 (branch claude/sweet-babbage-utar0a): these documents; in draft, to be completed with the outcome and merged at the end.

## Update of 13 November 2026 (later): 3.1.0, renamed to Quiet Home, five languages

Asked by the owner: a name not tied to Milan, the project given away on GitHub for an international audience, documentation in
English, interface in Italian, English, Spanish, German and French with an easy way to add more, a choice of backgrounds, and
both of his TVs updated (living room QN90A at 192.168.1.10, plus a kitchen TV not yet reachable on the network).

Done in 3.1.0 (local tests: 82 + 42 + 47 passed):
- Name: "Quiet Home" everywhere the user sees it. Native package ids are now `QuietHomeT` (10 characters, required by Tizen), `QuietHomeT.Launcher`,
  `QuietHomeT.Service`, data folder `/home/owner/share/quiethome-native`, package file `dist/QuietHome.wgt`. Internal prefixes
  (`mh_*`, `MH_*`, `milanohome-*` cache files) are unchanged on purpose. The repository and TizenBrew module name are unchanged.
- Languages: English built into `app/launcher.html` (`EN`), the others in `app/lang/<code>.json`, downloaded from the commit in
  use and cached in localStorage (`mh_lang`); the native package carries them inside `bundled.js` (`window.MH_LANGS`). The
  language follows `navigator.language` (measured on the QN90A: `it-IT`), or the menu choice (`prefs.lang`). Dates use
  `toLocaleDateString` (measured on the QN90A: correct for all five languages). `test/run.sh` step 1b checks keys and
  placeholders. Diagnostics and service messages are English only.
- Weather: no more hard-coded town. The city is chosen from the menu (text field, Open-Meteo geocoding, `prefs.wx`). Without a
  city nothing is requested. NOT tried with the TV's on-screen keyboard yet.
- Backgrounds: menu row cycling all photos / one fixed photo / none (`prefs.wall`). The slow zoom now runs continuously (60 s,
  back and forth, scale 1.03 to 1.2): before, it ran for 50 s out of every 75 and with a third of the travel, measured on the TV
  as already stopped. The photos are still the four of Milan.
- Service launch answer field `method` is now `unconfirmed` when the TV gives no success callback.

Still to do:
- The living-room TV still has the OLD package `MilanoHome` 3.0.2 (it self-updates launcher and service, so it already shows
  Quiet Home). To move to the `QuietHomeT` package: uninstall the old one first (both services would listen on 8096), install the
  new one, restore the row order and the weather city (the preferences belong to the old package and are lost).
- Kitchen TV: not found on the network on 13/11 (scan of 192.168.1.0/24 on ports 8001 and 26101). It needs to be on, with the
  developer IP set to this Mac, and the distributor certificate must be re-issued with its DUID as well.
- Neutral photo sets; the "tonight" strip, time-aware ordering and the "one more episode" timer discussed with the owner, each
  one switchable per app and off by default.

## State of the repository (as of 31 October 2026)
- main = 2.1.0: 2.0.0 (PR #5) + purge Action (PR #6, #9) + Codex fixes 2.0.1 (PR #7) + 2.1.0 (v2/v3 channel, return with
  app control, performance, lightweight clock, preferences reset).
- History: 8c58710 = 1.5.0 · 9e90648 = 1.5.1 · f7a8fce = 1.6.0 · 9bdfd45 = documentation · 2.0.0 (PR #5).
- Files: app/index.html and service.js (stable bootstraps, now with cache), app/launcher.html (the real launcher, embedded font),
  app/icons.js (our own icon set, 45 apps + 6 system ones), service-core.js (the real service), package.json (2.0.0), README.md,
  test/ (complete test bench), .github/workflows/purge-jsdelivr.yml.

## Verified facts (do not re-discuss, they are proven)
1. TizenBrew 2.x reads from jsDelivr ONLY three files without a version: package.json (TizenBrew's service, at startup, once only:
   if the network is missing the module stays "Unknown Module" until the Module Manager is opened), app/index.html (proxy
   127.0.0.1:8081/module/..., at every opening, WITHOUT cache and WITHOUT error handling: if jsDelivr does not respond the page stays
   empty), service.js (serviceLauncher, at service startup). Read in the TizenBrew source code (service-nextgen).
2. purge.jsdelivr.net accepts the purge (status finished, provider CF+FY) but that is NOT enough for URLs without a version: on 31/10
   after the 2.0.x merges jsDelivr went on for more than 5 minutes resolving "main" to old commits, different across
   nodes (service.js at 1.5.1, index.html at 1.6), and repeating the purge only produces "throttled". The three files that TizenBrew
   reads without a version are renewed within 12 hours (s-maxage 43200). @sha URLs, on the other hand, are available immediately. The Action
   now purges once and reports the status without insisting. Practical consequence: after a merge that touches the bootstraps, the TV
   may use the old bootstrap for a few hours; it is not a problem because it loads launcher and core from the latest
   commit anyway (scenario S8 of the tests).
3. Module Manager: type apiazza75/samsung-tizen-home without gh/.
4. TizenBrew sandbox: vm context with the properties of global EXCEPT global, module, services, inDebug, currentClient,
   currentModule; `new Function(...)` runs in the main realm (where `tizen` exists). test/sandbox.js is the exact replica.
5b. Photo of 2.0.1 on the TV (31/10 07:41): all 4 combinations (192.168.1.41 and 127.0.0.1, 8002 and 8001) closed by the TV
   AFTER the handshake with "codice 1005 notack" ("code 1005 notack"). Explanation found in the code of darksider4all/yet-another-samsung-ha-
   integration (measured on a 2024 Samsung): 1005 "notack" = pairing request never accepted/shown (ms.channel.timeOut)
   or token no longer valid; on the same firmware the /api/v3/channels/samsung.remote.control channel accepted keys without
   pairing, while on a later firmware v2 worked and v3 answered ms.error to keys. 2.1.0 tries v2 and v3
   on all combinations, forgets the rejected token, discards the channel that rejects keys. TO BE VERIFIED on the TV with the
   2.1.0 Diagnostics ("tentativi canale: host:porta/api → esito [eventi]", i.e. "channel attempts: host:port/api → outcome [events]"). If v3 also closes with 1005: the HDMI/Power off/
   Home/Menu keys stay without function; next ideas: launch of the system apps (Settings, Home) via tizen.application.launch
   and HDMI sources as Tizen apps (to be looked for among the 439 ids in Diagnostics), or tizen.tvwindow (privilege not in TizenBrew).
5c. Leaving an app (2.0.1): the service relaunched TizenBrew with tizen.application.launch; the TV had closed TizenBrew, which
   restarted on the modules page ("parte un caricamento, la home non si riapre", i.e. "a loading starts, the home does not reopen"). 2.1.0 uses launchAppControl with
   {moduleName:'apiazza75/samsung-tizen-home', moduleType:'gh'} (key 'module'), the mechanism with which TizenBrew opens a module
   at the request of another app (UI: AppControlData → service: CanLaunchModules{type:'appControl'}); fallback on the plain launch.
   It goes through the same relaunch in debug (ADB/CDP) as the autostart: if autostart does not work on the TV, this might not work
   either. "ritorno a Milano Home: ..." ("return to Milano Home: ...") in Diagnostics says which way was used.
5d. The user reports a slow interface on 2.0.1: 2.1.0 removes backdrop-filter and filter:blur, reduces shadows and transitions
   (160-220 ms); /apps answers immediately for 2 minutes after a channel failure. Clock at weight 500 (was 700).
5. The user's TV: Tizen 6 (2021), Node v12.4.0 in the service, 439 Tizen apps. Photo of the 1.6.0 Diagnostics of 30/10:
   service ok, "Smart Hub: non disponibile (connessione chiusa dalla TV / connessione chiusa dalla TV)" ("Smart Hub: not available
   (connection closed by the TV / connection closed by the TV)") = on 8001 and 8002 the
   WebSocket handshake succeeds (101) and then the TV closes without sending ms.channel.connect. In the TV's device list
   "Milano Home" does NOT appear (there are "device 2" and "device 3" without details, all allowed); "Notifica di accesso" (Access notification) =
   first time only. Main hypothesis: the TV does not accept the remote control channel from 127.0.0.1. 2.0.0 also tries the TV's
   network IP (os.networkInterfaces) and records the close code/reason: the 2.0.0 Diagnostics will say which combination
   works ("canale ok su <host>:<porta>", i.e. "channel ok on <host>:<port>") or why not ("tentativi canale: ...").
6. TizenBrew autostart (read in the code): it happens only after the relaunch in debug mode (ADB → CDP → CanLaunchModules
   {type:'autolaunch'}); the UI skips it if ↑ has been pressed. For 2.0.5 the flow is correct; on the user's TV it does not start:
   to be clarified, the TizenBrew version and what it shows. Samsung's "Esecuzione automatica ultima app" (Autorun last app) also requires "Esecuzione
   automatica Smart Hub" (Autorun Smart Hub) to be on (source: Samsung community) and the TV switched off with the app in the foreground.
7. Icons: all our own (app/icons.js); Smart Hub only as a fallback (FirstScreen folder read directly, then channel).

## 2.0.0 architecture (tested)
- index.html: launcher (with icons.js embedded) in localStorage `mh_launcher` {ref, html}; if it is there it starts immediately; if not it
  downloads it (sha of main → jsDelivr@sha, otherwise @main) with retries at 3/5/10/20/30 s; Enter retries. `?ref=` bypasses.
- launcher.html: after 4 s it checks main; if new it downloads launcher+icons into the cache (active at the next opening) and calls
  /update on the service; VERSION, window.MH_REF, MH_SOURCE (cache|rete), MH_CDN, MH_API. Menu ↑ → "Svuota la cache del
  launcher e ricarica" (Empty the launcher cache and reload) and "Riprova il collegamento con la TV" (Retry the connection with the TV) (/hubreset).
- service.js: core in /home/owner/share/milanohome-core.js (+ .json {ref}); runs immediately from the cache; check with backoff
  2/5/10/30/60/120 s; exposes MH_BOOT {update(cb), info()} to the core; the new core takes port 8095 by asking the old one
  for /shutdown. The 2.0 core also works under the 1.5.1 bootstrap (/update → 'unsupported').
- service-core.js: /ping (v, ref, lan, boot, hub{apps,error,dir,dirError,chan,channelError,attempts}), /apps (hub from channel
  or from folder), /hub, /hubicon, /icon, /asset?name= (wallpapers/fonts with disk cache, warmed at startup), /update, /launch,
  /key, /hubreset, /shutdown. Channel: combinations [state.chan, lan:8002, lan:8001, 127.0.0.1:8002, 127.0.0.1:8001];
  it stops on unauthorized/timeout (so as not to reopen the "Consenti" prompt). Variables for the tests: MH_TV_HOST, MH_TV_PORT,
  MH_TV_PORT_TLS, MH_LAN_IP, MH_HUB_DIR, MH_DATA_DIR, MH_CDN, MH_API.

## Tests (test/run.sh): all passed before every merge (2.1.0: 81 service checks in 13 scenarios, 41 launcher checks)
- ES5 syntax (acorn) of service, core, icons, index and launcher.
- test/service-tests.js: 66 checks in 9 scenarios (first installation; hot update; start without network with cache;
  without network and without cache; loopback channel closed/LAN ok; channel closed everywhere + icons folder; unauthorized; bootstrap
  1.5.1 + core 2.0; waiting for "Consenti" and reuse of the token). Also passed with Node 12.22 (MH_NODE=...).
- test/launcher-tests.js: 35 checks in 5 scenarios (first opening; GitHub/jsDelivr down with cache; main advances → launcher
  and service updated; first installation without network with the network coming back; file:// demo). 1920x1080 screenshots inspected.

## On the TV, to do (one at a time, asking for the outcome)
1. Restart TizenBrew (or the TV): the service renews service.js (2.0, purged) and downloads the 2.0 core; open Quiet Home
   twice (the first time downloads the 2.0 launcher into the cache, the second uses it). As an alternative to the first opening: menu ↑ →
   "Svuota la cache del launcher e ricarica".
2. Diagnostics (menu ↑): expected "commit <sha 2.0.0> da cache" ("commit <sha 2.0.0> from cache"), "servizio: ok v2.0.0", line "Smart Hub: ... canale ok su
   <host>:<porta>" or "tentativi canale: ..." with the reasons. Ask for a photo.
3. If the channel stays closed on all 4 combinations: the icons are our own anyway; the keys
   HDMI/Home/Power off/Settings stay without function. Next idea to verify: direct launch of the system apps for Home/Settings
   (tizen.application.launch) and HDMI sources as Tizen apps, or tizen.tvwindow (privilege not granted to TizenBrew).
4. Automatic start: ask for the TizenBrew version and behaviour; Samsung: both "Esecuzione automatica" (Autorun) settings on.

## Notes
- jsDelivr: full hash immutable; purge POST https://purge.jsdelivr.net/ {"path":[...]}.
- Page origin: http://127.0.0.1:8081 (document.write + <base>): isTV and fromPage hold.
- TizenBrew app ID: xvvl3S1bvH.TizenBrewStandalone; WS 8081: GetModules=4, LaunchModule=5, ModuleAction=10.
- Constraints: ES5 in the service; CSS/JS for Chromium 76. The two bootstraps must be touched as little as possible (every change requires
  purge + restart of TizenBrew for service.js).
