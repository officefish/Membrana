# Промпт: background-office O1 — Docker образ и локальный compose

> **Task-промпт для агента-разработчика.**
> Эпик: [`BACKGROUND_OFFICE_V1_EPIC_PROMPT.md`](./BACKGROUND_OFFICE_V1_EPIC_PROMPT.md).
> Зависит от: `background-office-v1` (пакет v0.1 уже в репо).
> Размер: **M**. Ожидаемый артефакт: **1 PR**.
> Реестр: `id` = `background-office-o1-docker`.

---

## Промпт целиком (для вставки агенту)

### Кто ты

DevOps-инженер Membrana (**Vesnin**). Минимальный воспроизводимый образ для stateless office API.

### Что построить

Docker-окружение для `@membrana/background-office`:

1. **`packages/background-office/Dockerfile`** — multi-stage (yarn focus → `tsc` → node:20-alpine runtime).
2. **`packages/background-office/docker-compose.yml`** — сервис `office-api`, порт `3000`, `env_file`.
3. **`packages/background-office/.env.docker.example`** — шаблон без секретов (`API_INTERNAL_TOKEN`, `ANTHROPIC_API_KEY`, …).
4. **Entrypoint** — `prepare` (copy prompts) + `node dist/main.js`.
5. **Root scripts** в `package.json`:
   - `yarn office:docker:build`
   - `yarn office:docker:up` / `down` / `logs`
6. **README** секция «Docker Compose» — `curl localhost:3000/health`.

### Требования

- Порт **3000** (не конфликтовать с media `3010`).
- **Stateless** — без PostgreSQL, без volumes (кроме опционального mount prompts).
- `prepare` / copy-prompts в образе на этапе build.
- Healthcheck в compose на `GET /health`.
- `.dockerignore` в пакете или корне контекста сборки.

### Definition of Done

- [ ] `yarn office:docker:up` → `GET /health` 200
- [ ] `POST /v1/claude/ask` с токеном работает при заданных env (локальный smoke)
- [ ] Документация в `packages/background-office/README.md`
- [ ] CI не обязан собирать образ
- [ ] LGTM Teamlead

### Out of scope

- Prod TLS / Caddy (→ O3)
- VPS deploy scripts (→ O2)

### Порядок ролей

1. **Teamlead** — путь Dockerfile в монорепо (контекст корня, как media)
2. **Структурщик** — Dockerfile, compose, scripts

---

## Заметки для постановщика

После merge: `yarn task:archive background-office-o1-docker --notes "PR #…"`.
