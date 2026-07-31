# GitHub Pages Artifact Repo

This repository (`edricgsh/pages`) is the source for password-gated research artifacts published to **https://edricgsh.github.io/pages/<folder>/** via GitHub Pages (static hosting, auto-deploy on push to `main`).

## Quick facts

- **Password:** `recon2026`
- **SHA-256 hash (must be embedded in every gate):** `2ff51fba4b8b1137a97ed27dfbd357e5b690665b2f016c308d95b05febf5bf7e`
- **Live URL pattern:** `https://edricgsh.github.io/pages/<folder-name>/`
- **Shared menu:** every artifact MUST include `<link rel="stylesheet" href="/pages/_shared/menu.css">` in `<head>` and `<script src="/pages/_shared/menu.js"></script>` before `</body>`
- **manifest.json:** every artifact MUST be registered in `manifest.json` at the repo root (slug, title, description, emoji) so it appears in the shared hamburger menu
- **Pre-commit hook:** `.githooks/pre-commit` catches truncated/placeholder hashes. Activate with `git config core.hooksPath .githooks`

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
- Password gate: fixed overlay `#password-gate` (z-index 9999), SHA-256 verify, localStorage unlock
- Diagrams: inline SVG with fullscreen toggle (⛶ button, Escape to exit), `z-index` of fullscreen container must stay below the menu (10001)
- Video breakdowns: thesis box → SVG diagram → module sections → footer; timestamps from YouTube chapters

See `.claude/skills/github-pages/SKILL.md` for the full publishing workflow.
