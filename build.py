#!/usr/bin/env python3
"""Encrypt every artifact in _src/ into a published loader page at the repo root.

    ./build.py            # build everything
    ./build.py <slug>     # build one artifact
    ./build.py --check    # verify built output matches _src (no writes)

Why this exists
---------------
The old SHA-256 gate only *hid* content visually — the full plaintext was still
served to anyone (or anything) that fetched the URL, so crawlers indexed it.
Here the published page contains nothing but ciphertext plus a small loader;
the plaintext never leaves _src/, which is not served as a page.

Envelope: base64( salt[16] || iv[12] || AES-256-GCM ciphertext )
Key:      PBKDF2-HMAC-SHA256, 600_000 iterations over the UTF-8 password.

On unlock, shared/unlock.js replaces the whole document via
document.open()/write()/close() rather than assigning innerHTML. That matters:
innerHTML does NOT execute <script> tags, which is what broke the July 2026
encryption attempt — every interactive page (fullscreen toggles, tab switching,
the bundled React app in tariff-trade-breakdown) came back dead.
"""

import base64
import hashlib
import json
import os
import re
import sys
from xml.etree import ElementTree

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, '_src')

PASSWORD = 'recon2026'
PASSWORD_HASH = hashlib.sha256(PASSWORD.encode()).hexdigest()

PBKDF2_ITERATIONS = 600000
SALT_BYTES = 16
IV_BYTES = 12

# Deterministic salt/iv per file: byte-identical rebuilds keep git diffs clean
# and avoid re-committing every page on every build. Safe here because the
# password is shared and public-by-design; this is anti-crawler, not a secret
# store. Reusing an (key, iv) pair across *different* plaintexts would break
# GCM, so the iv is derived from the plaintext itself.
def _derive_salt_iv(rel_path, plaintext):
    seed = hashlib.sha256(('pages-salt|' + rel_path).encode()).digest()
    salt = seed[:SALT_BYTES]
    iv = hashlib.sha256(b'pages-iv|' + salt + plaintext).digest()[:IV_BYTES]
    return salt, iv


def encrypt(rel_path, plaintext_str):
    plaintext = plaintext_str.encode('utf-8')
    salt, iv = _derive_salt_iv(rel_path, plaintext)
    key = hashlib.pbkdf2_hmac('sha256', PASSWORD.encode('utf-8'), salt,
                              PBKDF2_ITERATIONS, dklen=32)
    ciphertext = AESGCM(key).encrypt(iv, plaintext, None)
    return base64.b64encode(salt + iv + ciphertext).decode('ascii')


# ─────────────────────────── unlock-key extraction ───────────────────────────
# Sources keep their original password gate so they still work when opened
# directly from _src/. Once the loader has authenticated, it seeds whatever
# localStorage keys that page's own gate checks, so the gate self-unlocks the
# instant the decrypted document is written — no second prompt, no flash.

GATE_MARKERS = ('id="password-gate"', 'pw-gate', 'password-input')

SETITEM_RE = re.compile(
    r"""localStorage\.setItem\(\s*(?P<key>['"][^'"]+['"]|[A-Za-z_$][\w$]*)\s*,"""
    r"""\s*(?P<val>['"][^'"]*['"]|[A-Za-z_$][\w$]*)\s*\)"""
)


def _unquote(tok):
    return tok[1:-1] if tok[:1] in ("'", '"') else None


