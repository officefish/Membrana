# OPEN: dual-mintlify-docs — два Mintlify-проекта (product + harness)

| Поле | Значение |
|------|----------|
| **Sprint** | `dual-mintlify-docs-2026-07-24` |
| **Registry epic** | `dual-mintlify-docs` · [#1121](https://github.com/officefish/Membrana/issues/1121) |
| **Status** | **open** |
| **Kind** | day-sprint (эпик L + фазы M) |
| **Size** | L |
| **Lead epic** | vesnin |
| **Craft** | ozhegov (W1–W3) |
| **Started** | 2026-07-24 |
| **Ратификация** | владелец «ратифицирую» 2026-07-24 · harness subdomain locked: **`harness.mmbrn.tech`** (owner may rename to `ops.mmbrn.tech` later) |
| **Дома** | `apps/docs` (product) · `apps/docs-harness` (harness, layout **A**) |
| **Стык** | Focus [`tasks-workshop`](../tasks-workshop-2026-07/OPEN.md) **не затирать** — только Also open |

**Промпт эпика:** [`DUAL_MINTLIFY_DOCS_PROMPT.md`](../../prompts/DUAL_MINTLIFY_DOCS_PROMPT.md)

---

## Цель

Развести публичную документацию на **два независимых Mintlify-проекта** с разными
subdomain: продуктовый Device Board и harness (tooling / containers / bestiary /
llm-calls / git cookbooks). Корень проблемы — не «починить tabs», а **не смешивать
аудитории** в одном `docs.json`; каждый сайт — свой валидный object-navigation schema.

## Модель (канон спринта)

```text
Product site  → Mintlify project `membrana` (существующий)
                URL: docs.mmbrn.tech  (fallback: membrana.mintlify.app)
                Repo: apps/docs/          + docs.json (только product)

Harness site  → Mintlify project  (новый; создаёт владелец)
                URL: harness.mmbrn.tech  ← LOCKED W0 (owner may rename → ops.mmbrn.tech)
                Repo: apps/docs-harness/  + docs.json (только harness)
```

### Layout — **рекомендация A**

| Опция | Суть | Вердикт |
|-------|------|---------|
| **A** | `apps/docs` = product, `apps/docs-harness` = harness; два yarn workspace, два `docs.json` | **канон спринта** |
| B | Один `apps/docs` с subdirs `product/` + `harness/` и двумя корнями `docs.json` | отклонено для v1 |

**Почему A:** Mintlify привязывает проект к **корню** с `docs.json`; два workspace
чисто стыкуются с Turbo/`package.json` scripts (`docs:dev` / `docs-harness:dev`),
CI (`verify-mintlify-docs` ×2), и не ломают существующий `@membrana/docs`. Subdir-корни
(B) путают path-aliases и деплой «какой pathPrefix у Mintlify GitHub App».

### Subdomain (W0 lock)

| Сайт | URL | Решение |
|------|-----|---------|
| Product | `docs.mmbrn.tech` (уже в [`CUSTOM_DOMAIN_SETUP`](../../../apps/docs/CUSTOM_DOMAIN_SETUP.md)) | зафиксирован как цель product |
| Harness | **`harness.mmbrn.tech`** | locked при ратификации W0; владелец может переименовать в `ops.mmbrn.tech` |

Второй subdomain + второй Mintlify project создаёт **владелец** (вне репо).

## Abandoned: tabs-as-final (STOP)

| Артефакт | Статус |
|----------|--------|
| Branch `ozhegov/feat/docs-json-navigation-object` | **не мержить** — single-site tabs «Продукт / Харнес» |
| PR [#1120](https://github.com/officefish/Membrana/pull/1120) | **closed / abandoned** (2026-07-24) — superseded этим спринтом |
| Текущий WIP `apps/docs/docs.json` с `navigation.tabs` | допустим как **временный** локальный WIP; целевое состояние после W1 — product-only groups (без harness tab) |

Tabs на одном сайте **не** являются финальным решением. Object schema Mintlify
(`navigation.groups` / `pages`) — да, на **каждом** сайте отдельно.

## Phases

| Phase | Registry id | Issue | Lead | Prompt | DoD | Status |
|-------|-------------|------:|------|--------|-----|--------|
| **W0** | `dmd-w0-brief` | [#1122](https://github.com/officefish/Membrana/issues/1122) | vesnin | [`DMD_W0_BRIEF_PROMPT.md`](../../prompts/DMD_W0_BRIEF_PROMPT.md) | OPEN + Issues + ACTIVE Also open | **done** |
| **W1** | `dmd-w1-split` | [#1123](https://github.com/officefish/Membrana/issues/1123) | ozhegov | [`DMD_W1_SPLIT_PROMPT.md`](../../prompts/DMD_W1_SPLIT_PROMPT.md) | Split trees + 2× docs.json (valid object nav) | **done** (PR [#1129](https://github.com/officefish/Membrana/pull/1129)) |
| **W2** | `dmd-w2-wires` | [#1124](https://github.com/officefish/Membrana/issues/1124) | ozhegov | [`DMD_W2_WIRES_PROMPT.md`](../../prompts/DMD_W2_WIRES_PROMPT.md) | atlas `--render` → harness path; CI ×2 | **open** |
| **W3** | `dmd-w3-surface` | [#1125](https://github.com/officefish/Membrana/issues/1125) | ozhegov | [`DMD_W3_SURFACE_PROMPT.md`](../../prompts/DMD_W3_SURFACE_PROMPT.md) | Panel → harness URL; CUSTOM_DOMAIN notes | **open** |
| **W4** | `dmd-w4-closure` | [#1126](https://github.com/officefish/Membrana/issues/1126) | vesnin | [`DMD_W4_CLOSURE_PROMPT.md`](../../prompts/DMD_W4_CLOSURE_PROMPT.md) | CLOSURE + owner DNS checklist | **open** |

## Инварианты (R1–R6)

1. **R1** Product board docs **не исчезают** с публичного product-сайта (все device-board / concepts / cookbooks / nodes остаются в `apps/docs`).
2. **R2** Harness содержит tooling/containers, bestiary, llm-calls, git cookbooks (переезд MDX в `apps/docs-harness`).
3. **R3** Каждый `docs.json` — **object** navigation, который принимает Mintlify (`navigation.groups` и/или `pages`; не array-legacy; tabs-as-final **запрещены** как целевая модель).
4. **R4** Panel `ToolingAtlasBoard` ссылается на **harness** public URL, не на `membrana.mintlify.app/tooling` product-fork.
5. **R5** Focus `tasks-workshop` в `DAY_SPRINT_ACTIVE` не затирать — только **Also open**.
6. **R6** Issues / `task:start` только после «ратифицирую».

## Вне scope v1

- Третий Mintlify-проект / i18n / products-switcher между сайтами.
- Перенос agent-truth (`docs/catalog/`, `docs/procedures`, …) в публичный Mintlify.
- Оплата тарифа Mintlify / DNS — шаги владельца (чеклист в W4), не код агента.
- Консилиум core-контрактов.

## Gate checklist (W0, после ратификации)

- [x] Слово владельца («ратифицирую») + harness subdomain locked: `harness.mmbrn.tech` (rename OK)
- [x] Эпик + 5 фаз в registry + GitHub Issues #1121–#1126
- [x] `DAY_SPRINT_ACTIVE` → **Also open** (Focus `tasks-workshop` цел)
- [x] Номера Issue в таблице Phases
- [x] PR #1120 closed / abandoned
