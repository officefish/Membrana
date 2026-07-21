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
