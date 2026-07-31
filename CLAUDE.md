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
- **Shared menu:** every artifact MUST include `<link rel="stylesheet" href="/pages/shared/menu.css">` in `<head>` and `<script src="/pages/shared/menu.js"></script>` before `</body>`. It renders a fixed top-left bar (`☰` + `← All Artifacts` back-link to the catalogue), auto-hides while the password gate is up, and adds `menu-bar-offset` to `<html>` so `body` gets 46px of top padding — don't add your own top offset for it
- **manifest:** every artifact MUST be registered in `_src/manifest.json` (slug, title, description, emoji). It ships encrypted as `manifest.enc`, so titles and descriptions aren't crawlable either
- **Pre-commit hook:** `.githooks/pre-commit` blocks plaintext in published paths and catches truncated/placeholder hashes. Activate with `git config core.hooksPath .githooks`

## Encryption model

The old SHA-256 gate only *hid* content visually — the full plaintext was still served, so crawlers indexed it. Now the published page contains only ciphertext plus `shared/unlock.js`.

- Envelope: `base64( salt[16] || iv[12] || AES-256-GCM ciphertext )`, key = PBKDF2-HMAC-SHA256, 600k iterations
- On unlock, `unlock.js` replaces the document via `document.open()/write()/close()` — **not** `innerHTML`. innerHTML doesn't execute `<script>` tags; that is exactly what killed the July 2026 attempt (every interactive page, including the React bundle in `tariff-trade-breakdown`, came back dead)
- The password itself (not just its hash) is kept in `localStorage.pages_pw`, because re-decrypting on the next page load needs real key material. Storing only the hash is why the old auto-unlock threw a `ReferenceError`
- Sources keep their original gates so they still work when opened directly from `_src/`. `build.py` extracts the `localStorage` keys each gate checks and seeds them at unlock time, so the inner gate self-opens instead of prompting twice
- `robots.txt` disallows everything and each loader carries `noindex,nofollow,noarchive,nosnippet` — belt and braces for crawlers that fetch anyway

**Limits, so nobody over-trusts this:** it's encryption at rest on GitHub's CDN. Anyone with the password can read and re-share the plaintext, and one shared password means no per-visitor revocation.

## The 8 published artifacts

| Folder | Title | Emoji |
|--------|-------|-------|
| `tariff-trade-breakdown` | Tariffs, Trade & Trump's Strategy | 🌐 |
| `payment-reconciliation-research` | Payment Reconciliation Market Map | 💳 |
| `pragmatic-engineer` | The Pragmatic Engineer | 📬 |
| `jensen-huang-mindset` | Jensen Huang: The Mindset That Built NVIDIA | ⚡ |
| `circular-financing` | AI Circular Financing — The $800B Money Loop | 🔄 |
| `personal-brand-course` | How to Build a Personal Brand — Full Course | 🎯 |
| `sharran-srivatsaa-formula` | The Man That Makes Billionaires — Sharran Srivatsaa | 📈 |
| `postiz-saas-growth` | Postiz: $17K → $143K MRR in 4 Months | 🚀 |

## Artifact conventions

- Dark theme (slate-950 `#020617` background, Inter + JetBrains Mono fonts)
- Password gate: fixed overlay `#password-gate` (z-index 9999), SHA-256 verify, localStorage unlock. Keep it in the source — the build seeds its unlock key so it never double-prompts
- Diagrams: inline SVG with fullscreen toggle (⛶ button, Escape to exit), `z-index` of fullscreen container must stay below the menu (10001)
- **No neon glow on diagrams** — do not add `feGaussianBlur`/`feMerge` glow filters to SVG text or shapes. Labels stay crisp; use colour and weight for emphasis instead
- Video breakdowns: thesis box → SVG diagram → module sections → footer; timestamps from YouTube chapters

See `.claude/skills/github-pages/SKILL.md` for the full publishing workflow.
