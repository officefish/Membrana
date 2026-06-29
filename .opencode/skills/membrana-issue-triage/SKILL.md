---
name: membrana-issue-triage
description: "Triages GitHub issues for Membrana via yarn issues:audit (scripts/github-issues-audit.mjs) using a manifest under docs/issues/manifests/. Audits open issues, proposes labels/closures, applies with issues:audit:apply. Use when the user says triage issues, разобрать issues, аудит issues, issues:audit, close stale issues, or prepare an issue manifest. Do NOT use for closing a registry task (membrana-task-lifecycle / close-task command) or PR review (membrana-code-review)."
---
# Membrana issue triage

Канон: [`docs/prompts/GITHUB_ISSUES_AUDIT_PROMPT.md`](../../../docs/prompts/GITHUB_ISSUES_AUDIT_PROMPT.md) · скрипт: [`scripts/github-issues-audit.mjs`](../../../scripts/github-issues-audit.mjs).

**Владелец:** **Teamlead** — вход/triage GitHub issues; решает label/close/keep.

## When to use

- Разобрать открытые issues: дубли, устаревшие, без репро, готовые к закрытию.
- Пользователь: «triage issues», «аудит issues», «issues:audit», «закрыть stale».

## When NOT to use

- Закрыть **задачу реестра** (`docs/tasks/registry.json`) → `membrana-task-lifecycle` / команда `close-task`.
- Ревью PR → `membrana-code-review`.
- Создание Issue под новую задачу → `TASK_PROMPT_WORKFLOW.md`.

## Commands

| Goal | Command |
|------|---------|
| Аудит (dry, читает манифест) | `yarn issues:audit --manifest docs/issues/manifests/github-issues-audit-<YYYY-MM-DD>.json` |
| Применить решения | `yarn issues:audit:apply --manifest <path>` |
| Dry-run применения | `yarn issues:audit:apply --manifest <path> --dry-run` |

Требует `gh` CLI (авторизованный) для применения closures.

## Agent workflow

1. Сгенерируй/обнови манифест `docs/issues/manifests/github-issues-audit-<date>.json` по `GITHUB_ISSUES_AUDIT_PROMPT.md`.
2. Прогон `yarn issues:audit` (read-only) — проверь предложения.
3. `--dry-run` apply → ревью diff'а действий.
4. `yarn issues:audit:apply` — применяй labels/closures (нужен `gh`).

## Output

- Список решений: issue → действие (keep / label / close + причина).
- Не закрывай issue без причины в манифесте.
