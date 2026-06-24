# Промпт: background-office O3 — TLS, DNS, публичный HTTPS

> **Task-промпт для агента-разработчика.**
> Эпик: [`BACKGROUND_OFFICE_V1_EPIC_PROMPT.md`](./BACKGROUND_OFFICE_V1_EPIC_PROMPT.md).
> Зависит от: `background-office-o2-prod-compose` (merged).
> Размер: **M**. Ожидаемый артефакт: **1 PR** + работающий `https://office.membrana.space/health`.
> Реестр: `id` = `background-office-o3-tls-deploy`.
> GitHub Issue: [#61](https://github.com/officefish/Membrana/issues/61).

---

## Промпт целиком (для вставки агенту)

### Кто ты

DevOps-инженер Membrana (**Vesnin**). Caddy reverse proxy на том же VPS, что media.

### Что построить

1. **`deploy/Caddyfile.office.membrana.space`** — `office.membrana.space` → `127.0.0.1:3000`.
2. **`scripts/_ssh-office-tls-setup.mjs`** — install/reload Caddy site block (по образцу `_ssh-media-tls-setup.mjs`).
3. **`docs/deploy/BACKGROUND_OFFICE_DEPLOY.md`** §5–§8 — TLS, DNS A-record, smoke `curl https://office.membrana.space/health`.
4. Обновить **`docs/BACKGROUND_SERVERS.md`** — prod URL `office.membrana.space`.

### DNS

- **A** `office.membrana.space` → `72.56.27.58` (тот же VPS, что `media.`).
- TLS: **Let's Encrypt** через Caddy (ручной CSR из `ssl/` не использовать).

### Требования

- Порты 80/443 уже открыты (media Caddy); добавить второй site block в `/etc/caddy/Caddyfile.d/`.
- Office API bind только `127.0.0.1:3000` (не публичный напрямую).
- HTTP → HTTPS редирект (Caddy default).

### Definition of Done

- [ ] `https://office.membrana.space/health` → 200 извне (после DNS)
- [ ] `office-api` не слушает `0.0.0.0:3000` с интернета
- [ ] Документ `docs/deploy/BACKGROUND_OFFICE_DEPLOY.md` полный чеклист
- [ ] Секреты не в git
- [ ] LGTM Teamlead

### Out of scope

- Linear webhook registration (→ O4)
- HSTS в коде NestJS (достаточно Caddy)
- Отдельный VPS для office

### Порядок ролей

1. **Teamlead** — approve subdomain `office.` (не `api.`)
2. **Структурщик** — Caddyfile, SSH script, docs

---

## Заметки для постановщика

После DNS: `node scripts/_ssh-office-tls-setup.mjs --check-dns`.
После merge: `yarn task:archive background-office-o3-tls-deploy --notes "PR #…"`.
