---
name: github-pages
description: Publish encrypted research artifacts to GitHub Pages via the edricgsh/pages repo. Full pipeline: write HTML in _src/ → ./build.py encrypts it (AES-256-GCM) → git push → auto-deploy to https://edricgsh.github.io/pages/<folder>/.
---

# GitHub Pages Artifact Publishing

Use when the user asks to publish a research artifact, visualization, or HTML page to the password-gated GitHub Pages site. This repo IS the source — work inside this directory, commit, and push to `main`.

## ⚠️ Read this first: sources are in `_src/`, the root is generated

**Never write or edit `<slug>/index.html` at the repo root.** Those files are generated — a loader shell wrapped around a ciphertext blob. Anything you write there is destroyed on the next `./build.py`, and the pre-commit hook rejects it.

```
_src/<slug>/index.html   ← write this
_src/manifest.json       ← register the artifact here
./build.py               ← encrypts _src/ into the published root
<slug>/index.html        ← generated; commit it (Pages serves it)
manifest.enc             ← generated
```

## Security model

**AES-256-GCM payload encryption + client-side decryption** (active since Aug 2026). The published page contains only ciphertext, so crawlers get nothing. Key = PBKDF2-HMAC-SHA256, 600k iterations over the password; envelope = `base64( salt[16] || iv[12] || ciphertext )`.

An earlier encryption attempt was reverted in Jul 2026. It failed for three specific reasons, all fixed in the current design — do not reintroduce them:

1. It assigned the decrypted HTML with `innerHTML`, which **does not execute `<script>` tags**, so every interactive page died on unlock. `unlock.js` now uses `document.open()/write()/close()`.
2. It stored only the password *hash*, then tried to decrypt with an undefined `PASSWORD` variable on revisit — a `ReferenceError` that broke auto-unlock. `crypto.js` now stores the password itself in `localStorage.pages_pw`.
3. It encrypted pages in place and had to guess where content started and ended. The plaintext now lives in `_src/`, so there are no boundaries to guess.

This is encryption at rest on GitHub's CDN. Anyone with the password can still read and re-share the plaintext — say so plainly if the user asks how strong it is.

## Workflow

### 1. Create the source folder and write the artifact

```bash
mkdir -p _src/<folder-name>
# Write full HTML to _src/<folder-name>/index.html
```

Use the **paper** house style — warm paper, serif prose, mono labels, one rust
accent, generated contents rail. Read "Artifact style guide" in `CLAUDE.md` before
writing a line of markup; `_src/ai-advertising-ugc/index.html` is the reference
implementation to copy structure from.

Skeleton:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/pages/shared/paper.css" />
<link rel="stylesheet" href="/pages/shared/menu.css" />
</head>
<body class="paper" data-title="ARTIFACT NAME" data-meta="SUBTITLE
SECOND LINE">

<div id="password-gate">…</div>

<main class="sheet">
  <nav class="tabs">
    <a class="tab" href="#first">First</a> …
  </nav>

  <header class="hero">
    <h1>A real sentence, not a label</h1>
    <p class="lede">One paragraph on what this is and the order it's in.</p>
  </header>

  <div class="callout">
    <p class="callout-label">The one idea</p>
    <p>The single thesis. One per page.</p>
  </div>

  <section class="mod" id="first" data-group="Foundations" data-nav="Short rail label">
    <div class="mod-head">
      <span class="mod-num">01</span>
      <h2>Section title</h2>
      <span class="mod-source">Source / timestamp</span>
    </div>
    <p>Prose…</p>
  </section>

  <footer class="sheet-footer">Provenance line</footer>
</main>

