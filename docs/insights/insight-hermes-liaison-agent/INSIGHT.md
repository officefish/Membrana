# INSIGHT: Hermes — вестник-лиазон между сессиями

| Поле | Значение |
|------|----------|
| **ID** | `insight-hermes-liaison-agent` |
| **Статус** | adopted · вес **7.4/10** (research 2026-07-09 + review команды 2026-07-09) |
| **Источник** | user |
| **Создан** | 2026-07-08 |
| **Консилиум** | [`docs/seanses/hermes-liaison-agent-2026-07-08.md`](../../seanses/hermes-liaison-agent-2026-07-08.md) (24 реплики, LGTM Teamlead) |
| **Research** | [`RESEARCH.md`](./RESEARCH.md) — Perplexity Q1–Q3 (cross-session handoff patterns; детерминированный сбор vs LLM) |
| **Review** | [`REVIEW.md`](./REVIEW.md) — 5 ролей, средний **7.4**; Teamlead → adopted, следующий шаг = task-промпт M (владелец Dynin) |
| **Спринт** | → `hermes-brief` (2026-07-09): [`HERMES_BRIEF_PROMPT.md`](../../prompts/HERMES_BRIEF_PROMPT.md), реестр `status: active`, `insightId` обратной ссылкой |

---

## Проблема / наблюдение

Каждая агентская сессия начинается «с холода» и заново собирает состояние проекта из
разбросанных источников: `HANDOFF.md` ночного билда, `DAILY_CODE_REVIEW`, `MAIN_DAY_ISSUE`,
открытые PR (`gh`), активные карточки `registry.json`, `MEMORY.md`. Контекст теряется между
сессиями и агентами (показательно: пользователь сослался на прошлый разговор про Hermes —
в текущей сессии его нет). Ночью 2026-07-08 уже построена база: `scripts/lib/git-day-context.mjs`,
HANDOFF (`night:close`), `tasks:archive-closed`.

## Гипотеза

Если выделить **вестника-лиазона Hermes** — детерминированный сборщик состояния «здесь и
сейчас» — то любой агент (и человек) на входе в сессию получает один связный бриф вместо
ручной пересборки шести источников; на горизонте Hermes растёт до паковщика handoff и
(гипотетически) оркестратора облачных сабагентов.

## Решение консилиума (2026-07-08)

| Вопрос | Решение |
|--------|---------|
| Отдельный агент или функция ритма? | **Функция ритма в read-only сабагенте.** НЕ 6-я роль виртуальной команды; не голосует, не пишет прод-код. |
| Минимальное внедрение сейчас | **(а)** детерминированный `scripts/hermes-brief.mjs` + `yarn hermes:brief` → `docs/HERMES_BRIEF.md`; **(б)** тонкий `.claude/agents/hermes.md` read-only (шаг 1.5). Оркестратор — отложен (гипотеза в WHITE_PAPER). |
| ОДИН первый шаг | **Детерминированный `yarn hermes:brief`** (6 источников → иерархичный документ). Владелец — Математик (Dynin). |
| Размещение | `scripts/` + `.claude/`, слой ops/tooling. **НЕ** `packages/services/*`, вне графа foundation/analyzer. |

**Форсайт-горизонт (одна ветка контракта):** брифинг `state→brief` → паковщик `session-diff→handoff` → оркестратор `tasks→subagent-plan`. Реализуем только первую; остальные — гипотезы, не код.

## Scope (первый шаг)

- **In scope:** `scripts/hermes-brief.mjs` (переиспользует `git-day-context.mjs`; источники — HANDOFF/MAIN_DAY_ISSUE/registry-активные/`gh pr list --json` с graceful fallback/MEMORY.md); `docs/HERMES_BRIEF.md` (блок «сейчас» → «контекст» → метаданные commit-hash + timestamp); юнит-тест детерминизма; `yarn hermes:brief` в package.json; тонкий read-only `.claude/agents/hermes.md`.
- **Out of scope:** LLM-резюме своими словами на первом шаге (запрещено — только сбор фактов); паковщик handoff и оркестратор сабагентов; UI-панель; переписывание `plan:day`/`standup` (бриф **дескриптивный**, ссылается, не нормативный).

## Риски и митигации

- **Дрейф брифа** → timestamp + hash коммита; устаревший бриф «кричит о возрасте».
- **Дублирование `plan:day`/`standup`** → строгое разграничение: план нормативный, бриф дескриптивный; бриф ссылается, не переписывает.
- **Лишний слой** → скрипт первичен и переносим (переживёт смену раннера), сабагент вторичен и тонок.
- **Соблазн LLM-резюме** у будущего паковщика → LGTM Teamlead + обязательная сверка с git-diff; «магической кнопки Hermes всё понял» нет.

## Связи

- Консилиум: `docs/seanses/hermes-liaison-agent-2026-07-08.md`
- Опирается на night-build [[reference_agent_tooling]]: `scripts/lib/git-day-context.mjs`, HANDOFF (`night:close`), `tasks:archive-closed` (PR #315)
- Смежные скиллы: `membrana-tooling-doctor` (health-check), `membrana-ship`

## Вопросы для research (Q1–Q3)

1. **Landscape:** как другие агентские окружения решают cross-session state/handoff (memory-файлы, context packs, session briefs) — паттерны и анти-паттерны?
2. **Fit (Membrana):** что даёт больше — детерминированный сбор (скрипт) или LLM-обобщение; где граница, за которой бриф начинает врать?
3. **Risk:** как не превратить Hermes в дубль `plan:day`/`standup` и не отрастить преждевременный оркестратор?
