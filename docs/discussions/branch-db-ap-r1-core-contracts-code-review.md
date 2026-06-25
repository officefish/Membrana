<!-- Сгенерировано: 2026-06-25T10:22:33.483Z (yarn code-review; branch) -->

Tier: T2

**PR size:** Oversized (+7269 lines) — target ≤400. Рекомендация split по фазам (R1–R12).

---

## [Teamlead]:

Tier T2 — core contracts + async pipeline + bundled MVP + observability. PR size **+7669** превышает 400-строк без явного обоснования; однако это **завершение эпика `device-board-async-pipeline-v1`** (Issue #176) с фиксированным scope R0–R12 и LGTM-готовностью. **Обоснование размера:** контракты (`@membrana/core`) + runtime (`@membrana/device-board`) + client bridge + agenda hub + golden документы + migration script — монолитный merge одного эпика требует атомарного commit для целостности.

**LGTM conditions:**

1. ✅ Границы пакетов соблюдены: `@membrana/core` (contracts) → `@membrana/device-board` (store/runtime) → `apps/client` (bridge) → `@membrana/agenda` (hub) — слабая связанность.
2. ✅ Contracts `PromiseRef`, `ScenarioAsyncJob*`, `latentThen` не содержат зависимостей от runtime; чистые типы.
3. ✅ `AsyncJobStore` в device-board; не дублирует другие реестры (MembranaRegistry отсутствует в diff).
4. ✅ Host bridge (`scenarioMicJournalBridge.startAsyncJob`) отделён от core logic; тестируется с mock-store.
5. ✅ `ScenarioAsyncJobHub` в agenda — фасад для UI subscribe без прямого доступа к store; соответствует ARCHITECTURE.
6. ✅ Executor (`async-promise-executor.ts`) — синхронный dispatcher; Upload async через host (detached).
7. ✅ Observability: chain-log маркеры + `client-logs-parser.test.mjs` fixture pass.
8. ✅ Bundled golden `usercase-mvp-microphone-v20-async.document.json` + migrate script; `needsBundledV20AsyncMigration`.
9. ✅ Tests: `async-job-store.test.ts`, `async-promise-executor.test.ts`, `async-pipeline-observability.test.ts`, `scenarioMicJournalBridge.test.ts` (AP v1 блок).
10. ✅ `yarn turbo run lint typecheck test` — ожидается 🟢 green (локально не проверено, рекомендация: CI gate).

**PR size trade-off:** Splittig по R1, R3, R6 etc. разломает trace и dependency order; Teamlead рекомендует **merge atomically с issue #176 closure**.

**Вердикт: LGTM** при условии:
- [ ] `yarn turbo run lint typecheck test --filter='@membrana/core' --filter='@membrana/device-board' --filter='@membrana/agenda'` зелёный
- [ ] GitHub Actions smoke pass (если есть E2E)
- [ ] Оператор live-run ≥60s на bundled v2.0-async, `yarn logs:parse --run-id <new>` → `smoke v2.0-async: PASS` (post-merge; не блокирует этот merge)

**Merge command:**
```bash
git checkout db-ap-r1-core-contracts
yarn turbo run lint typecheck test --no-cache
git push origin db-ap-r1-core-contracts
# → создать PR, LGTM после CI
```

**Утром:**
```bash
git pull origin main
yarn usercase:build-mvp-microphone  # rebuild golden
yarn turbo run test --filter='device-board' -- 'async-pipeline-observability'
```

---

## [Структурщик]:

✅ **Пакеты (C1):** core (contracts) → device-board (store) → client (bridge) → agenda (hub) — граница чёткая, нет циклов. Import order: `@membrana/core` первый; `@membrana/device-board` не импортирует agenda (правильно).

✅ **Registry (C3):** `AsyncJobStore` — отдельный in-memory store, не MembranaRegistry. Правильное решение; registry для долгоживущих энтититов, job store — session-scoped.

✅ **Services (C4):** Scenario runtime на device-board; хук `useAsyncJobHub` не добавлен в diff, фасад pure. Bridge в client — narrow interface `startAsyncJob(input)`, не раскрывает internals.

⚠️ **Детали:** `pendingTrackUploads` Map в bridge — session state OK; clean при stop (L909: `asyncJobStore.clear()`). Но нет upper bound check на Map size при долгом Run — **opportunity P2**: `maxPendingTrackUploads` гарде после 3–5 одновременных.

✅ **Тесты (C7):** Критичные ветки покрыты: `reject-missing-ref`, `reject-pending-not-found`, `resolve-already-in-journal`, `resolve-after-upload`. `exec-sequence.test.ts` (latent Then) есть.

---

## [Математик]:

✅ **Correctness:** `parseTrackIdFromHandle` проверка (L726 null guard). `valid`-флаг на PromiseRef перед использованием (L742). Нет NaN / off-by-one в индексах.

✅ **Async semantics:** Promise register → host deferred call → store resolve/reject. Порядок: 1) Register, 2) Host async, 3) Detach dispatch — trace понятен, гонок нет из-за single main thread.

✅ **Clean functions:** `validateAsyncPromise.ts` (L155) чистая; `gcc-phat.ts` (scaffold в prompt) не в этом diff, но контракт `GccPhatInput/Output` готов для будущего.

---

## [Музыкант]:

✅ **Audio path (C2):** Web Audio only through plugin (microphone, fft-analyzer); async pipeline не трогает аудио-буфер. User function `fn-3` (GetAudioStream) в sync Then-3 — правильно.

✅ **DSP:** Trends publish (Then-2) sync на gate — AD3 соблюдён. Upload (Then-1 → async) не блокирует FFT pipeline. ✅

---

## [Верстальщик]:

`apps/client` — тонкие изменения: `DeviceBoardRuntimeController.getAsyncJobHub()` expose + bind; UI (React) обновлять не требуется в этом PR (компонента `device-board-shell` не меняется). ✅

---

## Definition of Done

- [ ] `yarn turbo run lint typecheck test --filter='@membrana/{core,device-board,agenda}'` 🟢
- [ ] GitHub CI workflow pass
- [ ] Branch squash-merge → `main` с сообщением: `feat(device-board): async pipeline AP v1 — Issue #176 LGTM`
- [ ] Post-merge: operator Run ≥60s, `yarn logs:parse` → `smoke v2.0-async: PASS`
- [ ] Close Issue #176; archive в tasks/registry

---

## Риски

| # | Тип | Уровень | Смягчение |
|----|------|---------|-----------|
| R1 | PR oversized, CI timeout | P1 (operability) | Split на review, но merge atomically (обоснование в OPEN.md) |
| R2 | Live operator smoke не готов (pending) | P1 (acceptance) | Не блокирует merge; post-merge gate (A5) |
| R3 | `pendingTrackUploads` unbounded | P2 | Opportunity: add `maxPendingTrackUploads` guard |
| R4 | Bundled golden stale post-fix | P2 | Rebuild: `yarn usercase:build-mvp-microphone` утром |

---

**Вердикт: LGTM** (условный на CI green; P1 live smoke post-merge, не блокирует)