<script>/* gate — step 2 */</script>
<script src="/pages/shared/paper.js"></script>
<script src="/pages/shared/menu.js"></script>
```

**Never hand-write the sidebar.** `paper.js` builds it from the `section.mod`
elements: `data-group` starts a new group when it changes, `.mod-num` supplies the
number, `data-nav` (or the `<h2>`) supplies the label. It also drives scrollspy for
both the rail and the `.tabs` row, the small-screen rail toggle, and the ⛶ button
on each `.figure`.

Component classes — `.rows`/`.row` + `.row-chip[data-level]` for ordered ladders,
`.rows.numbered` + `.row-idx` for numbered principles, `.entry` for catalogued
frameworks or tools, `.cards` for parallel concepts, `.chips` for banks of short
strings, `.note`, `.figure`, `.scroll-x`. Full list in `CLAUDE.md`.

If the page needs a component that doesn't exist, **add it to `shared/paper.css`**
with a comment saying what it's for — don't inline a one-off `<style>` block.

### 2. Add the password gate template

Wrap the artifact content in the standard gate template. The gate div covers the entire viewport until the correct password is entered.

**Password:** `recon2026`
**SHA-256 hash:** `2ff51fba4b8b1137a97ed27dfbd357e5b690665b2f016c308d95b05febf5bf7e`

Always verify the hash before embedding:
```bash
echo -n "recon2026" | sha256sum
# 2ff51fba4b8b1137a97ed27dfbd357e5b690665b2f016c308d95b05febf5bf7e
```

**Gate CSS** — none needed. `paper.css` styles `#password-gate` in paper tones as
long as `<body>` carries `class="paper"`. Don't paste a gate stylesheet.

**Gate HTML** (put right after `<body>`, BEFORE your content):
```html
<div id="password-gate">
  <div class="gate-box">
    <div style="font-size:48px;margin-bottom:16px;">🔐</div>
    <h1>Password Required</h1>
    <p>Enter the passcode to view this artifact.</p>
    <input type="password" id="password-input" placeholder="Enter password" autocomplete="off" />
    <div class="error" id="password-error">Incorrect password.</div>
  </div>
</div>
```

**Gate script** (put before `</body>`):
```html
<script>
(function(){
  const HASH = "2ff51fba4b8b1137a97ed27dfbd357e5b690665b2f016c308d95b05febf5bf7e";
  const gate = document.getElementById('password-gate');
  const input = document.getElementById('password-input');
  const error = document.getElementById('password-error');

  async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function check() {
    const digest = await sha256(input.value);
    if (digest === HASH) {
      gate.classList.add('hidden');
      localStorage.setItem('pages_pass', digest);
    } else {
      error.style.display = 'block';
      setTimeout(() => error.style.display = 'none', 2000);
    }
  }

  // Auto-unlock from localStorage
  (async function(){
    const stored = localStorage.getItem('pages_pass');
    if (stored === HASH) { gate.classList.add('hidden'); return; }
  })();

  input.addEventListener('keydown', function(e){ if (e.key === 'Enter') check(); });
})();
</script>
```

### 3. Add shared menu (MANDATORY for every artifact)

In `<head>`:
```html
<link rel="stylesheet" href="/pages/shared/menu.css">
```

Before `</body>` (after the gate script, before the closing tag):
```html
<script src="/pages/shared/menu.js"></script>
```

What this gives you for free — don't hand-roll any of it:

- A fixed top-left bar: `☰` hamburger + `← All Artifacts` link back to the catalogue at `/pages/`
- The sidebar (built from `manifest.json`), with an `🏠 All Artifacts — Home` entry above the list
- The bar auto-hides while the password gate is up (detects `#password-gate` or `.pw-gate`)
- `menu-bar-offset` on `<html>`, which applies `body { padding-top: 46px }` so the bar never covers your page heading — **don't add your own top offset for it**, and don't set `body` padding with higher specificity than `html.menu-bar-offset body`

On paper pages `paper.css` already handles this: it cancels that offset (the
`.sheet` has its own top padding) and moves the bar to the top *right* so it clears
the contents rail. Nothing to do per-page.

### 4. Register in the manifest

