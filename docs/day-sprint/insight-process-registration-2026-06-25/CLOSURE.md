# CLOSURE: Insight process registration

| Поле | Значение |
|------|----------|
| **Sprint** | `insight-process-registration-2026-06-25` |
| **Status** | **closed** |
| **Closed** | 2026-06-25 |

---

## Phases A–F (инфраструктура)

| Phase | DoD | Status |
|-------|-----|--------|
| A | `INSIGHT_REGULATION.md`, templates, registry | ✅ |
| B | `insight.mjs` create/list/help | ✅ |
| C | Research cascade (Perplexity API → MCP → manual) | ✅ |
| D | Review (5 ролей, /10) | ✅ |
| E | Skill + `DEVELOPER_RHYTHM` § Insight | ✅ |
| F | `plan:week` hook (weight ≥ 6) | ✅ |

## Pilots G–J

| Phase | Insight | Weight | Статус |
|-------|---------|--------|--------|
| G | `insight-operator-smoke-ci-gate` | 7.0 | **adopted** |
| H | `insight-async-v2-product-narrative` | 6.6 | **adopted** |
| I | `insight-competition-catalog-pipeline` | 6.6 | **adopted** |
| J | `insight-loop-engineering-competition-test` | 6.8 | **deferred** |

## Итог для plan:week

Adopted (≥6): G, H, I — попадут в недельный план.  
Deferred (≥6): J — в registry, после smoke gate (G).

## Следующие шаги (не автоматические)

1. Эпик S: competition pack CI gate (из G)
2. `COMPETITION_PACKAGING_RUNBOOK.md` (из I)
3. Comment profiles + async markers (из H)
4. Пользователь: второй user-insight + **инсайты команды** (см. `INSIGHT_REGULATION.md` § Team insights)

## Артефакты

- [`docs/INSIGHTS.md`](../../INSIGHTS.md)
- [`docs/insights/registry.json`](../../insights/registry.json)
- Skill: [`.cursor/skills/membrana-insight/SKILL.md`](../../../.cursor/skills/membrana-insight/SKILL.md)
