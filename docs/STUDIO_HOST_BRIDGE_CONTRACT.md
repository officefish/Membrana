# Studio Host Bridge — контракт трёх хостов device-board

> **Статус:** канон v0.1 (2026-06-26, консилиум [`studio-host-smoke-registry-2026-06-26.md`](./seanses/studio-host-smoke-registry-2026-06-26.md))  
> **Эпик:** MS6 в [`MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md`](./prompts/MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md)  
> **Операционный дневник:** [`actions/device-board/STUDIO_HOST_LESSONS.md`](./actions/device-board/STUDIO_HOST_LESSONS.md) (STx)  
> **Pack/runtime:** [`actions/device-board/USERCASE_COMPETITION_LESSONS.md`](./actions/device-board/USERCASE_COMPETITION_LESSONS.md) (Lx)

---

## Назначение

Один **DeviceScenarioDocument** (например `usercase-mvp-microphone-alpha-async-v2`) должен вести себя одинаково на трёх **хостах** — различия только в bridge-слое (backends, device id, FS), не в графе сценария.

| Хост | Entrypoint | Renderer | Статус DB3H |
|------|------------|----------|-------------|
| **Browser** | `yarn workspace @membrana/client dev` | `apps/client` | baseline (#181) |
| **Membrana Studio** | `yarn studio:dev` | `apps/client` в Electron | **DB3H-S3** (текущий) |
| **Cabinet** | web-cabinet module | embedded / iframe client | **deferred** (`db3h-s2`) |

**Membrana Device** (узкий SKU) — подмножество контракта: pairing + device-board, без full media-library (см. [`MEMBRANE_PLATFORM.md`](./MEMBRANE_PLATFORM.md)).

---

## Принципы (не нарушать)

1. **Бизнес-логика** device-board / mic / journal — только в `apps/client` + `packages/*`, не в `membrana-studio/main` (кроме FS/IPC).
2. **Web Audio** — только `@membrana/audio-engine-service` (см. `ARCHITECTURE.md` §1b).
3. **ScenarioRuntimeHost** — единая фабрика `createScenarioRuntimeHost()`; хосты не форкают runtime.
4. **Smoke** — единый `yarn logs:parse`; пороги ниже.
5. Ошибки **pack/collapse** → Lx; ошибки **bridge/Electron** → STx.

---

## §1 DeviceHandle

| Режим | `getDeviceHandle()` | `isDeviceLinked()` |
|-------|---------------------|-------------------|
| `paired` + live WS | `pairing.deviceId` (cabinet) | `true` если `isDeviceLive` |
| `autonomous` | `local-{uuid}` из `localStorage` `membrana.client.localDeviceId` | `false` |
| mode `null` | то же что autonomous | `false` |

**Реализация:** `apps/client/src/modules/device-board/createScenarioRuntimeHost.ts`  
**Тесты:** `createScenarioRuntimeHost.test.ts`  
**Урок:** ST2

Initial-event и `device-global` на main **обязаны** резолвиться в один и тот же handle в рамках run.

---

## §2 Journal backend

**Резолвер:** `apps/client/src/lib/resolveJournalBackend.ts`

| Условие | Backend | Путь / API |
|---------|---------|------------|
| paired + cabinet reachable + valid token | sync cabinet journal | HTTP + WS (ST4) |
| иначе в Studio | `electronAPI.journal` | `%APPDATA%/Membrana/journal/items.json` |
| иначе в browser | IndexedDB / local fallback | см. telemetry-journal |

**Offline smoke (ST2-J):** autonomous → entries на диске; `upload-ok: 0` норма; **reports ≥2** обязательны.

**Уроки:** ST1, ST7

---

## §3 Media library backend

**Резолвер:** `apps/client/src/lib/resolveMediaLibraryBackend.ts`

| Условие | Backend |
|---------|---------|
| paired + server OK | `background-media` remote |
| Studio offline / server down | `electron-fs` → `%APPDATA%/Membrana/media-library/` |
| browser | IndexedDB + optional remote |

Shell **не** дублирует quota logic — только FS в main (`apps/membrana-studio` MS2).

---

## §4 ScenarioRuntimeHost parity

Минимальный набор портов для alpha async-v2 smoke (не исчерпывающий):

| Port | Browser | Studio | Cabinet (plan) |
|------|---------|--------|----------------|
| `getDeviceHandle` | ✓ | ✓ | ✓ |
| `startRecorderRecording` / `isRecorderWindowFull` | ✓ | ✓ | ✓ |
| `getRecorderSessionRef` | ✓ | ✓ | ✓ |
| `resetCollectorSessions` | ✓ | ✓ | ✓ |
| `publishReport` / journal write | ✓ | ✓ (FS) | ✓ (server) |
| `startAsyncJob` (upload) | ✓ | ✓ (electron-fs) | ✓ |

**Урок:** ST6 — gate parity; `elapsedSec` в логах gate обязателен для диагностики.

---

## §5 Electron preload (`electronAPI`)

Канон surface (Studio MS1–MS3):

| API | Назначение | FS path |
|-----|------------|---------|
| `electronAPI.journal` | append/read journal items | `journal/items.json` |
| `electronAPI.mediaLibrary` | manifest + blobs | `media-library/` |
| `electronAPI.trendsTemplates` | user FFT templates | `trends-templates.json` |

`contextIsolation: true`, `nodeIntegration: false`. Preload — единственный мост.

---

## §6 Dev launcher (Studio only)

| Правило | Деталь |
|---------|--------|
| Команда | `yarn studio:dev` (root), не только workspace studio |
| Vite URL | Парсится из stdout / probe; передаётся в `MEMBRANA_STUDIO_DEV_URL` |
| Порты | 5173 default; fallback 5174+ при занятости |

**Урок:** ST3

---

## §7 Smoke matrix

Один UserCase: **alpha async-v2**. Run ≥3 min.

| Host | Mode | `logs:parse` | Journal check |
|------|------|--------------|---------------|
| Browser | paired | gate≥2, publish≥2, upload≥2 | server/cabinet |
| Studio | **autonomous** | gate≥2, publish≥2, upload WARN 0 | `yarn studio:journal-fs-check --min-tracks 2 --min-reports 2` |
| Studio | paired (ST2-O) | как browser | cabinet + local |
| Cabinet | paired | TBD db3h-s2 | server |

**Перед offline smoke:** очистить `journal/items.json` (ST7).

**Reference PASS:** browser `c778c4ee`; Studio target — TBD после ST-GATE.

---

## §7.5 Logging (desktop hosts)

Канон: [`DESKTOP_APP_LOGGING_POLICY.md`](./DESKTOP_APP_LOGGING_POLICY.md) v1.0 · консилиум [`seanses/desktop-logging-policy-2026-06-26.md`](./seanses/desktop-logging-policy-2026-06-26.md).

| Канал | Файл под `userData/logs/` | Кто пишет |
|-------|---------------------------|-----------|
| **T1** scenario trace | `device-board-trace-latest.txt` | main IPC flush (**DL-2** ✅) |
| **M1** shell | `shell-YYYY-MM-DD.log` | main via `electron-log` (**DL-1** ✅) |

**Правила:**

- Запись на диск — **только main**; renderer → IPC `membrana:logging` (backlog).
- Бизнес-log device-board остаётся в client runtime; main не дублирует gate/upload семантику в M1.
- Smoke: `yarn logs:parse` на **T1**; M1 — отдельный grep (backlog `logs:parse-shell`).
- Deprecated: `app-*.log` (L0).

README приложений: [`apps/membrana-studio/README.md`](../apps/membrana-studio/README.md), [`apps/membrana-device/README.md`](../apps/membrana-device/README.md).

---

## §8 Ritual и реестры

| Событие | Действие |
|---------|----------|
| Новый симптом Studio smoke | Запись **STx** в `STUDIO_HOST_LESSONS.md` |
| Новый симптом pack/collapse | Запись **Lx** в `USERCASE_COMPETITION_LESSONS.md` |
| Закрытие DB3H-S3 | ST6 open → closed; OPEN + consilium DoD |
| Вечерний review | grep `ST6` / gate-true в `DAILY_CODE_REVIEW` |

---

## Связанные файлы

| Область | Путь |
|---------|------|
| Runtime host | `apps/client/src/modules/device-board/createScenarioRuntimeHost.ts` |
| Mic bridge | `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts` |
| Journal resolver | `apps/client/src/lib/resolveJournalBackend.ts` |
| Studio shell | `apps/membrana-studio/src/main.ts`, `scripts/studio-dev.mjs` |
| Log parser | `scripts/lib/client-logs-parser.mjs` |
| Logging policy | `docs/DESKTOP_APP_LOGGING_POLICY.md` |
| FS check | `scripts/studio-offline-journal-check.mjs` |

---

## MS6 Definition of Done (эпик)

- [x] Документ `STUDIO_HOST_BRIDGE_CONTRACT.md` (этот файл)
- [x] `STUDIO_HOST_LESSONS.md` с ST1+
- [ ] Unit matrix: host tests green (ST5)
- [ ] Operator smoke matrix: Studio ST2-J PASS
- [ ] Ссылка в `ARCHITECTURE.md` (client hosts) — backlog
- [ ] Optional CI: headless studio journal test — backlog
