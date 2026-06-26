# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Moka Companion — a vanilla HTML/CSS/JS PWA for the Bialetti Moka pot (4-cup Moka Express). Covers history, technique, science, a kit checklist, and a personal brew log with taste ratings and CSV export. No backend, no account — everything persists in browser `localStorage`.

## Running it

Must be served over HTTP — opening `index.html` as a `file://` URL breaks the markdown `fetch()` calls.

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then visit `http://localhost:8080`. There is no build step, no package.json, no test suite, and no linter configured.

## Architecture

**Content is markdown, fetched at runtime.** The narrative sections (History, How It Works, Recipe, Science, Kit List prose) live as markdown files and are fetched + rendered client-side via `marked.js` (loaded from CDN). They are not bundled or inlined.

**Two copies of the content files exist, only one is canonical.** `content/0N-*.md` is the canonical, git-tracked copy that the app actually fetches (`app.js` does `fetch('content/' + file)`). The root-level `0N-*.md` files are gitignored duplicates kept for convenience — `.gitignore` explicitly excludes them. **Always edit the files under `content/`**, not the root-level copies, or your changes won't be tracked or served correctly.

**Section registry drives navigation.** `js/app.js` has a single `SECTIONS` array mapping section id → markdown file → render type (`markdown`, `recipe`, `kit`, `brewlog`). Adding a new top-level section means: add an entry here, add the nav `<li>`/tab `<button>` pair in `index.html` (both the sidebar `nav-list` and the bottom `tab-bar` — they're kept in sync manually, not generated), and add a matching `<section class="content-section" id="section-...">` container.

**Kit List and Brew Log are not plain markdown — they're interactive widgets built in JS:**
- Kit List (`app.js`, `KIT_ITEMS`/`renderKitChecklist`): hardcoded array of gear items rendered as checkboxes, state persisted to `localStorage` under `moka-kit-checked`.
- Brew Log (`js/brewlog.js`, separate file/script tag from `app.js`): builds the log form, rating widgets (1-5 stars), toggle widgets, renders saved entries as expandable cards, and exports CSV. Persisted to `localStorage` under `moka-brew-log`. This is the most complex/stateful part of the app — entries are stored as plain objects keyed by an id generated from `Date.now()` + random suffix.

**Two responsive nav UIs share one state.** `index.html` renders both a `sidebar` (desktop/landscape) and a `tab-bar` (mobile/portrait); CSS media queries pick which is visible. `activateSection()` in `app.js` toggles `.active` on both sets of nav elements and the corresponding `.content-section` simultaneously, so any new nav-triggering code must update both DOM trees.

**Styling is one large stylesheet** (`css/style.css`, ~1160 lines) — no CSS framework, no CSS-in-JS, no preprocessor.

**PWA wiring**: `manifest.json` + `apple-touch-icon.png`/`icon-192.png`/`icon-512.png` for installability; no service worker is registered, so "works offline" relies on the browser's own caching rather than an explicit cache strategy.
