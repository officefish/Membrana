# Промпт (эпик): MP7 — Node Realtime Gateway (WebSocket: журнал + микрофон)

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Task-эпик** (7 PR) · **Размер:** **L** (фазы NR0–NR6)  
> **Ожидаемый артефакт:** 7 последовательных PR; каждый `Closes` подзадачу в GitHub Issue эпика.  
> **Реестр:** `id` = **`membrane-node-realtime-gateway`** в [`docs/tasks/registry.json`](../tasks/registry.json)  
> **Консилиум:** [`discussions/membrane-realtime-transport-consilium-2026-06-17.md`](../discussions/membrane-realtime-transport-consilium-2026-06-17.md)  
> **Канон:** [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) §«Транспорт узла»

**GitHub Issue:** [#92](https://github.com/officefish/Membrana/issues/92).

---

## Контекст продукта

Полевые испытания paired-сценария показали: для **live-микрофона** (окна 3+2 с, brief ≤500 мс) и **оперативного журнала** в кабинете REST round-trip недостаточен. Нужен **WebSocket (WSS)** как сигнальный слой между `apps/client` и `background-cabinet`, с REST fallback для истории и крупных payload.

**Scope MP7 (канон product):**

| Входит | Не входит |
|--------|-----------|
| Журнал: `journal.append`, live-session, cursor ack | Device-board runtime по WS (**MP7b**) |
| Микрофон: `analysis.brief`, `analysis.level`, `mic.session` | Sample library / `background-media` WS (**отдельный консилиум**) |
| Presence: `node.online`, `session.invalidated` | Сырой PCM/opus stream |
| Reconnect + REST fallback | SSE как второй канал |

**Предпосылки:** MP3 pairing ✓, MP5 journal REST ✓, модуль микрофона + `mic-live-drone-analysis` (LP1–LP4), `SyncJournalStorageBackend` + `liveJournalHub` в client.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | Граница REST vs WS |
| [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | WS только в cabinet |
| [`LIVE_PARALLEL_DETECTION.md`](../LIVE_PARALLEL_DETECTION.md) | Окна 3s, brief SLO |
| [`LIVE_JOURNAL_SYNC_PAGINATION_EPIC_PROMPT.md`](./LIVE_JOURNAL_SYNC_PAGINATION_EPIC_PROMPT.md) | REST journal truth, counts |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Закрытие фаз + prod-smoke |
| [`deploy/MEMBRANE_PLATFORM_DEPLOY.md`](../deploy/MEMBRANE_PLATFORM_DEPLOY.md) | Prod deploy cabinet |

**Ветка:** контракты `@membrana/core` + gateway → **`vesnin`**. Client/cabinet UI — feature-ветки по [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md).

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Эпик NR0→NR6 строго последовательно. NR0 — контракт без сети. NR1–NR2 — сервер. NR3 — client journal
до mic-live (NR4), иначе дублируем transport. NR5 — cabinet только после стабильного fan-out.
NR6 — prod-smoke обязателен до archive эпика (как MP1–MP5). Device-board и media-library вне scope.

[Структурщик — Ozhegov]:
Один WS на paired-сессию; каналы MP7: journal | mic-live | presence. Client: nodeRealtimeClient
рядом с nodeRestClient. journal.append на сервере вызывает существующий JournalService (не второй store).
Cabinet подписчик — отдельный WS auth (session cookie), fan-out по membraneId/nodeId.
Запрещено: WS в background-media; прямой импорт gateway из плагинов микрофона — только через bridge.

[Математик — Dynin]:
По WS — brief и скаляры (confidence, RMS level), не матрицы кадров. Throttle mic-live events ≤2 Hz
агрегат на узле. Инвариант: порядок journal.append сохраняется per deviceId (monotonic cursor).

[Музыкант]:
DoD ручной smoke: paired client, stream-auto 3+2 с → cabinet видит brief ≤1 с после окна;
тишина/речь/дрон — brief не ломает канал. Headless CI без микрофона — не блокер.

[Верстальщик — Rodchenko]:
Cabinet: индикатор канала (connected / reconnecting / REST-only); live-append без кнопки «Обновить».
Client footer: WS status рядом с paired indicator. DESIGN.md + LIVE_DETECTION_UI для mic badge.
```

---

## План спринта (фазы NR0–NR6)

| Фаза | Реестр `id` | PR | Lead | Содержание | Зависит от |
|------|-------------|-----|------|------------|------------|
| **NR0** | `membrane-node-realtime-nr0-contract` | 0 | Vesnin | Типы envelope + события в `@membrana/core` | — |
| **NR1** | `membrane-node-realtime-nr1-gateway` | 1 | Ozhegov | `NodeRealtimeGateway` WSS, auth, presence | NR0 |
| **NR2** | `membrane-node-realtime-nr2-journal-ws` | 2 | Ozhegov | `journal.append` ingest + fan-out + `journal.acked` | NR1 |
| **NR3** | `membrane-node-realtime-nr3-client-journal` | 3 | Ozhegov | `nodeRealtimeClient` + bridge в telemetry/journal | NR2 |
| **NR4** | `membrane-node-realtime-nr4-mic-live` | 4 | Музыкант | События mic-live из модуля микрофона | NR3 |
| **NR5** | `membrane-node-realtime-nr5-cabinet-live` | 5 | Rodchenko | Cabinet WS subscriber + live UI | NR2, NR3 |
| **NR6** | `membrane-node-realtime-nr6-prod-hardening` | 6 | Vesnin | Reconnect, REST fallback, prod-smoke, runbook | NR4, NR5 |

**Оценка календаря (ориентир):** NR0 0.5д · NR1 1–2д · NR2 1–2д · NR3 2д · NR4 1–2д · NR5 1–2д · NR6 1д.

**Ритм дня (регламент):** перед кодом — `MAIN_DAY_ISSUE.md` + id фазы из реестра; вечер — `yarn task:archive <nr-id>` после LGTM; Issue — батч `yarn task:close-github`.

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana (Teamlead Vesnin). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), merge-order **NR0 → NR6**. Не расширяй scope на device-board и sample library.

### Контракт envelope (NR0, обязательно)

```typescript
/** Версия wire-протокола MP7. */
export const NODE_REALTIME_PROTOCOL_V = 1 as const;

export type NodeRealtimeChannel = 'journal' | 'mic-live' | 'presence';

export interface NodeRealtimeEnvelope<T = unknown> {
  v: typeof NODE_REALTIME_PROTOCOL_V;
  channel: NodeRealtimeChannel;
  type: string;
  ts: string; // ISO 8601
  payload: T;
}

/** Курсор reconnect (per deviceId). */
export interface JournalAckPayload {
  cursor: string;
  clientEntryId: string;
}
```

Типы событий MP7 (минимум):

| channel | type | Направление |
|---------|------|-------------|
| presence | `node.online` | client → server → cabinet |
| presence | `node.offline` | client → server → cabinet |
| presence | `session.invalidated` | server → client |
| journal | `journal.append` | client → server → cabinet |
| journal | `journal.acked` | server → client |
| journal | `journal.liveSession` | client → server → cabinet |
| mic-live | `mic.session` | client → server → cabinet |
| mic-live | `analysis.brief` | client → server → cabinet |
| mic-live | `analysis.level` | client → server → cabinet (throttle ≤2 Hz) |

Канал `runtime` — **зарезервировать в enum**, не использовать в MP7.

---

### NR0 — контракт в core (детали)

**Пакет:** `@membrana/core` (ветка `vesnin`).

1. Модуль `node-realtime/` (или `contracts/node-realtime.ts`): envelope, channel, payload types для таблицы выше.
2. `journal.append` payload совместим с существующим `LiveJournalItem` / report render payload (ссылка на типы telemetry-journal-service без циклических импортов — при необходимости дублировать slim DTO в core).
3. Unit-тесты: parse/validate envelope, reject unknown `v`.
4. README core: один абзац + ссылка на этот промпт.

**DoD NR0:** типы экспортированы из `index.ts`; `yarn workspace @membrana/core test` зелёный; без Nest/React в core.

**Out of scope NR0:** сетевой код.

---

### NR1 — gateway scaffold (детали)

**Пакет:** `@membrana/background-cabinet`.

1. NestJS `@WebSocketGateway` (или Fastify ws — согласовать со стеком cabinet; предпочтение Nest для единообразия с media).
2. Endpoint dev: `wss://localhost:3020/v1/nodes/realtime` (точный path зафиксировать в README).
3. Auth: bearer/session тот же что `POST /v1/pair`; handshake query `?deviceId=` + token header.
4. Реестр подключений: `deviceId` → socket; cabinet subscribers: `membraneId` / `nodeId`.
5. События presence: при connect `node.online`, disconnect `node.offline`.
6. `session.invalidated` при revoke key (интеграция с существующим pair status).
7. Ping/pong или heartbeat 30 с.

**DoD NR1:** integration test: mock client connect/disconnect; unit auth reject invalid token; `yarn workspace @membrana/background-cabinet test`.

**Prod-smoke NR1:** опционально на staging; полный smoke — NR6.

---

### NR2 — journal over WebSocket (детали)

**Пакет:** `@membrana/background-cabinet`.

1. Inbound `journal.append`: валидация envelope → вызов существующего `JournalService` / telemetry persist (тот же путь что REST upload).
2. Outbound fan-out: всем cabinet-подписчикам мембраны + echo ack клиенту `journal.acked { cursor, clientEntryId }`.
3. `journal.liveSession`: upsert TelemetryLiveRecord metadata (без дублирования blob logic).
4. Idempotency: повтор `clientEntryId` — ack без дубля в БД.
5. Хранение `lastCursor` per deviceId для reconnect hint.

**DoD NR2:** тест: client mock шлёт 2 append → cabinet subscriber получает 2; duplicate clientEntryId → 1 row.

---

### NR3 — client journal bridge (детали)

**Пакеты:** `apps/client`, `@membrana/telemetry-journal-service` (если нужен тонкий порт).

1. `apps/client/src/lib/nodeRealtimeClient.ts`: connect при `paired`, disconnect при `autonomous` / unpair.
2. Reconnect exponential backoff (1s → 30s cap).
3. Bridge: после успешного локального `appendReport` в paired mode — **параллельно** WS `journal.append` (REST push оставить как fallback до NR6 или dual-write с feature flag `VITE_NODE_REALTIME_JOURNAL`).
4. Интеграция `journalHubBridge` / `liveJournalHub`: при `journal.acked` — обновить sync state.
5. Не ломать `SyncJournalStorageBackend` reconcile (JS1–JS4).

**DoD NR3:** paired dev: append в client → событие уходит на gateway (mock или local cabinet); autonomous — WS не открывается.

---

### NR4 — mic-live channel (детали)

**Пакеты:** `apps/client` (модуль `microphone`, плагины `mic-live-drone-analysis`, FFT live).

1. `MicLiveRealtimeBridge`: подписка на события engine/плагинов после закрытия окна 3s.
2. WS `analysis.brief` — schema `drone-detection-brief/v1` slim payload (без полной матрицы).
3. WS `analysis.level` — RMS/peak агрегат, throttle 500 ms.
4. WS `mic.session` — start/stop stream-manual | stream-auto.
5. Полный DDR — по-прежнему REST/async upload (LP1b), не блокирует WS.

**DoD NR4:** ручной smoke stream-auto: ≥3 цикла → cabinet (или ws tap) видит brief; `yarn turbo run lint typecheck test --filter=@membrana/client` зелёный.

---

### NR5 — cabinet live subscriber (детали)

**Пакет:** `apps/cabinet`.

1. `useNodeRealtimeSubscription(membraneId)`: WSS с session cookie.
2. Live journal: на `journal.append` — prepend в store без full reload (сохранить counts/pagination JS3).
3. Mic-live panel/badge: последний `analysis.brief` + session state.
4. UI: channel indicator (connected / reconnecting / offline-REST).
5. a11y: live region для новых detection cards (не спамить каждый level tick).

**DoD NR5:** cabinet + paired client локально: новая карточка журнала <1 с; индикатор WS green.

---

### NR6 — hardening + prod (детали)

**Пакеты:** все затронутые + `docs/deploy/`.

1. Feature flag или env `NODE_REALTIME_ENABLED` default true on prod после smoke.
2. Fallback: при WS down — client продолжает REST journal upload + poll; cabinet — existing refresh interval.
3. Скрипт `yarn cabinet:mp7:prod` (или расширить mp6): WS connect, 1 journal append, 1 mic brief path check.
4. Deploy `background-cabinet` + `apps/cabinet` + client build с WS URL.
5. Runbook в `deploy/MEMBRANE_PLATFORM_DEPLOY.md` §MP7.

**DoD NR6:** prod smoke OK на `cabinet.membrana.space`; `archiveNotes` на эпике; отчёт в Issue.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Контракты | `packages/core` | Envelope, event types |
| Gateway | `packages/background-cabinet` | WSS, auth, fan-out, journal ingest |
| Client transport | `apps/client/src/lib/nodeRealtimeClient.ts` | WS lifecycle, bridges |
| Journal | `apps/client` + telemetry-service | dual path append |
| Mic | `apps/client/src/modules/microphone` | mic-live events |
| Cabinet UI | `apps/cabinet` | subscriber, live journal |
| Media | `packages/background-media` | **без изменений WS** |

**Запрещено:**

- `new AudioContext` вне audio-engine (как в ARCHITECTURE.md).
- WebSocket в `background-media` / `background-office`.
- Device-board imports в gateway.
- Сырой PCM по WS.

---

### Definition of Done (эпик целиком)

- [ ] NR0–NR6 в реестре `archived` с `archiveNotes` и PR refs.
- [ ] Paired client держит WSS; autonomous — без WS.
- [ ] `journal.append` в cabinet ≤1 с без manual refresh (p95 ≤300 мс в LAN).
- [ ] `analysis.brief` после окна 3 с виден в cabinet mic-live UI.
- [ ] Revoke key → `session.invalidated` на client ≤5 с.
- [ ] REST fallback работает при убитом WS.
- [ ] Prod smoke NR6 documented and passed.
- [ ] `yarn turbo run lint typecheck test build --continue` зелёный.
- [ ] LGTM Vesnin.

### Definition of Done (одна фаза NR*)

- [ ] DoD фазы из раздела выше.
- [ ] CI зелёный для затронутых пакетов.
- [ ] PR `Closes #<issue>` + id фазы в описании.
- [ ] `yarn task:archive <nr-id> --notes "PR #…"`.
- [ ] NR1–NR5: dev smoke описан в PR; NR6: **prod-smoke** обязателен.

---

### Out of scope (весь эпик)

- Device-board runtime WS (**MP7b** / `membrane-node-runtime-remote`).
- Sample library WebSocket (**отдельный консилиум**).
- PCM/opus streaming.
- SSE параллельно WS.
- Изменения квот/media blobs.

---

### Порядок работы ролей

1. **Teamlead** — NR0 контракт, NR6 prod sign-off.
2. **Структурщик** — NR1–NR3 gateway + client transport.
3. **Музыкант** — NR4 mic-live, ручной audio smoke.
4. **Верстальщик** — NR5 cabinet UI.
5. **Математик** — review throttle/idempotency тестов NR2/NR4.

---

## Заметки для постановщика

1. Создать GitHub Issue `wish` с acceptance criteria из DoD эпика; ссылка на этот файл.
2. Утром: `yarn main-day-issue` с `primaryFocusId` = текущая фаза `membrane-node-realtime-nr*`.
3. Закрытие: [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) — prod-smoke на NR6.

### Проверка после NR6

```bash
yarn turbo run lint typecheck test build --continue
yarn cabinet:mp7:prod   # после добавления скрипта в NR6
```

---

## Связь с дорожной картой

- Membrane Platform **MP7** после MP6.
- Закрывает открытый вопрос MP0: journal sync = **WS live + REST history**.
- Device-board → MP7b; media-library → TBD consilium.
