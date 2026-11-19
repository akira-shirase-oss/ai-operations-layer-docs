---
title: "The runner's own answer beside the timeline"
date: 2026-11-17
type: Feature
areas: [API, Console, Adapters]
docs:
  - { label: "Durable Runner hosts", href: "/adapters/durable-runner/" }
  - { label: "Concepts", href: "/concepts/" }
---
Operations linked to a Durable Runner run gained a live authority read:
`GET …/operations/{id}/authority` verifies the named run really derives to the operation before asking
the runner, then returns the runner's verbatim answer — or an explicit `not_configured`, `not_linked`,
`unknown_runner`, `link_unverified` or `unavailable`, never a telemetry guess in its place. The console
renders the answer and the timestamp it was read at, so "what does the system of record say?" is one
panel, not an inference.
