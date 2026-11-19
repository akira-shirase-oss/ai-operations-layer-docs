# AI Operations Layer Docs — agent instructions

The docs site for [ai-operations-layer](https://github.com/akira-shirase-oss/ai-operations-layer), built with
Astro Starlight and deployed to Cloudflare Pages as `docs.ai-operations-layer.404human.dev`. The product
repository is read-only reference for this worktree; never edit it from here.

## The model

- `src/content/docs/*.mdx` are the pages. Code fences carry test markers: `run=<suite>` executes,
  `output=<suite>` must match the real collector (normalised), `not-run="why"` explains a block that
  cannot run. `node scripts/snippets.mjs --coverage` fails on any unmarked block.
- Suites run against an `aiops-server` built from the product's `main` with the quick start's own
  commands (PostgreSQL comes from the product's compose file on a maintainer machine, or from a
  service on CI). Hosted pages show `https://aiops.example.com` (RFC 2606); the pages that run on
  this machine show `http://127.0.0.1:57400` (and `127.0.0.1:57432` for PostgreSQL) and say so — the
  list lives in `scripts/check-urls.mjs` (`ALLOWED`) and `scripts/snippets.mjs` (`LOCAL_PAGES`).
  Keep them aligned.
- `src/data/openapi.json` is a **draft** authored here; `scripts/check-openapi.mjs` keeps it
  bidirectionally in sync with the routes in `crates/aiops-server/src/app.rs`. It moves into the
  product repository once reviewed.
- `scripts/check.sh` is the gate before every push: node tests, the accessibility scan's self-test,
  snippet coverage, `npm run build` (internal links, CSP hashes, the output checks), no home paths
  in tracked files.

## Non-negotiables

- No secrets, real hostnames, home paths, user names, commit hashes or internal decision numbers in
  anything committed (public repo). The only real hostname allowed is
  `docs.ai-operations-layer.404human.dev`. `scripts/check-dist.mjs` enforces most of this in the output.
- Every example runs in CI or carries a `not-run` reason. Never fake an output block.
- Telemetry is evidence, never authority: the docs must say what the collector observed, never
  present it as proof a business action should happen. Uncertainty and gaps are documented as
  first-class states.
- Neutral theme: Starlight tokens only, no product palette — a shared design system is coming.
- Small commits on `main`; the coordinator reviews and pushes.

## Verification

`scripts/check.sh` before every commit that touches pages, scripts or config; `npm run build`
before any commit, always.
