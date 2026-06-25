# Промпт: async-v2 track upload (#178)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M**. Ожидаемый артефакт: **1–2 PR** — fix upload + `yarn media:diag` + runbook.
> Реестр: `id` = `async-v2-track-upload-178` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Parent packaging: `comp-packaging-catalog-2026-06-25` (Phase C, Alpha blocked).

---

## Контекст

Competition packaging Phase C: operator smoke **alpha-async-v2** — gate + trends OK, **все track-upload падают** (`upload-ok: 0`, `async rejected: 3`), detached drone report не стартует.

| Документ | Зачем |
|----------|--------|
| [`ISSUE_ASYNC_V2_TRACK_UPLOAD.md`](../competition-sprint/comp-packaging-catalog-2026-06-25/ISSUE_ASYNC_V2_TRACK_UPLOAD.md) | Симптомы run `043ec8d6` |
| [`OPERATOR_DEBUG_LOG.md`](../competition-sprint/comp-packaging-catalog-2026-06-25/OPERATOR_DEBUG_LOG.md) | ODF-av2-alpha-004 |
| [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | Граница client ↔ background-media |
| [`MEDIA_SERVER_DIAGNOSTICS.md`](../deploy/MEDIA_SERVER_DIAGNOSTICS.md) | Server diag playbook |
| [`CLIENT_LOGS_PARSING.md`](../device-board-scripts/CLIENT_LOGS_PARSING.md) | `yarn logs:parse` |

**GitHub Issue:** [#178](https://github.com/officefish/Membrana/issues/178)

---

## Промпт целиком (для агента)

---

### Кто ты

Координатор под **Vesnin**; исполнение — **Ozhegov** (интеграция), **Dynin** (server diag). Соблюдай границы пакетов; Web Audio только через `@membrana/audio-engine-service`.

---

### Что построить

1. **Root cause** цепочки `StartAsyncJob(track-upload)` → `importBlob` → `upload-failed`.
2. **Fix** в правильном слое (client bridge / media-library / background-media / ops).
3. **`yarn media:diag`** — health → quota → ensure-reserved → test WAV upload.
4. **Runbook** [`MEDIA_SERVER_DIAGNOSTICS.md`](../deploy/MEDIA_SERVER_DIAGNOSTICS.md).
5. **Deploy pitfalls** [`BACKGROUND_MEDIA_DEPLOY.md`](../deploy/BACKGROUND_MEDIA_DEPLOY.md) §10
5. Alpha operator smoke: `yarn logs:parse` → **v20 happy path: PASS**.

---

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Bridge | `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts` | `uploadTrackAsync`, async job resolve/reject |
| Hub | `apps/client/src/lib/mediaLibraryHubBridge.ts`, `resolveMediaLibraryBackend.ts` | backend selection, `init()` |
| Foundation | `packages/services/media-library` | `importBlob`, `ServerStorageBackend` |
| Data-plane | `packages/background-media` | multipart upload, quota, blob volume |
| Diag | `scripts/media-diag.mjs` | operator server smoke |
| Smoke | `scripts/lib/client-logs-parser.mjs` | `passV20HappyPath` |

**Запрещено:** правки L16 pack/graph (`usercase-competition-pack.ts` gate→sequence); прямой `fetch` из device-board; merge winner в bundled MVP.

---

### Фазы работы

#### Фаза 1a — Client diag

1. Expand `[media] upload-failed` → поле `error` (+ `code` если `DomainError`).
2. `upload-start`: `storageMode`, `serverReachable`.
3. `yarn logs:parse` на run ≥60s.

#### Фаза 1b — Server diag (обязательно)

```bash
yarn media:diag --register          # local: yarn media:db:up && yarn media:migrate && yarn media:dev
yarn media:diag --device-id <id>    # prod paired device
# VPS: df -h, docker stats, yarn media:docker:logs (логи в %TEMP%)
```

Классифицировать root cause: `client` | `server-quota` | `server-infra` | `env-misconfig`.

#### Фаза 2 — Fix + tests

- Unit/integration по затронутому слою.
- Улучшить surface ошибки в `upload-failed` (HTTP status / `DomainError.code`).

#### Фаза 3 — Operator sign-off

- Re-smoke alpha-async-v2 ≥60s.
- ODF-av2-alpha-004 → `resolved`.
- Beta/Gamma — только после Alpha `pass`.

---

### Definition of Done

- [ ] `upload-ok ≥ gate-true` (или documented async lag).
- [ ] `async-job resolved ≥ 1`; нет `async-resolved-dispatch-error`.
- [ ] `make-report-from-track` + detached publish в логах.
- [ ] `yarn logs:parse` → **v20 happy path: PASS**.
- [ ] Server diag выполнен; ODF содержит quota + verdict `yarn media:diag`.
- [ ] `yarn media:diag` green на target env (local и/или prod).
- [ ] CI: `yarn turbo run lint typecheck test build --continue`.
- [ ] Unit test если bug в коде (не env-only).
- [ ] `MEDIA_SERVER_DIAGNOSTICS.md` актуален.

---

### Out of scope

- L16 pack wiring (closed).
- Beta/Gamma rebuild до Alpha pass.
- Full observability stack (Prometheus/Grafana).
- Merge Beta → bundled `usercase-mvp-microphone`.

---

### Порядок ролей

1. **Teamlead** — приоритет, LGTM, packaging gate.
2. **Dynin** — фаза 1b, `media:diag`, VPS checklist.
3. **Ozhegov** — fix + tests.
4. **Kuryokhin** — sign-off mic smoke (≥60s).
5. **Rodchenko** — —

---

### Команды

```bash
yarn media:db:up && yarn media:migrate && yarn media:dev
yarn workspace @membrana/client dev
yarn media:diag --register
yarn logs:parse
yarn turbo run lint typecheck test build --continue
```

---

### Закрытие

```bash
yarn task:archive async-v2-track-upload-178
```

PR: `Closes #178`. Packaging sprint D7: Alpha `pass` в `OPERATOR_DEBUG_LOG.md`.
