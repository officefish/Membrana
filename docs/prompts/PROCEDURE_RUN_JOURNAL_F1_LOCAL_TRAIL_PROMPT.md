# Промпт: F1: локальная лента прогона процедур

> **Task-промпт для агента-разработчика**.
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — минимальный локальный journal для прогонов процедур.
> Реестр: `id` = `procedure-run-journal-f1-local-trail`.

---

## Контекст

F1 — первый блок membrana-local-sprint `procedure-run-journal-2026-08-01`. Он закрывает
самую острую дыру: прогон процедуры должен оставить след, который называет не
только факт запуска, но и предмет покрытия. Если предмет не покрыт, gap должен
жить в журнале, а не в памяти сессии.

`run-ledger` уже реализован и даёт leaf hash / Merkle / checkpoint. F1 использует
только leaf hash как стабильный отпечаток записи; серверные подписи и consistency
proof — вне этой фазы.

---

## Промпт целиком

### Кто ты

Ты — координатор виртуальной команды Membrana. Ведущий F1 — **Dynin**. Держи
границы: локальная лента, pure Node scripts, без новых зависимостей.

### Что построить

1. `docs/procedure-runs/README.md` — дом и контракт JSONL.
2. `scripts/lib/procedure-run-journal.mjs`:
   - `buildProcedureRunRecord(input, opts)`
   - `validateProcedureRunRecord(record)`
   - `appendProcedureRunRecord(repoRoot, trailRelPath, record)`
   - `readProcedureRunTrail(repoRoot, trailRelPath)`
   - `summarizeProcedureRunTrail(records)`
3. `scripts/procedure-run-journal.mjs`:
   - `append`
   - `check`
   - `report`
4. `package.json`: `procedure-run:journal`.
5. `scripts/procedure-run-journal.test.mjs`.

### Контракт записи

Минимальная запись:

```json
{
  "schema": "procedure-run-journal@1",
  "sequence": 1,
  "at": "2026-08-01T05:00:00.000Z",
  "runId": "ritual-evening-2026-08-01",
  "procedureId": "ritual-evening",
  "status": "blocked",
  "subject": "delivery frame covered generated artifacts",
  "coverage": {
    "evidence": [],
    "gaps": ["bridge digest missing"]
  },
  "ledger": {
    "algorithm": "run-ledger.leafHash@1",
    "leafHash": "..."
  }
}
```

`status=pass` без `coverage.evidence[]` запрещён.

### Definition of Done

- [ ] Record builder валидирует required-поля и status enum.
- [ ] `pass` без evidence запрещён.
- [ ] `blocked/fail/skipped` могут нести named gaps.
- [ ] JSONL append/read работает.
- [ ] Report печатает gaps поимённо.
- [ ] `node --test scripts/procedure-run-journal.test.mjs` зелёный.

### Out of scope

- Проверка существования файлов evidence.
- Серверный checkpoint и ключи.
- Интеграция в `ritual-evening-run.mjs`.

---

## Acceptance criteria

- [ ] Тесты F1 проходят offline.
- [ ] Новых npm-зависимостей нет.
- [ ] CLI usable через `node scripts/procedure-run-journal.mjs`.
