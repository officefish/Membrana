# Деплой `@membrana/background-office`

Пошаговый чеклист для VPS/staging. Секреты **не коммитить** в git.

Связанные документы: [`packages/background-office/README.md`](../../packages/background-office/README.md), [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md), эпик O1–O4, GitHub [#60](https://github.com/officefish/Membrana/issues/60), [#61](https://github.com/officefish/Membrana/issues/61).

---

## Что уже в репозитории (O1 + O2)

| Артефакт | Назначение |
|----------|------------|
| `packages/background-office/Dockerfile` | multi-stage образ API |
| `packages/background-office/docker-compose.yml` | `office-api` (stateless) |
| `packages/background-office/.env.docker.example` | шаблон env для локального compose |
| `deploy/background-office.prod.compose.yml` | prod override (`127.0.0.1:3000`) |
| `deploy/generate-office-env.sh` | генерация `/etc/membrana/office.env` |
| `deploy/office-stack.sh` | `build` / `up` / `down` / `ps` / `logs` на VPS |
| `deploy/Caddyfile.office.template` | Caddy site block (O3), домен из `OFFICE_DOMAIN` |
| `scripts/_ssh-office-tls-setup.mjs` | установка/проверка TLS |
| `scripts/_ssh-office-smoke.mjs` | приёмка O4 (health, webhook, API) |
| `scripts/_ssh-office-show-token.mjs` | показать `API_INTERNAL_TOKEN` с VPS |
| `scripts/_sync-office-env-from-root.mjs` | ключи из корневого `.env` → пакет + VPS |

Корневые команды (локально): `yarn office:docker:build`, `yarn office:docker:up`, `yarn office:docker:prod:build`, `yarn office:docker:prod:up` (на VPS с `/etc/membrana/office.env`).

---

## 1. Данные для сеанса

Параметры сеанса берутся из корневого `.env` (значений в git нет):

```
VPS_HOST=$BACKGROUND_OFFICE_IPV4
SSH_USER=root
DOMAIN=$OFFICE_DOMAIN        # office.<домен>
GIT_BRANCH=main
```

> **Миграция #349 (2026-07-11):** office переезжает с общего VPS `72.56.27.58`
> (`office.membrana.space`, prod 2026-06-13 … cutover) на **выделенный VDS** с новым
> доменом. Старый инстанс гасится после cutover (OM3). Ветка `techies68` мертва —
> деплой только с `main`.

Секреты интеграций (`ANTHROPIC_API_KEY`, `LINEAR_*`, `GITHUB_TOKEN`) — в `/etc/membrana/office.env` на VDS.

Локальные SSH-хелперы (читают `.env`, пароль не коммитить):

```bash
node scripts/_ssh-office-check.mjs
node scripts/_ssh-office-prod-up.mjs   # sync O1+O2 артефактов и up на VDS
node scripts/_ssh-office-tls-setup.mjs # O3: Caddy site block
node scripts/_ssh-office-tls-setup.mjs --check-dns
node scripts/_ssh-office-smoke.mjs     # O4: prod smoke
```

| `.env` ключ | Назначение |
|-------------|------------|
| `BACKGROUND_OFFICE_IPV4` | IP VDS office — **обязателен** (fallback на `BACKGROUND_MEDIA_*` удалён, #349) |
| `BACKGROUND_OFFICE_PASSWORD` | root SSH — **обязателен** |
| `OFFICE_DOMAIN` | **обязателен** — дефолт удалён, протухший домен целился бы в старый прод |

## 2. Требования к VDS

| Параметр | Значение |
|----------|----------|
| Профиль | выделенный VDS: 2 vCPU / 4 GB RAM / 40–60 GB NVMe (запас под RAG-контур T3) |
| SSH user | `root` |
| DNS (O3) | `$OFFICE_DOMAIN` → A-record на IP VDS |
| Docker | Engine 24+ + Compose v2 |
| Stateful storage | **не нужен** (office stateless; диск — запас под будущий RAG) |
| Порты | API `127.0.0.1:3000` (не публичный); наружу **443** через Caddy (O3) |

До миграции office соседствовал с media на одном VPS; на выделенном VDS compose-проект
один — `membrana-office`.

---

## 3. Подготовка сервера (один раз)

На свежем VDS: установить Docker Engine 24+ / Compose v2, `git clone` репо в `/root/membrana`. Затем:

```bash
cd /root/membrana
git pull origin main

chmod +x deploy/generate-office-env.sh deploy/office-stack.sh

# только если office.env ещё нет:
sudo ./deploy/generate-office-env.sh /etc/membrana/office.env
# затем вручную замените REPLACE_BEFORE_PROD на реальные ключи (перед O4)
```

---

## 4. Деплой compose на сервере

```bash
cd ~/membrana

./deploy/office-stack.sh build
./deploy/office-stack.sh up
./deploy/office-stack.sh ps
curl -s http://127.0.0.1:3000/health
# → {"status":"ok","version":"0.1.0","uptime":…}
```

**Проверено (O2):** `2026-06-12` — `membrana-office-office-api-1` **healthy**, bind `127.0.0.1:3000`, 5 prompt files loaded.  
С Windows (до push в `main`): `node scripts/_ssh-office-prod-up.mjs` — tarball исходников + build/up на VDS.

Альтернатива без скрипта:

```bash
docker compose \
  -f packages/background-office/docker-compose.yml \
  -f deploy/background-office.prod.compose.yml \
  --env-file /etc/membrana/office.env \
  up -d --build
```

Обновление после `git pull`:

```bash
./deploy/office-stack.sh build
./deploy/office-stack.sh up
```

---

## 5. TLS (Caddy)

Office использует **тот же** Caddy на VPS, что и media — отдельный site block `office.caddy` в `/etc/caddy/Caddyfile.d/`.

**Текущий статус (2026-06-12):** Caddy v2.11.4, `office.caddy` установлен, Let's Encrypt для `office.membrana.space` выпущен, `https://office.membrana.space/health` → 200.

### 5a. Автоматический TLS (рекомендуется)

Caddy выпустит Let's Encrypt-сертификат, когда DNS укажет на VPS:

1. В панели DNS: **A** `office` → IP VDS (`$BACKGROUND_OFFICE_IPV4`).
2. Дождаться пропагации. Проверка:

```bash
node scripts/_ssh-office-tls-setup.mjs --check-dns
# или: dig +short A office.membrana.space
```

3. Установка / обновление site block:

```bash
node scripts/_ssh-office-tls-setup.mjs
```

4. После появления A-record (если HTTPS ещё не поднялся):

```bash
# на VPS
sudo systemctl reload caddy
curl -s https://office.membrana.space/health
```

Конфиг в репозитории: [`deploy/Caddyfile.office.template`](../../deploy/Caddyfile.office.template) — домен подставляется из `OFFICE_DOMAIN` скриптом tls-setup.

### 5b. Ручной сертификат

**Не использовать** CSR из `ssl/membrana/space/` — он для `www.membrana.space`, не для `office.`. Для поддомена нужен отдельный LE через Caddy или wildcard SAN.

### 5c. Legacy (ручная установка Caddyfile)

```bash
# отрендерить шаблон вручную (обычно это делает _ssh-office-tls-setup.mjs)
sed "s/{{OFFICE_DOMAIN}}/$OFFICE_DOMAIN/" deploy/Caddyfile.office.template | sudo tee /etc/caddy/Caddyfile.d/office.caddy
sudo systemctl reload caddy
curl -s "https://$OFFICE_DOMAIN/health"
```

---

## 6. Безопасность портов

| Слой | Bind | Доступ |
|------|------|--------|
| `office-api` (Docker) | `127.0.0.1:3000` | только localhost |
| Caddy | `0.0.0.0:443` | публичный HTTPS |

Проверка на VPS:

```bash
ss -tlnp | grep -E ':3000|:443'
curl -s http://127.0.0.1:3000/health
```

Порт `3000` **не** должен быть доступен с интернета напрямую.

---

## 7. Linear webhook (O4)

### 7a. Заполнить секреты на VPS

Перед webhook-тестом в Linear синхронизируйте ключи из корневого `.env`:

```bash
node scripts/_sync-office-env-from-root.mjs --restart
```

Или вручную на VPS:

```bash
# на VPS
sudo nano /etc/membrana/office.env
cd /root/membrana && ./deploy/office-stack.sh up
```

| Ключ | Где взять |
|------|-----------|
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) |
| `LINEAR_API_KEY` | Linear → Settings → API → Personal API keys |
| `LINEAR_WEBHOOK_SECRET` | Linear → Settings → API → Webhooks → **Signing secret** (создаётся с webhook) |
| `GITHUB_TOKEN` | GitHub → fine-grained PAT, scope `issues:read` на репо Membrana |

`LINEAR_API_KEY` и `LINEAR_WEBHOOK_SECRET` — **разные** строки.

### 7b. Регистрация webhook в Linear

1. Linear → **Settings** → **API** → **Webhooks** → **New webhook**.
2. Параметры:

| Поле | Значение |
|------|----------|
| URL | `https://office.membrana.space/webhooks/linear` |
| Signing secret | скопировать в `LINEAR_WEBHOOK_SECRET` в `office.env` |
| Events | по необходимости (для smoke достаточно любого тестового события) |

3. **Test webhook** в UI Linear → в логах office ожидается `200` и `{ "received": true }`:

```bash
node scripts/_ssh-office-check.mjs   # логи office-api
```

4. Локальная проверка подписи (без вывода секретов):

```bash
node scripts/_ssh-office-smoke.mjs
```

Unsigned POST → **403** (норма). Signed POST → **200** после настройки `LINEAR_WEBHOOK_SECRET`.

---

## 8. Приёмка O3

| Критерий | Команда |
|----------|---------|
| Local health | `curl http://127.0.0.1:3000/health` → 200 |
| HTTPS health | `curl https://office.membrana.space/health` → 200 |
| No public :3000 | `nmap -p 3000 <VPS_IP>` → closed/filtered |
| Caddy active | `systemctl is-active caddy` → active |

---

## 9. Smoke API (после секретов)

```bash
# health (без токена)
curl -s https://office.membrana.space/health

# токен с VPS (не коммитить вывод)
node scripts/_ssh-office-show-token.mjs

# полный smoke на VPS
node scripts/_ssh-office-smoke.mjs
node scripts/_ssh-office-smoke.mjs --external

# Linear issue (подставьте токен и id тикета)
curl -s "https://office.membrana.space/v1/linear/issue/MEM-60" \
  -H "X-Membrana-Token: <API_INTERNAL_TOKEN>"
```

Опционально на VPS: `LINEAR_SMOKE_ISSUE=TEC-42 node scripts/_ssh-office-smoke.mjs` (через env в remote script — задайте в `office.env` или экспортируйте перед smoke на VPS).

---

## 10. Чеклист приёмки O4

Отметьте после выполнения:

- [x] `/etc/membrana/office.env` — реальные ключи (sync из корневого `.env`, 2026-06-12)
- [x] `node scripts/_ssh-office-smoke.mjs` — 5 OK, 0 FAIL (signed webhook + Claude)
- [x] Все пункты §10 выполнены (2026-06-13); epic + O1–O4 в [`docs/tasks/archive/`](../tasks/archive/)
- [ ] **PR** merge в `main` (код в workspace)
- [ ] **`yarn task:close-github`** — #60, #61 (вечерний батч)
- [ ] **Linear R1/R3** — `linearId` в registry, Done (неблокирующий) — [`LINEAR_GITHUB_SYNC_REGULATION.md`](../prompts/LINEAR_GITHUB_SYNC_REGULATION.md)
- [x] `https://office.membrana.space/health` → 200 извне
- [x] `POST /webhooks/linear` без подписи → 403
- [x] `POST /v1/claude/ask` без токена → 401
- [x] README `packages/background-office` — раздел Production deployment
- [x] Секреты только на VPS, не в git

---

## Prod URL

```
HEALTH_URL=https://office.membrana.space/health
WEBHOOK_URL=https://office.membrana.space/webhooks/linear
DEPLOYED_AT=2026-06-13
EPIC_STATUS=archived (background-office-v1, O1-O4)
NOTES=smoke 5OK; Linear webhook live; PR pending; task:close-github for #60 #61
```
