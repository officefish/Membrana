# ADR 0005 — panel-users store: первый персистентный стейт office (реестр партнёров панели)

> **Статус:** ACCEPTED · 2026-07-14 (консилиум
> [`panel-promo-access-2026-07-14.md`](../seanses/panel-promo-access-2026-07-14.md),
> развилки 2–4; LGTM Teamlead)

## Контекст

Эпик `panel-partner-access` (#463): регистрация партнёров по промокоду + owner-раздел
«Пользователи» с живыми галочками прав на разделы. ADR 0004 Р2 фиксирует office как
stateless — верно для drift-журнала (записи восстановимы producer'ами), но реестр
пользователей/грантов **невоспроизводим**: его не пересоздаст никакой прогон.
Ресёрч (Perplexity, 2 запроса в консилиуме): живой отзыв и админ-тумблеры недостижимы
в чистом stateless (только TTL/ротация секрета); канонический паттерн — минимальная
персистентность + снапшот грантов в подписанном токене + эпоха версии прав.

## Решение

### Р1 — Область: ЕДИНСТВЕННЫЙ стейт office = реестр панели; ADR 0004 не правится

`packages/background-office/src/modules/panel-users/` — модуль с JSON-store.
ADR 0004 остаётся каноном для остального office (drift — in-memory). Любой следующий
кандидат в персистентность — новый ADR, не расширение этого.

### Р2 — Хранилище: один JSON-файл на docker volume, атомарная запись

- Путь: `PANEL_USERS_STORE_PATH` (env), дефолт `/var/lib/membrana-office/panel-users.json`.
- Volume объявляется и в базовом `docker-compose.yml`, и в
  `deploy/background-office.prod.compose.yml` — файл переживает редеплой.
- Запись: `tmp` в том же каталоге → `rename` (атомарно на одном fs); in-memory кэш —
  единственный источник чтения в рантайме, диск читается один раз на старте.
- Нет файла на старте → пустой реестр + **громкий warning** (видимая деградация,
  канон ADR 0004): партнёрские сессии не роняются, но грантов store не отдаёт.
- SQLite/Prisma/Redis отклонены: 10–50 записей, один узел, нативные зависимости
  в docker-образе не окупаются.
- Файл — единственная невоспроизводимая часть office: бэкап-строка в
  [`BACKGROUND_OFFICE_DEPLOY.md`](../deploy/BACKGROUND_OFFICE_DEPLOY.md) обязательна.

### Р3 — Инвариант: store — истина, cookie — кэш отображения

Session-cookie партнёра несёт снапшот `{role:'ally', sub:'user:<id>', grants, pv}`.
`GET /v1/panel/auth/me` сверяет `pv` с `permVersion` пользователя в store:

| Состояние | Поведение /me |
|-----------|----------------|
| `pv` совпал | identity как есть |
| `pv` отстал | **тихое переиздание** cookie со свежими `grants` (не разлогин) |
| пользователь `revoked` / не найден | cookie гасится → `public` |

Каждое изменение грантов (галочка, revoke) инкрементит `permVersion`. Будущие
приватные серверные ручки обязаны проверять store (guard-предикат), НЕ снапшот cookie.

### Р4 — Промокоды: серверные, отзываемые

`{code: base32×16 (CSPRNG, ~80 бит), label, grants, expiresAt, maxUses, usedCount,
revoked, createdAt}` — живут в том же store; чеканка только ручкой owner-UI
(секретов в браузере нет). Старые HMAC ally-invite (`/v1/panel/auth/invite`)
продолжают работать без миграции. Аудит (регистрации, изменения грантов, revoke)
— массив в том же файле, кап 500 записей.

## Q3

Rate-limit регистрации 5/час/IP поверх общего панельного лимитера; ошибки регистрации
не различают причину наружу; admin-ручки отдают **404** не-owner'у; `no-store` ставит
существующий guard; реестр никогда не попадает в git/статику; ротация
`PANEL_SESSION_SECRET` — аварийный сброс всех сессий (задокументировано в runbook).

## Ссылки

- Консилиум: [`panel-promo-access-2026-07-14.md`](../seanses/panel-promo-access-2026-07-14.md)
- ADR 0004 (stateless-канон, не правится): [`ADR-0004-drift-anchor-journal-transport.md`](./ADR-0004-drift-anchor-journal-transport.md)
- Эпик: Issue #463, промпт [`PANEL_PARTNER_ACCESS_EPIC_PROMPT.md`](../prompts/PANEL_PARTNER_ACCESS_EPIC_PROMPT.md)
