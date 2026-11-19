---
title: "The credential surface: see every key, revoke on the next presentation"
date: 2026-11-19
type: Feature
areas: [API, Console, Self-hosting]
docs:
  - { label: "Credentials and revocation", href: "/credentials/" }
---
`GET /v1/admin/credentials` shows the whole credential surface — projects, ingest keys, tokens with
their actors, scopes and revocation state; metadata only. `POST /v1/admin/credentials/tokens/{id}/revoke`
and `…/ingest-keys/{id}/revoke` evict the credential's cached answer in the same call, so a revoked
key or token dies on its next presentation rather than at the cache TTL — the incident tool, audited
before it answers.
