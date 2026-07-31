---
name: github-pages
description: Publish password-gated research artifacts to GitHub Pages via the edricgsh/pages repo. Full pipeline: HTML artifact → SHA-256 password gate → git push → auto-deploy to https://edricgsh.github.io/pages/<folder>/.
---

# GitHub Pages Artifact Publishing

Use when the user asks to publish a research artifact, visualization, or HTML page to the password-gated GitHub Pages site. This repo IS the source — work inside this directory, commit, and push to `main`.

## Security model

**SHA-256 hash gate** (only active approach). Crawlers see the gate shell with plaintext HTML behind it — the gate just hides it visually. Suitable for most artifacts. The AES-256-GCM encryption approach was retired (Jul 2026) after repeated production failures.

## Workflow — SHA-256 Gate

### 1. Create the folder and write the artifact

```bash
mkdir -p <folder-name>
# Write full HTML to <folder-name>/index.html
```

### 2. Add the password gate template

Wrap the artifact content in the standard gate template. The gate div covers the entire viewport until the correct password is entered.

**Password:** `recon2026`
**SHA-256 hash:** `2ff51fba4b8b1137a97ed27dfbd357e5b690665b2f016c308d95b05febf5bf7e`

Always verify the hash before embedding:
```bash
echo -n "recon2026" | sha256sum
# 2ff51fba4b8b1137a97ed27dfbd357e5b690665b2f016c308d95b05febf5bf7e
```

**Gate CSS** (add inside `<style>` or as a separate `<style>` block in `<head>`):
```css
#password-gate { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: #0a0a0f; font-family: 'Inter', sans-serif; }
#password-gate.hidden { display: none; }
.gate-box { text-align: center; padding: 40px; max-width: 380px; }
.gate-box h1 { font-size: 24px; font-weight: 700; color: #f0f0f0; margin-bottom: 8px; }
.gate-box p { font-size: 14px; color: #888; margin-bottom: 24px; }
.gate-box input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 15px; outline: none; text-align: center; }
.gate-box input:focus { border-color: #60a5fa; }
.gate-box .error { color: #f87171; font-size: 13px; margin-top: 10px; display: none; }
```

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
<link rel="stylesheet" href="/pages/_shared/menu.css">
```

Before `</body>` (after the gate script, before the closing tag):
```html
<script src="/pages/_shared/menu.js"></script>
```

### 4. Update manifest.json

Add to `manifest.json` at repo root:
```json
{
  "slug": "<folder-name>",
  "title": "Page Title",
  "description": "Short description for the menu",
  "emoji": "📄"
}
```

### 5. Verify before committing

```bash
# Check the hash is the full 64 characters, not truncated
grep 'HASH = "' <folder-name>/index.html | python3 -c "
import sys
line = sys.stdin.read()
h = line.split('\"')[1]
print(f'Length: {len(h)} — {\"PASS\" if len(h) == 64 else \"FAIL! Truncated hash!\"}')"

# Check no truncated placeholder pattern (like 2ff51f...bf7e)
grep '\.\.\.' <folder-name>/index.html && echo "WARNING: found ellipsis in file — likely truncated placeholder"
```

The pre-commit hook (`.githooks/pre-commit`) will also catch these automatically on `git commit`.

### 6. Commit and push

```bash
git add <folder-name>/ manifest.json
git commit -m "Add <folder-name> research artifact"
git push
```

The page goes live at `https://edricgsh.github.io/pages/<folder-name>/` within ~30 seconds (GitHub Pages build).

### 7. Verify live deployment

```bash
curl -sL "https://edricgsh.github.io/pages/<folder>/" | python3 -c "
import sys; import re
data = sys.stdin.read()
checks = [
    ('Full hash (64 chars)', len(re.search(r'([a-f0-9]{64})', data).group(1)) == 64 if re.search(r'([a-f0-9]{64})', data) else False),
    ('No truncated placeholder', '...bf7e' not in data),
    ('Password gate exists', '<div id=\"password-gate\">' in data),
    ('Menu css', 'menu.css' in data),
    ('Menu js', 'menu.js' in data),
    ('Diagram svg', '<svg' in data),
    ('Fullscreen btn', 'toggleFullscreen' in data),
]
failures = [n for n, ok in checks if not ok]
if failures:
    print(f'FAIL: {', '.join(failures)}')
else:
    print('ALL PASS')"
```

Note: the page returns 404 for the first ~20-30s after push while GitHub Pages builds — retry if you hit it.

## Diagram conventions

- **Fullscreen toggle** for diagram wrappers: ⛶ button toggles `.fullscreen` class, Escape exits, `z-index` must stay below the hamburger menu (10001+)
- Hand-crafted SVG for centerpiece diagrams (dark grid aesthetic, `#020617` background); Mermaid.js acceptable for simpler flowcharts
- Video breakdown pages: thesis box → SVG diagram → module sections with timestamps → footer

## Video breakdown recipe (recurring task)

1. `yt-dlp --print "%(title)s|%(channel)s|%(duration_string)s" <url>` — get video info
2. `yt-dlp --write-auto-sub --sub-langs en --sub-format json3 --skip-download -o "/tmp/%(id)s" <url>` — download transcript
3. Parse JSON3 events → segments with timestamps
4. If >8k words: split by chapters → delegate to subagents for parallel breakdowns
5. Build HTML artifact (thesis → SVG diagram → sections → footer) with gate + menu
6. Update manifest.json, verify hash, commit, push, verify live

## Pitfalls

- **Truncated hash is the #1 production failure** — always verify 64 chars before commit; pre-commit hook catches it
- **manifest.json ordering** — append, don't clobber existing entries
- **404 after push is normal** — GitHub Pages build takes ~30s
- **`video_ids` is JSONB in LingoQ** — irrelevant here, but don't confuse the two repos
