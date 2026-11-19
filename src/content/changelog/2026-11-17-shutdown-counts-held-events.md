---
title: "A shutdown cut by its deadline counts every event it loses"
date: 2026-11-17
type: Fix
areas: [SDK]
docs:
  - { label: "The Rust SDK", href: "/instrument/" }
---
When `client.shutdown()` hit its deadline with events still in the queue, the held events could go
uncounted — loss the SDK knew about but never reported. Now every event a deadline abandons is counted
in the drop counters the next batch reports, so an impatient shutdown shows up as the loss it was
instead of a clean-looking flush.
