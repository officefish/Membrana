---
name: membrana-ship
description: >-
  One-shot review→merge для агента: git add -A → code-review --uncommitted → при LGTM →
  yarn pr:ship. Use when user says «зашипь», «смёржи с ревью», ship the change. Do NOT use
  for prod deploy (deploy:when-green) или закрытие задач (membrana-task-closure-review).
---

# Membrana ship — review → merge за один проход

Свернул ~15 ручных прогонов review→PR→merge из сессии 2026-07-08.

## Когда

- Изменение готово к мерджу; нужно провести через ревью и PR-флоу за один проход.

## Шаги

1. `git add -A` — чтобы `code-review --uncommitted` видел **untracked** файлы (иначе
   ревьюер решит «файлов нет в diff» — реальный кейс 2026-07-08).
2. `node scripts/code-review.mjs --uncommitted` — прочитать вердикт (Tier / P0–P2 / LGTM).
3. Исправить P0/P1; P2 — по возможности; при необходимости пере-ревью.
4. При **LGTM**: `yarn pr:ship --type <t> --scope <s> -m "<msg>" [--issue N] [--branch <b>] --execute`.
   - `pr:ship` по умолчанию `--dry-run` (печатает шаги), `--execute` — реально.
   - Гуард: отказ коммитить в `main` без `--branch`.
   - Уже на нужной ветке: `--branch` идемпотентен (не делает `checkout -b` повторно).
   - Артефакт ревью `docs/discussions/uncommitted-code-review.md` — в gitignore (не трекается).
5. Если в сессии остался **другой** незакрытый трек — перед ship новой темы
   напомни одной строкой (ветка / PR / merged), не смешивай диффы.

## Мердж — только через pr:ship (норма #700)

`gh pr merge --delete-branch` руками из feature-worktree **запрещён**: он чекаутит
base локально, а base почти всегда держит соседний worktree → команда падает
`fatal: '<base>' is already used by worktree at …` **после уже успешного merge**
(ложный красный; живой инцидент — закрытие #696 / PR #697). `pr:ship` кодирует
безопасный порядок (#653): merge без `--delete-branch`, remote-ветка отдельным
optional-шагом, ff-sync worktree-aware.

- PR **ещё нет** → полный `yarn pr:ship … --execute` (создаёт и мёржит).
- PR **уже открыт** (ревью прошло отдельно, closure-review) → `yarn pr:ship
  --merge-only --execute` — мёржит PR текущей ветки тем же безопасным хвостом.
- Если raw `gh` всё же неизбежен — факт мерджа проверять `gh pr view <N> --json
  state`, **а не по exit code** (код относится к пост-мердж уборке, не к мерджу).

## НЕ использовать

- Прод-деплой → `yarn deploy:when-green` (печатает команду) + ручной деплой.
- Закрытие задачи/эпика в реестре → `membrana-task-closure-review`.
- Только ревью без мерджа → `membrana-code-review`.
