# DNS / Domain Policy — Membrana

> Канон разделения доменов. Заведён по слову владельца 2026-07-15 (office/panel
> переехали на `mmbrn.tech`; product-домен `membrana.space`). Грунтует консилиум
> по хостингу документации (`membrana.space/scenarios/docs`). Решение владельца
> 2026-08-01 развело актуальные Mintlify-поверхности на `product.mmbrn.tech` и
> `harness.mmbrn.tech`; прежний subpath остаётся историей топологии.

## Принцип разделения

| Домен | Назначение | Кто видит |
|-------|-----------|-----------|
| **`membrana.space`** | **Продукт** — всё, что видит пользователь/клиент | публичный |
| **`mmbrn.tech`** | **Команда / фоновая инфра** — сервисы разработки и бэкенда, не для конечного пользователя | внутренний |

Правило сервисов: **user-facing → `membrana.space`; background/team →
`mmbrn.tech`.** Документация — явное исключение владельца: Product живёт на
`product.mmbrn.tech`, рабочий контур — на `harness.mmbrn.tech`. При остальных
развилках «где разместить сервис» решает адресат, а не удобство.

## Карта поддоменов (состояние 2026-08-02)

### `mmbrn.tech` — команда / фон
| Поддомен | Сервис | Статус |
|----------|--------|--------|
| `office.mmbrn.tech` | `@membrana/background-office` (VDS 176.124.218.4, Caddy+LE) | ✅ актуален — **не переназначать** |
| `panel.mmbrn.tech` | office panel (эпик #438) | ✅ актуален — **не переназначать** |
| `harness.mmbrn.tech` | Mintlify harness (tooling docs) | ✅ live — **не переназначать** |
| `strategy.mmbrn.tech` | Affine self-host на office VDS `176.124.218.4` (эпик #1156, scope B) | 🟡 DNS owner + install W2 — канон/runbook: [`STRATEGY_AFFINE_DEPLOY.md`](./STRATEGY_AFFINE_DEPLOY.md) |
| `product.mmbrn.tech` | Product Mintlify (`apps/docs`: Device Board, узлы, тарифы) | ⏸ owner DNS + Mintlify dashboard; репозиторный контракт готов |
| `other.mmbrn.tech` | (уточнить назначение) | ❓ |

**Карта имён (docs / harness / strategy):**

```text
product.mmbrn.tech   → Mintlify Product (apps/docs)     — owner publish step
harness.mmbrn.tech   → Mintlify harness                 — already live
strategy.mmbrn.tech  → Affine self-host (office VDS)    — strategy-affine-routing
```

Owner DNS для strategy (Timeweb): A `strategy` → `176.124.218.4`. Агент DNS не
меняет. Перед LE — `yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4`.

### `membrana.space` — продукт
| Путь/поддомен | Сервис | Статус |
|---------------|--------|--------|
| `cabinet.membrana.space` | `@membrana/cabinet` (клиентский кабинет) | ✅ |
| `cabinet-api.membrana.space` | cabinet API | ✅ |
| `media.membrana.space` | `@membrana/background-media` — медиафайлы, в т.ч. **пользовательские треки** | ✅ **остаётся** (решение владельца 2026-07-15: media = реально media, user-facing; НЕ фон) |
| `membrana.space` (apex, `@`) + `www` | root-Caddy: минимальная страница + `/downloads`; `www` → 301 на apex | ✅ **живёт с 2026-07-16** (`deploy/Caddyfile.root.membrana.space`, TLS/LE выпущен) |
| `membrana.space/scenarios/docs` | прежний маршрут документации (ADR-0008) | ⛔ **не настраивать**: заменён отдельным Product-доменом `product.mmbrn.tech` |
| `membrana.space/downloads` | инсталляторы клиентов (десктоп Studio) — статика | ✅ **живёт с 2026-07-16**: `/var/www/membrana/downloads`, `Membrana-Studio-Setup-0.1.0.exe` (131.4 МБ), range-запросы работают |
| `membrana.space/scenarios/` | community-маркет сценариев | 🔮 будущее |

### Текущие DNS-записи (reg.ru, ns1/ns2.reg.ru) — @2026-07-15

| Запись | Значение | Комментарий |
|--------|----------|-------------|
| `A @` (apex) | `72.56.27.58` | ✅ **корень уже указывает на продуктовый VPS** (A-запись, ALIAS не нужен) |
| `A cabinet` | `72.56.27.58` | ✅ |
| `A media` | `72.56.27.58` | ✅ |
| `A www` | `72.56.27.58` | ✅ |
| `A office` | `72.56.27.58` | ⚠️ **УСТАРЕЛА** — office переехал на `office.mmbrn.tech` (176.124.218.4); удалить |

**Ключевое:** `72.56.27.58` = продуктовый VPS (cabinet + media + postgres; office
с него снят при миграции #349, media/cabinet не тронуты). Apex `membrana.space` уже
резолвится сюда → **DNS для корня менять НЕ надо**, остаётся добавить Caddy site-блок
`membrana.space` на 72.56.27.58 (лендинг `/` + `/scenarios/docs` proxy + `/downloads`).

### Устаревшее (почистить)
| Артефакт | Причина |
|----------|---------|
| `office.membrana.space` (ссылки, `Caddyfile.office.template`) | office переехал на `mmbrn.tech` |
| `Caddyfile.panel.template` (в контексте membrana.space) | panel переехал на `panel.mmbrn.tech` |

`Caddyfile.media.membrana.space` — **актуален** (media остаётся на product-домене, см. ниже).

## Открытые вопросы (решение владельца / консилиум)

1. ~~`media.membrana.space` — переезд на `mmbrn.tech`?~~ **РЕШЕНО (владелец 2026-07-15):
   media ОСТАЁТСЯ на `membrana.space`.** media = реально медиафайлы, включая
   пользовательские треки → это user-facing контент, а не фоновая инфра, принцип
   разделения к нему не применяется. Возможный будущий переезд на S3/CDN (Amazon и
   подобные) — рано обсуждать, НЕ сейчас.
2. ~~**Корень `membrana.space`** не обслуживается~~ **РЕШЕНО 2026-07-16:** root-Caddy
   поднят (`deploy/Caddyfile.root.membrana.space`, установка —
   `node scripts/_ssh-root-site-setup.mjs --execute`). Отдаёт минимальную страницу
   (загрузки / документация борда / регистрация в кабинете) и `/downloads`.
   Полный лендинг — карточка `product-landing`. Документация опубликована отдельной
   поверхностью и не требует base path или proxy на продуктовом VPS.
3. ~~**Хостинг документации** на `membrana.space/scenarios/docs`~~ **РЕШЕНО
   2026-08-01:** прежний subpath не настраивать. Product Mintlify получает
   `product.mmbrn.tech`, Harness остаётся на `harness.mmbrn.tech`.
4. **`other.mmbrn.tech`** — уточнить, что это.

## Ловушки (из истории)

- Деплой Mintlify = **отдельный репозиторий** (`mintlify-community/docs-membrana-...`),
  НЕ синхронизирован с `apps/docs` (mdr-спринт 2026-07-09). Смена хостинга доков
  затрагивает этот внешний репо.
- office-переезд: блок ТСПУ был IP-specific (Timeweb), сменён IP на том же МСК-VDS;
  KZ/NL-переезд не понадобился (см. office-vds-migration).
