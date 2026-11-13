# Quiet Home as a native Tizen app (3.0.0)

Note: the project was called Milano Home until version 3.0.4; identifiers such as `MilanoHome` in the history below are the names used at the time.

Since 3.0.0 the same code runs in two ways:

- **TizenBrew module** (as before): no difference in behaviour;
- **native app** (`.wgt`): Quiet Home is a TV app in its own right, with its own service. It no longer goes through TizenBrew, jsDelivr or the
  `127.0.0.1:8081` proxy to open: launcher, icons and wallpapers are inside the package.

## What changes in native mode

| | TizenBrew module | Native app |
|---|---|---|
| Opening | TizenBrew → proxy → jsDelivr (3 KB) → cache | package files, no network |
| Service | in the TizenBrew sandbox, port 8095 | the package's service (`MilanoHome.Service`), port 8096 |
| Wallpapers | jsDelivr, then disk cache | package files |
| TizenBrew modules (TizenTube) | via TizenBrew's WebSocket | read from `tizenbrewConfig.json`, opened with app control |
| Return to the launcher when leaving an app | app control to TizenBrew | `launch` of `MilanoHome.Launcher` |
| Updates | automatic from the latest commit on `main` | the same (launcher and core); wallpapers and `config.xml` only with a new package |

The two modes coexist on the same TV (different ports and data folders): the native one can be tried without removing the module.

## Building the package

```bash
node tools/build-native.js          # out/native/ and dist/MilanoHome-unsigned.wgt
```

