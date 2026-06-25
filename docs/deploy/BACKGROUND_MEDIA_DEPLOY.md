# Деплой `@membrana/background-media`

Пошаговый чеклист для VPS/staging. Секреты **не коммитить** в git.

Связанные документы: [`packages/background-media/README.md`](../../packages/background-media/README.md), [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md), промпт A5c, GitHub [#59](https://github.com/officefish/Membrana/issues/59).

---

## Что уже в репозитории (A5b + A5c prep)

| Артефакт | Назначение |
|----------|------------|
| `packages/background-media/Dockerfile` | multi-stage образ API |
| `packages/background-media/docker-compose.yml` | `postgres` + `media-api` + volumes |
| `packages/background-media/.env.docker.example` | шаблон env для локального compose |
| `deploy/background-media.prod.compose.yml` | prod override (localhost bind, host blob path) |
| `deploy/Caddyfile.media.example` | TLS reverse proxy |
| `deploy/generate-media-env.sh` | генерация `/etc/membrana/media.env` на сервере |
| `deploy/media-stack.sh` | `build` / `up` / `down` / `ps` / `logs` на VPS |

Корневые команды (опционально, локально): `yarn media:docker:build`, `yarn media:docker:up`.  
На VPS предпочтительнее `deploy/media-stack.sh` (см. §4).

---

## 1. Данные для вечернего сеанса (заполнить)

```
VPS_HOST=72.56.27.58
SSH_USER=root
DOMAIN=media.membrana.space
GIT_BRANCH=techies68
```

Секреты (`API_INTERNAL_TOKEN`, `POSTGRES_PASSWORD`) **генерируются на сервере** — не передавать в чат.

Локальные SSH-хелперы (читают `.env`, не коммитить пароль):

```bash
node scripts/_ssh-media-check.mjs          # health + compose ps
node scripts/_ssh-media-tls-setup.mjs --check-dns
node scripts/_ssh-media-tls-setup.mjs      # Caddy + Let's Encrypt
```

| `.env` ключ | Назначение |
|-------------|------------|
| `BACKGROUND_MEDIA_IPV4` | IP VPS (`72.56.27.58`) |
| `BACKGROUND_MEDIA_PASSWORD` | root SSH (только локально) |
| `MEDIA_DOMAIN` | опционально, default `media.membrana.space` |

---

## 2. Требования к VPS

| Параметр | Значение |
|----------|----------|
| Хост / IP | см. §1 |
| SSH user | см. §1 |
| DNS | `media.membrana.space` → A-record `72.56.27.58` |
| OS | Ubuntu 22.04+ / Debian 12+ |
| Docker | Engine 24+ + Compose v2 |
| Диск | ≥ 20 GB (blobs + PG) |
| Порты наружу | **443** (Caddy), **22** (SSH); PostgreSQL **не** публичный |

---

## 3. Подготовка сервера (один раз)

```bash
# на VPS
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git caddy openssl
sudo usermod -aG docker $USER
# перелогиниться

sudo mkdir -p /etc/membrana /var/lib/membrana/media-blobs
sudo chown -R $USER:$USER /var/lib/membrana
```

Секреты:

```bash
git clone <repo-url> membrana && cd membrana
git checkout techies68   # или release-ветка

chmod +x deploy/generate-media-env.sh deploy/media-stack.sh
sudo ./deploy/generate-media-env.sh /etc/membrana/media.env
# сохраните API_INTERNAL_TOKEN из файла для client build (§6)
```

Опционально в `/etc/membrana/media.env`:

```bash
MEDIA_BLOB_HOST_DIR=/var/lib/membrana/media-blobs
# SWAGGER_ENABLED=true   # default off in production; exposes /docs and /docs-json
```

Firewall (если ufw включён):

```bash
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 4. Деплой compose на сервере

```bash
cd ~/membrana   # путь к клону

./deploy/media-stack.sh build
./deploy/media-stack.sh up
./deploy/media-stack.sh ps
curl -s http://127.0.0.1:3010/health
```

Альтернатива без скрипта:

```bash
docker compose \
  -f packages/background-media/docker-compose.yml \
  -f deploy/background-media.prod.compose.yml \
  --env-file /etc/membrana/media.env \
  up -d --build
```

Обновление после `git pull`:

```bash
./deploy/media-stack.sh build
./deploy/media-stack.sh up
```

**Важно:** стандартный `node scripts/_ssh-media-deploy.mjs` делает `git pull origin techies68`. Правки на **feature-ветке до merge** на сервер **не попадут** — см. §10.

---

## 5. TLS (Caddy)

**Текущий статус (2026-06-13):** Caddy 2.11 установлен на VPS, reverse proxy `media.membrana.space` → `127.0.0.1:3010`, порты 80/443 открыты. Let's Encrypt ждёт DNS — A-record `media.membrana.space` пока не резолвится.

### 5a. Автоматический TLS (рекомендуется)

Caddy сам выпустит сертификат, когда DNS укажет на VPS:

1. В панели регистратора / DNS хостинга: **A** `media` → `72.56.27.58` (или `media.membrana.space` → `72.56.27.58`).
2. Дождаться пропагации (до 24 ч). Проверка:

```bash
node scripts/_ssh-media-tls-setup.mjs --check-dns
# или: dig +short A media.membrana.space
```

3. После появления A-record:

```bash
# на VPS
sudo systemctl reload caddy
curl -s https://media.membrana.space/health
```

Конфиг в репозитории: [`deploy/Caddyfile.media.membrana.space`](../../deploy/Caddyfile.media.membrana.space).

### 5b. Ручной сертификат (альтернатива)

Если используете свой SSL (папка `ssl/membrana/space/` локально, в git не коммитится):

| Файл в `ssl/membrana/space/` | Статус |
|------------------------------|--------|
| `membrana.space.key` | приватный ключ есть |
| `membrana.space.csr` | CSR для **`www.membrana.space`**, не для `media.` |
| `*.crt` / `fullchain.pem` | **нужен выданный сертификат** с SAN `media.membrana.space` или wildcard `*.membrana.space` |

CSR ≠ готовый сертификат. Для поддомена `media.` нужен отдельный выпуск или wildcard.

Загрузка на VPS (после получения `.crt` от CA):

```bash
# с локальной машины (пути подставить)
scp ssl/membrana/space/fullchain.pem root@72.56.27.58:/etc/membrana/ssl/fullchain.pem
scp ssl/membrana/space/membrana.space.key root@72.56.27.58:/etc/membrana/ssl/privkey.pem
chmod 600 /etc/membrana/ssl/*

# на VPS
node scripts/_ssh-media-tls-setup.mjs --manual-cert
```

### 5c. Legacy (ручная установка Caddyfile)

```bash
sudo cp deploy/Caddyfile.media.membrana.space /etc/caddy/Caddyfile.d/media.caddy
sudo systemctl reload caddy
curl -s https://media.membrana.space/health
```

---

## 6. Клиент (после A5a client)

| Env (Vite build) | Пример |
|------------------|--------|
| `VITE_MEDIA_SERVER_URL` | `https://media.membrana.space` |
| `VITE_MEDIA_API_TOKEN` | `API_INTERNAL_TOKEN` из `/etc/membrana/media.env` (локально: `node scripts/_ssh-media-show-token.mjs`) |

Режим storage: `remote-server` в sample library.

---

## 7. Backup

| Что | Как |
|-----|-----|
| PostgreSQL | `docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file /etc/membrana/media.env exec postgres pg_dump -U membrana membrana_media > backup-$(date +%F).sql` |
| Blobs | `rsync -a /var/lib/membrana/media-blobs/ backup-host:media-blobs/` |

Расписание: cron daily, хранение 7–30 дней.

---

## 8. Smoke после деплоя

```bash
curl -s https://media.<domain>/health

curl -X POST https://media.<domain>/v1/devices \
  -H "Content-Type: application/json" \
  -H "X-Membrana-Token: <API_INTERNAL_TOKEN>" \
  -d '{"name":"prod-smoke","kind":"microphone"}'
```

---

## 9. Чеклист приёмки (A5c)

- [ ] `https://media.<domain>/health` → 200 извне
- [ ] PostgreSQL не доступен с интернета
- [ ] Upload sample через API или клиент
- [ ] Trends template PUT/GET per `deviceId`
- [ ] Секреты только на сервере (`/etc/membrana/media.env`, mode 600)
- [ ] CORS настроен, если клиент на другом origin (follow-up в API)
- [ ] `yarn media:verify-swagger` — зелёный в CI/перед релизом
- [ ] (опц.) `SWAGGER_ENABLED=true` + `https://media.<domain>/docs` для интеграторов
- [ ] §10: `yarn media:prod:diag` exit 0; ensure-reserved &lt;1 s (после merge / hotfix)

---

## 10. Известные препятствия (ops lessons, 2026-06-25, #178)

> Агент деплоя **обязан** прочитать перед `build`/`up` и smoke. Диагностика: [`MEDIA_SERVER_DIAGNOSTICS.md`](./MEDIA_SERVER_DIAGNOSTICS.md).

### 10a. `POST ensure-reserved` «висит» (минуты)

| | |
|---|---|
| **Симптом** | `curl` на `.../collections/ensure-reserved` без ответа 2–5+ мин; client `upload-ok: 0`; `yarn media:prod:diag` exit 1 |
| **Причина** | Синхронный catalog provision (120 WAV) + `pg_advisory_lock`; застрявший lock после OOM/kill |
| **Не путать с** | quota (413), disk full, 404 collection — upload curl при этом может давать 201 |
| **Fix код** | `ensure-reserved` отдаёт коллекции сразу, catalog — deferred (PR #179+) |
| **Fix ops** | `yarn media:prod:restart-api` → повтор smoke; ensure-reserved должен быть **&lt;1 s** |
| **Профилактика** | Всегда `curl -m 15` на ensure-reserved в SSH-скриптах; не ждать бесконечно |

### 10b. Health сразу после `up` / restart — ложный FAIL

| | |
|---|---|
| **Симптом** | `curl: (56) Recv failure: Connection reset by peer` через 3–10 s после recreate |
| **Причина** | NestJS/Prisma ещё не слушает 3010 |
| **Fix** | Retry: sleep 2–3 s, до 8–10 попыток; только потом smoke |
| **Профилактика** | Не считать деплой failed по первому curl; см. `scripts/_ssh-media-restart-api.mjs` |

### 10c. Feature-ветка ≠ prod без merge

| | |
|---|---|
| **Симптом** | Локальный fix есть, prod после `./deploy/media-stack.sh build` — старое поведение |
| **Причина** | VPS клон тянет только `techies68` (или заданную release-ветку) |
| **Fix** | Merge PR → `git pull` на VPS **или** одноразовый hotfix: `yarn media:prod:hotfix-deploy` (патч файла + rebuild, **до merge**) |
| **Профилактика** | В task prompt явно: «prod hotfix только после merge в deploy-ветку, иначе hotfix-deploy» |

### 10d. Имена Docker-контейнеров

Compose project `membrana-media` → контейнер **`membrana-media-media-api-1`**, не `media-api`.

```bash
docker logs membrana-media-media-api-1 --tail 100
docker ps --format '{{.Names}}'
```

### 10e. Дешёвый VPS (14 GB)

| Риск | Порог / симптом | Действие |
|------|-----------------|----------|
| Disk | `df` **&gt;80%** | cleanup buffer samples, монитор blob volume |
| Build | `docker build` 3–10 мин | swap 2G (`_ssh-media-deploy.mjs` создаёт `/swapfile`) |
| OOM | intermittent restart | `free -h`, `docker stats --no-stream` |

### 10f. SSH-хелперы и git

| Факт | Следствие |
|------|-----------|
| `scripts/_ssh-*.mjs` в `.gitignore` | `yarn media:prod:*` — только если скрипты есть локально |
| Credentials | `BACKGROUND_MEDIA_*` в `.env` — не в чат, не в PR |
| Логи SSH | `%TEMP%` / `$TMPDIR`, не корень репо |

### 10g. Smoke интерпретация

| HTTP | Значение |
|------|----------|
| 201 | upload path OK |
| 409 duplicate title | path OK |
| 404 collection | cold device / race до ensure-reserved |
| 413 | quota |

```bash
yarn media:prod:diag
yarn media:prod:ensure-reserved-smoke
yarn media:prod:upload-smoke
yarn cabinet:mp3:smoke
```

---

## 11. Локальная проверка (опционально)

Не обязательна перед VPS. Если нужна отладка образа на dev-машине:

```bash
cp packages/background-media/.env.docker.example packages/background-media/.env.docker
# задайте API_INTERNAL_TOKEN и POSTGRES_PASSWORD

yarn media:docker:build
yarn media:docker:up
curl http://localhost:3010/health
```

Остановка: `yarn media:docker:down`  
Полная очистка volumes: `docker compose -f packages/background-media/docker-compose.yml down -v`

---

## Prod URL (заполнить после деплоя)

```
HEALTH_URL=https://media.membrana.space/health
DEPLOYED_AT=2026-06-13 (Caddy installed; HTTPS pending DNS)
NOTES=API healthy on 127.0.0.1:3010; LE cert auto after A-record propagates
```
