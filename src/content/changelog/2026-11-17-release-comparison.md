---
title: "Compare releases over one window"
date: 2026-11-17
type: Feature
areas: [API, Console, Collector]
docs:
  - { label: "Which API, when", href: "/api/" }
  - { label: "The console", href: "/console/" }
---
`GET /v1/projects/{project}/releases/compare` puts up to four releases side by side over the same
window — operations, each declared status, missing events, reported drops and cost estimates — built
from the same summaries and statuses the operations list filters by. A release whose operations lost
events or never finished shows that in its own columns, never as success, and a release with no
operations in the window is listed with zeros rather than dropped, so a quiet rollout can't look like
a healthy one by omission. The console compares releases on the same endpoint it always did.
