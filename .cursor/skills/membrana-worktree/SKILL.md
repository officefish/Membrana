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

   ```bash
   cd ../Membrana-<label> && yarn worktree:bootstrap
   ```

   **Штатный ответ на «как поднять свежее дерево» — этот глагол.** Сегодня он делает
   **свой `yarn install`** в дереве (умолчание `mode: 'install'`, канон #725) и копирует
   `.env` из primary; выбранный способ пишется в `WORKTREE.md`. Junction остался только
   за явным `--junction` и в `--help` назван анти-паттерном #725 (ломает Nest11/express
   resolve, прячет несобранные пакеты — 29.07: rag-service, пять e2e).

   _Прежняя редакция этого скилла говорила «bootstrap исторически делал junction — не
   опираться». Это устарело: инструмент переписан, отставал текст. Проверено 22.08
   живым `--dry-run` в дереве без модулей: `modules-install: yarn install …`._

   **Если install не проходит.** В песочнице агента `yarn install` иногда падает на
   создании связей воркспейсов (`EPERM: operation not permitted, symlink`) даже при
   `winLinkType: junctions`. Тогда выходов **два**, и оба честные:
   - выполнить установку из терминала владельца (та же команда, другие права);
   - **работать в дереве из канона, где модули уже есть** — и не гонять локальных судей
     здесь (см. ниже).

4. **Что можно делать в дереве БЕЗ установки, а что нельзя.** Установка нужна не всегда:
   задачи про документы, git и `pr:ship` обходятся без неё, и это законно — цель не
   «чтобы всегда всё было», а «чтобы агент знал, чего у него нет».
   - **можно:** правки документов, `git`, `gh`, `yarn pr:ship` (запускается как
     `node scripts/pr-ship.mjs`, если `yarn` недоступен), скрипты на голом node;
   - **нельзя доверять:** `vitest`, `tsc`, `turbo` — workspace-пакеты не резолвятся.
     `yarn`-обёртки судей откажут рано и назовут оба выхода (`yarn test`, `typecheck`).
   - **⚠ Одолженный бинарь соседнего дерева даёт ЛОЖНЫЙ ЗЕЛЁНЫЙ.** Запуск вида
     `node ../Membrana/node_modules/vitest/vitest.mjs run …` в дереве без установки
     проходит и печатает «✓ passed», хотя `require.resolve('@membrana/…')` в том же
     прогоне даёт `MODULE_NOT_FOUND`: зелёными выглядят ровно те тесты, что не трогали
     workspace-импорты, а остальные либо падают в глубине, либо судят пакеты **чужого**
     дерева (#725). Такой прогон **не является свидетельством** — гнать судей только в
     установленном дереве.
5. **Запустить сессию:** `cd ../Membrana-<label> && yarn claude:code` (proxy-aware).
6. **Работать изолированно.** Каждая сессия коммитит/пушит свою ветку — общего индекса нет,
   контаминация исключена.
7. **Смена трека mid-flight.** Перед новой задачей в том же чате — одной строкой:
   предыдущая ветка: uncommitted / PR открыт / merged. Не оставлять владельца
   спрашивать «а прошлую доделали?».
8. **Убрать по завершении:** `git worktree remove ../Membrana-<label>` (`--force` если грязный)
   → затем `git worktree prune`. Ветку мёржит/удаляет её собственный ship-флоу.

## Anti-patterns

- Вкладывать worktree ВНУТРЬ репо (`./tmp-wt`) — ломает turbo/globs/tooling; только sibling.
- Держать одну ветку в двух worktree (git откажет) или силой `checkout` под чужой активной
  сессией (сдёрнешь её работу).
- **Junction / symlink shared `node_modules`** (#725) — Nest11/express resolve ломается.
- **Одолженный бинарь из соседнего дерева** (`node ../Membrana/node_modules/…`) — даёт
  зелёный, ничего не значащий для этого дерева: ложное свидетельство хуже честной ошибки.
- Забыть `.env` / `yarn install` в новом worktree → «нет ключа»/«module not found».
- `git add -A`, когда в общем worktree лежит чужое (до изоляции) — коммить свои файлы поимённо.
- Оставить мёртвый worktree — периодически `git worktree prune`.

## Команды

```bash
git worktree list                                   # активные worktree
git worktree add ../Membrana-<label> <branch>       # существующая ветка
git worktree add -b feat/<topic> ../Membrana-<label> origin/main
cd ../Membrana-<label> && yarn worktree:bootstrap    # штатно: свой install + .env (#725)
cd ../Membrana-<label> && yarn install              # то же вручную, без копии .env
git worktree remove ../Membrana-<label>             # убрать (--force если грязный)
git worktree prune                                  # почистить записи мёртвых
```
