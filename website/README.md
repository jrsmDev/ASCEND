# ASCEND website

Source of the project website — plain hand-written HTML/CSS/JS, no build step,
served by nginx in production and by `run-local.mjs` on
[localhost:5174](http://localhost:5174) during development. The app stays on
[localhost:5173](http://localhost:5173); the demo iframe points across to it.

Committed assets:

- `img/` — generated from the five screenshots in `../assets/screenshots/` as PNG plus
  WebP at 480/600/1170 px (served through `<picture>`), with `banner.png` and
  `social.jpg` (1200×630, the og:image on every page). The build script is
  `build-images.sh <dist>/img`; the checked-in copies are what the local site serves.
- `icon-180.png` / `icon-512.png` (plus the smaller favicon sizes) — copied from
  `../frontend/public/`, so the browser tab, home screen and app all match.
- `ASCEND-1.4.2.apk`: the local signed Standard Android build served in development and by
  `run-local.mjs`. The download link uses `download="ASCEND.apk"`, so the saved file keeps the
  brand name while the source file keeps its version. Plus and HD animation packs stay on the
  GitHub release.

Added at deploy time:

- `demo/` — the browser-only demo build of the app, embedded in the `#demo` section and
  reachable on its own at `/demo/`. Built from `../frontend` with `VITE_DEMO=1`, with the
  180 px exercise media from `../catalogue/media` staged into `demo/exercise-media/` by
  `../scripts/catalogue/stage-media.mjs` (see the `pages` job in `../.gitlab-ci.yml`).
  Never put larger media here (see `../catalogue/media/NOTICE.md`). It has to live on
  this host: the site frames it, and `X-Frame-Options: SAMEORIGIN` would block it from
  anywhere else. During local development, `site.js` frames the Vite app on
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