Append to `_src/manifest.json` (append — don't clobber existing entries):
```json
{
  "slug": "<folder-name>",
  "title": "Page Title",
  "description": "Short description for the menu",
  "emoji": "📄"
}
```

### 5. Build

```bash
./build.py                 # all pages
./build.py <folder-name>   # just this one
```

Prints a per-page size table and fails loudly if any recognisable plaintext from the source ends up in the published output. Output is deterministic — rebuilding unchanged sources produces byte-identical files, so a noisy diff means something really changed.

If it errors with `could not resolve localStorage unlock key(s)`, your gate stores its unlocked flag in a way `build.py` can't read. Use a string literal: `localStorage.setItem('unlocked_<slug>', 'true')`.

### 6. Verify locally before pushing

Serve the repo as `/pages/` so absolute asset paths resolve:

```bash
mkdir -p /tmp/pgserve && ln -sfn "$PWD" /tmp/pgserve/pages
(cd /tmp/pgserve && python3 -m http.server 8899 &)

# A crawler sees nothing — this must print 0
curl -s http://127.0.0.1:8899/pages/<folder-name>/ | grep -ci "<a distinctive phrase from the artifact>"
```

Then open `http://127.0.0.1:8899/pages/<folder-name>/` and confirm: password unlocks it, the content renders, **interactive bits still work** (fullscreen toggle, tabs, any JS app), and a reload doesn't re-prompt.

### 7. Commit and push

```bash
git add _src/<folder-name>/ _src/manifest.json <folder-name>/ manifest.enc
git commit -m "Add <folder-name> research artifact"
git push
```

Commit **both** the source and the generated output — Pages serves the generated file. The pre-commit hook rejects a published `index.html` that has no encrypted payload, which is what you'd get from editing the built file or forgetting `./build.py`.

The page goes live at `https://edricgsh.github.io/pages/<folder-name>/` within ~30 seconds.

### 8. Verify live deployment

```bash
curl -sL "https://edricgsh.github.io/pages/<folder>/" | python3 -c "
import sys
data = sys.stdin.read()
checks = [
    ('Encrypted payload', 'id=\"pg-payload\"' in data),
    ('Unlock script', 'shared/unlock.js' in data),
    ('Crypto helpers', 'shared/crypto.js' in data),
    ('noindex meta', 'noindex' in data),
    ('No plaintext leak', '<svg' not in data and 'article-section' not in data),
]
failures = [n for n, ok in checks if not ok]
print('FAIL: ' + ', '.join(failures) if failures else 'ALL PASS')"
```

Note: the page returns 404 for the first ~20-30s after push while GitHub Pages builds — retry if you hit it.

## Diagram conventions

- Wrap every diagram in `<div class="figure">` with an optional `<p class="figure-caption">`. `paper.js` adds the ⛶ fullscreen button and the Escape handler — **don't hand-roll either**, and don't raise the figure above `z-index: 9000` (the menu sits at 10001).
- **Light ground.** SVG diagrams draw on `--paper-raised` with hairline `--rule` strokes, ink labels, and `--ramp-*` fills. The old dark-grid `#020617` aesthetic retired with the dark theme.
- **No neon glow.** Do not add `<filter id="glow">` (`feGaussianBlur` + `feMerge`) or apply `filter="url(#glow)"` to SVG text/shapes — it reads as blurry neon. Emphasis comes from colour, weight, and size. Removed repo-wide Aug 2026.
- Hand-crafted SVG for centerpiece diagrams; Mermaid.js acceptable for simpler flowcharts.
- Video breakdown pages: `.hero` → `.callout` → `.figure` → one `.mod` per chapter with the timestamp in `.mod-source` → `.sheet-footer`

## Video breakdown recipe (recurring task)

1. `yt-dlp --print "%(title)s|%(channel)s|%(duration_string)s" <url>` — get video info
2. `yt-dlp --write-auto-sub --sub-langs en --sub-format json3 --skip-download -o "/tmp/%(id)s" <url>` — download transcript
3. Parse JSON3 events → segments with timestamps
4. If >8k words: split by chapters → delegate to subagents for parallel breakdowns
5. Write the HTML artifact to `_src/<slug>/index.html` in the paper style (hero → callout → figure → `.mod` per chapter → footer) with gate + paper + menu
6. Update `_src/manifest.json`, run `./build.py`, verify locally, commit both source and output, push, verify live

## Pitfalls

- **Editing the built file instead of `_src/`** — the #1 way to lose work now. The root `<slug>/index.html` is generated; your edit vanishes on the next build. The pre-commit hook catches it, but only at commit time
- **Forgetting `./build.py`** — the source changes, the published page doesn't. Nothing is live until you rebuild
- **Never use `innerHTML` to inject decrypted content** — it doesn't run `<script>` tags and silently kills every interactive page. Use `document.write` (see Security model)
- **Truncated hash** — pre-commit hook catches ellipses in hash-like values
- **`_src/manifest.json` ordering** — append, don't clobber existing entries
- **Hand-rolling what `paper.css`/`paper.js` already give you** — a page-local sidebar, gate stylesheet, fullscreen toggle, or colour palette. Link the shared files and use the classes; extend `paper.css` if something is genuinely missing
- **`.paper a` beats bare class selectors** — prose links are styled at `(0,2,0)`, so any new link component needs `.paper a.thing`, not `.thing`, or it inherits the rust underline
- **404 after push is normal** — GitHub Pages build takes ~30s
- **`video_ids` is JSONB in LingoQ** — irrelevant here, but don't confuse the two repos
