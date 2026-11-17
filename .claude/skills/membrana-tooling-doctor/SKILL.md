---
name: membrana-tooling-doctor
description: >-
  Health-check агентского tooling перед плотной работой: wire-sync, client-каталог,
  stale-dist, git-хуки, gitignore ревью-артефакта. Use when starting a session or diagnosing
  tooling drift. Delegates to .cursor/skills/membrana-tooling-doctor/SKILL.md.
---

# Mirror — tooling doctor

**Canonical:** [`.cursor/skills/membrana-tooling-doctor/SKILL.md`](../../.cursor/skills/membrana-tooling-doctor/SKILL.md)

Stale-dist: `yarn verify:dist-fresh` судит свежесть dist по содержимому (`.tsbuildinfo` ↔ sha256 исходников),
`yarn build:affected` пересобирает. Подробности и лечение — в каноне (шаг 4; #2525).
