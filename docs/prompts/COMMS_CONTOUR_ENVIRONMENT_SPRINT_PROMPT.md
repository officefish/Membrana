# Sprint prompt: Окружение партнёра по внешним коммуникациям (CC1–CC9)

| Поле | Значение |
|------|----------|
| **Sprint** | `comms-contour-environment` |
| **Топология** | Вариант A — leaf-воркспейс `apps/comms-studio` (INSIGHT `insight-comms-contour-topology`, adopted) |
| **Консилиум** | [`comms-contour-topology-opus-2026-07-05.md`](../seanses/comms-contour-topology-opus-2026-07-05.md) (opus, →A) |
| **Брифы** | [`BRIEF_COMMS_CONTOUR_TOPOLOGY.md`](../comms/BRIEF_COMMS_CONTOUR_TOPOLOGY.md) · [`CANON_MINIMUM_FOR_COMMS_CONTOUR.md`](../comms/CANON_MINIMUM_FOR_COMMS_CONTOUR.md) |
| **Size** | L (3 фазы) |

> **Сверено с репо 2026-07-05:**
> - **Слой 1–2 канона существуют** (`docs/foundation/PROMPT_WHITE_PAPER.md`, `docs/ARCHITECTURE.md`,
>   `docs/INTEGRATIONS_STRATEGY.md`, `docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md`,
>   `docs/foundation/CLAUDE_PROJECT_SYSTEM_PROMPT.md`, `docs/foundation/MEMBRANA_ONE_PAGER.md`) →
>   агент читает их **живьём** (`fs-read`), переносить/копировать НЕ надо. В этом суть Варианта A.
> - **Слой 3 отсутствует** (`FACTS_SHEET`, `GLOSSARY`, `BRAND_TOKENS`) → создать как отдельный канон.
> - **`yarn check:boundaries`** (`scripts/check-package-boundaries.mjs`) уже есть → CC2 расширяет его,
>   не пишет с нуля.
> - **`apps/`** содержит cabinet/client/demos/membrana-device/membrana-studio → `apps/comms-studio`
>   заводится чистым leaf-ом.

## Инвариант (не обсуждается)

**Контур — сток, а не исток.** Изоляция **по записи, не по чтению**: запрет исходящих рёбер к контуру
(`indegree(comms от продуктовых) = 0`), а не запрет чтения. **Чтение ≠ импорт** — канон читается
через `fs-read` рабочей копии, не через `import @membrana/*` (импорт создаёт ребро → блок границ).
Синхронизации нет по построению (single source of truth). Партнёр касается контура тонким срезом
(монитор `out/**` + Drive), не через git.

## Цель

Рабочее окружение партнёра по внешним коммуникациям v0.1: leaf-воркспейс `apps/comms-studio` с
инвариантом «сток не исток» по построению + канонический минимум Слой 3 + агент живого чтения,
производящий описания/outline/копирайт без дрейфа фактов.

---

## Фаза 1 — Изоляция и каркас (инвариант по построению)

### CC1 — leaf-воркспейс `apps/comms-studio`
- [ ] `package.json` без `@membrana/*` в `dependencies`; tsconfig; scaffolding; каталог `out/` для выходов.
- [ ] README тонкого среза: что партнёр видит (`out/**` + Drive), чего не касается (git).

### CC2 — `check:boundaries`: инвариант по построению (поз. + нег. тест)
- [ ] Декларация `apps/comms-studio` как leaf-zero; проверка `indegree(comms) = 0` и `outdegree(comms) = 0`.
- [ ] **Позитивный** тест: чистый контур проходит. **Негативный** тест: искусственное ребро к/от контура **роняет** сборку.

### CC3 — CI path-фильтры + CODEOWNERS
- [ ] Отдельная comms-полоса CI (`paths`-фильтры / Turbo scope): правка `apps/comms-studio/**` не триггерит продуктовый `lint typecheck test build`, и наоборот.
- [ ] CODEOWNERS: `apps/comms-studio/**` → comms-owner; продуктовые пути остаются за инженерами.

### CC4 — изолированный `.env` + secret-scan
- [ ] `apps/comms-studio/.env` вне продуктового скоупа секретов.
- [ ] Блокирующий secret-scan чек в comms-CI (regex известных паттернов: apiKey/token/secret/IP/internal-URL).

---

## Фаза 2 — Канонический минимум Слой 3 (создаём то, чего нет)

Порядок ввода из `CANON_MINIMUM` §63. Слой 1–2 читаются живьём — здесь только производные артефакты.

### CC5 — `FACTS_SHEET.md` (лист фактов, первым)
- [ ] Только проверенные утверждения: стадия, метрики-шлюзы (P≥85%/R≥90%), размер команды (4–7), демо-артефакт, дорожная карта по этапам.
- [ ] Каждый факт с пометкой `подтверждён / гипотеза / [TBD]`. Извлекается из Слоя 1 (WHITE_PAPER, INTEGRATIONS_STRATEGY, SINGLE_NODE_DETECTION_FIRST).

### CC6 — `GLOSSARY.md` (заблокированный глоссарий)
- [ ] Фиксированные термины: «нижнее небо», «сенсорный узел» (не нода/датчик/устройство), «семейство детекторов», «stage-gate», «наблюдательная система».

### CC7 — `BRAND_TOKENS.md` (бренд-токены)
- [ ] Палитра (графит / тёмно-синий / серый + один приглушённый акцент), шрифты (Inter / Manrope / IBM Plex Sans, кириллица), визуальные do/don't (без сток-дронов и солдат; схема и абстракция), формат футера/нумерации.

---

## Фаза 3 — Агент живого чтения + срез партнёра

### CC8 — comms-агент живого чтения
- [ ] Читает канон Слой 1–3 + живые исходники через `fs-read` рабочей копии; пишет **только** в `out/`.
- [ ] Ритм `git pull` перед прогоном (закрытие единственной точки дрейфа — кэша агента).
- [ ] Применяет канон коммуникаций (тон, dual-use, запрещённые слова, лист фактов, глоссарий) на этапе рендера.

### CC9 — тонкий срез партнёра + первый выход v0.1
- [ ] Монитор каталога `out/**` + экспорт в Drive; обратный импорт из Drive в git **запрещён** (правки через changelog).
- [ ] Первый выход: агент описывает 3–5 ключевых компонентов дизайн-системы; сверка точности против Storybook/UI.

---

## Non-goals

- Не деплоит боевой лендинг `membrana.space` (хостинг отложен stage-gate; не смешивать с авторством контура).
- Не второй источник истины — только потребитель канона.
- Не сажает партнёра в продуктовый git; запись только в `out/`.
- Не импортирует `@membrana/*` (чтение ≠ импорт).

## Definition of Done (эпик)

- `apps/comms-studio` — leaf-воркспейс; `check:boundaries` проходит и **падает** на искусственном ребре.
- CI path-фильтры разводят продуктовую и comms-полосы; CODEOWNERS покрывает контур.
- Изолированный `.env` + secret-scan в comms-CI.
- Слой 3 создан: `FACTS_SHEET` + `GLOSSARY` + `BRAND_TOKENS`.
- Агент читает канон+исходники живьём (`git pull` ритм), пишет в `out/`, применяет канон тона.
- Первый выход v0.1 (3–5 компонентов) проверен против Storybook/UI.
