---
name: membrana-git-pr
description: "Git & PR hygiene for Membrana: persona branches (vesnin/ozhegov/dynin/kuryokhin/rodchenko, human техies68), scoped commits (stage only the sprint's files, not the whole dirty tree), lefthook pre-commit (prettier/eslint/ai-review), and the rule to never commit .env or deploy logs to repo root. Use when committing, preparing a PR, splitting a sprint from a mixed working tree, choosing a branch, or when the user mentions commit, PR, ветка, scoped commit, lefthook, or git index.lock. Do NOT use for closing a registry task (membrana-task-lifecycle) or running CI (membrana-full-ci-operator)."
---
# Membrana git & PR hygiene

Канон: `.cursorrules`, [`AGENTS.md`](../../../AGENTS.md), [`docs/VIRTUAL_TEAM_PROMPT.md`](../../../docs/VIRTUAL_TEAM_PROMPT.md) (ветки персонажей), `.lefthook.yml`.

**Владелец:** **Структурщик (Ozhegov)** — слабая связанность, чистые диффы.

## When to use

- Готовишь коммит/PR; нужно отделить файлы спринта от грязного рабочего дерева.
- Выбор ветки персонажа; PR в `main`.
- Пользователь: «commit», «PR», «scoped commit», «ветка», «lefthook», «index.lock».

## When NOT to use

- Закрыть задачу реестра → `membrana-task-lifecycle` / команда `/close-task`.
- Полный CI → `membrana-full-ci-operator`.
- Triage issues → `membrana-issue-triage`.

## Ветки персонажей

| Персонаж | Ветка | Роль |
|----------|-------|------|
| Vesnin | `vesnin` | Teamlead |
| Ozhegov | `ozhegov` | Структурщик |
| Dynin | `dynin` | Математик |
| Kuryokhin | `kuryokhin` | Музыкант |
| Rodchenko | `rodchenko` | Верстальщик |
| (человек) | `techies68` | оператор/постановщик |

Вся работа персонажа — в одну ветку; PR в `main`. См. `TASKS_MANAGEMENT.md → Ветки персонажей`.

## Scoped commit (когда дерево грязное)

Коммить **только** файлы спринта, не `git add -A`:

1. Определи набор: артефакты по путям + файлы, где дифф = только целевое изменение.
2. Классификатор «pure-change»: для каждого `git diff --unified=0 -- <f>` все `+/-` строки относятся к теме; иначе файл — *mixed* → не стейджить.
3. Guard перед commit: `git diff --cached --name-only | grep -E '<запрещённые пути>'` → exit 1.
4. Эталон: `docs/day-sprint/*/commit-sprint.sh` (из спринтов #182/#183).

## Lefthook pre-commit (`.lefthook.yml`)

- `format` (prettier `--write`), `lint` (eslint `--fix`), `ai-review` (claude-code review), `fix-imports`.
- Не обходи hook без причины; при падении — чини, не `--no-verify`.

## Инварианты

- **Никогда** не коммить `.env`, deploy-логи, `*.log` в корень репо — используй `%TEMP%`/`$TMPDIR` (см. `.claude/CLAUDE.md`).
- Один коммит = одна тема; для day-sprint предпочтительно 1 PR.
- На cowork/Windows-маунте git `unlink` может падать (`index.lock`) — коммить локально, не из песочницы.