def extract_unlock_keys(html, rel_path):
    """Map of localStorage key -> value that this page's gate treats as unlocked."""
    keys = {}
    unresolved = []

    for m in SETITEM_RE.finditer(html):
        raw_key, raw_val = m.group('key'), m.group('val')

        key = _unquote(raw_key)
        if key is None:
            # e.g. localStorage.setItem(KEY, 'true') — resolve the const
            decl = re.search(
                r"\b%s\s*=\s*['\"]([^'\"]+)['\"]" % re.escape(raw_key), html)
            if not decl:
                unresolved.append(m.group(0))
                continue
            key = decl.group(1)

        val = _unquote(raw_val)
        if val is None:
            # e.g. localStorage.setItem('pages_pass', digest) — every gate in
            # this repo stores the SHA-256 digest of the password there.
            val = PASSWORD_HASH

        keys[key] = val

    if unresolved:
        raise SystemExit(
            "%s: could not resolve localStorage unlock key(s): %s\n"
            "  Fix the source to use string literals, or teach build.py the pattern."
            % (rel_path, ', '.join(unresolved)))

    if any(mark in html for mark in GATE_MARKERS) and not keys:
        print("  ! %s has gate markup but no localStorage unlock key — "
              "the gate will re-prompt after decryption" % rel_path)

    return keys


# ─────────────────────────── document preparation ────────────────────────────
# Injected into the decrypted document before it is written:
#   - crypto.js, so menu.js can decrypt manifest.enc for the sidebar
#   - a style that pre-hides any gate, so it never paints before the page's own
#     script gets to hide it
HEAD_INJECT = (
    '<script src="/pages/shared/crypto.js"></script>'
    '<style id="pg-pre">#password-gate,.pw-gate{display:none!important}</style>'
)

HEAD_RE = re.compile(r'<head\b[^>]*>', re.I)
HTML_RE = re.compile(r'<html\b[^>]*>', re.I)


def prepare_document(html):
    if '/pages/shared/crypto.js' in html:
        return html
    m = HEAD_RE.search(html)
    if m:
        return html[:m.end()] + HEAD_INJECT + html[m.end():]
    m = HTML_RE.search(html)
    if m:
        return html[:m.end()] + HEAD_INJECT + html[m.end():]
    return HEAD_INJECT + html


