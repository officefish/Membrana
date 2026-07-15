# ADR-0008 — Топология корня membrana.space: docs на /scenarios/docs (Mintlify subpath-proxy) + лендинг

> **Статус:** ACCEPTED · 2026-07-15
> Все owner-гейты подтверждены владельцем 2026-07-15: apex уже настроен (`A @ →
> 72.56.27.58`), **доки ПУБЛИЧНЫ** (subpath-путь, план B спящий), downloads →
> `/downloads`, media остаётся. Старт реализации — по слову владельца (карточки
> `root-domain-scenarios-docs` + `product-landing`).

## Контекст

Владелец: доки по `membrana.space/scenarios/docs`; `membrana.space/scenarios/` —
будущий community-маркет; корень `/` — **ближний** продуктовый лендинг (описание +
регистрация + загрузка клиентов). Консилиум `root-domain-topology-scenarios-docs-2026-07-15`
(20 реплик) + research docs-hosting + `DNS_DOMAIN_POLICY.md`.

## Наблюдаемое состояние (подтверждено, @2026-07-15)

| Факт | Где |
|------|-----|
| `membrana.space` = продукт; `mmbrn.tech` = фон (office/panel переехали) | `docs/deploy/DNS_DOMAIN_POLICY.md` |
| Корень `membrana.space/` НЕ обслуживается (только поддомены cabinet/media/…) | нет root-Caddyfile в `deploy/` |
| `cabinet.membrana.space` на cabinet-VPS (TLS/LE отработан) | cabinet deploy |
| Mintlify **штатно** поддерживает subpath через reverse-proxy (base path в дашборде) | research → Mintlify docs (custom-domain, reverse-proxy) |
| Mintlify subpath **несовместим с auth** | research |
| Деплой Mintlify = внешний community-репо, не синхронизирован с `apps/docs` | mdr-спринт |

## Решение

### Р1 — Docs: Mintlify subpath через Caddy reverse-proxy (не миграция)
`membrana.space/scenarios/docs` → Caddy `handle_path /scenarios/docs/* {
reverse_proxy <sub>.mintlify.site }` с рецептом research: `header_up Origin
<sub>.mintlify.site`, `header_up -Host`, forward `X-Forwarded-*`/`X-Real-IP`,
**POST разрешён**, docs-пути `no-cache, no-store, must-revalidate`, кэш только
`/mintlify-assets/_next/static/*`; base path — в дашборде Mintlify. Миграция с
Mintlify НЕ нужна. **Границы:** контент доков (`apps/docs`/внешний репо) не трогаем;
только роутинг.

### Р2 — Root-сервер на cabinet-VPS, спроектирован на ДВА ближних хендлера
Один Caddy site-блок `membrana.space` на cabinet-VPS: `/scenarios/docs/*` (Р1,
матчится ПЕРВЫМ) + `/` → **лендинг** (Р3). `/scenarios/*` (маркет) — будущий хендлер,
сейчас НЕ строим; shell-приложение `/scenarios` не заводим.

### Р3 — Лендинг `/` — ближний, отдельная карточка
Продуктовая страница membrana.space `/`: описание + CTA регистрация (→
`cabinet.membrana.space`) + загрузка клиентов (десктоп Studio-инсталлятор + веб-кабинет).
Хостинг — статика (`file_server`) на cabinet-VPS. Бренд — `docs/comms/canon/BRAND_TOKENS.md`.
До готовности — временная заглушка/редирект на `/` (не голый 404).

### Р4 — План B (fallback, СПЯЩИЙ)
**Владелец подтвердил: доки публичны (2026-07-15)** → идём subpath-путём, план B
не активен. Возврат к плану B — **subdomain `docs.membrana.space`** (CNAME →
Mintlify) — только если: (а) egress с 72.56.27.58 к `*.mintlify.site` окажется
заблокирован (ловушка ТСПУ/DPI, как office), ИЛИ (б) продукт когда-то захочет
приватные доки за тарифом. **Инвариант subpath: доки ПУБЛИЧНЫ.**

## Definition of Done (реализация docs-cutover)
- [x] ~~DNS apex~~ — **уже есть**: `A @ membrana.space → 72.56.27.58` (продуктовый
  VPS, там же cabinet+media). A-запись, ALIAS/flattening НЕ нужен. DNS корня не менять.
- [ ] Cleanup DNS: удалить устаревшую `A office → 72.56.27.58` (office на `office.mmbrn.tech`).
- [ ] Mintlify dashboard: base path `/scenarios/docs` + custom domain `membrana.space`.
- [ ] **Egress-preflight** с 72.56.27.58: `curl` к origin Mintlify (до cutover).
- [ ] Caddy site-блок `membrana.space` на 72.56.27.58: `/scenarios/docs/*` (proxy, Р1)
  ДО `/` (лендинг, Р3) + `/downloads` (статика инсталляторов, решение владельца).
- [ ] Live-валидация: ассеты/canonical под subpath не уехали в корень; POST-аналитика жива.

## Out of scope
- Маркет `/scenarios/` (будущее). Лендинг Р3 — **отдельная карточка** `product-landing`.

## Решено владельцем (2026-07-15)
- **media остаётся** на `media.membrana.space` (user-facing медиа/треки; будущий S3 — рано).
- **Download-артефакты десктопа → `membrana.space/downloads`** (статика на 72.56.27.58,
  хендлер root-блока). Ссылки загрузки лендинга (Р3) ведут туда.
- **DNS apex уже настроен** (`A @ → 72.56.27.58`); чистка устаревшей `A office`.

## Ссылки
- Консилиум: `docs/seanses/root-domain-topology-scenarios-docs-2026-07-15.md`
- Домены: `docs/deploy/DNS_DOMAIN_POLICY.md`
