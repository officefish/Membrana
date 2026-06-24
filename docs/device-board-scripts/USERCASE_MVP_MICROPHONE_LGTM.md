# UserCase MVP microphone — LGTM (device-board)

> **Date:** 2026-06-21  
> **id:** `usercase-mvp-microphone`  
> **Branch:** `vesnin`  
> **Канон:** [`USERCASE_MVP_MICROPHONE.md`](./USERCASE_MVP_MICROPHONE.md) · [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §16.5

## Вердикт

**UserCase MVP microphone выполнен через device-board runtime** — live mic, bundled graph, journal publish.

Цепочка **onConnect → onStart → onMainTick (gate + trends) → onStop / onDisconnect** работает end-to-end без plugin-sidecar для observation bundle.

---

## Что доказано (operator + chain-log)

| Критерий | Статус | Доказательство |
|----------|--------|----------------|
| Bootstrap: journal, device, mic, stream | **PASS** | `info.txt` onConnect + initial |
| Recording gate 5 s · WAV | **PASS** | `recording-window-full` → `stop-recording` → `MakeTrack` |
| Policy constructors на canvas | **PASS** | `MakeRecordingPolicy` + `MakeFftTrendsPolicy` (pure, data-only) |
| Trends classify + journal | **PASS** | `fft-trends-input` → `make-report-from-analysis` → `publish-report` (`trends-fft/v0.1`) |
| Shipped catalog (6 templates) | **PASS** | DRONE_TIGHT + WIND/QUIET/TRAFFIC/BIRDS/VOICE |
| Bundled default (без ручного import) | **PASS** | `default-usercase-mvp-microphone.generated.ts` |
| CI smoke | **PASS** | `yarn recording-parity:smoke-matrix`, `yarn trends-parity:smoke-matrix` |

**Sign-off runs:** `docs/device-board-scripts/logs/info.txt` (run `8deacb27`, tick 45+ publish).

---

## Закрытые эпики (parity v0.8)

| Эпик | Фазы | Архив |
|------|------|-------|
| Recording parity A | A0–A5 | [`db-recording-parity-mic-v08`](../tasks/archive/db-recording-parity-mic-v08.md) |
| Trends FFT parity B | P0, B0–B3 | [`DEVICE_BOARD_TRENDS_FFT_PARITY_V08_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_TRENDS_FFT_PARITY_V08_EPIC_PROMPT.md) |
| Pure Getters U7 | P0, G0–G4 | [`PURE_GETTERS_LGTM.md`](./PURE_GETTERS_LGTM.md) |

---

## Не входит в LGTM (осознанно)

- Formal 60 s plugin vs graph A/B timeline (deferred в B3 sign-off)
- Alarm loop journal (stub `onTick → ∞`)
- UserCase picker UI в shell (import JSON / bundled default only)
- Server-side scenario CRUD в production (следующая фаза)

---

## Следующая фаза

См. [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](../prompts/DEVICE_BOARD_POST_USERCASE_ROADMAP.md):

1. **Usability** — editor UX, policy inspectors, run/debug affordances  
2. **Documentation snapshot** — зафиксировать v0.8 board state в CONCEPT + catalog  
3. **Server support** — `device-scenario` persist через `background-media`, pairing path

---

## Addendum: v0.9-functions cutover (2026-06-24)

> **Sprint:** `device-board-bundled-mvp-v09-sprint-2026-06-25`  
> **Предшественник:** v0.8 LGTM выше (flat graph) остаётся в силе для parity-эпиков.  
> **Smoke:** `logs/apps/client/logs.txt` · `runId 7e8a289c` · `yarn logs:parse`  
> **Teamlead LGTM:** **approved** 2026-06-24

### Вердикт

**Bundled default `usercase-mvp-microphone` переведён на v0.9-functions** — `scenario.functions[]`, onStart bootstrap через `fn-1-block`, main hot path с `fn-3` + recording gate, auto-migrate flat v0.8 (BD5).

### Критерии (P0.4 / operator)

| # | Критерий | Статус | Доказательство |
|---|----------|--------|----------------|
| L1 | Embedded `functions[]` ≠ `[]` | **PASS** | `default-usercase-mvp-microphone.generated.ts` · `yarn usercase:build-mvp-microphone` |
| L2 | onStart `fn-1-block` bootstrap | **PASS** | `logs:parse` · `[recording] start-recording` до main |
| L3 | Run ≥60s, ≥2 gate windows | **PASS** | `7e8a289c`: max tick 376, 10 gate ticks |
| L4 | Trends `publish-done` на journal | **PASS** | 10/10 gate · server trends reports |
| L5 | Tracks upload (async) | **WARN** | 3/10 `upload-ok` до Stop; 7 догружаются async — не блокер BD2/P7 |
| L6 | CI `@membrana/device-board` | **PASS** | P6 sprint 2026-06-24 |
| L7 | Migrate flat → v0.9 | **PASS** | `needsBundledV09FunctionsMigration` + unit tests |

### Известные ограничения (не регресс cutover)

| Тема | Статус |
|------|--------|
| `drone-skip: track-not-in-journal` на 2-м PublishReport | Ожидаемо до `ucv2-2` async |
| `fn-3` `is-valid: false` на main | Не блокирует Run (guard внутри fn) |
| cabinet `live-records` 500 | P7 infra |
| Id `fn-1`/`fn-3` vs BD4 `fn-StartRecording` | Follow-up rename |

### Закрытые задачи спринта (code)

- Golden document + build pipeline от golden  
- Export full UserCase (device-board shell + launcher)  
- Competition pack / parity matrices обновлены под v0.9 topology  

### Deferred

- **BD4** canonical function ids  
- **P3** `referencedFunctions[]` branch export/import  
- **P4** comment groups layout  
- **P7** async MakeTrack/Publish — [`USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md`](../prompts/USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md)
