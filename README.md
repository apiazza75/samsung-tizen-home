# Quiet Home

**A clean, quiet home screen for Samsung Smart TVs (Tizen).** No ads, no sponsored rows: a clock, the weather, a slowly moving photo,
one row with the apps you actually use, and a grid with everything else.

Quiet Home is an independent open-source project. It is not affiliated with or endorsed by Samsung; "Samsung" and "Tizen" are
trademarks of their owners and are used here only to say which TVs it runs on.

It runs in two ways, from the same code:

- as a **[TizenBrew](https://github.com/reisxd/TizenBrew) module**: no certificate, no signing;
- as a **native Tizen app** (`.wgt`), without TizenBrew underneath and without needing the network at start-up:
  see [docs/NATIVE-APP.md](docs/NATIVE-APP.md).

Developed and measured on a 2021 Neo QLED (QN90A, Tizen 6.0, Chromium 76). Other models may behave differently: reports are welcome.

## What it does

- **Your apps first.** One row that you choose and order; the grid (↓) lists every installed app by category.
- **Comes back by itself.** When you leave an app you opened from Quiet Home, Quiet Home returns to the front instead of the
  Samsung home (can be turned off in the menu).
- **HDMI inputs as tiles**, with names you choose (Console, Set-top box, …).
- **Weather** for your city (Open-Meteo, no account), **clock** and a greeting.
- **Backgrounds**: all photos in rotation, one fixed photo, or none. The photo drifts and zooms slowly.
- **Five languages**: English, Italian, Spanish, German, French. It follows the TV language; you can change it in the menu.
- **Built for slow TV hardware**: the TV draws web pages in software, so the interface only moves things the TV can move cheaply
  (transforms and fades). No blur, no animated shadows.
- **Starts without the network and updates itself** from this repository.

## Install as a TizenBrew module (once)

1. On the TV open **TizenBrew → Module Manager (green key) → Add GitHub module** and type only `apiazza75/samsung-tizen-home`,
   **without** the `gh/` prefix: TizenBrew adds it by itself (with `gh/` in front the module becomes `gh/gh/…` and shows up as
   "Unknown Module"). The field saves as soon as you leave it.
2. Open Quiet Home once from the TizenBrew home: the first start downloads the launcher and stores it on the TV; from then on it
   starts instantly, even without the network.
3. In the TizenBrew settings (blue key) you can set Quiet Home as the **autostart module** and its service among the
   **autostart services**.
4. To have the TV turn on straight into Quiet Home: *Settings → General → Smart Features*, turn on both **Autorun Smart Hub** and
   **Autorun Last App** (Samsung needs both), then turn the TV off with TizenBrew / Quiet Home in front.

If TizenBrew no longer reaches its home: start it while holding **↑**, which skips autostart for that session, then disable it
in Settings → Autostart.

For the native app (signing with your own Samsung certificate, installing over the network) see
[docs/NATIVE-APP.md](docs/NATIVE-APP.md).

## Remote control

← → choose an app in the row · OK open · **↓ all apps** (← → ↑ ↓ move, OK opens, Back closes) · **↑ menu** · channel ▲▼ jumps by 5.

Menu (↑): choose and order the apps in the row, HDMI input names, system apps, return to Quiet Home when you leave an app,
restore the default order, retry the link with the TV, **Diagnostics**, background, weather city, language, clear the launcher
cache.

The grid also has **TizenBrew**, **TV settings**, **Samsung Home** and **Turn off** (OK twice). These last three, and HDMI under
TizenBrew, use Samsung's remote-control API: the first time, the TV asks you to allow "Quiet Home". On some TVs that API does not
answer at all (see *Known limits*).

## Translations

English is built into `app/launcher.html` (the `EN` object). Every other language is one file in `app/lang/`.

To add a language:

1. copy `app/lang/it.json` to `app/lang/<code>.json` (the two-letter code the TV reports, e.g. `pt`, `nl`, `pl`);
2. translate the values; keep the keys and the placeholders `{0}`, `{1}` as they are;
3. add the code and the language's own name to `LANGS` in `app/launcher.html`;
4. run `bash test/run.sh`: step 1b fails if a key or a placeholder is missing.

Corrections to the existing translations are just as welcome. Diagnostics and service error messages are English only, on
purpose: they are what you paste into an issue.

## How it works: starts offline, updates itself

TizenBrew reads only three unversioned files from jsDelivr (`package.json`, `app/index.html`, `service.js`) and caches them for a
long time. Everything else is handled by two **stable bootstraps**:

- `app/index.html` keeps the real launcher (`app/launcher.html` with `app/icons.js` inlined) in a **cache on the TV**
  (localStorage): if it is there, it starts at once and without the network. On first install it downloads it from the latest
  commit on `main` (`cdn.jsdelivr.net/gh/apiazza75/samsung-tizen-home@<sha>/…`, an immutable URL), retrying until the network
  answers.
- `service.js` keeps the real service (`service-core.js`) in a **cache on disk**: if it is there, it runs at once; in the
  background it checks the latest commit on `main` and, if it changed, downloads the new core and runs it in place of the old
  one, without restarting TizenBrew.
- The **launcher**, once started, checks the latest commit on `main`: if it is new it downloads launcher and icons into the cache
  (active at the next start) and asks the service to update right away (`/update`).
- On every push to `main` the GitHub Action **Purge jsDelivr cache** purges jsDelivr for all files.

In practice: **merge to `main` → open Quiet Home twice** (the first downloads, the second runs the new one). *Diagnostics* in the
menu shows the commit in use, where it came from, the update state, the service, and the attempts to link with the TV.

To try a branch or a commit without touching the cache: `…/app/index.html?ref=<sha-or-branch>`.

The update check uses the public GitHub API, which allows 60 requests per hour per IP address: with many restarts in an hour the
check answers 403 and the update simply waits.

## Icons

The icons are **our own** (`app/icons.js`, SVGs that mirror the originals: 45 apps plus HDMI, TizenBrew, Settings, Home, Power),
matched by app name or id: a uniform look and no dependency on the TV. For other apps it uses, in order, the Smart Hub icon (when
the TV provides it), the app's own icon file, and finally the app name on a coloured tile.

## Returning to Quiet Home

After opening an app, the service asks the TV every 2 seconds whether that app is still visible
(`/api/v2/applications/<id>`); when it is not, it brings Quiet Home back. On the QN90A that API tells the truth only when asked
with the numeric Smart Hub id, so `service-core.js` has a small table (`HUB_IDS`) for common apps. For apps outside the table
the service checks whether the app is still running: that works for apps that close when you leave them, not for those that stay
suspended. To add an app to the table, open an issue with its name and its line from *Diagnostics*.

## Known limits

- **Home button**: it always opens the Samsung home. Quiet Home cannot replace it.
- **Samsung Home, TV settings, Turn off** tiles depend on Samsung's remote-control API. On the QN90A that API does not answer
  requests coming from the TV itself, so in the native app those three tiles do nothing.
- **Returning** from an app that is not in `HUB_IDS` and stays suspended when you leave it: you land on the Samsung home.
- **Temperatures** are in °C only.
- **Backgrounds** are four photos of Milan (where the project was born). More sets are planned.

## Tests

`bash test/run.sh` runs everything: ES5 syntax, language files, the service inside a replica of the TizenBrew sandbox against a
fake TV (REST, WebSocket on 8001 and 8002/TLS with token, icons, keys, every failure mode of the channel) and a fake network
(GitHub API, jsDelivr, TizenBrew proxy), the launcher in Chromium with Playwright, and the native package built by
`tools/build-native.js`. `MH_NODE=<node 12>` runs the service with the same Node version as the TV. Requirements are listed at
the top of `test/run.sh`.

## Constraints for contributors

- Service code in **ES5** (Node 12 on the TV; TizenBrew's `vm` sandbox has no `global`, `exports`, `__filename`).
- Page code for **Chromium 76** (Tizen 6): no flex `gap`, `clamp`, `inset`, `aspect-ratio`.
- The module name on the TV (`apiazza75/samsung-tizen-home`) must not change.
- The project was called *Milano Home* until 3.0.4. Internal names (`mh_*` storage keys, `MH_*` globals, `milanohome-*` cache
  files) keep the old prefix so existing installs keep working. Code comments are still mostly in Italian; translating them is a
  welcome contribution.

## Photo credits

Gianluca (Pexels), Mikhail Nilov (Pexels), Anastasiia Buchinskaia (Unsplash), Mahya Jahangir (Unsplash). Pexels / Unsplash
licences.

## Licence

MIT.
