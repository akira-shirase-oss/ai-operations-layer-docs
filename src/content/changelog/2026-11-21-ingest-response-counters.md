---
title: "The ingest response's policy counters, shown everywhere they appear"
date: 2026-11-21
type: Improvement
areas: [API]
docs:
  - { label: "The ingest contract", href: "/ingest-contract/" }
  - { label: "Which API, when", href: "/api/" }
---
Every `POST /v1/ingest` answer carries three counters beside `accepted`, `duplicates` and `refused`,
and they are now documented wherever a response is shown: `withheld_attributes` (attribute keys the
default-deny policy dropped — attributes are opt-in per project), `redactions` (secret-shaped
strings replaced with `[redacted]` before storage) and `overflowed_names` (names over the
cardinality budget, stored under `_overflow`). All three are zero on a clean batch; a non-zero count
says what was filtered and why.
