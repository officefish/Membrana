# Research: Sunrise flashes

> Perplexity MCP · 2026-06-25

## Q1 — Landscape

**Запрос:** Sunrise flash — automated morning briefing for dev teams 2024-2026

**Выжимка:**

- Паттерн **agentic morning briefing**: KB/RAG retrieve → rank topics → compose digest → deliver (Slack/MD).
- **Weighted random** (prefix-sum sampling) — variety + bias к high-weight темам; critical items deterministic top slot.
- External news via Perplexity/Gemini as **News Agent** tool; internal + external в единый pool с разными весами.
- Observability: trace sources, human feedback loop.
- Отдельно **weekly research radar** — не дублировать `analyzers:research:week`; daily = один flash.

**Импликация:** один запрос/день, не 30 API calls; 30+ тем — только cloud для scoring.

---

## Q2 — Fit (Membrana)

**Запрос:** fit with RAG dual-circuit, DEVELOPER_RHYTHM, weighted topic from insights/tasks

**Выжимка:**

- **06:00** `yarn sunrise:flash` (cron/CI) → `docs/sunrise-flash/<date>.md` + `SUNRISE_FLASH.md` pointer.
- Topic cloud: `yarn rag:query` + `docs/insights/registry.json` + open tasks + epics → ≥30 labels.
- Weights: RAG relevance, insight weight, epic status, freshness gap, random exploration ε.
- **Input к** `plan:day` / `standup` (read-only block), не замена `main-day-issue`.
- Knowledge tree: `docs/knowledge-tree/topics.json` append-only; optional `rag:index:incremental` on flash corpus.
- Provider cascade: Perplexity API → MCP → Grok/Gemini (membrana-opencode-proxy) → dry-run.

---

## Q3 — Risk

**Запрос:** risks noise, cost, MAIN_DAY_ISSUE conflict, weekly duplicate

**Выжимка:**

| Риск | Митигация |
|------|-----------|
| Distraction from MAIN_DAY_ISSUE | Flash = context only; sprint lottery P ≤ 0.1, LGTM |
| API cost | 1 external query/day + local RAG |
| Duplicate weekly research | Daily = news pulse; week = analyzers deep dive |
| Stale tree | Decay weights; human prune quarterly |
| Insight vs ritual rule | Sunrise = **adopted ritual extension** (exception documented) |

---

*Источник: Perplexity MCP*
