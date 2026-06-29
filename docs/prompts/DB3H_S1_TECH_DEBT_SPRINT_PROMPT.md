# Промпт: DB3H-S1 — техдолг (lint, CI, issues, гигиена)

> **Task-промпт для агента-разработчика.**  
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).  
> Размер: **M**. Реестр: `db3h-s1-tech-debt` · parent: `device-board-three-hosts-2026-06-26`.  
> Консилиум: [`neural-detectors-strategy-2026-06-26.md`](../seanses/neural-detectors-strategy-2026-06-26.md).

---

## Контекст

Перед размещением UserCase device-board на **кабинете**, **Membrana Studio** и **Device Board** нужен зелёный, предсказуемый CI и порядок в backlog. **RAG archive index (`yarn rag:index --full`) и OPENAI_API_KEY — вне scope** (нет токенов; operative RAG-тесты без ключа — опциональная проверка).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) | Канон дня |
| [`GITHUB_ISSUES_AUDIT_PROMPT.md`](./GITHUB_ISSUES_AUDIT_PROMPT.md) | Триаж Issues |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Архив задач |
| [`DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md) | Ритуалы |

**GitHub Issue:** создать или привязать #TBD (tech debt sprint).

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana (**Vesnin** / Teamlead). План → код → CI green.

### Что сделать

1. **CI:** `yarn turbo run lint typecheck test build --continue` — зелёный (126/126 tasks). RAG: только `yarn workspace @membrana/rag-service test` (без `--full` index).
2. **Lint:** ноль warnings в `@membrana/device-board` (react-hooks/exhaustive-deps и др.).
3. **Issues audit:** manifest `docs/issues/manifests/github-issues-audit-2026-06-26.json` → `yarn issues:audit --dry-run` → отчёт; закрытие только с LGTM в manifest.
4. **Registry hygiene:** задачи с merged PR — `yarn task:archive <id>`; `yarn task:sync-readme`.
5. **Repo hygiene:** не коммитить `.env*`, playwright-report, test-results, `.sync-readme-out.txt`; лишние JSON в `device-board-scripts/` — в `%TEMP%` или удалить.
6. **Scripts:** `yarn test:scripts` green.
7. **Async L18–L19:** ветка `fix/async-v2-l18-l19-recording-detached` — тесты device-board green; при готовности — PR.

### Запрещено

- `yarn rag:index --full` без ключа пользователя.
- Менять `@membrana/core` / neural contract (спринт 5).
- Feature-работа cabinet/Studio host (спринт 2–3).

### Definition of Done

- [ ] Turbo lint + typecheck + test + build — green.
- [ ] device-board lint: 0 warnings.
- [ ] Issues audit manifest + dry-run отчёт в `docs/archive/`.
- [ ] `yarn test:scripts` green.
- [ ] OPEN sprint: [`docs/day-sprint/db3h-s1-tech-debt-2026-06-26/OPEN.md`](../day-sprint/db3h-s1-tech-debt-2026-06-26/OPEN.md) обновлён (фазы ✅/⏳).
- [ ] LGTM Teamlead.

---

## Фазы спринта

| Phase | Deliverable |
|-------|-------------|
| A | Baseline CI + lint device-board |
| B | Issues manifest + dry-run audit |
| C | Registry archive merged tasks + sync-readme |
| D | Repo hygiene + test:scripts |
| E | async-v2 L18–L19 PR ready (если в scope ветки) |
