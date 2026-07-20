# WORKTREE_HYGIENE_ORDER — task-промпт

> **Единица счёта:** GitHub-issue (удостоверение). Контейнер движения — Linear (DRU/Membrana).
> Ответственный: **Ozhegov (Структурщик)**; `classifyWorktree` — **Dynin (Математик)**;
> отчёт/баннер — **Rodchenko (Верстальщик)**.
> Размер: **M** · sprintKind: day-sprint · Ветка: своя от свежего `main`.

## Зачем

Навести порядок в ветках/деревьях под 4 агентами (2 Claude + Codex + Grok) на одной
машине с одним проектом. На 20.07 — 33 worktree, гигиена держится «руками, периодически».
Решения уже приняты и не пересматриваются — это **чистое исполнение**:

- Ядро: консилиум `tier2-git-hygiene-multi-agent-2026-07-20.md`.
- Lifecycle/teardown (K2): `worktree-hygiene-gaps-m1-lifecycle-2026-07-20.md`.
- Синхрон базы (K1): [`ADR-0014`](../adr/ADR-0014-worktree-base-branch-sync.md).

## Канон топологии (норма, не предмет спора)

5 канонических деревьев: `main` (ритуалы/штормы), `tooling` (scripts/docs/CI),
`product` (apps/packages), `codex` (саппорт Codex), `cursor` (саппорт Grok). У каждого
своя базовая ветка; **спринт всегда уходит в собственную ветку** — база не принимает
прямых спринт-коммитов. Разные базы = mandatory-lock git. `|writers(worktree)| ≤ 1`.

## Definition of Done (5 пунктов — один спринт)

1. **Разовая чистка.** 33 дерева → 5 канонических. `repo:clean --execute --worktrees`
   (истина = состояние PR, squash слепит `--merged`). Отчёт до/после в закрытии.
2. **Карточки и gc.** `WORKTREE.md` в каждом каноническом корне (поле `kind: canon|sprint`,
   базовая ветка, владелец, «gc запрещён кроме main», «install свой») + advisory
   `.worktree-owner` (имя агента + timestamp). `git config gc.auto 0` на репо + строка в
   `CONTRIBUTING.md`. Каноническое множество закрыто и перечислимо.
3. **Teardown-предикат (K2).** Чистая функция `classifyWorktree(w) → {class, reasons[]}` в
   `scripts/lib/`: классы `canon` / `sprint-closed` (`sprint ∧ prClosed`: ¬uncommitted ∧
   ¬unpushed ∧ prState∈{merged,closed}) / `sprint-open` / `unregistered`; сеть-ошибка `gh`
   → `unknown` (не сносить). Юнит-тесты на все классы. `repo:clean` и merge-гейт — её
   **потребители** (без дублирования логики). Гейт «нет хвостов» = `repo:clean --dry-run`
   шагом `ritual:day` (report), `--execute` руками. `repo:clean --report` — таблица
   path/branch/class/reasons, `unknown` отдельной строкой.
4. **Синхрон базы (K1, ADR-0014).** `scripts/lib/worktree-sync-check.mjs` — чистая функция
   после `git fetch`: классы `fresh`/`ff-able`/`diverged`/`dirty`, метрики против
   `origin/main`, время/сеть — параметры (детерминизм, юнит-тесты). `scripts/worktree-sync.mjs`
   + `yarn worktree:sync`: авто **только** `git merge --ff-only` при `ff-able` (громкий лог);
   `diverged`/`dirty` — только сигнал, без мутации (`|writers|≤1`). Находка расхождения ≠
   ненулевой exit. Шаг в `ritual:day`. Список деревьев — из носителя п.3, `main` исключён.
   Пороги (`behind≥10`, `age≥7дн`) — в конфиге.
5. **Единый словарь классов.** Свести таксономию lifecycle (п.3: `canon/sprint-*`) и синхрона
   (п.4: `fresh/ff-able/...`) в один непротиворечивый словарь (P2 ревью), задокументировать.

## Ограничения

- Только `scripts/` + docs + git-config; `packages/*` не трогать (границы пакетов).
- Не вводить новый core-контракт/узел палитры (если вскроется — эскалация в консилиум, не тихо).
- `repo:clean --execute --worktrees` — деструктивно: сначала `--dry-run`, показать владельцу список под снос, снести по слову.
- ADR-0014 действует после LGTM владельца (сейчас DRAFT).

## Гейт закрытия

Teamlead LGTM · `docs:lint` + затронутые тесты зелёные · closure с exact-SHA · биекция
GitHub-issue ⟺ Linear-под-задача сохранена.
