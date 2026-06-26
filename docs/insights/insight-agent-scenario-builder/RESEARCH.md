# Research: AI-агент построения UserCase

> Perplexity MCP · 2026-06-25

## Q1 — Landscape

**Запрос:** AI-агент построения UserCase по описанию пользователя: industry landscape 2024-2026

**Выжимка:**

- Доминирующий паттерн: **dual-surface** — chat (intent) + canvas (typed graph); Planner → Graph mapper → execution engine.
- **Feasibility gate** до генерации: tool registry/schema, capability matching, template matching (n8n/Make), preflight type compatibility.
- Co-editing: mixed-initiative — NL правки подграфа, node-level edit, templates + AI adaptation.
- Роли агента (research): Task selector, Reasoner, Diagrammer, Editor — близко к трём режимам Membrana (Concept / Structure / Usability).

**Импликация:** v0 = Palette Feasibility Check как обязательный шаг до платного чата; graph kernel = UserCase document schema.

---

## Q2 — Fit (Membrana)

**Запрос:** fit with Web Audio, device-board palette, cabinet tariff

**Выжимка:**

- **Tool registry** = machine-readable export из `palette-node.ts` + catalog `nodeKinds` + branch handlers.
- **Feasibility:** intent → required nodeKinds; сравнение с bundled MVP + competition entries как few-shot templates.
- **Токены:** hybrid subscription + **prepaid credits wallet** в cabinet; pre-call balance check, action-based credits («feasibility», «co-build session», «issue diagram»).
- **Office vs cabinet:** LLM proxy в `background-office`; quota enforcement в `background-cabinet` (не media).
- Verify: `usercase.mjs verify-pack` после apply графа агентом.

---

## Q3 — Risk

**Запрос:** risks hallucinated graphs, token abuse, auto GitHub issues

**Выжимка:**

| Риск | Митигация |
|------|-----------|
| Hallucinated nodes | Constrained generation по palette schema; abstain → gap report |
| Invalid wiring | `verify-pack` + runtime dry-run; human apply-to-canvas |
| Token abuse | Hard cap, estimate before session, feasibility cheap/free |
| Auto-issues spam | User confirms issue; sanitize; template `node-request`; diagram preview |
| Security | No auto-merge node kinds; LGTM maintainers |

**Импликация:** агент — **drafting**, не authority; GitHub issue — opt-in с preview за токены.

---

*Источник: Perplexity MCP*
