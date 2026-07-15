# DNS / Domain Policy — Membrana

> Канон разделения доменов. Заведён по слову владельца 2026-07-15 (office/panel
> переехали на `mmbrn.tech`; product-домен `membrana.space`). Грунтует консилиум
> по хостингу документации (`membrana.space/scenarios/docs`).

## Принцип разделения

| Домен | Назначение | Кто видит |
|-------|-----------|-----------|
| **`membrana.space`** | **Продукт** — всё, что видит пользователь/клиент | публичный |
| **`mmbrn.tech`** | **Команда / фоновая инфра** — сервисы разработки и бэкенда, не для конечного пользователя | внутренний |

Правило: **user-facing → `membrana.space`; background/team → `mmbrn.tech`.** При
развилке «где разместить сервис» — по тому, кому он адресован, а не по удобству.

## Карта поддоменов (состояние 2026-07-15)

### `mmbrn.tech` — команда / фон
| Поддомен | Сервис | Статус |
|----------|--------|--------|
| `office.mmbrn.tech` | `@membrana/background-office` (VDS 176.124.218.4, Caddy+LE) | ✅ актуален |
| `panel.mmbrn.tech` | office panel (эпик #438) | ✅ актуален |
| `other.mmbrn.tech` | (уточнить назначение) | ❓ |

### `membrana.space` — продукт
| Путь/поддомен | Сервис | Статус |
|---------------|--------|--------|
| `cabinet.membrana.space` | `@membrana/cabinet` (клиентский кабинет) | ✅ |
| `cabinet-api.membrana.space` | cabinet API | ✅ |
| `media.membrana.space` | `@membrana/background-media` — медиафайлы, в т.ч. **пользовательские треки** | ✅ **остаётся** (решение владельца 2026-07-15: media = реально media, user-facing; НЕ фон) |
| `www.membrana.space` / корень | лендинг | 🔜 планируется (роадмап: лендинг → кабинет + скачать десктоп) |
| `membrana.space/scenarios/` | community-маркет пользовательских сценариев | 🔮 будущее |
| `membrana.space/scenarios/docs` | документация (сейчас Mintlify) | 🎯 желаемое (консилиум по хостингу) |

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
2. **Корень `membrana.space`** сейчас **не обслуживается** (только поддомены; Caddy
   root-блока нет). Лендинг + `/scenarios/*` требуют корневого сервера — прежде
   чем `/scenarios/docs` станет достижим.
3. **Хостинг документации** на `membrana.space/scenarios/docs` — **консилиум по
   топологии корня**. Research (2026-07-15) поправил ранний пессимизм: Mintlify
   **штатно поддерживает subpath** (дашборд «Host at» + base path), через
   reverse-proxy: Caddy `handle_path /scenarios/docs/* { reverse_proxy
   <subdomain>.mintlify.site }` (set `Origin`, strip `Host`, POST разрешить,
   docs-пути `no-cache`). **Миграция НЕ нужна.** Условие: доки остаются
   ПУБЛИЧНЫМИ (subpath несовместим с Mintlify-auth). Только Nginx-пример у
   Mintlify → выверить Caddy-заголовки. Консилиум решает не «можно ли доки», а
   топологию корня (лендинг + `/scenarios` shell + docs + порядок).
4. **`other.mmbrn.tech`** — уточнить, что это.

## Ловушки (из истории)

- Деплой Mintlify = **отдельный репозиторий** (`mintlify-community/docs-membrana-...`),
  НЕ синхронизирован с `apps/docs` (mdr-спринт 2026-07-09). Смена хостинга доков
  затрагивает этот внешний репо.
- office-переезд: блок ТСПУ был IP-specific (Timeweb), сменён IP на том же МСК-VDS;
  KZ/NL-переезд не понадобился (см. office-vds-migration).
