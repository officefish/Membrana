# Closure: worktree-hygiene-order

| Field | Value |
|---|---|
| acceptedBy | druid (владелец, Teamlead-LGTM в чате 2026-07-20) |
| headRev | c5d2e966266f0ad849f91583df4a99729f7992cc |
| githubIssue | 717 |
| linear | DRU-234 (биекция сохранена, дублей не создано) |
| pr | 743 |
| sprintKind | day-sprint (новый движок задач, не registry.json) |

## DoD 5/5

1. **Разовая чистка** — worktree 35→17, локальные ветки 171→57, origin 126→45
   (два прогона по слову владельца; отчёты `repo:clean --report` в `%TEMP%` сессии).
2. **Карточки + gc** — `WORKTREE.md` в 5 канонических корнях + бэкфилл, `.worktree-owner`,
   `gc.auto 0` (общий конфиг), `CONTRIBUTING.md`, ветки `base/*` (mandatory-lock).
3. **K2** — `scripts/lib/classify-worktree.mjs` (5 классов, 17 тестов); потребители
   `repo:clean` + `pr:ship`; гейт «нет хвостов» шагом `ritual:day`; `worktree:bootstrap`
   пишет карточку атомарно.
4. **K1 (ADR-0014)** — `scripts/lib/worktree-sync-check.mjs` (12 тестов) +
   `yarn worktree:sync`; авто только `--ff-only` в canon; шаг `ritual:day`;
   пороги в `scripts/worktree-sync.config.json`.
5. **Словарь** — `docs/WORKTREE_CLASSES.md` (две оси, связь, регистрация/владение).

## Хвосты владельцу (вне DoD, названы в #717)

- `main` держит `Membrana-detector-compare`, главный checkout стоит на task-ветке — инверсия канона.
- 2 detached-дерева (`sec-main-drift`, `tooling-needs-720`) — разбор руками.
- Миграция канонических деревьев на свои `base/*` — за владельцами деревьев.
