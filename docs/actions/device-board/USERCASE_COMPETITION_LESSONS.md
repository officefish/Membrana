# UserCase Competition — дневник недочётов и профилактика

> Живой документ для агентов и команды. Читать **перед** programmatic collapse, fork UserCase и sprint packaging.
>
> **Sprint `comp-mvp-packaging-2026-06-21`:** closed — все три fork Run-green; победитель не merged.  
> **Sprint `comp-detection-alarm-2026-07-10`:** closed — winner Beta merged (#337); находки L24–L28; live Run владельцем — pending.  
> **Agent prompt:** [`docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md)  
> **Regulation:** [`USERCASE_GENERATION_REGULATION.md`](./USERCASE_GENERATION_REGULATION.md)  
> **Studio host (STx):** [`STUDIO_HOST_LESSONS.md`](./STUDIO_HOST_LESSONS.md) · контракт: [`STUDIO_HOST_BRIDGE_CONTRACT.md`](../STUDIO_HOST_BRIDGE_CONTRACT.md)  
> **Runtime map (CONCEPT §4.7):** [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md#47-runtime-execution-pipeline-exec--function-calls)  
> **CLI:** `node scripts/usercase.mjs help`  
> Источник логов: [`logs/info.txt`](./logs/info.txt).

---

## Sprint closure (2026-06-21)

| Fork | Run | Notes |
|------|-----|-------|
| alpha | ✅ | bootstrap onConnect + gate + observation |
| beta | ✅ | pure policy-build block (L12) |
| gamma | ✅ | 2 functions, policy on main |

См. [`docs/competition-sprint/comp-mvp-packaging-2026-06-21/CLOSURE.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/CLOSURE.md).

---

## Симптомы (alpha, 2026-06-21)

```
edge-invalid-socket … node-make-recording-policy-v08-1:policy->fn-alpha-recording-gate-block:policy
edge-invalid-socket … node-get-audio-stream-mql3ckno-7:stream->fn-alpha-recording-gate-block:stream
Warning: Encountered two children with the same key … (duplicate validation issues)
```

Run блокировался pre-run validation; все три sprint UserCase (`alpha`, `beta`, `gamma`) падали одинаково.

---

## Корневые причины

### L1 — Collapse: fan-in pins без dedupe

**Что:** Один внешний источник (`MakeRecordingPolicy.policy`) подключён к **дум** внутренним узлам (`StartRecording bootstrap` + `StartRecording restart`) с одинаковым `targetHandle: policy`.

**Баг:** `collapseSelectionToFunction` создавал pins `policy` и `policy-1`, но при remap branch edges использовал `inputPins.find(name === handle)` → **оба** ребра шли на pin `policy`.

**Следствие:** Дублирующиеся edges на main, `edge-invalid-socket`, duplicate React keys в banner.

**Fix:** Dedupe pins по ключу `(side, handle, socketType)` + map `boundaryEdge.id → pinId` + dedupe remapped branch edges.

**Профилактика:**

- [ ] После programmatic collapse grep embedded JSON: нет пар одинаковых `source:sourceHandle->block:pin`
- [ ] Unit-test: fan-in two `start-recording` ← one `policy`
- [ ] В DoD sprint: `validatePreRun` green после `hydrateBoardFromDocument`

---

### L2 — Collapse: exec wiring по «первому узлу», не по boundary

**Что:** Exec-in function подключался к `firstInternalExecIn` (первый узел в массиве с exec-in), часто `MakeTrack`, а не к реальной точке входа (`GetRecorder` ← `CollectFFT`).

**Следствие:** Неверный exec chain внутри function; Run ломается даже при green validation.

**Fix:** Exec-in/out wiring только по **boundary exec edges** (outside→inside `exec-in`, inside→outside `exec-*-out`).

**Профилактика:**

- [ ] Collapse order: leaf → root (trends before gate) — сохранять
- [ ] Smoke: один manual Run после каждого collapse spec в CI (optional)

---

### L3 — Hydrate: subgraph block без pins функции

**Что:** `deserializeScenarioSubgraph` восстанавливает `blockKind: subgraph` из D0 catalog (`inputs: [exec-in]`, `outputs: [exec-out]`), **игнорируя** `function.inputPins` / `outputPins`.

**Баг:** В editor после marquee collapse вызывается `syncSubgraphBlocksForFunctionPins`; при **Apply UserCase** / bundled load — **нет**.

**Следствие:** Edges на main ссылаются на `policy`, `stream`, `recorder`, а block exposes только exec → validation fail.

**Fix:** `syncAllSubgraphBlocksFromFunctionDrafts` в `hydrateBoardFromDocument` для всех веток.

**Профилактика:**

- [ ] Любой путь загрузки document (apply, bundled, import) → sync block pins
- [ ] Test: `hydrateBoardFromDocument(canon)` + `validatePreRun` для каждого competition fork

---

### L4 — inferSocketType: is-valid / Event без inline outputs

**Что:** Bootstrap onConnect collapse: `Event.server → isValid.value`. У is-valid pin `value` **без** socketType; у Event после deserialize **нет** inline outputs.

**Баг:** Fallback `DeviceRef` вместо `ServerRef` → invalid socket на block pin `value`.

**Fix:** `inferSocketTypeFromEdge` → fallback через `resolveHandle` (catalog / nodeKind pins).

**Профилактика:**

- [ ] Boundary edges с Event / is-valid / print — явно проверять socketType pins в function draft

---

### L5 — Sprint build vs editor collapse parity

**Что:** Editor marquee collapse + `syncSubgraphBlocksForFunctionPins` в graph-context; sprint использует `packMvpUserCaseForTeam` + JSON embed **без** post-sync до hydrate.

**Профилактика:**

- [ ] Считать editor path и script path **одним** контрактом: оба должны проходить `validatePreRun` после hydrate
- [ ] Не закрывать sprint Phase 2β без Run gate OR явного split canvas DoD / Run DoD

---

### L6 — Collapse order и node id sets

**Что:** `GATE_NODE_IDS` включает **внутренний** `GetRecorder` (`mqmo3mba-31`), не путать с **внешним** (`mqm9sdoi-25` на main). MVP намеренно имеет два recorder getter.

**Профилактика:**

- [ ] Collapse specs — только ids из **актуального** MVP generated, не из memory
- [ ] После MVP rebuild — пересобрать все competition forks

---

### L7 — D-PINS-9 и mega-bundle

**Что:** Gamma mega-function > 9 pins → build fail.

**Fix:** Split на 2 functions (gate + trends).

**Профилактика:**

- [ ] Планировать pin budget до collapse; `MAX_SCENARIO_FUNCTION_PINS_PER_SIDE` в CONCEPT

---

### L8 — Community tier entitlement (client)

**Что:** `tier: community` мапился в `locked` → нельзя Apply sprint variants.

**Fix:** `UserCaseEntitlementStatus` + `canApply: true` для community.

**Профилактика:**

- [ ] Новый tier в manifest → client catalog service + picker badge + test

---

### L9 — Runtime: function-input без bridge с parent graph

**Симптом (alpha Run, 2026-06-21):**

```text
ResolveInputError: Node "fn-alpha-bootstrap-input" (kind=function-input) is not a data source
```

**Что:** Pre-run green, Run падает на `fn-alpha-bootstrap-block` (onConnect). Exec проходит через `function-input`, но data внутри function (is-valid ← `value`, get-journal ← `server`) резолвится с `function-input`, а runtime не подтягивал значения с parent edges на subgraph block.

**Fix:** `augmentResolveContextForFunctionCall` + `resolveFunctionInputPin` в `block-executor` subgraph case.

**Профилактика:**

- [ ] UserCase с functions → smoke Run onConnect + main tick
- [ ] Unit-test: Event.server → block pin → function-input → downstream node

---

### L10 — Serialize roundtrip теряет data edges на subgraph block

**Симптом (alpha Run tick 1):**

```text
flush-spectral-analyser skip { reason: 'invalid-analyser' }
make-fft-trends-analysis requires variableStore, resolveContext and analysisStore
```

**Что:** После **второго** programmatic collapse data edges `analyser/policy/journal → fn-alpha-observation-tick-block` исчезали из `main.edges`. `deserializeScenarioSubgraph` восстанавливал block только с D0 pins (exec-in/out); `serializeScenarioSubgraph` → `toScenarioEdge` отбрасывал edges с неизвестными handles.

**Fix:** `deserializeScenarioSubgraph(..., functions)` синхронизирует block pins из `scenario.functions`; `applyBranchCollapse` передаёт уже созданные functions; `block-executor` subgraph case пробрасывает все runtime stores (`analysisStore`, `collectStore`, …).

**Профилактика:**

- [ ] Test: pack alpha → 3 data edges на observation block
- [ ] Любой collapse chain: deserialize с functions перед следующим collapse

---

### L11 — Collapsed gate: observation каждый tick, report null

**Симптом (alpha Run, runId db2d863d):**

```text
collect append → gate → observation (каждый tick)
fft-trends-abort { reason: 'insufficient-subsample', frameRefCount: 1 }
make-report-from-analysis { analysis: null }
```

**Что:** В MVP flat `is-recording-window-full exec-false-out → main-infinity` — trends/flush **пропускаются**, пока окно записи не заполнено. После collapse gate function выходит через `function-output` с pin `exec-false-out`, но `findExecSuccessor` искал только `targetHandle === 'exec-in'`. Subgraph завершался без propagated handle; parent block default `exec-out` → observation **каждый tick** → flush по 1 frame → subsample never met.

**Fix:** `exec-successor.ts` — follow exec в `function-output` с именованными pins; `runSubgraphOnce` возвращает `execOutHandle`; `block-executor` subgraph case пробрасывает его в main exec chain.

**Профилактика:**

- [ ] Test: function subgraph с `exec-false-out → function-output` → parent `exec-false-out`
- [ ] Run logs: observation только после `is-recording-window-full full: true`

---

### L12 — Beta: pure policy-build block не data source

**Симптом (beta Run tick 1):**

```text
ResolveInputError: Node "fn-beta-policy-build-block" (kind=subgraph) is not a data source
```

**Что:** Beta выносит `MakeRecordingPolicy` + `MakeFftTrendsPolicy` в `fn-beta-policy-build` (pure, без exec). Gate/trends тянут `policy` с block pin, но `resolveNodeOutput` не умел читать выход collapsed function — только exec + function-input bridge.

**Fix:** `resolveNodeOutput` для `blockKind=subgraph` → pull через function-output pin во internal pure node; `scenarioFunctions` в `ResolveInputContext` из `ScenarioRuntime.execOptions`.

**Профилактика:**

- [ ] Test: policy-build block → gate `resolveFunctionInputPin('policy')`
- [ ] Любой data-only collapsed function: проверить Run без exec на block

---

### L18 — Clip recorder: stop-recording-empty on second gate cycle

**Симптом (beta async-v2, runId f73b167b):**

```text
gate tick 77 · recording-window-full · stop-recording-empty · no second make-track
```

**Что:** после then-3 `StartRecording` session timer активен, но clip recorder уже снят на первом `StopRecording`. Idempotent start пропускал re-arm → второй gate получал пустой blob.

**Fix:** `scenarioMicJournalBridge.startRecorderRecording` — re-arm при `session.isActive()` без `activeClipRecorders` (#180).

**Профилактика:**

- [x] Unit: start → stop → re-arm → stop (`scenarioMicJournalBridge.test.ts`)

### L19 — Detached report dispatch in collapsed upload pipeline

**Симптом (alpha/beta/gamma pass runs):**

```text
event-dispatch-detached-error on on-async-resolved inside fn-*-async-*-block
```

**Что:** `dispatchAsyncResolvedBranches` внутри collapsed function не резолвил parent block data pins для `make-report-from-track` (track/reporter через function-input).

**Fix:** `augmentResolveContextForFunctionSubgraphTarget` в `async-resolved-dispatch.ts` — bridge в `findAsyncResolvedTargets` и detached dispatch (#180).

**Профилактика:**

- [x] Runtime test collapsed upload pipeline (`async-resolved-dispatch.test.ts`)

### L20 — Async v2 pack: orphaned main loop entry (GetAudioStream stripped)

**Симптом (alpha async-v2, runId `044ec8eb`, 2026-06-26):**

```text
main ticks: 816 · gate-true: 0 · publish: 0 · upload: 0
unique nodeIds on main: только main-on-tick (нет get-sample, gate, sequence)
```

**Что:** Рантайм крутится, серверный журнал пуст — main-пайплайн **никогда не стартует** после `onTick`.

**Корневая причина (двойная):**

1. `stripBundledUserFunctionBlocks` удалял `fn-3-block` (`GetAudioStream::fn-3`), т.к. парсинг label через маркер `::fn-` давал id `"3"` вместо `"fn-3"` → preserve не срабатывал.
2. `packMvpUserCaseForTeamInternal` обнулял `scenario.functions` → терялась def `fn-3`; team collapses могли дополнительно выбросить entry edges.

**Следствие:** Нет ребра `main-on-tick` → `fn-3-block` → `GetSample`; `runSubgraphOnce` завершает тик сразу после event-узла. Это **не** upload (#178) и **не** gate L18/L19 — до gate exec не доходит.

**Fix (`usercase-competition-pack.ts`, 2026-06-26):**

- `parseSubgraphFunctionId` для preserve whitelist (`fn-3`)
- `preservedBundledFunctions` + не strip `fn-3-block` / `fn-3-block-2`
- `restorePreservedMainLoopWiring` после collapses
- Test: `main-on-tick` exec → `fn-3-block`; runtime smoke `runSubgraphOnce` past onTick

**Профилактика:**

- [x] Unit: strip preserves `fn-3-block` + entry exec edge
- [x] Unit: packed alpha async v2 `runSubgraphOnce` enters `fn-3-block` or `get-sample`
- [ ] После `yarn usercase:build-competition-async-v2 *` — grep embedded: `"source": "main-on-tick"` + target `fn-3-block`
- [ ] Manual Run + `yarn logs:parse`: `gate-true` / `get-sample` > 0 (не только `main-on-tick`)
- [ ] `validatePreRun` **не** ловит orphan entry — не считать green pack достаточным без L20 checks

---

### L21 — Collapsed gate: recorder data pull before exec (function-input bridge on main)

**Симптом (alpha async-v2, runId `da5d1257`, 2026-06-26):**

```text
main tick 1: fn-3 → get-sample → fft → collect-fft → collect-samples
scenario-runtime error: Node "fn-alpha-recording-gate-input" (kind=function-input) is not a data source
```

**Что:** L20 починил entry; первый main tick доходит до `collect-samples`, который тянет `recorder` с `fn-alpha-recording-gate-block` **до** exec-входа в gate. `resolveSubgraphBlockOutput` резолвил внутренний `GetRecorder` → `function-input.device` без `resolveFunctionInputPin` (bridge с parent edges на block).

**Fix:** `resolve-input.ts` — в `resolveSubgraphBlockOutput` вызывать `augmentResolveContextForFunctionCall` перед резолвом внутренних output nodes (тот же контракт, что L9 в `block-executor`).

**Профилактика:**

- [x] Unit: `resolveNodeOutput(gate-block, recorder)` с parent `device-global → gate:device`
- [ ] Run logs: tick 1 проходит `collect-samples` без `function-input` error
- [ ] При новых collapsed functions с data-in pins — тест data pull с parent subgraph

---

### L22 — Competition pack: missing fn-1 bootstrap + broken gate hot path (async v2)

**Симптом (alpha async-v2, runId `36da5e80`, 2026-06-26):**

```text
main ticks: max=150 · gate-true: 0 · publish-done: 0 · upload-ok: 0
is-recording-window-full full: false (все 150 тиков)
onStart: StartStreaming без start-recording
```

**Что:** L20/L21 починили entry и data-pull; тики идут, `collect-samples` append OK, но **запись никогда не стартует** — `stripBundledUserFunctionBlocks` вырезал `fn-1-block` с onStart (сохранён был только `fn-3`). Без `start-recording` `isRecorderWindowFull` всегда false. Дополнительно: collapsed `fn-*-recording-gate` fan-out `exec-in` → stop/make-track параллельно gate-check; на main нет `gate-block exec-out → Sequence`.

**Fix:** `usercase-competition-pack.ts` — preserve `fn-1`, `restorePreservedBundledWiring` (initial + main), `repairCollapsedRecordingGateFunctions`, async v2 `restoreAsyncV2RecordingGateHotPath` (gate `exec-out` → `node-sequence-gate-v20-async`).

**Профилактика:**

- [x] Pack test: initial `fn-1-block` после `StartStreaming`; gate `exec-out → Sequence`; нет `then-0/1 → gate exec-in`
- [ ] Run logs: `start-recording` на onStart; после ~5 s `recording-window-full` / gate-true
- [ ] `yarn usercase:build-competition-async-v2 alpha` после правок pack

---

### L23 — Async v2: Sequence then-0 orphaned after gate collapse (no upload)

**Симптом (alpha async-v2, runId `410387f3`, 2026-06-26):**

```text
gate-true: 4 · publish-done: 4 (trends) · upload-ok: 0 · async-jobs start: 0
sequence-then-skip thenIndex: 0,1 · make-track/slice-start OK inside gate
```

**Что:** L22 перенёс stop/make-track в collapsed gate; flat `Sequence then-0/1` указывали на узлы, снятые с main. `StartAsyncJob` получал `track` data с gate-block, но **без exec-in** — upload и треки в journal не стартовали. Trends reports публикуются sync (then-2 observation).

**Fix:** `restoreAsyncV2SequenceUploadWiring` — `then-0 → node-start-async-job-v20 exec-in` после pack.

**Профилактика:**

- [x] Pack test: sequence `then-0` → `StartAsyncJob`
- [ ] Run logs: `async-job-start` / `[media] upload-ok` после gate-true
- [ ] Серверный journal: tracks появляются (часто 1–3 тика после publish trends)

---

### L24 — Runtime: exec-subgraph не пробрасывал basn-stores (comp-detection-alarm)

**Симптом (все команды, unit vs live, 2026-07-10):** runtime-smoke на `executeScenarioBlock` зелёный, но живой Run бросил бы `make-detection-fusion requires ... fusionStore` — `runSubgraphOnce`/function-call не передавали fusion/ensemble/proximity stores (нашла Beta, CONCEPT §Risks).

**Fix (#338):** проброс трёх store в `exec-subgraph.ts` + function-call ветке `block-executor`.

**Профилактика:**

- [x] Новый runtime-store → grep ВСЕ точки `executeScenarioBlock(` и `runSubgraphOnce(` — проброс везде
- [ ] Smoke новых узлов гонять и через `runSubgraphOnce`, не только прямой executor

---

### L25 — Host: startAsyncJob принимал только track-upload (report-build reject)

**Симптом (gamma, live, 2026-07-10):** `async-job rejected unsupported-async-job-kind:report-build` — smoke на stub-host проходил, живой клиент реджектил (нашла Gamma, ADR G5 — detached-обход через промис трека).

**Fix (#338):** `scenarioMicJournalBridge.startAsyncJob` — report-build = детач-resolve после микротаска (main loop не блокируется).

**Профилактика:**

- [x] Новый `ScenarioAsyncJobKind` → проверять клиентский host, не только stub
- [ ] В DoD сценариев с async: chain-log без rejected-jobs на живом Run

---

### L26 — Collect invalid-ref дефолтного kind до первого flush → type-mismatch

**Симптом (beta, 2026-07-10):** типизированное ребро от collect-fft-frames batch-выхода бросало `type-mismatch` на холодном старте — store до flush отдавал `kind: AudioSampleRefList` по дефолту; команды обходили нетипизированными рёбрами (костыль).

**Fix (#341):** `resolveNodeOutput` коэрсит invalid-ref к каноничному kind узла; сквозной инвариант «invalid-ref всегда несёт целевой kind» (консилиум comp-findings т.1).

**Профилактика:**

- [x] Unit: типизированное ребро от collect до flush → invalid с целевым kind, без throw
- [ ] Новые ref-источники: invalid-состояние обязано нести целевой kind

---

### L27 — Вход в alarm-loop по trends-соло вопреки fusion

**Симптом (2026-07-10):** runtime detection-front переключал main→alarm по `lastDetection` от trends-СОЛО (legacy D0); branch-on-detection с combined-порогом на вход в alarm не влиял — тревога стартовала вопреки ансамблю (дух ND3 нарушен).

**Fix (#341):** fusion — единственный писатель lastDetection (combined → front); порог detected — из связанного branch-узла ГРАФА (`resolveFusionDetectedThreshold`, не хардкод, не runtime→топология); legacy fallback в графах без fusion. NB: реализация «фикс-порог 0.5 внутри fusion» была поймана closure-review как BLOCK — рассинхрон с branch-порогом сценариев (Beta 0.55).

**Профилактика:**

- [x] Unit: порог branch 0.55 / combined 0.52 → not detected (рассинхрона нет)
- [x] Unit: граф без fusion → trends пишет lastDetection (fallback жив)

---

### L28 — Анализаторы бросали на пустом окне холодного старта

**Симптом (2026-07-10):** `MakeEnsembleAnalysis/MakeFftTrendsAnalysis: empty ...List` — сценарий умирал в первые тики, пока collect не наполнился (n=0 — transient холодного старта, не ошибка).

**Fix (#341):** молчащий skip (`skipReason: empty-window` в лог, store не пишется, ref остаётся invalid с целевым kind, exec продолжается); throw — только для реального мусора (NaN/неверный kind).

**Профилактика:**

- [x] Unit: пустой batch → skip, ref invalid с kind, exec идёт дальше
- [ ] Live Run: первые тики без красного экрана; `empty-window` в логе — норма

---

## Чеклист live Run трёх сценариев (comp-detection-alarm, перед sign-off владельца)

```text
[ ] Пикер: Alpha / Beta·winner / Gamma видны (community), Apply работает
[ ] Пуск: первые тики живут (empty-window в логе — ок, красного экрана нет)
[ ] Дрон-звук ≥15 c: branch → detected; трек пишется; combined-отчёт в журнале
[ ] chain-log: ноль rejected async-jobs (report-build детачится)
[ ] Тревога живёт (ближе/дальше); вход в alarm СИНХРОНЕН порогу branch-узла
[ ] Тишина ≥15 c: proximity lost → выход из alarm → main продолжает
[ ] yarn logs:parse: gate-true > 0, публикации не блокировали тики
[ ] Новые находки → сюда же (симптом → корень → фикс → профилактика)
```

---

## Чеклист перед merge competition UserCase

```text
[ ] yarn usercase:build usercase-mvp-microphone
[ ] node scripts/build-usercase-competition-team.mjs alpha|beta|gamma
[ ] yarn workspace @membrana/device-board test (usercase-competition-pack + collapse-to-function)
[ ] validatePreRun green ×3 после hydrate
[ ] Manual Run F1–F6 в browser (mic device)
[ ] verify-layout green
[ ] Нет duplicate edges к одному block pin в generated JSON
```

---

## Исправления (2026-06-21)

| Файл | Изменение |
|------|-----------|
| `collapse-to-function.ts` | Pin dedupe, boundary edge map, exec boundary wiring, resolveHandle infer |
| `hydrate-board-from-document.ts` | `syncAllSubgraphBlocksFromFunctionDrafts` |
| `function-pin-ops.ts` | Export sync helper |
| `usercase-competition-pack.test.ts` | pre-run gate ×3 teams |
| `*.generated.ts` | Rebuilt alpha/beta/gamma |
| `function-call-resolve.ts` | Parent pin → function-input data bridge |
| `resolve-input.ts` | `function-input` in `resolveNodeOutput` |
| `block-executor.ts` | Augmented context + all stores on subgraph call |
| `serialize-scenario-subgraph.ts` | Deserialize + function pin sync |
| `exec-successor.ts` | L11 function-output exec pins |
| `resolve-input.ts` | L12 subgraph block data pull; L21 `augmentResolveContextForFunctionCall` in `resolveSubgraphBlockOutput` |
| `scenario-runtime.ts` | scenarioFunctions in resolve context |
| `usercase-competition-pack.ts` | L20 preserve `fn-3`, `restorePreservedMainLoopWiring`, `parseSubgraphFunctionId` |
| `usercase-competition-async-v2-pack.test.ts` | L20 entry wiring + runtime smoke |

---

## Agent tooling (2026-06-21)

| Script | Command |
|--------|---------|
| Agent CLI | `node scripts/usercase.mjs help` |
| Build all forks | `yarn usercase:build-competition-all` |
| Verify pack | `node scripts/usercase.mjs verify-pack <id>` |
| Generation prompt | `docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md` |

---

## Связанные документы

- [`COMPETITION_SPRINT_BRIEF.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/COMPETITION_SPRINT_BRIEF.md) — F1–F6 parity
- [`WINNER.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/WINNER.md) — Phase 5 blocked until Run proven
- [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) — user functions CGF

---

*Обновлять при каждом новом sprint packaging или regression Run на collapsed UserCase.*
