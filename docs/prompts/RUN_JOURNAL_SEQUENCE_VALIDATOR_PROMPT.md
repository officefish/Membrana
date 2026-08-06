# Промпт: Валидатор монотонности sequence внутри runId — проверка уровня ленты журнала

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **S**.
> Ожидаемый артефакт: **1 PR** — лента, написанная мимо `nextSequenceOf`, судится,
> а не принимается на веру.
> Реестр: `id` = `run-journal-sequence-validator` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Follow-up P1 из ревью 03.08 (PR #1682, первый живой шот): в ленте шота
`close-stale-issues` замечены `sequence: 1, 1, 2` у одного runId — библиотека
`scripts/lib/procedure-run-journal.mjs` валидирует **запись**, но не **ленту**: повтор
номера внутри runId не ловится ничем. Механизм `nextSequenceOf` (после #1680 — один
проход; после #1694 — порядковый матчинг open/close и уникализация runId `-rN`) выдаёт
корректные номера, но судить уже написанную ленту нечем.

Шот 04.08 по этой находке отказан предикатом S честно (`capability_chaining`:
8 выстрелов / 236 строк цепочки в семье `scripts/lib` при порогах 3 / 200) — потому
карточка; маршрут выбран владельцем. Прецедент отказа:
[`2026-08-04-oneshot-1683-refusal-chain.md`](../precedents/drafts/2026-08-04-oneshot-1683-refusal-chain.md).
Вести **вместе с** `sprint-dictionary-to-lib` (#1681) одним локальным спринтом узла
журнала, на свежем контракте после #1694.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`docs/procedure-runs/README.md`](../procedure-runs/README.md) | Канон журнала: `pass` без evidence запрещён |
| Issue [#1683](https://github.com/officefish/Membrana/issues/1683) | Полная формулировка, вещдок дубля |
| Issue [#1681](https://github.com/officefish/Membrana/issues/1681) | Парный долг того же узла |

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план (1–2 абзаца + список файлов).

---

### Что построить

1. Проверка уровня ленты (рядом с `summarizeProcedureRunTrail` или в семействе
   `validateProcedureRunRecord`): `sequence` внутри runId строго возрастает; дубль
   номера — **находка** с адресом (runId, номера, строки), как `ledger.leafHash`.
2. Врезка в `yarn procedure-run:journal check` — существующий CI-вход ленты.

**Запрещено:**

- Чинить ленту молча (валидатор судит, не переписывает).
- Второе понятие sequence: судится контракт `nextSequenceOf`, не новая нумерация.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Валидатор | Дубль `1,1,2` (вещдок 03.08) — находка; корректная лента — чисто; несколько runId в одной ленте различаются |
| CLI | `procedure-run:journal check` красный на ленте с дублем |

---

### Definition of Done

- [ ] Дубль sequence внутри runId ловится проверкой ленты; вещдок-лента 03.08 судится.
- [ ] `node --test scripts/procedure-run-journal.test.mjs` — зелёный.
- [ ] LGTM Teamlead.

---

### Out of scope

- Кросс-файловый счёт при явном `--run` через границу дней (конспект Веснина) — та же
  семья, отдельный блок.
- Переезд словаря спринта (#1681) — парный блок того же спринта, не этот PR.

---

## Заметки для человека-постановщика

1. Issue [#1683](https://github.com/officefish/Membrana/issues/1683) уже существует.
2. Запись в `docs/tasks/registry.json` — `run-journal-sequence-validator`, `status: active`.
3. После merge: отчёт в Issue → `yarn task:archive run-journal-sequence-validator --notes "…"`.

### Проверка после PR

```bash
node --test scripts/procedure-run-journal.test.mjs
yarn procedure-run:journal check --trail docs/procedure-runs/trail/2026-08-03.jsonl
```

---

## Связь с дорожной картой

- Узел журнала прогонов (ADR-0022 «событие вместо мутации»; родня #1694).
