# Studio / Desktop Host — дневник недочётов и профилактика

> Живой документ для агентов и операторов. Читать **перед** DB3H-S3 smoke, `yarn studio:dev`, packaged installer smoke.
>
> **Runtime/pack (общий с browser):** [`USERCASE_COMPETITION_LESSONS.md`](./USERCASE_COMPETITION_LESSONS.md) (L1–L23)  
> **Контракт трёх хостов:** [`STUDIO_HOST_BRIDGE_CONTRACT.md`](../STUDIO_HOST_BRIDGE_CONTRACT.md)  
> **Спринт:** [`DB3H_S3_STUDIO_HOST_SPRINT_PROMPT.md`](../prompts/DB3H_S3_STUDIO_HOST_SPRINT_PROMPT.md)  
> **Парсинг логов:** [`CLIENT_LOGS_PARSING.md`](./CLIENT_LOGS_PARSING.md) · **Desktop policy:** [`DESKTOP_APP_LOGGING_POLICY.md`](../DESKTOP_APP_LOGGING_POLICY.md)  
> **Консилиум:** [`studio-host-smoke-registry-2026-06-26.md`](../seanses/studio-host-smoke-registry-2026-06-26.md)

**Разделение зон:**

| Префикс | Область | Пример |
|---------|---------|--------|
| **L*** | UserCase pack, collapse, scenario graph, runtime exec | L22 missing fn-1 |
| **ST*** | Host bridge, Electron shell, backends, dev launcher, operator smoke | ST3 Vite port |

---

## Симптомы (DB3H-S3, 2026-06-26)

```text
yarn logs:parse → gate-true: 0 · publish-done: 0 (run f9939e7b)
onStart fn-1 bootstrap: PASS · windowSec=5
main ticks: 118 · collect/FFT OK
yarn studio:journal-fs-check → tracks=2 reports=0 FAIL
```

Browser reference: run `c778c4ee` PASS (paired). Studio autonomous — pipeline OK, **gate не открывается**.

---

## Корневые причины и фиксы

### ST1 — Stale paired journal sync on Studio startup

**Симптом:** UI/FS показывает старые записи cabinet; autonomous smoke путается с прошлым paired run.

**Что:** `resolveJournalBackend` пытался sync cabinet journal без валидации pairing token.

**Fix:** `apps/client/src/lib/resolveJournalBackend.ts` — `fetchPairStatus` перед sync; fallback `electronAPI.journal`; `handlePairingInvalid` при expired session.

**Профилактика:**

- [x] Unit: `resolveJournalBackend.test.ts` (4/4)
- [ ] Operator: autonomous mode → journal только local FS
- [ ] Перед ST2-J: очистить `%APPDATA%/Membrana/journal/items.json` или сверять timestamp с текущим run

**Hosts:** Studio, browser (paired)

---

### ST2 — Autonomous `getDeviceHandle()` was `null`

**Симптом:** `scenario-run-start { device: null }`; collect/gate без device handle; bootstrap skip.

**Что:** `createScenarioRuntimeHost` возвращал `deviceHandle: null` для non-paired режима.

**Fix:** `readRuntimeLinkContext()` → `resolveDeviceBoardPersistDeviceId(null)` (`local-*` stable id).

**Профилактика:**

- [x] Unit: `createScenarioRuntimeHost.test.ts` — autonomous + unset mode
- [ ] Run logs: `scenario-run-start` с `device: 'local-…'`
- [ ] См. контракт §DeviceHandle в `STUDIO_HOST_BRIDGE_CONTRACT.md`

**Hosts:** Studio, browser, cabinet (future)

---

### ST3 — Studio dev: Vite port drift (5173 → 5174/5175)

**Симптом:** Electron blank / stale client; sandbox на 5173, Studio на другом порту.

**Что:** `yarn studio:dev` хардкодил `localhost:5173`; Vite занимал следующий порт.

**Fix:** `scripts/studio-dev.mjs` — parse Vite URL, port probe; `apps/membrana-studio/src/main.ts` — `MEMBRANA_STUDIO_DEV_URL`.

**Профилактика:**

- [ ] Log: `[studio:dev] launching Electron → http://localhost:…`
- [ ] Operator: не запускать `membrana-studio dev` без root `yarn studio:dev`
- [ ] Unit/smoke: port probe fallback (backlog)

