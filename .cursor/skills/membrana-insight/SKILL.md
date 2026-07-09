---
name: membrana-insight
description: >-
  Membrana Insight process: capture strategic ideas in docs/insights/, Perplexity
  research cascade, five-role review (1–10), weekly plan weight. Use when user says
  инсайт, insight, yarn insight:, save strategic idea, or insight create/research/review.
  Do NOT use for M/L task archive (membrana-task-lifecycle) or daily ritual (membrana-developer-rhythm).
---

# Membrana Insight

Канон: [`docs/prompts/INSIGHT_REGULATION.md`](../../../docs/prompts/INSIGHT_REGULATION.md) · навигатор [`docs/INSIGHTS.md`](../../../docs/INSIGHTS.md)

## When to use

- Пользователь описывает **крупную идею** после эпика / соревнования / продуктового озарения.
- Нужно сохранить идею **вне** дневного ритма, с фактурой и позицией команды.
- Недельное планирование (`yarn plan:week`) должно учесть adopted/reviewed инсайты.

## When NOT to use

- Исполняемая задача на сегодня → `membrana-task-lifecycle` + `MAIN_DAY_ISSUE`.
- Архитектурный спор → `membrana-consilium`.
- Вечернее ретро → `membrana-team-evening-feedback`.

## Workflow

1. **Create:** `yarn insight create <slug> --title "…" [--source user]`
2. **Describe:** отредактировать `docs/insights/<id>/INSIGHT.md` (или заполнить в чате).
3. **Research (каскад):**
   - `yarn insight research <id>` — Perplexity API если `PERPLEXITY_API_KEY`
   - при сбое API → **Cursor MCP Perplexity** (те же 3 запроса из dry-run)
   - `yarn insight research <id> --dry-run` — только запросы для ручного/MCP
4. **Review:** `yarn insight review <id>` — 5 ролей, оценки **1–10**, `REVIEW.md`
5. **Close:** `yarn insight close <id> --status adopted|deferred|rejected`

## Team insights

Роли виртуальной команды предлагают идеи через `--source virtual-team-<role>`:

```bash
yarn insight create graph-trace-contract --title "…" --source virtual-team-ozhegov
```

Цикл тот же: research → review (5 ролей) → close. Канон: `INSIGHT_REGULATION.md` § Team insights.

## Agent rules

- Инсайт **не** меняет `ritual:day` / `ritual:evening`.
- `adopted` не создаёт task без LGTM Teamlead. Переход adopted→спринт: [`membrana-insight-to-sprint`](../membrana-insight-to-sprint/SKILL.md).
- Для research в Cursor без API: вызови Perplexity MCP 3 раза, запиши в `RESEARCH.md`.
- Пилоты спринта: см. `docs/insights/registry.json`.

## Commands

```bash
yarn insight help
yarn insight list
yarn insight create my-slug --title "…" --source user
yarn insight research insight-my-slug
yarn insight review insight-my-slug
yarn insight close insight-my-slug --status adopted
```

## Output format (virtual team review)

См. [`INSIGHT_REVIEW_PROMPT.md`](../../../docs/prompts/INSIGHT_REVIEW_PROMPT.md) — таблица /10, средний балл, резюме Teamlead.
