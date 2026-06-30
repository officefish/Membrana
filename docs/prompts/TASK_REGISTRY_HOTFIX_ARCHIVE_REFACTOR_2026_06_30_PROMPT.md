# Sprint prompt: Task registry hotfix + archive refactor

**ID:** `task-registry-hotfix-archive-refactor-2026-06-30`
**Дата:** 2026-06-30
**Источник:** утренний ritual:day упал на `yarn main-day-issue` из-за `promptPath: null` в active registry entries.
**Консилиум:** `docs/seanses/task-registry-refactor-and-main-day-issue-fix-2026-06-30.md`

## Цель

Восстановить утренний ритуал и одновременно внедрить первый этап refactor-контракта task registry:

- hot registry для открытых задач;
- cold `archive.jsonl` для новых закрытий;
- audit/verify tooling;
- совместимость существующих task-команд с legacy `archived` строками.

## R0 — emergency fix

- `yarn main-day-issue` не падает на `promptPath: null`.
- Morning context берёт только ritual-safe задачи: `active/review` + непустой `promptPath`.
- Promptless active entries переведены в `deferred`.

## R0.5 — audit

- `yarn tasks:audit` выводит распределение по статусам.
- `yarn tasks:audit --json` даёт machine-readable report.
- `yarn tasks:audit:verify` проверяет hot contract и разрешает legacy closed rows warning-ом.

## R1 — contracts

- `docs/schemas/task-registry.schema.json`
- `docs/schemas/task-archive-log.schema.json`
- `docs/tasks/TASK_REGISTRY_STORAGE.md`

## R2 — command integration

- `task:archive` пишет `docs/tasks/archive.jsonl`, карточку и обновляет README.
- `task:list` и `task:sync-readme` читают archive log + legacy registry archive rows.
- `task:close-github` обновляет `githubIssueClosedAt` в archive log.
- `task-closure-review finalize` совместим с задачами, уже ушедшими в archive log.

## Definition of Done

- [ ] `node --test scripts/task-registry.test.mjs` pass.
- [ ] `yarn tasks:audit:verify` pass.
- [ ] `yarn main-day-issue --dry-run --no-rag` pass.
- [ ] `yarn test:scripts` pass.
- [ ] Реальный `yarn main-day-issue --no-rag` записывает `docs/MAIN_DAY_ISSUE.md`.
- [ ] Sprint archived through `yarn task:archive`, proving `archive.jsonl` path.
