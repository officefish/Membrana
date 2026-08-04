# Промпт: Переезд словаря спринта в scripts/lib + структурный orphanedBy через closeProcedureRun

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **S**.
> Ожидаемый артефакт: **1 PR** — словарь прогона спринта живёт в lib, кросс-файловое
> ленивое закрытие несёт машинную ссылку.
> Реестр: `id` = `sprint-dictionary-to-lib` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Класс acts-trail-reader (#1638): `scripts/execution-gate.mjs` импортирует
`SPRINT_PROCEDURE_ID` и `sprintTrailRelPath` из `scripts/sprint-cut-check.mjs` — связь
скрипт-к-скрипту, «тайное API». Появилась честно: open и close прогона спринта обязаны
выводить один путь ленты из одного поля (`ratification.at`), а зона блока sprint-producer
(спринт `run-journal-producer`, ратифицирован 03.08) lib не включала. Найдено ревью
PR #1680 (P1, условный BLOCK); ревьюер #1685 просил «ближайший спринт».

Второй долг того же узла: кросс-файловое ленивое закрытие в
`scripts/procedure-run-record.mjs` несёт ссылку на вытеснившую запись **строкой в
evidence** — структурный `orphanedBy` требует проноса поля через `closeProcedureRun`
(тоже lib). Внутрифайловое ленивое закрытие поле уже несёт (вещдок: записи
`orphanedBy: {runId, sequence}` в ленте 04.08).

Шот 04.08 по этой находке отказан предикатом S честно (`capability_chaining`:
8 выстрелов / 306 строк цепочки в семье `scripts/lib` при порогах 3 / 200) — потому
карточка; маршрут выбран владельцем. Прецедент отказа:
[`2026-08-04-oneshot-1681-refusal-chain.md`](../precedents/drafts/2026-08-04-oneshot-1681-refusal-chain.md).
Вести **вместе с** `run-journal-sequence-validator` (#1683) одним локальным спринтом
узла журнала; естественное место — рядом с ADR схемы журнала @1.1
(`runPhase`/`friction`/`amends`/`orphanedBy`), который ждёт слова владельца.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`docs/procedure-runs/README.md`](../procedure-runs/README.md) | Канон журнала прогонов |
| [`docs/procedures/membrana-local-sprint/README.md`](../procedures/membrana-local-sprint/README.md) | Процедура спринта, движки sprint:cut / sprint:gate |
| Issue [#1681](https://github.com/officefish/Membrana/issues/1681) | Полная формулировка долга |
| Issue [#1683](https://github.com/officefish/Membrana/issues/1683) | Парный долг того же узла |

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план (1–2 абзаца + список файлов).

---

### Что построить

1. Словарь прогона спринта (`SPRINT_PROCEDURE_ID`, `sprintTrailRelPath`, при
   необходимости `readActsTrail`-реэкспорт) переезжает из `scripts/sprint-cut-check.mjs`
   в модуль `scripts/lib/` (кандидат — `scripts/lib/sprint-cut/` или рядом с
   `procedure-run-journal.mjs`); `sprint-cut-check.mjs` и `execution-gate.mjs` импортируют
   из lib, импорт скрипт-к-скрипту умирает.
2. `closeProcedureRun` проносит структурный `orphanedBy` для кросс-файлового ленивого
   закрытия в `procedure-run-record.mjs` — ссылка на вытеснившую запись полем
   `{runId, sequence}`, не строкой в evidence.

**Запрещено:**

- Второй экземпляр словаря (переезд, не копия).
- Подъём схемы журнала без явного слова владельца об ADR @1.1 (валидатор лишних ключей
  не отвергает — поле проходит в контракте @1).

---

### Тесты

| Область | Минимум |
|---------|---------|
| Словарь | `sprint:cut` и `sprint:gate` выводят один путь ленты из одного поля (существующие зубы обоих скриптов зелёные) |
| orphanedBy | Кросс-файловое ленивое закрытие: поле `orphanedBy` присутствует и валидно; строка-ссылка в evidence больше не единственный носитель |

---

### Definition of Done

- [ ] Импорт `execution-gate.mjs` → `sprint-cut-check.mjs` отсутствует.
- [ ] Кросс-файловое ленивое закрытие несёт структурный `orphanedBy`.
- [ ] `node --test` затронутых семей — зелёный; `yarn procedure-run:journal check` — ок.
- [ ] LGTM Teamlead.

---

### Out of scope

- Валидатор монотонности `sequence` (#1683) — парный блок того же спринта, не этот PR.
- Содержательный ADR схемы @1.1 — отдельный артефакт по слову владельца.

---

## Заметки для человека-постановщика

1. Issue [#1681](https://github.com/officefish/Membrana/issues/1681) уже существует.
2. Запись в `docs/tasks/registry.json` — `sprint-dictionary-to-lib`, `status: active`.
3. После merge: отчёт в Issue → `yarn task:archive sprint-dictionary-to-lib --notes "…"`.

### Проверка после PR

```bash
node --test scripts/sprint-cut-check.test.mjs scripts/execution-gate.test.mjs scripts/procedure-run-record.test.mjs
yarn procedure-run:journal check
```

---

## Связь с дорожной картой

- Узел журнала прогонов (спринт `run-journal-producer`, ADR-0022 «событие вместо мутации»).