The package embeds the launcher and core of the current commit. It must be built **after** 3.0.0 is on `main`: at first start the launcher and
the service align themselves with the latest commit on `main`, which must therefore know about native mode. 3.0.0 has been on `main` since 13/11/2026
(commit `3c8a253`, PR #11).

## Signing and installation (in progress since 13/11/2026, not yet tried on the TV)

The TV installs only signed packages and only with **Developer mode** on (Apps → type 12345 → Developer mode On →
IP of the computer → restart the TV). The file produced by `tools/build-native.js` **is not signed**.

**Route chosen by the user (13/11): `reisxd/tizen.js`, without Tizen Studio.** The Mac is arm64 with macOS 27; Tizen Studio (stuck at
6.1, April 2025) is x86_64 only and would require Rosetta 2, which the user does not want to install. Everything that follows runs in Node.

Read in the sources (`tizen.js` @45b0010, `TizenBrewInstaller` @579e2d2), **not yet executed**:

1. **TV state, read only**: `curl http://<TV>:8001/api/v2/` returns `device.developerMode` ("1" = on) and
   `device.developerIP` (the computer IP that was set). It must be read and noted down before changing anything.
2. **Connection**: the sdb protocol is on port 26101 of the TV, which accepts only the IP set as the computer. In Node it is spoken by
   the `adbhost` library (`createConnection({host, port: 26101})`), the same one the installer uses.
3. **DUID**: `shell:0 getduid` stream on the sdb connection (read only).
4. **Samsung certificate**: `tizenjs create-samsung-cert --name … --email … --password … --duidList <DUID> --privilege Public
   --output <folder>`. It asks you to sign in to the Samsung account at
   `https://account.samsung.com/accounts/TDC/signInGate?clientId=v285zxnl3h&tokenType=TOKEN` and to paste the response JSON
   (`access_token`, `userId`); it writes `author.p12`, `distributor.p12`, `device-profile.xml`. It downloads the Samsung CAs from
   `download.tizen.org` into `~/share/.samsung-cert`. The privileges in `config.xml` are all public: `Public` is enough.
5. **Signing**: `tizenjs build dist/MilanoHome-unsigned.wgt -t wgt -o dist/MilanoHome.wgt --author author.p12 --authorPwd …
   --distributor distributor.p12 --distributorPwd …` (removes any existing signatures, adds `author-signature.xml` and `signature1.xml`).
6. **Device profile** (change to the TV): `device-profile.xml` must be copied to
   `/home/owner/share/tmp/sdk_tools/device-profile.xml` (`sync:` protocol, see the installer's `utils/FilePusher.js`).
7. **Installation** (change to the TV): `.wgt` copied to `/home/owner/share/tmp/sdk_tools/package.wgt`, then the stream
   `shell:0 vd_appinstall MilanoHome /home/owner/share/tmp/sdk_tools/package.wgt`; the outcome is in the returned text (the installer
   considers the operation finished when "spend time" appears).

Points to keep an eye on, in order of likelihood:

- **TLS of `svdca.samsungqbe.com`** (the certificate service): the installer disables TLS verification for the whole process because
  that certificate has expired. If `create-samsung-cert` fails for this reason, stop and ask the user before working around the
  verification, and in any case limit it to that one command.
- **Signature format**: `tizen.js` writes the references with `encodeURIComponent` (`service%2Fservice.js`) and uses SHA-512. It is the
  same format with which the installer re-signs TizenBrew (which itself has a `service/` folder) on Tizen 7+; on Tizen 6 it is not
  tested. If the installation fails because of the signature, this is the first suspect.
- **"Public" Tizen certificate** (`create-tizen-cert`, without a Samsung account): a possible fallback, but it is not established that the QN90A
  accepts a non-Samsung distributor.
- **Computer IP in Developer mode**: TizenBrew wants it at `127.0.0.1` (it uses it to relaunch itself in debug),
  installation from the Mac wants it at the Mac's IP (192.168.1.30). It is changed from the remote control, with a restart; once the installation is done it must be
  put back as it was, with another restart.
- **Keys**: `author.p12`, `distributor.p12` and their password stay **outside the repository** (for example in
  `~/.milanohome-cert/`). The author certificate must be kept: an update signed by a different author is rejected until
  the app is uninstalled.

Official route, not chosen: Tizen Studio with *Samsung Certificate Extension* ≥ 2.0.73 (on Mac arm64 only with Rosetta 2), then
`tizen package -t wgt -s <profile> -- dist/MilanoHome-unsigned.wgt` and `tizen install -n <signed file> -t <TV>`.

TizenBrew Installer Desktop alone is not enough: below Tizen 7 it **does not sign** (`resignOrInstall`), it installs the `.wgt` as it is, and
from its computer interface it installs only from GitHub releases, not from a local file.

## What is tested and what is not

Tested here (`test/native-tests.js`, 42 checks): package assembly, service start without network from the included core,
access control (`X-MH` header, web origins rejected), TizenBrew modules, return to the launcher, automatic update of
service and launcher, service restart from the page, no page errors.

To be verified on the TV (QE75QN90AATXZT, Tizen 6.0, firmware 2310), one thing at a time:

1. the signed package installs;
2. the service starts (`Diagnostica`, the Diagnostics screen: "servizio: ok v3.0.0 … app nativa", i.e. "service: ok v3.0.0 … native app");
3. the folder `/home/owner/share/milanohome-native` is writable by the service (otherwise it uses `/tmp/milanohome-native`, which is
   emptied at every restart of the TV);
4. TizenTube opens from the YouTube tile (app control to TizenBrew);
5. the channel ▲▼ keys reach the launcher.

## HDMI sources and return to Quiet Home (since 3.0.2)

From the TV itself the Samsung remote control channel does not respond (measured on the QN90A), so the native app uses the TV's APIs:

- **HDMI**: `tizen.tvwindow.setSource` on the chosen source and then launch of the system viewer `org.tizen.tv-viewer`. It needs the
  privilege `http://tizen.org/privilege/tv.window`.
- **Return** (since 3.0.3, in the service): after opening an app the service asks `/api/v2/applications/<id>` every 2 s whether it is
  still `visible`; when it no longer is, it relaunches Quiet Home. The API tells the truth only with the numeric Smart Hub id (`HUB_IDS` table
  in `service-core.js`: Netflix, Prime Video, YouTube, Disney+, DAZN, Spotify, RaiPlay, Crunchyroll); with the Tizen id it always answers `false`.
  For apps outside the table the service checks whether the app is still among the running contexts: this works for those that close
  on exit, not for those that stay suspended. The page cannot do it: the TV suspends it about 20 s after it has ended up behind
  another app (3.0.2 tried by watching `tizen.tvwindow`, and on the TV source the signal used never changes).
- `config.xml` also declares an `app-control` with `reload="disable"`: the relaunch brings the page back to the foreground without reloading it.
- **Samsung Home, TV Settings and Power off** still go through the remote control channel and do not work from the native app.

## Package names since 3.1.0

The package is `QuietHomeT` (a Tizen package id must be exactly 10 letters or digits: `QuietHome`, 9, fails to install with "Parsing error") (apps `QuietHomeT.Launcher` and `QuietHomeT.Service`), built as `dist/QuietHome-unsigned.wgt`. A TV that
still has the old `MilanoHome` package must have it removed first (`shell:0 vd_appuninstall MilanoHome`, tried on the QN90A on 13/11/2026): the two services would both listen on port 8096. The
preferences (row order, HDMI names, weather city, language) live in the package's own storage and do not carry over.

## Next steps (not in this version)

- **Home key and wake from standby on Quiet Home**: documented by others on an AU8000 with the same Tizen 6.0 / firmware 2310
  (`DavidNgugi/samsung-tv-unlock`, `docs/HOME-BUTTON.md`), not on the QN90A. The state of the TV must be read first, with a backup, and only then
  may anything be written. Declared limit: after a cold power-on the TV starts on the TV viewer anyway.
- **Removal of the preinstalled apps**: only with a list verified on the model and a backup (`ardazeytin/samsung-tizen-tv-debloat`
  lists the packages not to touch).
