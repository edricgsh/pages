# GitHub Pages Artifact Repo

This repository (`edricgsh/pages`) is the source for encrypted research artifacts published to **https://edricgsh.github.io/pages/<folder>/** via GitHub Pages (static hosting, auto-deploy on push to `main`).

## ⚠️ Sources live in `_src/` — the root is generated

**Never edit `<slug>/index.html` at the repo root.** Those are build artifacts: a loader shell wrapped around an AES-256-GCM blob. Edit `_src/<slug>/index.html`, then run `./build.py`.

```
_src/<slug>/index.html   ← edit this (plaintext, opens fine in a browser)
_src/manifest.json       ← edit this
./build.py               ← encrypts _src/ into the published root
<slug>/index.html        ← generated, commit it (Pages serves it)
manifest.enc             ← generated
```

`build.py` is deterministic — rebuilding without source changes produces byte-identical output, so it never churns the diff.

## Quick facts

- **Password:** `recon2026`
- **SHA-256 hash:** `2ff51fba4b8b1137a97ed27dfbd357e5b690665b2f016c308d95b05febf5bf7e`
- **Live URL pattern:** `https://edricgsh.github.io/pages/<folder-name>/`
- **Shared style:** every artifact MUST include `<link rel="stylesheet" href="/pages/shared/paper.css">` + `<script src="/pages/shared/paper.js"></script>` and put `class="paper"` on `<body>`. See "Artifact style guide" below — it's the house style, not a suggestion
- **Shared menu:** every artifact MUST include `<link rel="stylesheet" href="/pages/shared/menu.css">` in `<head>` and `<script src="/pages/shared/menu.js"></script>` before `</body>`. It renders a fixed top-left bar (`☰` + `← All Artifacts` back-link to the catalogue), auto-hides while the password gate is up, and adds `menu-bar-offset` to `<html>` so `body` gets 46px of top padding — don't add your own top offset for it
- **manifest:** every artifact MUST be registered in `_src/manifest.json` (slug, title, description, emoji, plus `group`/`order` — see "Collections" below). It ships encrypted as `manifest.enc`, so titles and descriptions aren't crawlable either
- **Favicon:** `shared/favicon.svg` (paper palette, rust tile) plus `favicon.ico` and `apple-touch-icon.png` rasterised from it — SVG alone leaves Safari and older browsers with no icon. All three `<link>`s go right after `<title>` on every `_src` page, and `build.py` repeats them in the loader so the gate has them too. **Never write a double hyphen inside the SVG's comment** — XML forbids it, so naming the CSS custom properties there makes the file unparseable and the icon vanishes with no console error. `build.py` now XML-parses the SVG on every build to catch exactly that
- **Pre-commit hook:** `.githooks/pre-commit` blocks plaintext in published paths and catches truncated/placeholder hashes. Activate with `git config core.hooksPath .githooks`

## Encryption model

The old SHA-256 gate only *hid* content visually — the full plaintext was still served, so crawlers indexed it. Now the published page contains only ciphertext plus `shared/unlock.js`.

- Envelope: `base64( salt[16] || iv[12] || AES-256-GCM ciphertext )`, key = PBKDF2-HMAC-SHA256, 600k iterations
- On unlock, `unlock.js` replaces the document via `document.open()/write()/close()` — **not** `innerHTML`. innerHTML doesn't execute `<script>` tags; that is exactly what killed the July 2026 attempt (every interactive page, including the React bundle in `tariff-trade-breakdown`, came back dead)
- The password itself (not just its hash) is kept in `localStorage.pages_pw`, because re-decrypting on the next page load needs real key material. Storing only the hash is why the old auto-unlock threw a `ReferenceError`
- Sources keep their original gates so they still work when opened directly from `_src/`. `build.py` extracts the `localStorage` keys each gate checks and seeds them at unlock time, so the inner gate self-opens instead of prompting twice
- `robots.txt` disallows everything and each loader carries `noindex,nofollow,noarchive,nosnippet` — belt and braces for crawlers that fetch anyway

**Limits, so nobody over-trusts this:** it's encryption at rest on GitHub's CDN. Anyone with the password can read and re-share the plaintext, and one shared password means no per-visitor revocation.

## The 18 published artifacts

All seven bootcamp modules use the paper style. Some of the other twelve are
still on the retired dark theme — convert one when you next touch it, don't
leave it half-done.

