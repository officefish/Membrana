# CONTRIBUTING — Membrana

Точка входа для агентов: [`AGENTS.md`](./AGENTS.md). Здесь — то, что относится к
устройству репозитория как общего ресурса четырёх агентов.

## Git-гигиена worktree (канон #717)

- Топология: 5 канонических деревьев `main/tooling/product/codex/cursor`, каждое
  на своей базовой ветке (`main`, `base/*`) — mandatory-lock от git. Любой спринт —
  в собственной ветке от свежего `main`, база прямых коммитов не принимает.
- В корне каждого дерева — карточка `WORKTREE.md` (kind `canon|sprint`) и advisory
  `.worktree-owner`; `yarn worktree:bootstrap` пишет карточку атомарно.
- **`git gc` запрещён** во всех деревьях, кроме main-checkout, и только руками:
  на репозитории выставлен `gc.auto 0` (общий объектный стор + 4 конкурентных
  агента; авто-gc в одном дереве рвёт объекты под ногами остальных).
- Гигиена: `yarn worktree:sync` (синхрон баз, авто только ff), `yarn repo:clean`
  (снос только класса `sprint-closed`, руками). Словарь классов:
  [`docs/WORKTREE_CLASSES.md`](./docs/WORKTREE_CLASSES.md).

## CI & Testing

**Зелёный мердж-гейт не означает, что прогнан весь набор.** Мердж блокирует выборочный
прогон, полный корпус идёт ночью ([ADR-0018](./docs/adr/ADR-0018-tests-container-selective-gate-nightly-full.md)).
Корпусов два — `scripts-gate` (файлы `scripts/**/*.test.mjs`) и `vitest-gate` (пакеты
`packages/*`, `apps/*`), и «test gate» без уточнения означает разное.

Таблица ярусов, признак яруса smoke и адрес отчёта «что не гонялось» — в
[`docs/CONTRIBUTING.md` → «CI & Testing: два яруса, два корпуса»](./docs/CONTRIBUTING.md#ci--testing-два-яруса-два-корпуса).
Здесь только указатель: вторая редакция расхождением норму бы не усилила.