# ──────────────────────────────── the loader ─────────────────────────────────
# Deliberately generic: no title, no description, no emoji. A crawler that
# fetches this URL learns only that something password-protected lives here.
LOADER = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex">
<link rel="icon" href="/pages/shared/favicon.ico" sizes="32x32">
<link rel="icon" href="/pages/shared/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/pages/shared/apple-touch-icon.png">
<title>Protected</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    background: #0a0a0f; color: #e0e0e0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }}
  .gate-box {{ text-align: center; padding: 40px; max-width: 380px; width: 100%; }}
  .gate-box .lock-icon {{ font-size: 40px; margin-bottom: 16px; }}
  .gate-box h1 {{ font-size: 22px; font-weight: 700; color: #f0f0f0; margin-bottom: 8px; }}
  .gate-box p {{ font-size: 14px; color: #888; margin-bottom: 24px; }}
  .gate-box input {{
    width: 100%; padding: 12px 16px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; color: #fff; font-size: 15px;
    outline: none; text-align: center; letter-spacing: 2px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }}
  .gate-box input:focus {{ border-color: #60a5fa; }}
  .gate-box input:disabled {{ opacity: 0.5; }}
  .gate-box .msg {{ font-size: 13px; margin-top: 12px; min-height: 18px; }}
  .gate-box .msg.error {{ color: #f87171; }}
  .gate-box .msg.busy {{ color: #888; }}
</style>
</head>
<body>
<div id="password-gate">
  <div class="gate-box">
    <div class="lock-icon">&#128274;</div>
    <h1>Password Required</h1>
    <p>This page is encrypted. Enter the passcode to decrypt it in your browser.</p>
    <input type="password" id="password-input" placeholder="Enter password" autocomplete="off" autofocus>
    <div class="msg" id="password-msg"></div>
  </div>
</div>
<noscript>
  <p style="color:#fb7185;text-align:center;padding:40px;">
    This page is encrypted and needs JavaScript to decrypt.
  </p>
</noscript>
<script id="pg-payload" type="application/octet-stream">{payload}</script>
<script id="pg-unlock-keys" type="application/json">{unlock_keys}</script>
<script src="/pages/shared/crypto.js"></script>
<script src="/pages/shared/unlock.js"></script>
</body>
</html>
"""


def build_page(rel_path, out_path):
    with open(os.path.join(SRC, rel_path), encoding='utf-8') as f:
        source = f.read()

    unlock_keys = extract_unlock_keys(source, rel_path)
    document = prepare_document(source)
    payload = encrypt(rel_path, document)

    html = LOADER.format(payload=payload,
                         unlock_keys=json.dumps(unlock_keys, sort_keys=True))

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)

    return payload, unlock_keys


def build_manifest():
    with open(os.path.join(SRC, 'manifest.json'), encoding='utf-8') as f:
        raw = f.read()
    json.loads(raw)  # fail loudly on malformed manifest
    payload = encrypt('manifest.json', raw)
    with open(os.path.join(ROOT, 'manifest.enc'), 'w', encoding='utf-8') as f:
        f.write(payload)
    return payload


def leak_check(built_html, source_html, label):
    """The published file must not contain recognisable plaintext from the source."""
    problems = []

    # Any text node of 25+ chars from the source appearing verbatim in the output
    for chunk in re.findall(r'>([^<>]{25,})<', source_html):
        chunk = chunk.strip()
        if chunk and chunk in built_html:
            problems.append(chunk[:60])
            if len(problems) >= 3:
                break

    if problems:
        print('  ✗ %s LEAKS PLAINTEXT: %s' % (label, problems))
        return False
    return True


def check_favicon():
    """A malformed favicon fails silently in the browser — catch it at build time.

    The first version of shared/favicon.svg named the CSS custom properties
    (--rust, --paper) inside an XML comment. XML forbids '--' there, so every
    browser refused to parse the file and simply showed no icon: no console
    error, no failed request, nothing to notice.
    """
    path = os.path.join(ROOT, 'shared', 'favicon.svg')
    if not os.path.exists(path):
        print('  ! shared/favicon.svg is missing')
        return False
    try:
        ElementTree.parse(path)
    except ElementTree.ParseError as exc:
        print('  ✗ shared/favicon.svg is not valid XML: %s' % exc)
        print("    (a comment containing '--' is the usual cause)")
        return False
    return True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    only = args[0] if args else None

    if not check_favicon():
        raise SystemExit('\nBuild FAILED: favicon would not render.')

    slugs = sorted(d for d in os.listdir(SRC)
                   if os.path.isdir(os.path.join(SRC, d)))
    if only:
        if only not in slugs:
            raise SystemExit('unknown slug: %s (have: %s)' % (only, ', '.join(slugs)))
        slugs = [only]

    ok = True

    if not only:
        payload = build_manifest()
        print('manifest.enc%s%d bytes' % (' ' * 24, len(payload)))

    # Root catalogue
    targets = [] if only else [('index.html', os.path.join(ROOT, 'index.html'))]
    for slug in slugs:
        os.makedirs(os.path.join(ROOT, slug), exist_ok=True)
        targets.append((os.path.join(slug, 'index.html'),
                        os.path.join(ROOT, slug, 'index.html')))

    for rel_path, out_path in targets:
        payload, keys = build_page(rel_path, out_path)
        with open(os.path.join(SRC, rel_path), encoding='utf-8') as f:
            source = f.read()
        with open(out_path, encoding='utf-8') as f:
            built = f.read()

        label = os.path.dirname(rel_path) or '(root)'
        clean = leak_check(built, source, label)
        ok = ok and clean
        print('%-34s %7.1f KB -> %7.1f KB  keys=%s %s' % (
            label, len(source) / 1024, len(built) / 1024,
            ','.join(sorted(keys)) or '-', '' if clean else '  ✗'))

    if not ok:
        raise SystemExit('\nBuild FAILED: plaintext leaked into published output.')

    print('\nBuilt %d page(s). Commit the generated files — GitHub Pages serves them.'
          % len(targets))


if __name__ == '__main__':
    main()
