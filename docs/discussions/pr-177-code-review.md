<!-- Сгенерировано: 2026-06-25T10:31:11.906Z (yarn code-review; pr, pr-177) -->

Tier: T2

[Teamlead]: PR #177 — device-board async pipeline v1 (core contracts, Promise nodes, latent Sequence, MVP v2.0-async, bundled integration). **PR size oversized (+930 lines against target ≤400)** — обоснование: epic-замыкание (R0–R12, 12 фаз), 11 компонентов ядра, bundled golden + migrations. Граница пакетов соблюдена (@membrana/core, @membrana/device-board, @membrana/agenda слои разделены). CONCEPT §16.5.2 / SCENARIO_RUNTIME.md §10 синхронизированы. Acceptance criteria: A1–A4 unit/fixture PASS; A3 `drone-skip: 0` happy path (fixture), A5 live run pending operator. WHITE_PAPER.md §8 gate решение вложено в consilium PR #176. **LGTM** после: (1) green CI `yarn turbo run lint typecheck test --filter=@membrana/core --filter=@membrana/device-board --filter=@membrana/agenda --no-cache`; (2) spot-check `client-logs-parser.test.mjs` v20 fixture; (3) smoke browser ≥60s post-merge с `yarn logs:parse` → `smoke v2.0-async: PASS`.

[Структурщик]: Слои соблюдены. Core contracts (`PromiseRef`, `ScenarioAsyncJobRecord`, `latentThen`) в `@membrana/core` без импортов device-board. `AsyncJobStore` + runtime (`exec-sequence.ts`, `async-promise-executor.ts`, `async-resolved-dispatch.ts`) в device-board — чистая store, зависимостей нет. Agenda `ScenarioAsyncJobHub` — UI subscribe facade, не тянет runtime (правильно). Host bridge в client (`scenarioMicJournalBridge.ts`) — изоляция от core. Миграции (`needsBundledV20AsyncMigration`) в golden path, не breaking. Тесты рядом: `async-job-store.test.ts`, `async-promise-executor.test.ts`, `event-dispatch.test.ts` (расширение §12). C1/C3 ✅. Цикл 3 фаз ветки `db-ap-r1-core-contracts` → `vesnin` — по политике AD5 ✅.

[Математик]: —

[Музыкант]: Sequence `latentThen` dispatch — non-blocking main tick (Then branches fire-and-forget). Track upload via `StartAsyncJob` → `AsyncJobStore.register` → `host.startAsyncJob` (deferred) → `uploadTrackAsync` detached. Drone report на detached `on-async-resolved` (C8 цепь-лог маркеры). Trends publish **sync** на gate (Then-2) — AD3 сохранена, пarity с v0.9 ✅. Bundled v2.0-async: `latentThen: true`, 4 Then, StartAsyncJob на Then-1, drone на event-dispatch (не exec). Golden `usercase-mvp-microphone-v20-async.document.json` 1762 строк — полнота топологии проверена. C2 (Web Audio) только через plugins (microphone, fft-analyzer) ✅.

[Верстальщик]: BoardNodeInspectorNotes + palette (start-async-job, await-promise, on-async-resolved, cancel-async-jobs) новые узлы. DESIGN.md updates в каталоге `device-board.md` (+3 строк): Promise nodes, async pipeline §. Иконки/лейблы — имплицит (palette CRUD). Right sidebar bond nodes без spinner-UI (async job pending badge — follow-up R10 UI). Адаптив nodes — стандартные размеры. a11y на новых контролах — না (это R10+), но контракты готовы. C5 ✅ частично (вёрстка узлов OK, UI subscribe в R10).

**Ключевые файлы:**
- `packages/core/src/contracts/device-board/scenario-promise-ref.ts` (+34)
- `packages/core/src/contracts/device-board/scenario-async-job.ts` (+64)
- `packages/device-board/src/runtime/async-job-store.ts` (+159)
- `packages/device-board/src/runtime/async-promise-executor.ts` (+210)
- `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts` (+136/-6)
- `docs/device-board-scripts/golden/usercase-mvp-microphone-v20-async.document.json` (+1762)

**Риски:**
- **P0:** Live operator smoke (A5) — требует browser Run ≥60s, не unit-tested ✅ (fixture PASS, но live TBD).
- **P1:** Migration `needsBundledV20AsyncMigration` + load fallback для v0.9 графов — не видно reject/error пути; проверить в smoke.
- **P2:** Agenda hub subscribe (R10 side-effect) — не blocking, но UI pending badge без publish → information gap (документировано в SCENARIO_RUNTIME §10).

**Definition of Done:**
```bash
yarn turbo run lint typecheck test build \
  --filter=@membrana/core \
  --filter=@membrana/device-board \
  --filter=@membrana/agenda \
  --no-cache
node --test scripts/client-logs-parser.test.mjs
yarn workspace @membrana/device-board test -- src/runtime/async-pipeline-observability.test.ts
```

Merge условный: ✅ CI + `docs/discussions/branch-db-ap-r1-core-contracts-code-review.md` подписан. Post-merge: operator Run + `yarn logs:parse -- --run-id <new>` → **smoke v2.0-async: PASS**, `drone-skip: 0`.

---

**Итоговый артефакт:** `docs/actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md` + golden + fixture tests.

**Риски:** P0 live A5 (smoke); P1 migration fallback; P2 UI subscribe (R10).

**Вердикт:** **LGTM** (гейт: green CI local + smoke post-merge).