# ASCEND website

Source of the project website — plain hand-written HTML/CSS/JS, no build step,
served by nginx in production and by `run-local.mjs` on
[localhost:5174](http://localhost:5174) during development. The app stays on
[localhost:5173](http://localhost:5173); the demo iframe points across to it.

Committed assets:

- `img/` — generated from the five screenshots in `../assets/screenshots/` as PNG plus
  WebP at 480/600/1170 px (served through `<picture>`), with `banner.png` and
  `social.jpg` (1200×630, the og:image on every page). `../assets/social.html` is the
  printable source, rendered from the same five screenshots. The build script is
  `build-images.sh <dist>/img`; the checked-in copies are what the local site serves. Public
  image URLs carry `?v=5` so browsers fetch the corrected full-frame screen art.
- `icon-180.png` / `icon-512.png` (plus the smaller favicon sizes) — copied from
  `../frontend/public/`, so the browser tab, home screen and app all match.

The browser-only demo is also deployed to
[GitHub Pages](https://jrsmdev.github.io/ASCEND/) by `.github/workflows/pages.yml`.

The same source can be deployed as one Vercel project from the repository root.
`vercel.json` builds the ASCEND website at `/` and `/site/`, and the browser demo
at `/demo/` (also reachable from the legacy `/app` path). The frontend's
`build:vercel` command stages both from this directory. Import the repository,
leave Vercel's Root Directory set to the repository root (`.`), and deploy; no
separate project or environment variables are required.

The standalone Android APK is kept out of Vercel's static output because of its size. APKs and
checksums are hosted in the public Vercel Blob store `ascend-apks`; the small
`latest-android.json` manifest is deployed with this website. The site reads its download button
from the manifest, and the Android updater uses the same manifest, so APK downloads and updates
do not depend on GitHub being public. Keep each upload at a versioned Blob path and update the
manifest with the matching version, APK URL, and checksum URL. Do not commit APKs, signing
credentials, or Blob write tokens. The app stores workout data locally; no account or app-data
cloud service is required.

The manifest uses one entry per APK variant. For example:

```json
{
  "version": "1.4.4",
  "variants": {
    "standard": {
      "apkUrl": "https://<public-blob-url>/ASCEND-1.4.4.apk",
      "hashUrl": "https://<public-blob-url>/ASCEND-1.4.4.apk.sha256"
    }
  }
}
```

Only publish the manifest after both versioned Blob files are uploaded and their URLs are verified.
The app refuses to install an update unless it can read a valid SHA-256 checksum. The Vercel Hobby
Blob quota includes 1 GB of storage and 10 GB of monthly data transfer; monitor Storage usage because
downloads stop if the account reaches its included limit.

Build from the repository root in PowerShell after installing the Android SDK:

```powershell
$env:ASCEND_ANDROID_VERSION = '1.4.4'
npm run build:mobile --prefix frontend
Push-Location frontend/android
.\gradlew.bat --no-daemon clean assembleSideloadRelease '-PappVersionName=1.4.4' '-PappVersionCode=29'
Pop-Location
```

Sign the unsigned output
`frontend/android/app/build/outputs/apk/sideload/release/app-sideload-release-unsigned.apk`
with the private `ascend-v1` key using `zipalign` and `apksigner` from the Android SDK. Save the
signed file as `website/ASCEND-1.4.4.apk`, calculate its SHA-256 checksum, upload both files to
`ascend-apks`, then update `website/latest-android.json` with their public URLs. The current key
is kept outside the repository under `%LOCALAPPDATA%\ASCEND\signing`; back up both the keystore
and its password securely. Never commit either file. Android cannot update an older ASCEND
installation signed with the unavailable key: users must export a backup, uninstall the old app,
install this build, then import the backup. Every future APK must use the current key and a higher
version name and `versionCode`.

Added at deploy time:

- `demo/` — the browser-only demo build of the app, embedded in the `#demo` section and
  reachable on its own at `/demo/`. Built from `../frontend` with `VITE_DEMO=1`, with the
  180 px exercise media from `../catalogue/media` staged alongside the app in local and
  GitHub Pages builds. The Vercel build instead uses the public jsDelivr CDN to keep about
  190 MB of media out of the deployment. Never put larger media here (see
  `../catalogue/media/NOTICE.md`). The site frames the demo on the same host; during local
  development, `site.js` frames the Vite app on
  `http://localhost:5173` instead.

Every page has the same top bar. Docs, About and API also have a contents drawer (`.side`),
opened by the lime **Contents** pill in the bottom-left corner. Home uses its top-bar
links instead, so that pill is hidden there. On the two reference pages
(`<body class="dock">`: docs and API) a screen 1200 px or wider shows the contents as a
fixed column beside the text instead, so there is nothing to find; a scrollspy lights the
section under the reader.

`site.js` carries several independent pieces, each one failing soft so the page is
complete without any of them: the contents drawer (docked on wide docs/API pages), its
scrollspy, the scroll reveals, the first-visit curtain, the scroll-controlled screen
sequence, reading progress, the demo iframe (injected only once the frame is on screen,
and never below 700 px, where the CSS swaps it for an "open it full-screen" card), and
the three things that come from public APIs at view time — the GitHub star/issue counts,
the Discord member count, and the About page's release timeline. All wait for
`requestIdleCallback` so they never compete with the hero image.

Every page starts with a "Skip to content" link (`.skip`, visible on focus) that
targets `<main id="main">`. Screenshots change under the same file name, and nginx
caches images for seven days — bump the name if a new one must show up at once.

`api.html` and `openapi.yaml` are the **generated** files in here:
`node scripts/build-api-docs.mjs` rewrites both from `../api/openapi.yaml`. Edit the spec,
re-run the script, commit all three — never hand-edit `api.html` or the download copy, the
next run overwrites them. The page is static HTML in this site's own design (no Swagger UI,
nothing rendered at view time); the only script of its own it carries is the contents drawer
and the card expand/collapse.

`styles.css`, `ascend.css` and `site.js` are cache-busted with `?v=N` — nginx serves
the site with `no-cache, must-revalidate`, but the query bump is what saves a Cloudflare
edge from handing out an old stylesheet with new markup. Bump it on every change. The
ASCEND layer (`ascend.css`) loads after the legacy `styles.css`, so it can replace the
palette, type and hero without rewriting every rule in the old sheet.
