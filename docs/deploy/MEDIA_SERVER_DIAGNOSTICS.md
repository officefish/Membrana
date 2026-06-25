# Media server diagnostics (`background-media`)

> Operator playbook для инцидентов upload / quota / paired mode.
> Связано: [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) · Issue [#178](https://github.com/officefish/Membrana/issues/178) · client: [`CLIENT_LOGS_PARSING.md`](../device-board-scripts/CLIENT_LOGS_PARSING.md).

---

## Когда применять

| Симптом в client | Действие |
|------------------|----------|
| `[media] upload-failed` × N, `upload-ok: 0` | `yarn media:diag` + `yarn logs:parse` |
| `storageMode: remote-server`, trends OK | Server path — не blame device-board graph |
| `Buffer storage quota exceeded` / 413 | Quota / disk — см. § Quota |
| `Media API returned HTML` | Wrong `mediaApiUrl` / reverse proxy |
| `Media-server network error` | CORS, TLS, container down |

---

## Быстрый старт

```bash
# Локальный стек (baseline)
yarn media:db:up && yarn media:migrate && yarn media:dev

# Диагностика (регистрирует ephemeral device если --register)
yarn media:diag --register

# Prod / paired device (credentials из pair response или cabinet)
yarn media:diag --base-url https://media.membrana.space \
  --device-id <uuid> --token <mediaToken>
```

JSON summary печатается в stderr при `--json`; human-readable — stdout. Exit `0` = all checks pass.

---

## Что проверяет `yarn media:diag`

| Step | Endpoint | Fail означает |
|------|----------|---------------|
| health | `GET /health` | API down / wrong host |
| quota | `GET /v1/devices/:id/quota` | auth, device missing |
| ensure-reserved | `POST .../collections/ensure-reserved` | DB / migration |
| test-upload | `POST .../collections/__buffer__/samples` | quota, disk, multipart |

Verdict codes: `OK` · `SERVER_DOWN` · `AUTH` · `SERVER_QUOTA` · `SERVER_QUOTA_WARNING` · `SERVER_ERROR` · `CLIENT_CONFIG`.

---

## Серверные лимиты (дешёвый VPS)

| Лимит | Env / код | Типичный симптом |
|-------|-----------|------------------|
| Per-file upload | `MAX_UPLOAD_BYTES` (default 50 MB) | 413 на больших файлах |
| Buffer quota / device | `MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE` | `Buffer storage quota exceeded` |
| User storage / device | `MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE` | `User storage quota exceeded` |
| Disk full | `MEDIA_BLOB_DIR` volume | 500, `ENOSPC` в docker logs |
| RAM / OOM | cheap VPS | intermittent 502, container restart |
| PostgreSQL disk | docker volume | migrate/health fail |

Короткие gate-WAV (5–30 s) **не должны** бить 50 MB — если падают все подряд, смотрите quota и disk первыми.

---

## VPS checklist (prod)

Логи SSH — только в `%TEMP%` / `$TMPDIR`, не в корень репо (`CONTRIBUTING.md`).

```bash
# На VPS (пример)
df -h
docker stats --no-stream
docker compose -f ... ps
docker logs membrana-media-media-api-1 --tail 200

# С хоста разработки
yarn media:docker:logs
yarn cabinet:mp3:smoke    # pairing + media device reachability
```

Сопоставьте timestamp `upload-failed` в client с `X-Membrana-Trace-Id` в media logs.

---

## Client ↔ server bifurcation

| Local `media:diag --register` | Paired prod | Вывод |
|-------------------------------|-------------|--------|
| PASS | FAIL | infra / quota / deploy |
| FAIL | FAIL | код (media-library / media API / bridge) |
| PASS | PASS, client FAIL | client race / init / wrong deviceId |

---

## Очистка buffer (ops)

После подтверждения quota root cause — удалить старые buffer samples через cabinet sample library или API `DELETE /v1/devices/:id/samples/:sampleId`. Расширение volume / env quota — по [`BACKGROUND_MEDIA_DEPLOY.md`](./BACKGROUND_MEDIA_DEPLOY.md).

---

## Тройка операторских инструментов

| Команда | Уровень |
|---------|---------|
| `yarn logs:parse` | client scenario chain |
| `yarn media:diag` | media upload / quota (local or `--base-url`) |
| `yarn cabinet:mp3:smoke` | pairing + identity |

### VPS SSH (prod, credentials в `.env`)

| Команда | Назначение |
|---------|------------|
| `yarn media:prod:diag` | health, df, quota, ensure-reserved, test upload |
| `yarn media:prod:upload-smoke` | HTTPS multipart upload smoke |
| `yarn media:prod:ensure-reserved-smoke` | timeboxed `POST ensure-reserved` |
| `yarn media:prod:restart-api` | restart `media-api` (stuck advisory lock) |
| `yarn media:prod:hotfix-deploy` | patch `collections.controller.ts` + rebuild image |

**2026-06-25 (#178):** до hotfix `ensure-reserved` мог «висеть»; после `restart-api` / hotfix — ~0.1s. Upload path на prod рабочий (201/409); client race — `whenMediaLibraryConfigured()` + `ensureReservedCollections` в `importBlob`.

**Capacity / disk:** на legacy combined 14 GB VPS диск часто занят **Docker** (containerd + build cache), не user blobs. Целевая топология — platform 50 GB (media+cabinet only): [`TARIFF_MATRIX.md`](../TARIFF_MATRIX.md) §«Platform capacity», deploy §10e + §12.

**Deploy agent:** полный список препятствий — [`BACKGROUND_MEDIA_DEPLOY.md`](./BACKGROUND_MEDIA_DEPLOY.md) §10 · A5c prompt § «Предупреждения деплоя».
