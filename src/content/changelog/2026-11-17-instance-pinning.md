---
title: "One instance, one ingest key"
date: 2026-11-17
type: Security
areas: [Collector, API]
docs:
  - { label: "The ingest contract", href: "/ingest-contract/" }
  - { label: "Errors", href: "/errors/" }
---
A source `instance_id` now belongs to the first ingest key that used it: a batch claiming that
instance under a different key is refused whole with `409 instance_owned_by_another_key`. A stolen or
misconfigured key can no longer fill another host's `seq` gaps or rewrite its drop counters — the
holes it would have forged stay the honest gaps they were.
