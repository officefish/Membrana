# Промпт: Пересборка PR #1613: контракт EXECUTION_PROCEDURE + procedureKind поверх свежего main (pr:recreate)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — пересборка живого контента #1613 от свежего main;
> старый PR закрывается superseded после мерджа.
> Реестр: `id` = `recreate-execution-procedure-interface` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

PR #1613 несёт **живой непокрытый** контент — недостающее звено ADR-0021
(ACCEPTED 01.08, «род процедуры — два закрытых списка»): контракт
`docs/procedures/EXECUTION_PROCEDURE.md` + derivation report, поле `procedureKind`
в `docs/procedures/registry.json` (в стволе — 0 вхождений), контейнер процедуры
`adr`, зуб в `validateProcedure` (контракт применяется только к роду «разработка»).
Ствол уже **свесил провод в пустоту**: после #1650 `scripts/lib/mintlify-workflow-docs.mjs`
рендерит `**Род:** ${procedureKind}`, а зуб тестирует страницу `id: 'adr'` — поля и
процедуры в реестре нет.

Мержить нельзя: база ветки (`codex/hackathon-procedure`) влита сквошем (#1607),
ветка 82 позади main, `git merge-tree` даёт 10 конфликтов, среди них **append-only
лента** `docs/procedure-runs/trail/2026-08-01.jsonl` — конфликтующий блок переносить
запрещено (ADR-0022), только дописывать новой записью.

Вердикт ревизии PR 04.08 (membrana-pr-audit, слово владельца): **needs-work → pr:recreate**.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| PR [#1613](https://github.com/officefish/Membrana/pull/1613) | Исходный контент + полные ревью-свидетельства (ozhegov/vesnin v1→v2/dynin/angelina) — переносимы |
| [`docs/adr/ADR-0021-procedure-kind-two-closed-lists.md`](../adr/ADR-0021-procedure-kind-two-closed-lists.md) | Канон рода процедуры |
| [`docs/prompts/EXECUTION_PROCEDURE_INTERFACE_2026_08_01_PROMPT.md`](./EXECUTION_PROCEDURE_INTERFACE_2026_08_01_PROMPT.md) | Исходная постановка |
| [`scripts/pr-recreate.mjs`](../../scripts/pr-recreate.mjs) | Механика пересборки |

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin**
(держатель карточки; контракты процедур — его предмет). Перед кодом — краткий план.

---

### Что построить

1. `yarn pr:recreate 1613` — новая ветка от свежего `origin/main`.
2. Перенести 4 чистых артефакта: `docs/procedures/EXECUTION_PROCEDURE.md`,
   derivation report, `docs/procedures/adr/{MANIFEST.json,README.md}`.
3. `procedureKind` применить ко **всем актуальным** записям `docs/procedures/registry.json`
   (в стволе их уже больше, чем в PR — раскладка по родам пересчитывается и заново
   заверяется, цифры корпуса из тела PR не переносить слепо).
4. Проекции регенерить скриптами, не руками: `REGISTRY.md`, `docs/tooling-atlas/registry/ATLAS.md`,
   `apps/docs-harness/tooling/containers.mdx`.
5. Зуб `validateProcedure` на род — перенести и прогнать на актуальном реестре.
6. Ленту `docs/procedure-runs/trail/` — только дописывать новой записью.

**Запрещено:** force-push старой ветки; перенос конфликтующего блока append-only
ленты; слепой перенос счётчиков корпуса.

---

### Definition of Done

- [ ] `procedureKind` у каждой записи реестра; `validateProcedure` зелёный.
- [ ] Проекции регенерены скриптами, диффы совпадают с генератором.
- [ ] Ревью-свидетельства из #1613 перенесены/сослались; новое ревью тимлида — LGTM.
- [ ] После мерджа: старый #1613 закрыт superseded со ссылкой на новый PR.

---

### Out of scope

- Новые рода сверх двух закрытых списков ADR-0021.
- Изменения механики `procedure-run-journal` (узел закрыт спринтами 04.08).

---

## Заметки для человека-постановщика

1. Issue не заводится (`--no-issue`): у работы уже есть носитель — PR #1613.
2. После merge: `yarn task:archive recreate-execution-procedure-interface --notes "…"`.

### Проверка после PR

```bash
node --test scripts/validate-procedure.test.mjs
yarn pr:verify <новый-N>
gh pr view 1613 --json state   # CLOSED после закрытия superseded
```

---

## Связь с дорожной картой

- ADR-0021 (род процедуры); каркас процедур (ADR-0015, ADR-0022).
