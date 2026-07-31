# pages

Private static site host — encrypted research artifacts, one folder per artifact.

## Editing

Sources live in `_src/`. The repo root is **generated** — don't edit it.

```bash
vim _src/<slug>/index.html   # edit the artifact
./build.py                   # encrypt _src/ into the published root
git add -A && git commit && git push
```

Published pages contain only an AES-256-GCM blob plus a small loader, so crawlers
get nothing. The browser decrypts with the password and swaps in the real document.

See `CLAUDE.md` for the full model and `.claude/skills/github-pages/SKILL.md` for
the publishing workflow.
