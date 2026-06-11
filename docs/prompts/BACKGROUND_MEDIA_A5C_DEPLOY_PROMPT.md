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

DevOps-инженер Membrana (**Vesnin**). Форма следует функции: один VPS/PaaS, TLS, секреты вне git.

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
