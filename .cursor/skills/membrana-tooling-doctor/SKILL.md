---
name: membrana-tooling-doctor
description: >-
  Health-check агентского tooling перед плотной работой: wire-sync, client-каталог,
  stale-dist, git-хуки, gitignore ревью-артефакта. Use when starting a session or diagnosing
  tooling drift. Do NOT use for product tests (turbo test) или деплоя.
---

# Membrana tooling doctor — health-check

Быстрая проверка инструментов (эпик `agent-tooling-night-build`) перед сессией:

1. `yarn verify:wire-sync` — core ↔ background-cabinet wire синхронны (иначе события/поля теряются).
2. `yarn catalog:verify-client` — client-каталог совпадает с `registerClientModules` (иначе красный CI).
3. `yarn build:affected` — пересобрать dist изменённых пакетов (убрать stale-dist перед typecheck).
4. `git config core.hooksPath` == `.githooks` (иначе `yarn prepare` — хуки pre-push/commit-msg не активны).
5. `git check-ignore docs/discussions/uncommitted-code-review.md` — артефакт ревью не трекается.

Красное — чинить до начала работы. Полный список tooling — `AGENTS.md` §Agent tooling.

## НЕ использовать

- Полные продуктовые тесты/сборка → `yarn turbo run test build`.
- Прод-деплой → `yarn deploy:when-green` + ручной деплой.
