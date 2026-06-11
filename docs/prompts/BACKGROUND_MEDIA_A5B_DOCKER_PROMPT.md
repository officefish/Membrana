# Промпт: background-media A5b — Docker Compose

> **Task-промпт для агента-разработчика.**
> Эпик: [`BACKGROUND_MEDIA_V1_EPIC_PROMPT.md`](./BACKGROUND_MEDIA_V1_EPIC_PROMPT.md).
> Зависит от: `background-media-a5a-server` (merged).
> Размер: **M**. Ожидаемый артефакт: **1 PR**.
> Реестр: `id` = `background-media-a5b-docker`.

---

## Промпт целиком (для вставки агенту)

### Кто ты

DevOps-инженер команды Membrana (**Vesnin**). Минимальный, воспроизводимый локальный и staging стек.

### Что построить

Docker-окружение для `@membrana/background-media`:

1. **`packages/background-media/Dockerfile`** — multi-stage build (deps → dist → runtime node:20-alpine).
2. **`packages/background-media/docker-compose.yml`** (или `deploy/docker-compose.media.yml` в корне):
   - `media-api` — background-media
   - `postgres` — PostgreSQL 16
   - named volume `media-blobs` → `MEDIA_BLOB_DIR`
   - named volume `pg-data`
3. **`.env.docker.example`** — шаблон без секретов.
4. **Root scripts** в `package.json`:
   - `yarn media:docker:up`
   - `yarn media:docker:down`
   - `yarn media:docker:logs`
5. **Healthcheck** в compose для api + postgres.
6. **README** секция «Run with Docker» — `curl localhost:3010/health`.

### Требования

- **Prisma migrate deploy** при старте контейнера (entrypoint) **или** documented one-shot `yarn media:migrate` (`prisma migrate deploy`).
- Порт API: `3010` (не конфликтовать с office `3000`).
- `DATABASE_URL` внутри сети compose: `postgresql://...@postgres:5432/...`.
- Blob volume переживает `docker compose down` (без `-v`).

### Definition of Done

- [ ] `docker compose up` → `GET /health` 200
- [ ] Upload sample через API / client против `localhost:3010`
- [ ] Документация в README background-media
- [ ] `.dockerignore` исключает `node_modules`, `.git`
- [ ] CI **не обязан** собирать образ (опционально job `docker build` — stretch)
- [ ] LGTM Teamlead

### Out of scope

- Прод TLS / reverse proxy (→ A5c)
- Kubernetes manifests
- MinIO/S3

### Порядок ролей

1. **Teamlead** — выбор пути compose в монорепо
2. **Структурщик** — Dockerfile, entrypoint, scripts
3. **Музыкант** — smoke upload/play

---

## Заметки для постановщика

После merge: `yarn task:archive background-media-a5b-docker --notes "PR #…"`.
