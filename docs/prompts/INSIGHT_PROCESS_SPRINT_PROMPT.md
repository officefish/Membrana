# Промпт (day sprint · active): Insight process registration

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** **`insight-process-registration-2026-06-25`**  
> **Статус:** **active** (2026-06-25)  
> **Регламент:** [`INSIGHT_REGULATION.md`](./INSIGHT_REGULATION.md)

---

## Контекст

После эпика `comp-packaging-catalog-2026-06-25` накопились **крупные идеи** уровня стратегии, не попадающие в дневной ритм (`MAIN_DAY_ISSUE`) и не требующие немедленного task-промпта.

**Инсайт** — новый процесс: идея → Perplexity (каскад) → review команды (1–10) → вес для `plan:week`.

**Product decisions (зафиксировано Teamlead):**

| ID | Решение |
|----|---------|
| **D-INS-1** | Research: каскад Perplexity API → MCP в сессии → manual/dry-run |
| **D-INS-2** | Оценка приоритета: **1–10** от каждой роли; вес = среднее |
| **D-INS-3** | Инсайты **не** в `ritual:day` / `ritual:evening` |
| **D-INS-4** | `plan:week` подмешивает инсайты с weight ≥ 6 |
| **D-INS-5** | Пилоты из packaging + **свободные инсайты пользователя** (`insight create`) |

---

## Phases

| Phase | Registry id | Size | DoD |
|-------|-------------|------|-----|
| **A** | `ins-reg-a-regulation` | S | `INSIGHT_REGULATION.md`, `INSIGHTS.md`, templates, pilot registry |
| **B** | `ins-reg-b-script-core` | M | `insight.mjs` create/list/help |
| **C** | `ins-reg-c-research-cascade` | M | research + Perplexity API + dry-run |
| **D** | `ins-reg-d-review-anthropic` | M | review → REVIEW.md, weight /10 |
| **E** | `ins-reg-e-skill-rhythm` | S | skill + `DEVELOPER_RHYTHM` § Insight |
| **F** | `ins-reg-f-plan-week` | S | `plan:week` reads registry (weight ≥ 6) |
| **G** | `ins-pilot-g-operator-smoke` | M | `insight-operator-smoke-ci-gate` researched + reviewed |
| **H** | `ins-pilot-h-async-v2-narrative` | M | `insight-async-v2-product-narrative` researched + reviewed |
| **I** | `ins-pilot-i-catalog-pipeline` | M | `insight-competition-catalog-pipeline` researched + reviewed |
| **J** | `ins-pilot-j-user-insights` | S | ≥1 пользовательский инсайт через `insight create` |

**Порядок:** A → B → C → D → E → F → (G ∥ H ∥ I) → J

---

## Промпт целиком (для агента)

1. Прочитать [`INSIGHT_REGULATION.md`](./INSIGHT_REGULATION.md).
2. Фазы A–F — инфраструктура; не смешивать с пилотным контентом в одном PR без LGTM.
3. Пилоты G–I: заполнить `INSIGHT.md` (уже draft), `yarn insight research`, `yarn insight review`, `yarn insight close`.
4. Фаза J: пользователь добавляет свои идеи; агент помогает create/research/review.
5. Не создавать task/epic из инсайта без явного LGTM Teamlead.

---

## Out of scope

- Linear/GitHub sync для инсайтов
- RAG index `docs/insights/`
- UI в client
- Автоматическое изменение `MAIN_DAY_ISSUE`

---

## Definition of Done (спринт)

- [ ] A–F merged; `yarn insight help` green; `yarn test:scripts` includes insight-ritual
- [ ] G–I: три пилота `reviewed` или `adopted` с weight
- [ ] J: ≥1 user-sourced insight в registry
- [ ] `yarn task:archive insight-process-registration-2026-06-25` + `CLOSURE.md`
