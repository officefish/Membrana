# Промпт: background-office O2 — prod compose и deploy-скрипты

> **Task-промпт для агента-разработчика.**
> Эпик: [`BACKGROUND_OFFICE_V1_EPIC_PROMPT.md`](./BACKGROUND_OFFICE_V1_EPIC_PROMPT.md).
> Зависит от: `background-office-o1-docker` (merged).
> Размер: **M**. Ожидаемый артефакт: **1 PR**.
> Реестр: `id` = `background-office-o2-prod-compose`.

---

## Промпт целиком (для вставки агенту)

### Кто ты

DevOps-инженер Membrana (**Vesnin**). Воспроизводимый VPS-deploy по образцу `background-media`.

### Что построить

1. **`deploy/background-office.prod.compose.yml`** — override: `127.0.0.1:3000:3000`, `restart: unless-stopped`.
2. **`deploy/generate-office-env.sh`** — генерация `/etc/membrana/office.env` (random `API_INTERNAL_TOKEN`; плейсхолдеры для `ANTHROPIC_API_KEY`, `LINEAR_*`).
3. **`deploy/office-stack.sh`** — `build|up|down|ps|logs` (как `media-stack.sh`).
4. **`scripts/_ssh-office-check.mjs`** — health + compose ps (читает `BACKGROUND_MEDIA_IPV4` / password из `.env` или отдельные `BACKGROUND_OFFICE_*`).
5. **Документация** черновик в `docs/deploy/BACKGROUND_OFFICE_DEPLOY.md` §1–§4 (без TLS — в O3).

### Требования

- Секреты **не** коммитить; только `.env.example` / шаблоны.
- Env на VPS: `/etc/membrana/office.env`, mode `600`.
- Office и media — **разные** env-файлы (`office.env` vs `media.env`).
- Smoke на VPS: `curl http://127.0.0.1:3000/health`.

### Definition of Done

- [ ] `./deploy/office-stack.sh up` на VPS → healthy
- [ ] PostgreSQL **не** добавлен в office compose
- [ ] `docs/deploy/BACKGROUND_OFFICE_DEPLOY.md` §1–§4 заполнены (VPS IP, ветка, пути)
- [ ] LGTM Teamlead

### Out of scope

- Caddy / DNS (→ O3)
- Linear webhook в Linear UI (→ O4)

### Порядок ролей

1. **Teamlead** — approve общий VPS с media
2. **Структурщик** — compose override, shell scripts, SSH helper

---

## Заметки для постановщика

После merge: `yarn task:archive background-office-o2-prod-compose --notes "PR #…"`.
Секреты Anthropic/Linear в `office.env` заполняет человек перед O4.
