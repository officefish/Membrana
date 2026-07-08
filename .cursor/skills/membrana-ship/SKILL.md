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
   - Артефакт ревью `docs/discussions/uncommitted-code-review.md` — в gitignore (не трекается).

## НЕ использовать

- Прод-деплой → `yarn deploy:when-green` (печатает команду) + ручной деплой.
- Закрытие задачи/эпика в реестре → `membrana-task-closure-review`.
- Только ревью без мерджа → `membrana-code-review`.