**Hosts:** Studio only

---

### ST4 — Stale preset `microphoneId` in graph (Electron)

**Симптом:** `getUserMedia({ exact: presetId })` fail; mic-exact-fallback в логах.

**Что:** Embedded UserCase хранит deviceId с другой машины/сессии.

**Fix:** `scenarioMicJournalBridge.ts` — `mic-exact-fallback` → `acquireMicrophone(true)` → `stream:default`.

**Профилактика:**

- [ ] Run logs: `[stream] mic-exact-fallback` затем `capture-sampler-ready`
- [ ] Не считать fallback ошибкой если далее bootstrap OK
- [ ] Долгосрочно: hydrate сбрасывает mic preset в autonomous (backlog)

**Hosts:** Studio (часто), browser

---

### ST5 — fn-1 bootstrap `invalid-stream` after mic fallback

**Симптом:** `start-recording-skip { reason: 'invalid-stream' }` несмотря на live sampler.

**Что:** `resolveGetAudioStreamOutput` отвергал active stream если handle ≠ preset mic handle.

**Fix:** `packages/device-board/src/runtime/resolve-input.ts` — active stream authoritative after StartStreaming.

**Профилактика:**

- [x] Unit: `resolve-input.test.ts` updated
- [ ] Run logs: `[recording] start-recording` + `started: true` on onStart
- [ ] Связано с L20 data-pull, но проявление host-specific

**Hosts:** Studio, browser

---

### ST6 — Gate never opens despite bootstrap (OPEN)

**Симптом (run `f9939e7b`, 2026-06-26):**

```text
onStart fn-1 bootstrap: PASS · windowSec=5
gate-true: 0 · is-recording-window-full (все тики)
нет [recording] recording-window-full / stop-recording
```

**Что:** `isRecorderWindowFull` остаётся false при валидном `deviceHandle`. Возможные ветки: (a) `recordingSessions` сброшена между onStart и main; (b) `elapsedSec` не достигает 5 s wall-clock; (c) DevTools скрывает `full:` / `elapsedSec` в paste.

**Fix (диагностика, merged):** `recording-gate-executor.ts` — log `elapsedSec`; `client-logs-parser` — gate-true также по `full: true`.

**Fix (root cause):** TBD после smoke с `elapsedSec` на tick 30/60.

**Профилактика:**

- [x] Unit: `isRecorderWindowFull turns true after windowSec elapsed` (bridge)
- [ ] Run logs: tick ≥40 → `elapsedSec ≥ 5`, `full: true`, `[recording] recording-window-full`
- [ ] `yarn logs:parse`: gate windows ≥2
- [ ] Фаза спринта: **ST-GATE**

**Hosts:** Studio (observed), verify browser parity

**См. также:** L22 если нет `start-recording` вообще — другой корень.

---

### ST7 — Journal FS check: stale tracks from previous run

**Симптом:** `studio:journal-fs-check` tracks=2 reports=0 при текущем run без gate; или UI показывает записи, а `items.json` **missing**.

**Что:** `items.json` накапливает записи между run'ами; tracks от upload path (~5 s duration) без reports в том же smoke.

**Ctrl+R vs полный перезапуск (важно):**

| Действие | Renderer (UI) | Main (Electron journal FS) | `items.json` на диске |
|----------|---------------|----------------------------|------------------------|
| **Ctrl+R** | перезагрузка | **память main не сбрасывается** | не перечитывается с диска |
| Удалили `items.json` при открытой Studio | journal снова с IPC/main RAM | старые items в RAM | файл отсутствует → **FS-check FAIL**, UI может показывать RAM |
| **Закрыть Studio** (quit) + удалить `items.json` + новый запуск | чистый старт | загрузка с диска (пусто) | корректный ST7 |

**Fix:** Operator procedure — **полностью закрыть** Membrana Studio, затем удалить/очистить `journal/items.json`, затем новый smoke. Не полагаться на Ctrl+R для сброса journal.

**Профилактика:**

- [ ] Перед ST2-J: quit Studio → backup/delete `journal/items.json`
- [ ] Сверять `createdAtIso` entries с временем текущего run
- [ ] Backlog: `--since-run` в `studio:journal-fs-check`

