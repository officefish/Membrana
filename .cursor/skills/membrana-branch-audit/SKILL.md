---
name: membrana-branch-audit
description: >-
  Inventory local + origin/* branches vs origin/main as markdown tables (full tip SHA,
  base SHA, generatedAt, ahead/behind, buckets, current + worktree marks). Use when user
  says аудит веток, inventory branches, ahead/behind vs main, какие ветки отстали,
  repo:branches, branch audit. Do NOT use for deleting dead branches (yarn repo:clean /
  membrana-worktree teardown) or single-branch freshness before PR (yarn branch:check-base).
---

# Membrana branch audit — инвентарь веток

Движок: `yarn repo:branches` → `scripts/repo-branches.mjs`.

Контракт вывода — **markdown-таблицы** (не списки, не самописный grep).

## Когда

- Нужна картина локальных и `origin/*` веток относительно `origin/main`.
- Перед чисткой (`repo:clean`) или разбором «что отстало / разошлось».
- Соседние worktree заняли ветки — увидеть колонку Worktree.

## Когда НЕ

- Удалять мёртвые ветки → `yarn repo:clean` (истина — состояние PR, не ancestry).
- **Декомпозиция по гигиене** (7 категорий: worktree / персоны / baseline / in-flight / leftover / zombie / salvage) → `membrana-branch-decompose` / `yarn repo:branches:decompose`.
- Проверить одну feature-ветку перед ревью → `yarn branch:check-base`.
- Создать изолированный checkout → `membrana-worktree`.

## Workflow

1. `yarn repo:branches` — по умолчанию `git fetch origin`, затем таблицы в stdout.
2. Опции: `--no-fetch` · `--json` · `--report <file>` · `--help`.
3. Зафиксировать `baseSha` / `generatedAt`, затем прочитать три секции:
   Local branches · Remote origin/* · Buckets summary.
4. Не изобретать обход: `git worktree list` уже внутри скрипта; самописный grep
   про worktree **запрещён** (грабля AGENTS — соврал 16.07).

## Контракт таблиц

| Секция | Колонки |
|--------|---------|
| Local branches | Branch · Tip · Ahead · Behind · Bucket · Current · Worktree |
| Remote origin/* | Branch · Tip · Ahead · Behind · Bucket · Worktree |
| Buckets summary | Bucket · Local · Remote |

- `ahead` = `rev-list --count origin/main..BRANCH`
- `behind` = `rev-list --count BRANCH..origin/main`
- бакеты: `sync` (0/0), `ahead-only`, `behind-only`, `diverged`
- `origin/HEAD` исключён из remote-списка

## Грабли (не повторять)

- **`git branch --merged` врёт** при squash-мёрже (#492) — не использовать для
  «влитости» и не чистить по нему.
- **Персона-ветки** (`vesnin`, `ozhegov`, `boyarskiy`, `dynin`, …) никогда не
  авто-удалять — канон TASKS_MANAGEMENT §7а; `repo:clean` их бережёт.
- Чистка ≠ инвентарь: этот скилл только показывает; удаление — `repo:clean`.
- Гигиена-декомпозиция (7 категорий) — соседний скилл `membrana-branch-decompose`, не этот.
- Исполнение уже ратифицированного ledger — `membrana-branch-salvage`, не этот скилл.
