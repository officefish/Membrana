# Деплой `@membrana/background-cabinet` + `apps/cabinet` (MP1)

Пошаговый чеклист для VPS (тот же хост, что `media.membrana.space`).

Связанные документы: [`MEMBRANE_PLATFORM_DEPLOY.md`](./MEMBRANE_PLATFORM_DEPLOY.md), [`packages/background-cabinet/README.md`](../../packages/background-cabinet/README.md), эпик [#67](https://github.com/officefish/Membrana/issues/67).

---

## DNS (перед деплоем)

| Запись | Тип | Назначение |
|--------|-----|------------|
| `cabinet.membrana.space` | A | VPS IP |
| `cabinet-api.membrana.space` | A | VPS IP |

---

## Артефакты в репозитории

| Путь | Назначение |
|------|------------|
| `packages/background-cabinet/Dockerfile` | API image |
| `apps/cabinet/Dockerfile` | SPA (nginx) |
| `packages/background-cabinet/docker-compose.yml` | postgres + cabinet-api + cabinet-web |
| `deploy/background-cabinet.prod.compose.yml` | localhost bind |
| `deploy/generate-cabinet-env.sh` | `/etc/membrana/cabinet.env` |
| `deploy/cabinet-stack.sh` | build / up / smoke |
| `deploy/Caddyfile.cabinet.example` | TLS |

Корневые команды: `yarn cabinet:docker:build`, `yarn cabinet:docker:up`.

---

## 1. Подготовка сервера (один раз)

```bash
# на VPS (если media уже есть — Docker и Caddy установлены)
sudo mkdir -p /etc/membrana

cd ~/membrana
git fetch origin vesnin
git checkout vesnin
git pull origin vesnin

chmod +x deploy/generate-cabinet-env.sh deploy/cabinet-stack.sh
sudo ./deploy/generate-cabinet-env.sh /etc/membrana/cabinet.env
# Сохраните bootstrap password из вывода скрипта!

ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
```

Caddy:

```bash
sudo cp deploy/Caddyfile.cabinet.example /etc/caddy/Caddyfile.d/cabinet.caddy
sudo systemctl reload caddy
```

---

## 2. Деплой

```bash
cd ~/membrana
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
./deploy/cabinet-stack.sh smoke
```

После первого успешного старта:

```bash
sudo sed -i 's/^CABINET_RUN_SEED=.*/CABINET_RUN_SEED=false/' /etc/membrana/cabinet.env
./deploy/cabinet-stack.sh up
```

---

## 3. Prod-smoke (MP1)

```bash
curl -fsS https://cabinet-api.membrana.space/health

curl -fsS -X POST https://cabinet-api.membrana.space/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin","password":"<BOOTSTRAP_PASSWORD>"}'

curl -fsS -o /dev/null -w "%{http_code}\n" https://cabinet.membrana.space/
```

Браузер: login → shell → logout.

---

## 4. Обновление после `git pull`

```bash
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
./deploy/cabinet-stack.sh smoke
```

---

## 5. Локальная проверка образа (опционально)

```bash
cp packages/background-cabinet/.env.docker.example packages/background-cabinet/.env.docker
yarn cabinet:docker:build
yarn cabinet:docker:up
curl http://localhost:3020/health
curl -o /dev/null -w "%{http_code}\n" http://localhost:8080/
```

---

## 6. Чеклист приёмки MP1

- [ ] `https://cabinet-api.membrana.space/health` → 200
- [ ] Login API + `/v1/auth/me`
- [ ] `https://cabinet.membrana.space/` → SPA
- [ ] Login в браузере
- [ ] `ALLOW_REGISTRATION=false` на проде
- [ ] PostgreSQL cabinet не публичен
- [ ] `CABINET_RUN_SEED=false` после первого деплоя

---

## Prod URL

```
API_HEALTH=https://cabinet-api.membrana.space/health
SPA_URL=https://cabinet.membrana.space/
DEPLOYED_AT=
NOTES=
```