| Collection | Folder | Title | Emoji |
|---|--------|-------|-------|
| 🎬 AI Video Bootcamp | `ai-images` | AI Images — Field Guide | 🖼️ |
| 🎬 AI Video Bootcamp | `ai-videos` | AI Videos — Field Guide | 🎥 |
| 🎬 AI Video Bootcamp | `advanced-flows` | Advanced Flows — Field Guide | 🔀 |
| 🎬 AI Video Bootcamp | `ai-advertising-ugc` | AI Advertising &amp; UGC — Complete Playbook | 📢 |
| 🎬 AI Video Bootcamp | `social-media-viral` | Social Media &amp; Going Viral — Field Guide | 📱 |
| 🎬 AI Video Bootcamp | `ai-filmmaking` | AI Filmmaking — Field Guide | 🎞️ |
| 🎬 AI Video Bootcamp | `clone-yourself` | Clone Yourself — Field Guide | 🧬 |
| 📈 Growth & Brand | `postiz-saas-growth` | Postiz: $17K → $143K MRR in 4 Months | 🚀 |
| 📈 Growth & Brand | `sharran-srivatsaa-formula` | The Man That Makes Billionaires — Sharran Srivatsaa | 📈 |
| 📈 Growth & Brand | `personal-brand-course` | How to Build a Personal Brand — Full Course | 🎯 |
| 📈 Growth & Brand | `dopamine-ladder-key` | The Dopamine Ladder — Key Breakdown | 🧠 |
| 📈 Growth & Brand | `learn-marketing-fast` | How I'd Learn Marketing FAST in 2026 — Joanna Wiebe | 🧭 |
| 🌐 Markets & Money | `tariff-trade-breakdown` | Tariffs, Trade & Trump's Strategy | 🌐 |
| 🌐 Markets & Money | `circular-financing` | AI Circular Financing — The $800B Money Loop | 🔄 |
| 🌐 Markets & Money | `japan-economy` | Japan's Economy: Bubble to Yen Crash | 🌐 |
| 🌐 Markets & Money | `payment-reconciliation-research` | Payment Reconciliation Market Map | 💳 |
| ⚡ Craft & Mindset | `pragmatic-engineer` | The Pragmatic Engineer | 📬 |
| ⚡ Craft & Mindset | `jensen-huang-mindset` | Jensen Huang: The Mindset That Built NVIDIA | ⚡ |

Bootcamp modules are ordered by their **course** module number (01–07), not
alphabetically or by publish date — `order` in the manifest carries that. The
whole Skool course is now covered; there is no Module 08.

## Collections

The catalogue groups artifacts by topic. Both the group definitions and each
page's membership live in `_src/manifest.json`:

```jsonc
"groups": [ { "slug": "…", "title": "…", "description": "…", "emoji": "…" } ],
"pages":  [ { …, "group": "<group-slug>", "order": 1, "kicker": "Module 01" } ]
```

- `order` sorts pages *within* a group (missing → 99). `kicker` is an optional
  mono label on the card; only the bootcamp modules use one.
- A page with no `group`, or a `group` that doesn't exist, still renders — it
  lands under "Unfiled" in the flat list and the sidebar. Nothing 404s.
- **One template serves every collection:** `_src/group/index.html` reads
  `?g=<group-slug>` and renders from the decrypted manifest. Adding a collection
  is a manifest edit, never a new page. `/pages/group/` with no (or an unknown)
  `?g=` falls back to listing all collections.
- `shared/menu.js` renders the same grouping in the slide-in sidebar, with each
  heading linking to its collection page.

So: **to add an artifact**, write `_src/<slug>/index.html`, add a `pages` entry
with its `group`, and run `./build.py`. To add a collection, add a `groups` entry.

## Artifact style guide — "paper"

Artifacts are **long-form reading**, not dashboards. The house style is warm paper,
editorial serif prose, mono for labels only, one rust accent, and a fixed left
contents rail. It replaced the dark slate-950 theme in Aug 2026 because the dark
theme read as a status screen — dense, low-contrast, tiring past a screenful.

Everything below lives in `shared/paper.css` + `shared/paper.js`. **Don't restate
it in a page-local `<style>`** — link the shared files and use the classes. If a
page needs something the system lacks, add it to `paper.css` as a named component
so the next artifact gets it too.

### The shell every artifact starts from

```html
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/pages/shared/paper.css" />
<link rel="stylesheet" href="/pages/shared/menu.css" />
...
<body class="paper" data-title="ARTIFACT NAME" data-meta="SUBTITLE LINE
SECOND LINE">
  <div id="password-gate">…</div>
  <main class="sheet">
    <nav class="tabs">…</nav>
    <header class="hero"><h1>…</h1><p class="lede">…</p></header>
    <div class="callout">…</div>
    <section class="mod" id="…" data-group="…">…</section>
    <footer class="sheet-footer">…</footer>
  </main>
  <script>/* gate */</script>
  <script src="/pages/shared/paper.js"></script>
  <script src="/pages/shared/menu.js"></script>
```

