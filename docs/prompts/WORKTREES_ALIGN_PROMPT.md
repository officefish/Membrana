# Промпт: worktrees:align — WIP-снимок грязных, merge вместо ff-only, авто-abort конфликта, отчёт

> **Task-промпт для агента-разработчика.** Размер: **M**. Процедура:
> [`membrana-local-sprint`](../procedures/membrana-local-sprint/README.md).
> Реестр: `id` = `worktrees-align` в [`docs/tasks/registry.json`](../tasks/registry.json).
> **GitHub Issue:** [#1738](https://github.com/officefish/Membrana/issues/1738)

## Этот файл — указатель, не вторая редакция

Предмет, обзор «что уже есть», границы, риски и DoD живут **в одном месте** —
в теле [#1738](https://github.com/officefish/Membrana/issues/1738). Здесь они не
повторяются: две копии контракта норму не усилят, а сделают непроверяемой (тот же
довод, что у указателя `.claude/CLAUDE.md` → `AGENTS.md`).

Нарезка на блоки — в `docs/sprint/cut/worktrees-align.json`, ратифицируется
`yarn sprint:cut`. След исполнения — `yarn sprint:gate`, прогноз↔исход —
`yarn sprint:experience`.

## Что читать перед кодом, по порядку

| Источник | Зачем |
|----------|-------|
| [#1738](https://github.com/officefish/Membrana/issues/1738) | предмет, границы, DoD, названные риски |
| [`docs/precedents/2026-07-24-align-all-worktrees-to-main.md`](../precedents/2026-07-24-align-all-worktrees-to-main.md) | повод задачи; там же оба открытых action item и Windows-ловушка с путями |
| `scripts/worktree-sync.mjs` · `scripts/lib/worktree-sync-check.mjs` | что уже построено — **переиспользуется, не переписывается** |
| `scripts/lib/classify-worktree.mjs` | **образец формы**: чистые функции без git/fs, io инъектируется, зубы на фикстурах |
| [`AGENTS.md`](../../AGENTS.md) → «Порядок обращения к инструменту» | прибор мастерской до разведочного поиска |

## Три вещи, которые ломают эту задачу быстрее прочих

1. **Проверять на живых деревьях нельзя.** Из грязных одно — canon `main` с
   незакоммиченной правкой `sample-window` трёх красных детекторов (HANDOFF 06.08),
   её разбор отложен владельцем. Зубы — на фикстурах, живой прогон — только `--dry-run`.
2. **Мутирующий прогон — под owner-гейтом, не по умолчанию.** Скрипт трогает чужие
   деревья; молчаливая мутация здесь дороже несделанной работы.
3. **Конфликт не разрешать автоматически.** Скрипт обязан упереться, откатить merge
   (проверив `MERGE_HEAD`) и позвать человека. Обоснование — в #1738, раздел «Вне предмета».

## Заметки постановщику

- После merge: отчёт в Issue → `yarn task:archive worktrees-align --notes "…"`.
- Соседний action item прецедента (union-драйвер на `sent-log.jsonl` и
  `insights/registry.json`) — **отдельная задача**, в этот спринт не втягивать.
