---
name: membrana-branch-decompose
description: >-
  Decompose local + origin/* branches into 7 mutually exclusive hygiene categories
  (worktree-active, personas, baseline, in-flight open PR, experiment leftover,
  zombie, salvage) as markdown tables. Use when user says декомпозиция веток,
  hygiene categories, branch decompose, repo:branches:decompose, какие ветки
  zombie/salvage, разбор списка веток. Delegates to yarn repo:branches:decompose.
  Do NOT use for inventory-only tables (membrana-branch-audit / yarn repo:branches)
  or auto-delete (yarn repo:clean — only after human ok).
---

# Membrana branch decompose — 7 hygiene categories

Движок: `yarn repo:branches:decompose` → `scripts/repo-branches-decompose.mjs`
(чистые правила: `scripts/lib/repo-branches-decompose.mjs`).

Инвентарь ahead/behind/worktree — **тот же**, что у `yarn repo:branches`
(`collectInventory`); rev-list не переизобретать.

## Когда

- Нужна **декомпозиция** списка веток по гигиене (не сырой inventory).
- Перед ручной чисткой: увидеть zombie / salvage / leftover отдельно от персон и PR.
- Ответ на «что можно снести / что salvage / что в полёте».

## Когда НЕ

- Только ahead/behind таблицы → `membrana-branch-audit` / `yarn repo:branches`.
- Удалять ветки → `yarn repo:clean` **только после явного ok владельца**.
- Этот скилл **не** авто-удаляет. Персоны **никогда** не auto-delete.

## Workflow

1. `yarn repo:branches:decompose` — по умолчанию `git fetch origin`, затем markdown.
2. Опции: `--no-fetch` · `--json` · `--report <file>` · `--help`.
3. Прочитать: Taxonomy → Summary → семь category-таблиц.
4. Если `gh` недоступен — category 4 пуста (noted); open-PR heads fall through в 5/6/7.

## 7 категорий (first match wins)

| # | Category | Rule |
| --- | --- | --- |
| 1 | Worktree-активные | Worktree=yes **или** current branch |
| 2 | Персоны | `ozhegov`, `dynin`, `vesnin`, `boyarskiy` |
| 3 | Baseline / sync-якоря | `main` **или** `base/*` |
| 4 | Доставка в полёте | head открытого GitHub PR (`gh`) |
| 5 | Эксперимент leftover | `cowork/` `comp/` `codex/` `night/` + `parallel-persona*` + `chore/ritual-day*` |
| 6 | Застой / zombie | ahead==0 **или** remote `night-triage`/`claude*` без open PR |
| 7 | Salvage | remainder ahead>0 без open PR |

Sort: default behind DESC · cat.4 PR# DESC · cat.7 ahead DESC.
Remote twin с локальным тезкой не дублируется.

## Контракт таблиц

| Секция | Колонки |
|--------|---------|
| Summary | Category · Local · Remote · Total |
| Category 1–7 | Branch · Ahead · Behind · Bucket · Why/Note · Suggested action |

## Грабли

- **Не auto-delete** из этого отчёта — только классификация.
- **Персоны** никогда не в `repo:clean` execute без явного исключения канона (их там и так берегут).
- `git branch --merged` врёт при squash (#492) — не использовать.
- Sibling inventory: `membrana-branch-audit`. Sibling cleanup: `yarn repo:clean`.

## Registry / cache

Снимки реестра по категориям и deep analysis хранятся в контейнере
[`docs/audit/git/`](../../../docs/audit/git/) — канон агента:
[`docs/audit/git/AGENT_PROMPT.md`](../../../docs/audit/git/AGENT_PROMPT.md).
Scenario A → dated `registry/branches-by-category-YYYY-MM-DD.md` **и** overwrite
[`registry/branches-by-category.md`](../../../docs/audit/git/registry/branches-by-category.md);
Scenario B читает этот стабильный файл → `analysis/`. Этот скилл только классифицирует;
не подменяет контейнер.