`paper.js` **generates the whole contents rail** from `section.mod` elements — never
hand-write nav markup. It also runs scrollspy (syncing both the rail and the
`.tabs` row), the small-screen rail toggle, and the ⛶ button on every `.figure`.

### Tokens

| | |
|---|---|
| Page / raised / sunk | `#FBF8F3` · `#FFFDF9` · `#F4F0E8` |
| Ink · secondary · muted | `#1C1917` · `#44403C` · `#78716C` |
| Hairline · heavy rule | `#E2DCD0` · `#1C1917` |
| Rust · rust-on-tint · soft tint | `#B4451F` · `#8F3617` · `#F5E3D7` |
| Callout fill | `#E9E8DA` |
| Terracotta ramp 1→5 | `#F7E0D2` `#EFC3AB` `#E29C7B` `#D2734B` `#B4451F` |

All exposed as CSS vars (`--paper`, `--ink`, `--rust`, `--ramp-3`, …). **Use the
vars, never the literals** — a palette change should be one file.

### Type

- **Inter Tight** — headings and UI only. h1 is `clamp(2.6rem, 6vw, 4.1rem)/800` at `-0.035em`; it should feel oversized next to the body.
- **Source Serif 4** — all running prose, 1.16rem/1.72. Long text is *always* serif.
- **JetBrains Mono** — labels, numbers, eyebrows, tags, source attributions. Uppercase, ~0.68rem, `letter-spacing: 0.11em–0.15em`. Mono is for chrome; it never carries a sentence.

### Components

`.tabs`/`.tab` · `.hero` + `.lede` (auto heavy rule after) · `.callout` + `.callout-label`
(one per page, the single big idea) · `.mod` + `.mod-head`/`.mod-num`/`.mod-source` ·
`.rows`/`.row` with `.row-chip[data-level=1-5]` + `.row-name` + `.row-sub` + `.row-body`
(ordered ladders) · `.rows.numbered` with `.row-idx` (numbered principles) ·
`.entry` + `.entry-head`/`.entry-name`/`.entry-tag`/`.entry-when`/`.entry-flow`
(catalogued frameworks, tools, tactics) · `.cards`/`.card` + `.card-kicker`/`.card-title` ·
`.chips`/`.chip` (banks of short strings) · `.note` / `.note.warn` · `.figure` +
`.figure-caption` · `.scroll-x` · `.sheet-footer`.

Navigation pages (the catalogue and the collection template) have no contents
rail, so they use `.sheet.catalogue` instead of a bare `.sheet` — it centres
itself rather than clearing the rail. Their own components: `.cat-section` +
`.cat-section-label` · `.cat-grid` (`.wide` for two roomy columns) with
`.cat-card` + `.cat-emoji`/`.cat-kicker`/`.cat-name`/`.cat-desc`/`.cat-peek`/`.cat-go` ·
`.cat-list` + `.cat-row` + `.cat-row-emoji`/`.cat-row-name`/`.cat-row-group`.

### Rules

- **One accent.** Rust marks the active nav item, section numbers, callout labels, and links. Nothing else is coloured. Emphasis is weight, size, and space.
- **Prose stays in the measure** (`--measure`, 46rem). Only `.tabs`, `.cards`, `.chips`, `.figure`, and `.scroll-x` break out.
- **No shadows, no gradients, no glow.** Hairlines and fills do the separating. `feGaussianBlur`/`feMerge` glow filters on SVG are banned repo-wide.
- **Wide things scroll inside themselves** — wrap tables and diagrams in `.scroll-x`. The page body never scrolls sideways.
- **Diagrams are light now** — `--paper-raised` ground, hairline strokes, ramp fills. The old `#020617` dark-grid SVG aesthetic is retired; converting an old diagram means restyling it, not dropping it on a light background.
- Video breakdowns: hero → callout → `.mod` per chapter (`.mod-source` carries the timestamp) → `.sheet-footer`.

The password gate keeps its ids and its `localStorage.setItem('pages_pass', …)` call —
`build.py` reads that key to seed the outer unlock. `paper.css` restyles it in paper
tones automatically. The *loader* gate crawlers see is still dark; it's generated by
`build.py` and is deliberately independent of the artifact's theme.

See `.claude/skills/github-pages/SKILL.md` for the full publishing workflow.
