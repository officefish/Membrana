# Промпт: background-media A5c — продовый деплой

> **Task-промпт для агента-разработчика / DevOps.**
> Эпик: [`BACKGROUND_MEDIA_V1_EPIC_PROMPT.md`](./BACKGROUND_MEDIA_V1_EPIC_PROMPT.md).
> Зависит от: `background-media-a5b-docker` (merged).
> Размер: **M**. Ожидаемый артефакт: **1 PR** + работающий публичный endpoint.
> Реестр: `id` = `background-media-a5c-deploy`.
> Референс: [`SERVER_DEPLOYMENT_PROMPT.md`](./SERVER_DEPLOYMENT_PROMPT.md) (для office).

---

## Промпт целиком (для вставки агенту)

### Кто ты

DevOps-инженер Membrana (**Vesnin**). Форма следует функции: **platform VPS** (media+cabinet, 50 GB / 4 GB RAM) + отдельный integrations VPS (office+RAG); TLS, секреты вне git.

### Что построить

Продовая среда для `background-media`:

1. **Документация** `packages/background-media/README.md` → раздел `## Production deployment`:
   - рекомендуемый хостинг (VPS + Docker Compose **или** PaaS с persistent disk + managed PG)
   - DNS поддомен, напр. `media.<domain>` (отдельно от office API)
   - Caddy/nginx reverse proxy → TLS (Let's Encrypt)
   - backup policy: PG dump + blob volume
2. **Скрипт или compose override** `deploy/background-media.prod.compose.yml`:
   - не коммитить реальные секреты
   - env из хоста / secrets manager
3. **Проверочный чеклист** в `docs/deploy/BACKGROUND_MEDIA_DEPLOY.md`:
   - `curl https://media.<domain>/health`
   - client `VITE_MEDIA_SERVER_URL` для prod build
   - регистрация device + upload + templates PUT
4. **Firewall / exposure:** только 443 наружу; PostgreSQL не публичен.
5. **CORS** (если client на другом origin): явный allowlist origins в media API.

### Соседство с background-office

| Сервис | Порт (dev) | Прод URL (пример) |
|--------|------------|-------------------|
| background-office | 3000 | `api.<domain>` |
| background-media | 3010 | `media.<domain>` |

Один reverse proxy может маршрутизировать оба upstream. **Не** объединять процессы.

### Env прод (в dashboard хостинга)

- `API_INTERNAL_TOKEN` (можно отдельный от office или общий — зафиксировать в README)
- `DATABASE_URL` (managed PG или контейнер с backup)
- `MEDIA_BLOB_DIR` на persistent volume
- `MEDIA_QUOTA_BYTES_PER_DEVICE`

### Definition of Done

- [ ] `https://media.<domain>/health` → 200 из внешней сети
- [ ] Web-клиент (staging/prod build) подключается к media-server, режим `remote-server`
- [ ] Документ `docs/deploy/BACKGROUND_MEDIA_DEPLOY.md` с пошаговой инструкцией
- [ ] Секреты не в git
- [ ] LGTM Teamlead

### Out of scope

- HA / multi-region
- Автоматический CI deploy (можно follow-up issue)
- CDN для blobs

### ⚠️ Предупреждения деплоя (прочитать до SSH)

Обязательный runbook: [`docs/deploy/BACKGROUND_MEDIA_DEPLOY.md`](../deploy/BACKGROUND_MEDIA_DEPLOY.md) **§10**.

| Препятствие | Как не попасть |
|-------------|----------------|
| `ensure-reserved` висит минутами | `curl -m 15`; после fix #179 — deferred catalog; иначе `yarn media:prod:restart-api` |
| Health FAIL сразу после `up` | Retry curl 8–10× с паузой 2–3 s (не exit 1 на первом `Connection reset`) |
| Feature-ветка не на VPS | `_ssh-media-deploy.mjs` тянет `techies68` — **merge до prod** или `media:prod:hotfix-deploy` |
| `docker logs media-api` пустой | Имя контейнера: `membrana-media-media-api-1` |
| Дешёвый VPS 14 GB (legacy combined) | `df` &gt;80% — **split** stack; Docker bloat &gt; user blobs; см. §10e + TARIFF_MATRIX capacity |
| `scripts/_ssh-*.mjs` | В `.gitignore` — локальные копии у оператора; секреты только в `.env` |
| Upload smoke 409 | OK (duplicate title), не путать с 404/413 |

### Platform node (целевая топология v0.6)

| Параметр | Значение |
|----------|----------|
| VPS role | **Platform only** — media + cabinet (office → integrations VPS) |
| Disk | **50 GB NVMe** (≥40 GB под blobs после OS/Docker) |
| RAM | **4 GB**; concurrent mic/upload **10–20** без monitoring |
| Paired users (test/beta) | **50–100** free-v1 типично; до **150** при редкой одновременности |
| Indie on shared 4 GB | soft cap **~30**; business — dedicated node |

Канон: [`TARIFF_MATRIX.md`](../TARIFF_MATRIX.md) §«Platform capacity» · deploy [`BACKGROUND_MEDIA_DEPLOY.md`](../deploy/BACKGROUND_MEDIA_DEPLOY.md) §12.

Post-deploy: `yarn media:prod:diag` (exit 0, ensure-reserved &lt;1 s) → [`MEDIA_SERVER_DIAGNOSTICS.md`](../deploy/MEDIA_SERVER_DIAGNOSTICS.md).

### Порядок ролей

1. **Teamlead** — approve домен и модель секретов
2. **Структурщик** — compose prod, CORS, client env docs
3. **Верстальщик** — проверка banner `remote-server` против prod URL

---

## Заметки для постановщика

После приёмки всех трёх фаз:

```bash
yarn task:archive background-media-a5c-deploy --notes "PR #…"
yarn task:archive background-media-v1 --notes "эпик закрыт, A5a–A5c"
```

Закрыть GitHub #58 с итоговым отчётом.
