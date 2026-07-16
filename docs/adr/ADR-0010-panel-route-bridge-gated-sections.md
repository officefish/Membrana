# ADR-0010 — Маршрут-мост панели для гейтнутых визуальных разделов

> **Статус:** ACCEPTED · 2026-07-16
> Расширяет [ADR-0008](./ADR-0008-root-domain-scenarios-docs-topology.md) (топология доменов).
> Реализует вердикт консилиума `graphify-research-tree-panel-sections-2026-07-16` (GRP1).

## Контекст

Визуальные блоки (graphify — граф кода; research-tree — граф знаний) публикуются НЕ
публично, а за регуляцией доступа. Консилиум решил: блоки — **независимые
SPA-артефакты**, панель отдаёт их статику через **маршрут-мост** за общим гейтом;
доступ решает office (реестр секций + `canAccessSection`), reverse_proxy лишь
исполняет вердикт. Нужно зафиксировать топологию и границу безопасности.

## Наблюдаемое состояние (@2026-07-16)

| Факт | Где |
|------|-----|
| Панель на `panel.mmbrn.tech`, Caddy: `/v1/*`→office:3000, SPA-статика из `/opt/membrana-panel/dist` | `deploy/Caddyfile.panel.template` |
| Гейт разделов панели — **UX-only**, «данные бордов публичны» | `apps/panel/src/lib/sections.ts:16` |
| HMAC session-cookie + `resolveIdentity`/`canAccess` | `packages/background-office/.../panel-auth-core.ts` |
| Домены: `mmbrn.tech` = команда/фон (внутреннее) | ADR-0008, DNS_DOMAIN_POLICY |

## Решение

### Р1 — Блоки живут на `panel.mmbrn.tech` разделами, НЕ отдельными поддоменами
graphify и research-tree — разделы панели, отдаются маршрут-мостом
`panel.mmbrn.tech/panel/section/<id>/*`. Отдельные `graphify.mmbrn.tech` и т.п. **не
заводим** (консилиум: без дублирования гейта на origin). `mmbrn.tech` (внутреннее)
корректен — блоки гейтнуты, не публичный продукт `membrana.space`.

### Р2 — Маршрут-мост = реальная security-граница (не UX-гейт)
В отличие от существующих бордов («данные публичны»), статика блоков отдаётся
**только** при валидной подписи и доступе. Caddy `handle_path /panel/section/<id>/*`
делает `forward_auth` на office `/v1/panel/gate/<id>`; 2xx → `file_server`, иначе deny.

### Р3 — Единственный арбитр — office; в Caddy логики ролей нет
office держит реестр `BRIDGE_GATED_SECTIONS` (`<id> → minRole`) и предикат
`canAccessSection`. Caddy не знает ролей — только зовёт гейт и исполняет 204/403/404.

### Р4 — Панель не импортирует исходники блоков
Раздел панели — `iframe` на мост, без прямых импортов `apps/panel` ↔ блоки (линт
границ; граф зависимостей без циклов). Presentation блока сменный (инвариант «живой
мозг» — будущий дизайн-эпик).

### Р5 — Статика блоков вне репо панели
Артефакты блоков заливаются на VDS (`/opt/membrana-<block>/`), не в `apps/panel/dist`.

## Definition of Done
- [ ] office: `/v1/panel/gate/:sectionId` + `BRIDGE_GATED_SECTIONS` + контракт-тест (подпись×роль×раздел → 204/403/404).
- [ ] Caddy панели: `handle_path /panel/section/graphify/*` с `forward_auth` + `file_server`.
- [ ] Панель: раздел graphify (owner) — iframe на мост, без импорта блока.
- [ ] Живой смоук: owner видит граф; не-owner/аноним — 403.

## Out of scope
- Гранты (`grant:graphify`/`grant:research-tree`) и понижение graphify до техпартнёров — **GRP2**.
- research-tree за гейтом + git-time-travel — **GRP3**.
- Полировка graphify (скоупинг/тема/вендоринг) для публичного — **#529 / GRP4**.

## Ссылки
- Консилиум: `docs/seanses/graphify-research-tree-panel-sections-2026-07-16.md`
- Эпик: `docs/prompts/GRAPHIFY_RESEARCH_TREE_PANEL_SECTIONS_EPIC_PROMPT.md` (GRP1–4)
