# Деплой Affine на `strategy.mmbrn.tech` (office VDS)

> Runbook эпика [`strategy-affine-routing`](../prompts/STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md)
> (#1156). Scope **B**: только strategy + Affine.  
> **Не трогать:** `docs.mmbrn.tech` (product Mintlify), `harness.mmbrn.tech`,
> `office.mmbrn.tech`, `panel.mmbrn.tech`, path `apps/docs`.  
> DNS-канон: [`DNS_DOMAIN_POLICY.md`](./DNS_DOMAIN_POLICY.md).

**W1 (этот документ + capacity gate) — без `compose up`.** Install = фаза W2,
только после слова владельца и зелёного capacity gate.

---

## Замок

| Параметр | Значение |
|----------|----------|
| Поддомен | `strategy.mmbrn.tech` |
| Host | office VDS **`176.124.218.4`** (тот же Docker + Caddy, что office/panel) |
| Назначение | Affine self-host — поверхность стратегических документов |
| Внешний URL | `AFFINE_SERVER_EXTERNAL_URL=https://strategy.mmbrn.tech` |

---

## Owner checklist (не агент)

Шаги владельца — до/вокруг LE и первого admin. Агент DNS в Timeweb **не** меняет.

- [x] **DNS (Timeweb):** A-запись `strategy` → `176.124.218.4` (gate `[go]` 2026-07-25).
- [x] Дождаться пропагации; перед LE — `yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4` → `[go]`.
- [x] После W2 up + HTTPS: первый **admin** Affine в UI (владелец «Готово» 2026-07-25;
      email verify в v1 не требуется).
- [ ] При OOM / нехватке диска — **апгрейд тарифа** VDS (не «ещё контейнер»).

## Surface (W3)

| Куда | Ссылка |
|------|--------|
| Affine UI | **https://strategy.mmbrn.tech** |
| Panel | раздел «Стратегия» (`strategic-docs`) → кнопка на URL выше |
| Docs note | [`docs/containers/strategic-docs/SURFACE.md`](../containers/strategic-docs/SURFACE.md) |

Полный git↔Affine sync — вне scope v1.

---

## Capacity gate (обязателен перед first `compose up`)

Пороги (эпик / OPEN, замер 2026-07-25):

| Условие | Вердикт |
|---------|---------|
| `MemAvailable < 1.5 GiB` | **STOP** — эскалация владельцу |
| Disk `/` avail `< 12G` | **STOP** — эскалация владельцу |
| иначе | **GO** — можно W2 install |

### Readonly probe

Скрипт (парсит `free`/`df` на VDS, ничего не пишет):

```bash
yarn affine:capacity-gate
# [go] / [no-go]; exit 0 = go, 4 = no-go
```

Эквивалент руками (yarn 4: **без** `--` перед командой):

```bash
yarn office:ssh 'free -b; echo ---; df -B1 /'
```

Baseline 2026-07-25: MemAvailable ~2.8 GiB, disk avail ~16G — тонкий запас
(ниже комфортных 20G free / 4+ GB host для Affine docs). После стабилизации —
рекомендация апгрейда до **8 GB RAM / ≥80 GB disk** (CLOSURE / W4).

---

## Layout на VDS (W2)

| Путь | Назначение |
|------|------------|
| `/opt/membrana-affine/` | compose + рабочие файлы на хосте (не в git-дереве деплоя office) |
| `/opt/membrana-affine/.env` | секреты и `AFFINE_SERVER_EXTERNAL_URL` — **только на VDS**, вне git |
| `/opt/membrana-affine/postgres/` | volume Postgres |
| `/opt/membrana-affine/storage/` | Affine upload/blob storage |
| `/opt/membrana-affine/config/` | Affine config (private key и т.п.) |
| `/opt/membrana-affine/backups/` | точка бэкапа volumes (cron/ручной dump — W3) |

В репо (шаблон без секретов): [`deploy/affine/`](../../deploy/affine/) — compose pin
upstream AFFiNE stable + bind `127.0.0.1` + memory limits; Caddy template
[`deploy/Caddyfile.strategy.template`](../../deploy/Caddyfile.strategy.template).
Живые данные и `.env` **не** коммитить.

### Install (W2)

```bash
yarn affine:capacity-gate   # [go] обязателен
yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4
yarn affine:install         # scripts/_ssh-affine-install.mjs → /opt/membrana-affine
```

После up: `https://strategy.mmbrn.tech` → Affine UI / setup. **Первый admin** —
только владелец в браузере (агент bootstrap не делает).

### Compose constraints (R3)

- Официальный AFFiNE docker self-host (revision **stable**).
- Сервисы: app + Postgres + Redis.
- Bind портов **только** `127.0.0.1:<port>` (дефолт upstream часто `3010` —
  на office VDS media нет; office-api занял `127.0.0.1:3000` — не конфликтовать).
- Наружу только Caddy `:443`.
- Memory limits в compose; AI-фичи Affine в v1 **выключены**.
- Env минимум: `AFFINE_SERVER_EXTERNAL_URL=https://strategy.mmbrn.tech` (или
  эквивалент `AFFINE_SERVER_HTTPS` + `AFFINE_SERVER_HOST`).

### Секреты (R5)

| Где | Что |
|-----|-----|
| `/opt/membrana-affine/.env` | `DB_PASSWORD`, Redis password, `AFFINE_PRIVATE_KEY` (если задаёте вручную), external URL |
| git | только примеры `*.env.example` без реальных значений |
| `/etc/membrana/office.env` | **не** смешивать с Affine — office остаётся своим контуром |

---

## Caddy (W2 — отдельный site-block)

Паттерн как у panel/office: файл в `/etc/caddy/Caddyfile.d/strategy.caddy`,
**отдельный** site block — без правки существующих `office.caddy` / `panel.caddy`
и без двойного `import` (урок: ambiguous site definition).

Черновик site-block (канон — [`deploy/Caddyfile.strategy.template`](../../deploy/Caddyfile.strategy.template)):

```caddy
strategy.mmbrn.tech {
	@socketio path /socket.io/*
	handle @socketio {
		reverse_proxy 127.0.0.1:3010 {
			transport http {
				read_timeout 0
				write_timeout 0
			}
		}
	}

	encode gzip
	reverse_proxy 127.0.0.1:3010 {
		transport http {
			read_timeout 0
			write_timeout 0
		}
	}
}
```

**socket.io path:** `/socket.io/` на корне домена (не `/graphql`). Caddy `reverse_proxy` апгрейдит WebSocket по умолчанию; отдельный `handle @socketio` — явные таймауты для long-lived sync.

### Smoke: socket.io через Caddy

```bash
curl.exe -s "https://strategy.mmbrn.tech/socket.io/?EIO=4&transport=polling"
# ожидание: 0{"sid":"…","upgrades":["websocket"],…}
```

Если polling OK, а `--push` падает — см. [`PUBLISH.md`](../containers/strategic-docs/PUBLISH.md) (auth cookie vs bearer token).

Порядок W2:

1. `yarn affine:capacity-gate` → `[go]`
2. Owner DNS → `yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4` → `[go]`
3. Разложить compose под `/opt/membrana-affine`, `.env` на VDS
4. `docker compose up -d` (только после 1–2)
5. Положить `strategy.caddy` → `caddy validate` → `systemctl reload caddy`
6. Записать в OPEN: `docker stats` + повторный `MemAvailable`

**Не выпускать LE** до DNS-гейта `[go]` (урок OM4-C / panel).

---

## Backup volumes (W3)

Факт post-W2 (readonly probe 2026-07-25, Affine up ~55 min после admin bootstrap):

| Путь | Назначение | Размер (замер) |
|------|------------|----------------|
| `/opt/membrana-affine/postgres/` | Postgres data dir | ~68 MiB |
| `/opt/membrana-affine/storage/` | Affine upload/blob | ~4 KiB (пусто) |
| `/opt/membrana-affine/config/` | `private.key` и конфиг | ~8 KiB |
| `/opt/membrana-affine/backups/` | точка снимков | пусто до первого dump |
| `/opt/membrana-affine/.env` | секреты (не в tar публично) | mode `600` |

Каталог снимков: `/opt/membrana-affine/backups/YYYY-MM-DD/`.

### Ручной снимок (не разрушает живой Affine)

Логический dump Postgres **без** `compose down` (предпочтительно для регулярного бэкапа):

```bash
yarn office:ssh 'DAY=$(date -u +%F); DEST=/opt/membrana-affine/backups/$DAY; mkdir -p "$DEST" && docker exec affine_postgres pg_dump -U affine -Fc affine > "$DEST/affine.dump" && tar -C /opt/membrana-affine -czf "$DEST/storage-config.tgz" storage config && ls -lah "$DEST"'
```

Перед **разрушающими** операциями (переустановка volumes, смена major Postgres):

1. Capacity: disk `/` avail ≥ 12G (`yarn affine:capacity-gate`).
2. `cd /opt/membrana-affine && docker compose stop`
3. `DAY=$(date -u +%F); DEST=backups/$DAY; mkdir -p "$DEST" && tar -czf "$DEST/volumes.tgz" postgres storage config`
4. Проверить размер архива; только потом — destructive steps / `compose up -d`.

Cron автоматизации — follow-up (не DoD v1); минимум — путь и процедура выше.

---

## Антипаттерны

- `compose up` без capacity gate или при `[no-go]`.
- Публиковать порты Affine на `0.0.0.0` / без Caddy.
- Править DNS/Caddy для `docs.` / `harness.` / `office.` / `panel.` «заодно».
- Класть `.env` Affine в git или в `/etc/membrana/office.env`.
- Двойной import одного site-block в Caddyfile.
- Затирать Focus `tasks-workshop` в `DAY_SPRINT_ACTIVE` (только Also open).

---

## Связанные команды

| Команда | Когда |
|---------|--------|
| `yarn affine:capacity-gate` | перед W2 `up` (и при сомнении в запасе) |
| `yarn affine:install` | W2: compose + Caddy `strategy.caddy` + up (после capacity [go]) |
| `yarn office:ssh '…'` | readonly probe / `docker stats` |
| `yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4` | перед LE |
| Office deploy | [`BACKGROUND_OFFICE_DEPLOY.md`](./BACKGROUND_OFFICE_DEPLOY.md) — не смешивать стеки |
| Panel deploy | [`PANEL_DEPLOY.md`](./PANEL_DEPLOY.md) — не трогать при Affine install |
