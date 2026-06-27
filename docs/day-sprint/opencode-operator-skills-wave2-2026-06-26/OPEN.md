# OPEN: OpenCode operator skills — wave 2

| Поле | Значение |
|------|----------|
| **Sprint** | `opencode-operator-skills-wave2-2026-06-26` |
| **Registry** | `opencode-operator-skills-wave2-2026-06-26` |
| **Issue** | — (заведёт постановщик при go) |
| **Kind** | day-sprint |
| **Status** | **closed** (see [`CLOSURE.md`](./CLOSURE.md)) |
| **Started** | 2026-06-26 |
| **Size** | M (1 PR) |

**Prompt:** [`OPENCODE_OPERATOR_SKILLS_WAVE2_SPRINT_PROMPT.md`](../../prompts/OPENCODE_OPERATOR_SKILLS_WAVE2_SPRINT_PROMPT.md)
**Консилиум:** [`opencode-operator-skills-wave2-consilium-2026-06-26.md`](../../discussions/opencode-operator-skills-wave2-consilium-2026-06-26.md)

---

## Phases

| Phase | Registry id | Deliverable | Status |
|-------|-------------|-------------|--------|
| **C0** | `wc-c0-register` | prompt + registry + OPEN | ✅ |
| **C1** | `wc-c1-git-yarn` | `membrana-git-pr` + `membrana-yarn-workspace` | ✅ |
| **C2** | `wc-c2-deploy` | `membrana-deploy-operator` | ✅ |
| **C3** | `wc-c3-security-env` | `membrana-security-review` + `membrana-env-secrets-guard` | ✅ |
| **C4** | `wc-c4-wire-close` | wire + verify + closure | ✅ |

---

## Tier 1 scope (consilium consensus)

| # | Скилл | Тип |
|---|-------|-----|
| 1 | `membrana-git-pr` | плейбук + `gh`/lefthook |
| 2 | `membrana-deploy-operator` | операторский (prod-скрипты) |
| 3 | `membrana-yarn-workspace` | плейбук |
| 4 | `membrana-security-review` | гибрид (downloadable + адаптер) |
| 5 | `membrana-env-secrets-guard` | плейбук + guard |

**Tier 2 (defer):** `linear-sync`, `design-review`, `edge-capture`, mirror в `.cursor`/`.claude`.

---

## Next

C0 (планирование) выполнен. Реализация C1–C4 — после go постановщика по составу Tier 1.
