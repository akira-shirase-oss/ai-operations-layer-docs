---
title: "Controlled recovery: reconcile before retry, never a blind rerun"
date: 2026-11-19
type: Feature
areas: [API, Collector, Console, Adapters]
docs:
  - { label: "Recovering an uncertain operation", href: "/recovering/" }
  - { label: "Concepts", href: "/concepts/" }
---
The control path is live: `POST …/operations/{id}/reconcile` reads the effect's own authority and
stores the answer; `POST …/operations/{id}/retry` resubmits the work under its stable business key —
authorized only when the effect is confirmed absent, denied `effect_confirmed` when it already
happened. The decision, the authority snapshot and the audit row commit in one transaction; the
external call happens only after, and its outcome is observed — never assumed. Replay returns the
stored record; a changed `expected_state` is `409 conflicting_request`. There is no generic "run
again", and every denial is a first-class, audited state.
