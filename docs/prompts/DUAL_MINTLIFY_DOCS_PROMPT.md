# Промпт: Эпик — два Mintlify-проекта (product + harness)

> **L** · `dual-mintlify-docs` · [#1121](https://github.com/officefish/Membrana/issues/1121) · lead **vesnin** · craft **ozhegov**  
> Цепь: W0→W4 (`dmd-w0-brief` … `dmd-w4-closure`).  
> Семя: owner decision 2026-07-24 — refactor sprint на **два** Mintlify-проекта /
> subdomain; tabs-as-final на одном сайте **STOP**.  
> Инстанс: [`dual-mintlify-docs-2026-07-24/OPEN.md`](../day-sprint/dual-mintlify-docs-2026-07-24/OPEN.md).  
> Стык: Focus [`tasks-workshop`](./TASKS_WORKSHOP_SPRINT_PROMPT.md) не затирать.

---

## Контекст

Сейчас harness-контент (tooling, bestiary, llm-calls, git cookbooks) живёт рядом с
product Device Board в `apps/docs`. WIP [#1120](https://github.com/officefish/Membrana/pull/1120)
(`ozhegov/feat/docs-json-navigation-object`) пытался узаконить это через
`navigation.tabs` («Продукт» / «Харнес») на **одном** Mintlify-проекте.

**Вердикт владельца:** tabs не финал. Нужны два проекта:

| Сайт | Mintlify project | URL (цель) | Workspace |
|------|------------------|------------|-----------|
| Product | существующий `membrana` | `docs.mmbrn.tech` (fallback `membrana.mintlify.app`) | `apps/docs` → `@membrana/docs` |
| Harness | **новый** (создаёт владелец) | `harness.mmbrn.tech` (W0 lock; owner may rename → `ops`) | `apps/docs-harness` → `@membrana/docs-harness` |

Layout **A** (два app-workspace) — канон. Layout B (subdirs под одним apps/docs) —
отклонён для v1: хуже стыкуется с yarn/Turbo и привязкой Mintlify GitHub App к корню.

## Abandoned (обязательно учесть)

- **Не мержить** PR #1120 / ветку `ozhegov/feat/docs-json-navigation-object` как финал.
- Object navigation schema — **да**, но **на каждом сайте отдельно** (groups/pages),
  не «один docs.json + tabs = два продукта».

## Инварианты (R1–R6)

1. **R1** Product board docs остаются на публичном product-сайте.
2. **R2** Harness = tooling/containers + bestiary + llm-calls + git cookbooks.
3. **R3** Каждый `docs.json`: валидный Mintlify **object** `navigation` (не array-legacy;
   tabs-as-final запрещены как целевая модель эпика).
4. **R4** Panel `ToolingAtlasBoard` → harness public URL (не product `…/tooling`).
5. **R5** `DAY_SPRINT_ACTIVE` Focus `tasks-workshop` не трогать — только Also open.
6. **R6** Issues / `task:start` только после «ратифицирую».

## Фазы

| Фаза | id | Lead | DoD |
|------|-----|------|-----|
| W0 | `dmd-w0-brief` | vesnin | OPEN + Issues + registry + ACTIVE Also open |
| W1 | `dmd-w1-split` | ozhegov | `apps/docs-harness` + split MDX; 2× docs.json object-nav; product без harness |
| W2 | `dmd-w2-wires` | ozhegov | `tooling:atlas --render` → harness mintlify path; CI verify ×2 |
| W3 | `dmd-w3-surface` | ozhegov | Panel URLs → harness; CUSTOM_DOMAIN notes для обоих |
| W4 | `dmd-w4-closure` | vesnin | CLOSURE + owner checklist (2-й Mintlify project + DNS) |

## Out of scope (весь эпик v1)

- Products-switcher / deep-link между сайтами как продукт.
- Публикация agent-truth (`docs/catalog/`, procedures, audit raw).
- Оплата тарифа / фактический DNS (только чеклист владельцу).
- Новые контракты `@membrana/core`.

## Acceptance criteria (эпик)

- [ ] Product site отдаёт полный Device Board nav; harness pages там отсутствуют.
- [ ] Harness site отдаёт tooling/containers (+ bestiary, llm-calls, git).
- [ ] Оба `docs.json` проходят Mintlify object schema / `verify-mintlify-docs`.
- [ ] Panel atlas link указывает на harness URL.
- [ ] PR #1120 не влит; CLOSURE + archive карточек.
- [ ] Owner checklist выполнен или явно отложен с причиной.

---

## Промпт целиком (для вставки агенту)

> Всё ниже — задание координатору/исполнителю фазы. Читать OPEN + фазовый промпт.

### Кто ты

Координатор виртуальной команды Membrana (Vesnin). Перед кодом — план 1–2 абзаца +
список файлов. Не расширять scope без Issue. Не затирать Focus `tasks-workshop`.
Не создавать Issues до «ратифицирую».

### Что сделать

Развести Mintlify на два workspace/проекта по модели OPEN (layout A). Инварианты R1–R6.

### Запрещено

- Мержить tabs-as-final (#1120) как решение эпика.
- `git add -A` при параллельных сессиях; трогать чужой Focus в `DAY_SPRINT_ACTIVE`.
- Класть сырые deploy-логи в корень репо.
