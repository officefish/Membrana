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
VPS_HOST=
SSH_USER=
DOMAIN=media.<domain>
GIT_BRANCH=techies68
```

Секреты (`API_INTERNAL_TOKEN`, `POSTGRES_PASSWORD`) **генерируются на сервере** — не передавать в чат.

---

## 2. Требования к VPS

| Параметр | Значение |
|----------|----------|
| Хост / IP | см. §1 |
| SSH user | см. §1 |
| DNS | `media.<domain>` → A-record на VPS |
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

---

## 5. TLS (Caddy)

```bash
sudo cp deploy/Caddyfile.media.example /etc/caddy/Caddyfile.d/media.caddy
# заменить media.example.com на ваш поддомен
sudo systemctl reload caddy
curl -s https://media.<domain>/health
```

---

## 6. Клиент (после A5a client)

| Env (Vite build) | Пример |
|------------------|--------|
| `VITE_MEDIA_SERVER_URL` | `https://media.<domain>` |
| `VITE_MEDIA_API_TOKEN` | `API_INTERNAL_TOKEN` из `/etc/membrana/media.env` |

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

---

## 10. Локальная проверка (опционально)

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
HEALTH_URL=
DEPLOYED_AT=
NOTES=
```
