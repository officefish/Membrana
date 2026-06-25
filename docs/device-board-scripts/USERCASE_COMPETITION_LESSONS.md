# UserCase Competition — дневник недочётов и профилактика

> Живой документ для агентов и команды. Читать **перед** programmatic collapse, fork UserCase и sprint packaging.
>
> **Operator debug (Phase C):** [`COMPETITION_OPERATOR_DEBUG_REGULATION.md`](../prompts/COMPETITION_OPERATOR_DEBUG_REGULATION.md) · registry [`competition-operator-findings-registry.json`](./competition-operator-findings-registry.json)  
> **Sprint `comp-mvp-packaging-2026-06-21`:** closed — все три fork Run-green; победитель не merged.  
> **Sprint `comp-mvp-async-v2-2026-06-25`:** packaging Phase C — см. [`OPERATOR_DEBUG_LOG.md`](../competition-sprint/comp-packaging-catalog-2026-06-25/OPERATOR_DEBUG_LOG.md).  
> **Agent prompt:** [`docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md)  
> **Regulation:** [`USERCASE_GENERATION_REGULATION.md`](./USERCASE_GENERATION_REGULATION.md)  
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

### L13 — Async v2 pack: stripped GetAudioStream entry + gate exec-true boundary

**Симптом (alpha async-v2 Run, runId 2d906cf2):**

```text
main ticks: max=337 · gate-true: 0 · publish-done: 0
node-enter only main-on-tick each tick
```

**Что:** `packMvpUserCaseForTeamAsyncV2` вызывает `stripBundledUserFunctionBlocks`, который удаляет **все** `fn-*-block` на main, включая bundled `fn-3-block` (GetAudioStream). На `v2.0-async` bundled MVP входит в tick через `main-on-tick → fn-3-block → GetSample…`. После strip **нет exec-ребра** от `main-on-tick` — runtime крутит только event tick, gate/observation/publish не вызываются.

Дополнительно: collapse `recording-gate` на async v2 терял boundary `is-recording-window-full exec-true-out → sequence` (в flat MVP шло в sequence, не в stop напрямую).

**Fix:** `usercase-competition-pack.ts`:

- preserve main-tick targets + `fn-3` function для `competitionBase: v2.0-async`
- `repairAsyncV2MainLoopWiring` — exec-true-out gate block → sequence; window-full exec-true path внутри gate function
- rebuild: `yarn usercase:build-competition-async-v2-all`

**Профилактика:**

- [ ] Pack test: `main-on-tick → fn-3-block` exec edge exists
- [ ] Pack test: `recording-gate-block exec-true-out → sequence`
- [ ] CONCEPT Phase 1: explicit «bundled tick helpers» на v2.0-async base
- [ ] `yarn logs:parse` async-v2 mode (не только `fn-1-block` bootstrap heuristic)

### L14 — Async v2 pack: collect-samples recorder from gate output (pre-exec)

**Симптом (alpha async-v2, runId 6cdcbfa7):**

```text
scenario-runtime error tick=1: Node "fn-alpha-recording-gate-input" (kind=function-input) is not a data source
```

**Что:** после collapse `recording-gate` pack оставил data edge `gate-block.recorder → collect-samples.recorder`. `collect-samples` выполняется **до** входа в gate subgraph; резолвер тянет output pin gate-block → внутри function → `function-input`, где на main loop нет `resolveFunctionInputPin`.

В flat v2.0-async recorder шёл от `node-get-recorder-mqs3ir02-168` (внутри gate selection); на main остаётся `node-get-recorder-mqs6hyo6-171`.

**Fix:** `repairAsyncV2MainLoopWiring` — удалить gate→collect recorder; добавить `mqs6hyo6-171.recorder → collect-samples.recorder`.

**Профилактика:**

- [ ] Pack test: collect-samples recorder от main GetRecorder, не от gate output
- [ ] Collapse review: upstream data consumers вне selection → input pin, не output pin

### L15 — Async v2 pack: stripped StartRecording on initial

**Симптом (alpha async-v2, runId 1d779790):**

```text
main ticks: 137 · gate-true: 0 · publish-done: 0
collect-samples append ok each tick · is-recording-window-full never true
```

**Что:** bundled v2.0-async стартует WAV recorder на **initial**: `StartStreaming → fn-1-block (StartRecording)`. Competition strip удалил все `fn-*-block`, включая initial `fn-1-block`. `collect-samples` пишет в recorder ref, но `recordingSessions` без `startRecorderRecording` — gate window никогда не заполняется.

**Fix:** preserve `fn-1` + `fn-1-block` (+ main `fn-3-block-2` для restart); `repairAsyncV2InitialStartRecording`; sequence `then-3 → fn-3-block-2 → fn-1-block`.

**Профилактика:**

- [ ] Pack test: initial `fn-1-block` + exec от start-streaming
- [ ] Operator smoke: `start-recording` в логах on initial

### L16 — Async v2 track-upload: media init race + ensure-reserved hang

**Симптом (alpha async-v2, runId 043ec8d6):**

```text
gate-true: 3 · publish-done: 3 · upload-ok: 0 · async rejected: 3 · detached: 0
v20 happy path: FAIL
```

**Что:** `StartAsyncJob(track-upload)` → `importBlob` в `__buffer__` падает до detached report. На prod upload path рабочий (curl 201), квота не исчерпана. Две причины: (1) клиент стартует upload до завершения `reconfigureMediaLibraryFromConnection` / `ensureReserved`; (2) серверный `POST ensure-reserved` мог блокироваться на catalog provision (advisory lock) — диаг «висит» до `docker restart media-api`.

**Fix:** `whenMediaLibraryConfigured()` перед upload; `importBlob` вызывает `ensureReservedCollections`; `ensure-reserved` отдаёт коллекции сразу, catalog — `void` deferred; `upload-failed` с полем `code`.

**Профилактика:**

- [ ] Packaging smoke: `yarn media:diag` / `yarn media:prod:upload-smoke`
- [ ] Operator: при hung ensure-reserved — `yarn media:prod:restart-api`
- [ ] Pack/bridge: не `void` критичный media init перед async jobs

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
| `resolve-input.ts` | L12 subgraph block data pull; scenarioFunctions |
| `scenario-runtime.ts` | scenarioFunctions in resolve context |

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
