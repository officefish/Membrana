---
name: membrana-worktree
description: >-
  Create an isolated git worktree for a parallel Claude/Cursor/Codex session so two
  sessions don't collide on one checkout (a session switching branches or running
  `git add -A` can hijack/contaminate the other's uncommitted work). Use when user says
  отдельный worktree, параллельная сессия, разведи сессии, изолируй сессию, magistral +
  enabler параллельно, run two sessions at once, isolated checkout. Do NOT use for
  single-session persona-branch policy (TASKS_MANAGEMENT §7а) or ordinary branching.
---

# Membrana worktree — изоляция параллельной сессии

Свернул инцидент 2026-07-09: insight-трек `team-stack-watch` и магистраль
`detection-ensemble-service` работали в **одном** worktree — магистраль переключила
ветку, стейджинг insight-трека слетел, untracked-доки рисковали попасть в чужой
`git add -A`. Один checkout = одна ветка/индекс на всех.

Канон веток: [`TASKS_MANAGEMENT.md` §7а](../../../docs/TASKS_MANAGEMENT.md).

## When to use

- Запускаешь **вторую** сессию (магистраль + enabler, два трека дня) на том же репо.
- Нужен изолированный checkout, чтобы переключения веток / `git add -A` не пересекались.

## When NOT to use

- Одна сессия, обычная работа на ветке персоны/feature → просто `git checkout`.
- Разведение задач по персонам в одной сессии → `TASKS_MANAGEMENT` (не worktree).

## Ключевой принцип

**Одну ветку нельзя держать в двух worktree** (git запретит). Значит второй сессии —
**своя ветка** в **своём каталоге**. Каталог — sibling ВНЕ репо, не вложенный.

## Шаги

1. **Проверить занятость.** `git worktree list` — какие ветки уже в worktree.
   `git branch --show-current` — где основная сессия.
2. **Создать worktree** (каталог-сосед, напр. `../Membrana-<label>`):
   - существующая ветка: `git worktree add ../Membrana-<label> <branch>`
   - новая ветка: `git worktree add -b feat/<topic> ../Membrana-<label> main`
   - персона-ветка (если основная сессия НЕ на ней): `git worktree add ../Membrana-dynin dynin`
3. **Bootstrap нового worktree** (рабочий каталог отдельный, НЕ разделяется):
   - `.env` → скопировать из primary (gitignore).
   - `node_modules` → **per-worktree `yarn install`** (Yarn cache ускоряет).
   Shared junction/symlink на чужой `node_modules` — **anti-pattern** (#725):
   ломает Nest11/express resolve. Не заводить новый bootstrap «с junction».
   (`yarn worktree:bootstrap` исторически делал junction — не опираться на это
   как на канон; follow-up #705 = install, не junction.)
4. **Запустить сессию:** `cd ../Membrana-<label> && yarn claude:code` (proxy-aware).
5. **Работать изолированно.** Каждая сессия коммитит/пушит свою ветку — общего индекса нет,
   контаминация исключена.
6. **Смена трека mid-flight.** Перед новой задачей в том же чате — одной строкой:
   предыдущая ветка: uncommitted / PR открыт / merged. Не оставлять владельца
   спрашивать «а прошлую доделали?».
7. **Убрать по завершении:** `git worktree remove ../Membrana-<label>` (`--force` если грязный)
   → затем `git worktree prune`. Ветку мёржит/удаляет её собственный ship-флоу.

## Anti-patterns

- Вкладывать worktree ВНУТРЬ репо (`./tmp-wt`) — ломает turbo/globs/tooling; только sibling.
- Держать одну ветку в двух worktree (git откажет) или силой `checkout` под чужой активной
  сессией (сдёрнешь её работу).
- **Junction / symlink shared `node_modules`** (#725) — Nest11/express resolve ломается.
- Забыть `.env` / `yarn install` в новом worktree → «нет ключа»/«module not found».
- `git add -A`, когда в общем worktree лежит чужое (до изоляции) — коммить свои файлы поимённо.
- Оставить мёртвый worktree — периодически `git worktree prune`.

## Команды

```bash
git worktree list                                   # активные worktree
git worktree add ../Membrana-<label> <branch>       # существующая ветка
git worktree add -b feat/<topic> ../Membrana-<label> origin/main
cd ../Membrana-<label> && yarn install              # per-wt modules (#725)
git worktree remove ../Membrana-<label>             # убрать (--force если грязный)
git worktree prune                                  # почистить записи мёртвых
```