**Hosts:** Studio only

---

### ST8 — DevTools log truncation (`…`) hides gate fields

**Симптом:** В `logs.txt` нет `full:` / `windowSec:` / `elapsedSec:` — только `…`.

**Что:** Chrome/Electron console collapse при copy-paste.

**Fix:** Использовать `yarn logs:parse`; scenario trace download; или grep raw без truncation.

**Профилактика:**

- [ ] В CLIENT_LOGS_PARSING: предпочитать `elapsedSec` после ST-GATE merge
- [ ] Operator: Download trace → `device-board-trace-latest.txt` (канон [`DESKTOP_APP_LOGGING_POLICY.md`](./DESKTOP_APP_LOGGING_POLICY.md))
- [ ] Operator: `scenario-runtime` copy trace из UI если есть

**Hosts:** all

---

### ST9 — `publish-report { journal: null }` in autonomous Studio

**Симптом (run `4ba945f8`, 2026-06-26):**

```text
gate-true: 1 · upload-ok: 1 · publish-done: 0
publish-report { journal: null, … }
yarn studio:journal-fs-check → tracks=3 reports=0 FAIL
```

**Что:** `onConnect` (JournalRef variable-set via GetJournal device scope) выполнялся только при `isDeviceLinked()`. В autonomous Studio `linked: false` → `var-JournalRef` не инициализировался → observation `publish-report` skip.

**Fix:** `scenario-runtime.ts` — (1) `shouldRunOnConnectAtStart()` для autonomous; (2) `seedJournalRefVariablesIfNeeded()` после onConnect — bootstrap `exec-false-out` не всегда доходит до parent `variable-set`, поэтому JournalRef сидится из `getDeviceJournalRef(device)`.

**Профилактика:**

- [x] Unit: `scenario-runtime.test.ts` — autonomous journal seed (ST9)
- [x] Unit: `onconnect-journal-bootstrap.test.ts` — alpha onConnect graph regression
- [ ] Run logs: `journal-ref-seed { variableId, journal, linked: false }`
- [ ] `publish-report` с `journal: 'journal:device:local-…'`
- [ ] `yarn logs:parse`: trends publish = gate; `studio:journal-fs-check` reports≥2

**Hosts:** Studio autonomous (primary), verify browser unpaired if applicable

---

## Чеклист operator smoke (Studio autonomous)

```text
[ ] yarn studio:dev (не только workspace membrana-studio)
[ ] Node connection: autonomous
[ ] Hard refresh после pull
[ ] Очистить %APPDATA%/Membrana/journal/items.json (ST7)
[ ] Run alpha async-v2 ≥3 min
[ ] logs → logs/apps/studio/logs.txt (Studio) или logs/apps/client/logs.txt (browser)
[ ] yarn logs:parse → gate ≥2, publish-done ≥2
[ ] yarn studio:journal-fs-check --min-tracks 2 --min-reports 2
```

---

## Исправления (2026-06-26)

| Файл | ST | Изменение |
|------|-----|-----------|
| `resolveJournalBackend.ts` | ST1 | Pairing validation + electron FS fallback |
| `createScenarioRuntimeHost.ts` | ST2 | `local-*` device handle autonomous |
| `scripts/studio-dev.mjs`, `main.ts` | ST3 | Dynamic Vite URL |
| `scenarioMicJournalBridge.ts` | ST4 | mic-exact-fallback |
| `resolve-input.ts` | ST5 | Active stream after fallback |
| `recording-gate-executor.ts` | ST6 | `elapsedSec` in gate log |
| `client-logs-parser.mjs` | ST6/ST8 | gate-true from `full: true` |

---

## Closure

| ST | Status | runId / date |
|----|--------|----------------|
| ST1 | fixed (uncommitted) | 2026-06-26 |
| ST2 | fixed (uncommitted) | 2026-06-26 |
| ST3 | fixed (uncommitted) | 2026-06-26 |
| ST4 | fixed (uncommitted) | f9939e7b |
| ST5 | fixed (uncommitted) | f9939e7b |
| ST6 | **open** | f9939e7b |
| ST7 | documented | 2026-06-26 |
| ST8 | documented | 2026-06-26 |
