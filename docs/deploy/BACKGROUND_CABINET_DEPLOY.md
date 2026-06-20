# Деплой `@membrana/background-cabinet` + `apps/cabinet` (MP1)

Пошаговый чеклист для VPS (тот же хост, что `media.membrana.space`).

Связанные документы: [`MEMBRANE_PLATFORM_DEPLOY.md`](./MEMBRANE_PLATFORM_DEPLOY.md), [`packages/background-cabinet/README.md`](../../packages/background-cabinet/README.md), эпик [#67](https://github.com/officefish/Membrana/issues/67).

> **Логи отладки:** вывод `yarn cabinet:*:prod` и других SSH-скриптов **не сохранять в корень репозитория** (`cabinet-recover*.txt`, `deploy-*.txt`, …). Используйте `%TEMP%` / `$TMPDIR` или `docs/archive/`. См. [`CONTRIBUTING.md`](../CONTRIBUTING.md) → VPS deploy.

---

## DNS (перед деплоем)

| Запись | Тип | Назначение |
|--------|-----|------------|
| `cabinet.membrana.space` | A | VPS IP (SPA + API `/health`, `/v1/*` через Caddy) |
| `cabinet-api.membrana.space` | A | VPS IP (**опционально**, отдельный API-хост) |

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

### Размер Docker-образов (мониторинг техдолга)

После локальной сборки (`yarn cabinet:docker:build`) или pull из GHCR периодически проверяйте рост образов — расширение build context (core, device-board, fft-analyzer, …) увеличивает **build stage**, но runtime SPA должен оставаться компактным.

```bash
# локальные имена — см. packages/background-cabinet/docker-compose.yml
docker image inspect background-cabinet-cabinet-web --format='cabinet-web bytes={{.Size}}'
docker image inspect background-cabinet-cabinet-api --format='cabinet-api bytes={{.Size}}'

# GHCR после pull (deploy/background-cabinet.image.compose.yml)
docker image inspect ghcr.io/officefish/membrana-cabinet-web:latest --format='{{.Size}}'
docker image inspect ghcr.io/officefish/membrana-cabinet-api:latest --format='{{.Size}}'
```

| Образ | Ориентир (2026-06) | Действие при превышении |
|-------|-------------------|-------------------------|
| **cabinet-web** (nginx + `dist/`) | ≲ 50 MiB runtime | Проверить, что в финальный stage не попадает `node_modules` / build context |
| **cabinet-api** (NestJS) | следить за трендом | Prisma + deps; отдельный эпик при > 2× baseline |

Порог **50 MiB** для SPA — **warning**, не блокер CI. Зафиксируйте фактический размер в Issue/PR при существенном росте build context.

---

## Гейты деплоя по SSH (DR0 + DR1)

Команда `yarn cabinet:deploy:prod` (а также `yarn device-board:deploy:prod`) перед коннектом
к VPS выполняет два локальных гейта. Прод собирается на VPS из `origin/<branch>`, поэтому
важно, чтобы локальное состояние и CI совпадали с тем, что задеплоится.

| Гейт | Что проверяет | Блокирует, если | Обход |
|------|----------------|-----------------|-------|
| **preflight** (`scripts/_deploy-preflight.mjs`) | рабочее дерево + расхождение HEAD с `origin/<branch>` | есть незакоммиченное/untracked или local≠origin | `--allow-dirty` / `DEPLOY_ALLOW_DIRTY=1` |
| **ci-gate** (`scripts/_deploy-ci-gate.mjs`) | статус GitHub Actions для SHA `origin/<branch>` через `gh` | workflow «CI» не завершён успехом | `--allow-red-ci` / `DEPLOY_ALLOW_RED_CI=1` |

```bash
# нормальный путь: всё закоммичено, запушено, CI зелёный
yarn cabinet:deploy:prod

# осознанный обход обоих гейтов (например, hotfix вне CI)
DEPLOY_ALLOW_DIRTY=1 DEPLOY_ALLOW_RED_CI=1 yarn cabinet:deploy:prod
# или флагами:
yarn cabinet:deploy:prod -- --allow-dirty --allow-red-ci
```

Список обязательных workflow для ci-gate можно переопределить: `DEPLOY_CI_WORKFLOWS="CI,Unit tests"`.
`gh` должен быть установлен и авторизован (`gh auth status`).

---

## Деплой из образа registry (DR2) — рекомендуемый путь

Вместо сборки на VPS (`build`) прод тянет **готовый иммутабельный образ** из GHCR по тегу.
Образ нельзя «недокоммитить»: он собран в CI из чистого checkout — это устраняет первопричину
постмортема MP7B (`docs/deploy/POSTMORTEM-MP7B-2026-06-18.md`).

### Registry и теги

CI-workflow `.github/workflows/cabinet-images.yml` публикует два образа:

| Образ | Что внутри |
|-------|------------|
| `ghcr.io/officefish/membrana-cabinet-api` | NestJS API (`packages/background-cabinet/Dockerfile`) |
| `ghcr.io/officefish/membrana-cabinet-web` | SPA nginx (`apps/cabinet/Dockerfile`) |

Теги образа:

| Триггер | Теги |
|---------|------|
| push тега `cabinet-v*` | `cabinet-vX.Y.Z`, `sha-<short>`, `latest` |
| push в `main` | `main`, `sha-<short>` |

Релиз делается тегом: `git tag cabinet-v1.2.3 && git push origin cabinet-v1.2.3`.

### Разделение build-time / runtime env

- **build-time** (запекается в образ `cabinet-web` на этапе CI, поменять можно только пересборкой):
  `VITE_CABINET_API_URL=https://cabinet.membrana.space`, `VITE_MEDIA_API_URL=https://media.membrana.space`.
- **runtime** (приходит в `cabinet-api` при старте контейнера из `/etc/membrana/cabinet.env`,
  меняется без пересборки): `DATABASE_URL`, `API_INTERNAL_TOKEN`, `*_CORS_ORIGINS`, `MEDIA_API_*`,
  `CABINET_BOOTSTRAP_*` и т.д.

### Деплой по тегу

```bash
# релизный образ
CABINET_IMAGE_TAG=cabinet-v1.2.3 yarn cabinet:deploy:image:prod

# любой коммит main по sha
CABINET_IMAGE_TAG=sha-1a2b3c4 yarn cabinet:deploy:image:prod
```

Скрипт `scripts/_ssh-cabinet-deploy-image.mjs` проходит те же гейты (preflight + ci-gate),
синкает на VPS только compose/Caddy (`git reset` без build), затем:
`pull` образа **до** `down`/`up` — если образ недоступен, прод остаётся на старом образе
(свойство «провал до переключения не роняет прод»).

Приватные образы GHCR: положите `GHCR_USER` и `GHCR_TOKEN` в `/etc/membrana/cabinet.env` —
скрипт сделает `docker login` перед pull. Для публичных пакетов логин не нужен.

На VPS вручную image-режим включается так:

```bash
CABINET_DEPLOY_MODE=image CABINET_IMAGE_TAG=cabinet-v1.2.3 ./deploy/cabinet-stack.sh pull
CABINET_DEPLOY_MODE=image CABINET_IMAGE_TAG=cabinet-v1.2.3 ./deploy/cabinet-stack.sh up
```

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
curl -fsS https://cabinet.membrana.space/health

curl -fsS -X POST https://cabinet.membrana.space/v1/auth/login \
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

- [ ] `https://cabinet.membrana.space/health` → 200
- [ ] Login API + `/v1/auth/me`
- [ ] `https://cabinet.membrana.space/` → SPA
- [ ] Login в браузере
- [ ] `ALLOW_REGISTRATION=false` на проде
- [ ] PostgreSQL cabinet не публичен
- [ ] `CABINET_RUN_SEED=false` после первого деплоя

---

## Prod URL

```
API_HEALTH=https://cabinet.membrana.space/health
SPA_URL=https://cabinet.membrana.space/
DEPLOYED_AT=
NOTES=
```
