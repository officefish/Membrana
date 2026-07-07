# Контур внешних коммуникаций Membrana — индекс

Leaf-контур внешних коммуникаций (брендинг, лендинги, деки, инфографика). Топология — **Вариант A**:
изолированный воркспейс `apps/comms-studio` внутри монорепо, «сток, не исток» (из контура выходят
только файлы, не публикации). Изоляция держится инвариантом границ `yarn check:boundaries`
(`outdegree=0`, `indegree=0`), а не отдельным репозиторием.

## Решение и входы

- [`../insights/insight-comms-contour-topology/INSIGHT.md`](../insights/insight-comms-contour-topology/INSIGHT.md) — топологическое решение (Вариант A), механизмы изоляции, non-goals.
- [`BRIEF_COMMS_CONTOUR_TOPOLOGY.md`](BRIEF_COMMS_CONTOUR_TOPOLOGY.md) — исходный бриф топологии.
- [`CANON_MINIMUM_FOR_COMMS_CONTOUR.md`](CANON_MINIMUM_FOR_COMMS_CONTOUR.md) — состав канонического минимума.

## Живой канон (Слой 3, наполнен CC5–CC7)

Читается живьём из репо, **не копируется** в контур. Перечень путей (Слой 1–3) — источник истины
`apps/comms-studio/src/canon-sources.ts`.

- [`canon/FACTS_SHEET.md`](canon/FACTS_SHEET.md) — лист фактов (цифры, стадия, дорожная карта).
- [`canon/GLOSSARY.md`](canon/GLOSSARY.md) — глоссарий (§1–§2), запрещённые слова (§3), dual-use переформулировки (§4).
- [`canon/BRAND_TOKENS.md`](canon/BRAND_TOKENS.md) — визуальный канон (палитра, шрифты, do/don't).

Слой 1–2 канона — `docs/foundation/`, `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS_STRATEGY.md`,
`docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md` (см. `canon-sources.ts`).

## Реализация контура

- `apps/comms-studio/` — leaf-воркспейс (CC1–CC9): агент живого чтения канона, детерминированный
  `tone-guard` (`checkTone`), `out-writer` (запись только в `out/`), seam-генератор `yarn generate:v0.1`.

## Окружение партнёра (песочница)

Документы настройки интерактивной песочницы партнёра (нетехническая роль). Адаптированы под
Вариант A и живой канон спринтом `comms-sandbox-docs-adaptation` (CD1–CD6):

- [`sandbox/RUNBOOK_AGENT_SETUP_COMMS_SANDBOX.md`](sandbox/RUNBOOK_AGENT_SETUP_COMMS_SANDBOX.md) — исполняемый runbook агента (среда, 4 MCP-сервера, 9 скиллов, хук).
- [`sandbox/CHECKLIST_PARTNER_MANUAL_SETUP.md`](sandbox/CHECKLIST_PARTNER_MANUAL_SETUP.md) — ручные шаги партнёра (аккаунты, OAuth, подтверждение готового канона).
- [`sandbox/INSIGHT_MCP_INTEGRATIONS_COMMS_SANDBOX.md`](sandbox/INSIGHT_MCP_INTEGRATIONS_COMMS_SANDBOX.md) — свод решений по MCP-интеграциям + связь песочницы и seam-генератора.
- [`sandbox/GUIDE_SKILLS_DEPLOYMENT_COMMS_SANDBOX.md`](sandbox/GUIDE_SKILLS_DEPLOYMENT_COMMS_SANDBOX.md) — внедрение 9 скиллов.

## Инварианты (общие для всех документов)

- **Сток, не исток:** из контура выходят только файлы (`out/`), публикации — отдельный человеческий шаг.
- **Живой канон, не копии:** единый источник истины в git, контур ссылается, а не хранит вторую версию.
- **4 MCP-сервера** (filesystem, playwright, figma, replit — без публикующих), **9 скиллов**, хук
  переиспользует `tone-guard` (не заводит второй список запрещённых слов).
