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

- [ ] **DNS (Timeweb):** A-запись `strategy` → `176.124.218.4` (или CNAME на тот же
      хост, если так принято для panel; канон — A на office IP).
- [ ] Дождаться пропагации; перед LE — `yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4` → `[go]`.
- [ ] После W2 up + HTTPS: первый **admin** Affine в UI.
- [ ] При OOM / нехватке диска — **апгрейд тарифа** VDS (не «ещё контейнер»).

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

Опционально в репо (шаблон без секретов, W2): `deploy/affine/` — compose overlay /
документированный pin upstream AFFiNE stable compose. Живые данные и `.env` **не**
коммитить.

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

Черновик site-block (порт уточнить по фактическому bind после compose):

```caddy
strategy.mmbrn.tech {
	encode gzip
	reverse_proxy 127.0.0.1:3010
}
```

Порядок W2:

1. `yarn affine:capacity-gate` → `[go]`
2. Owner DNS → `yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4` → `[go]`
3. Разложить compose под `/opt/membrana-affine`, `.env` на VDS
4. `docker compose up -d` (только после 1–2)
5. Положить `strategy.caddy` → `caddy validate` → `systemctl reload caddy`
6. Записать в OPEN: `docker stats` + повторный `MemAvailable`

**Не выпускать LE** до DNS-гейта `[go]` (урок OM4-C / panel).

---

## Backup volumes

Минимум для W3:

- Путь данных: `/opt/membrana-affine/postgres`, `storage`, `config`.
- Снимки: `/opt/membrana-affine/backups/YYYY-MM-DD/` (tar/`pg_dump` — детализация в W3).
- Перед разрушающими операциями — остановить compose, скопировать volumes, проверить размер на диске (gate 12G).

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
| `yarn office:ssh '…'` | readonly probe / `docker stats` |
| `yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4` | перед LE |
| Office deploy | [`BACKGROUND_OFFICE_DEPLOY.md`](./BACKGROUND_OFFICE_DEPLOY.md) — не смешивать стеки |
| Panel deploy | [`PANEL_DEPLOY.md`](./PANEL_DEPLOY.md) — не трогать при Affine install |
