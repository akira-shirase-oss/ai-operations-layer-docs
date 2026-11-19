---
title: "Collector, SDK and console: the first end-to-end slice"
date: 2026-11-15
type: Feature
areas: [Collector, SDK, Console, API]
docs:
  - { label: "Quick start", href: "/quick-start/" }
  - { label: "The ingest contract", href: "/ingest-contract/" }
---
The first working slice landed: `aiops-sdk` emits operations and steps into a bounded, drop-counting
queue; `aiops-server` ingests authenticated, bounded, idempotent batches into PostgreSQL; and the
console at `/console/` reads the permissioned API with a tab-scoped token — showing declared
statuses, `no_finish_observed`, gap counts and uncertainty as data from day one.
