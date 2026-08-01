# Промпт: Membrana Local Sprint: журнал прогона процедур

> **Task-промпт для агента-разработчика**.
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **L**.
> Ожидаемый артефакт: **1 membrana-local-sprint** — локальная лента F1 сейчас, далее провод в реальные процедуры.
> Реестр: `id` = `procedure-run-journal-2026-08-01`.

---

## Контекст

Хендоф 2026-08-01 назвал первый приоритет: **журнал прогона процедур**. Дефект дня
31.07: механизмы показывали, что шаг отработал, но не проверяли, что шаг покрыл
свой предмет. Результат — находки пропадали вместе с временными файлами, ревью
не видело магистраль дня, доставка вечера краснела на собственном дефекте.

В репозитории уже есть `run-ledger`: Merkle/Ed25519-цепь для доказуемой истории.
Этот спринт не переписывает её. Он добавляет прикладной execution trail: запись
`procedureId/runId/status/subject/evidence/gaps`, которую можно предъявить до
появления полноценного проигрывателя процедур.

**Связанные документы:**

| Документ | Зачем |
|----------|-------|
| [`HANDOFF.md`](../HANDOFF.md) | Приоритет и формулировка дефекта |
| [`docs/procedures/membrana-local-sprint`](../procedures/membrana-local-sprint/README.md) | Процедура ведения этого спринта |
| [`docs/procedures/README.md`](../procedures/README.md) | Разница: определения процедур vs инстансы |
| [`RUN_LEDGER_PROMPT.md`](./RUN_LEDGER_PROMPT.md) | Предыдущий криптографический слой |
| [`scripts/lib/run-ledger/README.md`](../../scripts/lib/run-ledger/README.md) | Что уже есть и не пишется заново |

**GitHub Issue:** — (локальный старт без Issue).

---

## Промпт целиком

### Кто ты

Ты — координатор виртуальной команды Membrana. Ведущий — **Vesnin**; F1 держит
**Dynin**, потому что предмет — форма записи, инварианты и тесты. Соблюдай
`membrana-local-sprint`: это local sprint instance, не одиночная задача.

### Что построить

Открыть membrana-local-sprint `procedure-run-journal-2026-08-01` и провести первую фазу:

1. **F1 local trail** — `docs/procedure-runs/trail/*.jsonl` + CLI append/check/report.
2. Запись должна называть предмет покрытия (`subject`), evidence и gaps.
3. `pass` без evidence запрещён.
4. Запись получает `run-ledger` leaf hash, но не выдаёт себя за серверный checkpoint.

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Дом инстансов | `docs/procedure-runs/` | README + будущие JSONL trails |
| Библиотека | `scripts/lib/procedure-run-journal.mjs` | build/validate/read/summarize |
| CLI | `scripts/procedure-run-journal.mjs` | append/check/report |
| Тесты | `scripts/procedure-run-journal.test.mjs` | offline node:test |
| Sprint instance | `docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md` | OPEN и фазы |

### Definition of Done

- [ ] Эпик и F1-фаза зарегистрированы в `docs/tasks/registry.json`.
- [ ] `OPEN.md` membrana-local-sprint создан; `LOCAL_SPRINT_ACTIVE.md` обновлён.
- [ ] Локальный trail умеет append/check/report.
- [ ] `pass` без evidence падает тестом.
- [ ] Summary называет gaps поимённо.
- [ ] `node --test scripts/procedure-run-journal.test.mjs scripts/run-ledger.test.mjs` зелёный.

### Out of scope

- Серверный архив прогонов.
- Автоматический проигрыватель процедур.
- Подпись checkpoint приватным ключом сервера.
- Провод во все существующие процедуры за один PR.

---

## Acceptance criteria

- [ ] Есть локальный JSONL-home для procedure run trail.
- [ ] CLI проверяет записи и печатает report.
- [ ] Leaf hash строится через существующий `run-ledger`.
- [ ] Membrana Local Sprint OPEN/ACTIVE/LOG отражают старт.

## Заметки для человека-постановщика

Закрытие: после PR и LGTM архивировать F1, затем эпик либо закрыть, либо оставить
с явными F2/F3.
