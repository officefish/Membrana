# OPEN: device-board bundled MVP v0.9-functions sprint

**Epic:** `device-board-bundled-mvp-v09-sprint-2026-06-25`  
**Промпт:** [`DEVICE_BOARD_BUNDLED_MVP_V09_SPRINT_PROMPT.md`](../../prompts/DEVICE_BOARD_BUNDLED_MVP_V09_SPRINT_PROMPT.md)  
**Дата открытия:** 2026-06-25  
**Статус:** **closed** (2026-06-24)

---

## Цель

Cutover bundled `usercase-mvp-microphone` с flat v0.8 на runtime-validated **v0.9-functions**; закрыть хвосты export/import, codegen, тесты, sign-off.

---

## Блокер P0 — Operator / Teamlead

- [x] **P0.1** Golden `device-scenario` → [`golden/usercase-mvp-microphone-v09-functions.document.json`](../device-board-scripts/golden/usercase-mvp-microphone-v09-functions.document.json)
- [x] **P0.2** Решения **BD1–BD5** — в промпте
- [x] **P0.3** onStart = `fn-1-block` bootstrap — `runId 7e8a289c`, `yarn logs:parse`
- [x] **P0.4** LGTM критерии P5 — ниже

### P0.4 — LGTM критерии (operator smoke)

| # | Критерий | Проверка |
|---|----------|----------|
| L1 | Fresh hydrate → v0.9 embedded (`scenario.functions[]` ≠ `[]`) | `default-usercase-mvp-microphone.generated.ts` |
| L2 | onStart: `fn-1-block` + `start-recording` (windowSec 5, wav) | chain-log / `logs:parse` → `fn-1 bootstrap: PASS` |
| L3 | Run ≥60s, ≥2 gate windows | `max tick ≥60`, `gate windows ≥2` |
| L4 | Trends reports на server journal | `publish-done` = gate count |
| L5 | Tracks на server (async OK) | `upload-ok ≥2` или подождать 5–10 s после Stop |
| L6 | CI green `@membrana/device-board` | `yarn turbo run lint typecheck test build --filter=@membrana/device-board` |

Известные WARN (не блокер cutover): `drone-skip: track-not-in-journal`, reports раньше tracks, cabinet `live-records` 500 → P7 / `ucv2-2`.

---

## Фазы

| Phase | Статус | Примечание |
|-------|--------|------------|
| P1 Spec & consilium | **partial** | `USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md` создан; consilium опционален |
| P2 Build pipeline cutover | **done** | golden → build → embedded |
| P3 Import/export functions | **doc-only** (BD1) | full `device-scenario` only; `referencedFunctions[]` → follow-up |
| P4 Layout (optional) | **deferred** | layout canon для functions в cutover |
| P5 Smoke & LGTM | **done** | Teamlead LGTM 2026-06-24 |
| P6 Tests & CI | **done** | 525 tests · lint/typecheck/build green |
| P7 Async / telemetry | **deferred** | `ucv2-2`, cabinet |

---

## Smoke reference

| Run | Gate ticks | Publish | Upload-ok | Парсер |
|-----|------------|---------|-----------|--------|
| `1cf4983b` (2026-06-24) | 21, 34, 54 | trends | partial | ручной |
| **`7e8a289c`** (2026-06-24) | 44, 85, 112, 153, 190, 229, 269, 309, 344, 376 | **10** | **3** (async) | `yarn logs:parse -- --run-id 7e8a289c` |

Canon: [`CLIENT_LOGS_PARSING.md`](../actions/device-board/CLIENT_LOGS_PARSING.md)

---

## Осталось до CLOSURE

- [x] P6 CI green (`@membrana/device-board` — 525 tests)
- [x] Teamlead LGTM на addendum v0.9 ([`USERCASE_MVP_MICROPHONE_LGTM.md`](../actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md))
- [x] `CLOSURE.md`

**Follow-up (не блокер):** BD4 rename `fn-1`/`fn-3` → `fn-StartRecording`/`fn-GetAudioStream`
