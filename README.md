# AI Operations Layer — Docs

The documentation site for the [AI Operations Layer](https://github.com/akira-shirase-oss/ai-operations-layer),
built with Astro Starlight. The product repository is read-only reference for this one.

## The model

- `src/content/docs/*.mdx` are the pages. Code fences carry test markers: `run=<suite>` executes,
  `output=<suite>` must match the real collector (normalised), `not-run="why"` explains a block that
  cannot run. `node scripts/snippets.mjs --coverage` fails on any unmarked block.
- Suites run against an `aiops-server` built from the product's `main` with the quick start's own
  commands, against a real PostgreSQL. Hosted pages show `https://aiops.example.com` (RFC 2606); the
  pages that run on this machine show `http://127.0.0.1:57400` and say so — the lists live in
  `scripts/check-urls.mjs` (`ALLOWED`) and `scripts/snippets.mjs` (`LOCAL_PAGES`). Keep them aligned.
- `src/data/openapi.json` is a **draft** authored here; `scripts/check-openapi.mjs` keeps it
  bidirectionally in sync with the routes in the server's router on `main`. It moves into the product
  repository once reviewed.
- `scripts/check.sh` is the gate before every push: node tests, snippet coverage, `npm run build`
  (URL policy, internal links, CSP hashes, the output checks), the privacy pass.

## Commands

```sh
npm install          # deps
npm run dev          # local preview while writing
npm run build        # the build + all static checks
npm test             # node --test over the scripts
node scripts/snippets.mjs --coverage   # every block accounted for
node scripts/snippets.mjs --list       # the steps CI runs, in order
node scripts/check-openapi.mjs         # spec ↔ server routes, both ways
```
