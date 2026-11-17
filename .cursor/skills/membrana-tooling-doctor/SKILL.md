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
4. `yarn verify:dist-fresh` — dist пакетов совпадает с исходниками **по содержимому** (sha256 исходника
   против `fileInfos[].version` в `.tsbuildinfo`; часы не судья — `tsc -b` верит mtime и молчал на
   отравленном dist, #2525). Красный `stale`/`dist_missing` → `yarn turbo run build --filter=<pkg>`;
   запись, отравленная в общем кеше деревьев до 02.10, — `yarn workspace <pkg> clean` и
   `yarn turbo run build --filter=<pkg> --force`. `absent` — пакет в этом дереве не собирался.
5. `git config core.hooksPath` == `.githooks` (иначе `yarn prepare` — хуки pre-push/commit-msg не активны).
6. `git check-ignore docs/discussions/uncommitted-code-review.md` — артефакт ревью не трекается.

Красное — чинить до начала работы. Полный список tooling — `AGENTS.md` §Agent tooling.

## НЕ использовать

- Полные продуктовые тесты/сборка → `yarn turbo run test build`.
- Прод-деплой → `yarn deploy:when-green` + ручной деплой.
