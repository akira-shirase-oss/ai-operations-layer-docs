---
title: "A connect timeout reaches the runner as lost, not failed"
date: 2026-11-16
type: Fix
areas: [Adapters]
docs:
  - { label: "Durable Runner hosts", href: "/adapters/durable-runner/" }
---
A probe whose connection attempt timed out was reported to the runner as *failed* — an outcome the
probe never earned, since the request provably never arrived. It now reports as lost, matching the
contract's own words: `transport` means the request provably never reached the remote. Telemetry
stops asserting an outcome nobody declared.
