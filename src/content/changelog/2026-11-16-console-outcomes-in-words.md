---
title: "Console outcomes in plain words — cancelled as cancelled"
date: 2026-11-16
type: Improvement
areas: [Console]
docs:
  - { label: "The console", href: "/console/" }
  - { label: "Concepts", href: "/concepts/" }
---
The console now says what happened in words: a run the host declared `failed` with
`error_code: cancelled` renders as *cancelled*, never as a host error, and outcome details sit one
click away instead of crowding the row. Status and outcome stay whole down to 360 px — uncertainty is
not elided where the screen is smallest.
