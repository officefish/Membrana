# Промпт: автогенерация Device-Board UserCases

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Регламент (normative):** [`USERCASE_GENERATION_REGULATION.md`](../device-board-scripts/USERCASE_GENERATION_REGULATION.md)  
> **Дневник уроков:** [`USERCASE_COMPETITION_LESSONS.md`](../device-board-scripts/USERCASE_COMPETITION_LESSONS.md) (L1–L12)  
> **Эталон runtime:** bundled `usercase-mvp-microphone` (flat main, LGTM 2026-06-21)  
> **Sprint reference:** `comp-mvp-packaging-2026-06-21` — alpha/beta/gamma, **Run parity доказан**, merge победителя **отложен**

---

## Когда использовать этот промпт

- Пользователь просит **собрать / упаковать / сгенерировать** новый UserCase из MVP или branch JSON.
- Нужен **programmatic collapse** (functions + comment groups) без ручного редактирования embedded JSON.
- Агент должен **повторить попытку** после правок в `usercase-competition-pack.ts` или collapse runtime.

**Не использовать** для правок runtime device-board без нового UserCase — см. [`DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md`](./DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md) и дневник L9–L12.

---

## Цель

Получить **новый catalog entry** `usercase-<kebab-id>`:

1. `docs/device-board-scripts/usercase-<id>/manifest.json` + branch bundles `01–06.json`
2. `packages/device-board/src/graph/default-usercase-<id>.generated.ts`
3. Запись в `packages/device-board/src/catalog/bundled-user-case-entries.ts` (если публикация в picker)
4. **Green gates:** `verify-layout` + `verify-prerun` + `usercase-competition-pack.test.ts` (или аналог) + **manual Run** с mic

---

## Agent CLI (обязательно)

Единая точка входа для агентов:

```bash
node scripts/usercase.mjs help
```

| Команда | Назначение |
|---------|------------|
| `build <usercase-id>` | Сборка embedded + manifest |
| `build-competition <alpha\|beta\|gamma\|all>` | Pack fork из MVP |
| `verify-layout <id>` | Layout canon |
| `verify-prerun <id>` | Hydrate + validatePreRun |
| `verify-pack <id>` | layout + prerun |
| `verify-competition` | verify-pack для alpha, beta, gamma |

Yarn-алиасы (корень репо):

```bash
yarn usercase:build usercase-mvp-microphone
yarn usercase:build usercase-mvp-microphone-beta
yarn usercase:build-competition-all
yarn usercase:verify-layout usercase-mvp-microphone-beta
yarn usercase:verify-prerun usercase-mvp-microphone-beta
yarn usercase                          # = node scripts/usercase.mjs
```

**Порядок после изменений в pack/collapse:**

```bash
yarn usercase:build-competition-all
yarn workspace @membrana/device-board test usercase-competition-pack
node scripts/usercase.mjs verify-competition
# Manual: Apply в client → Run → сохранить docs/device-board-scripts/logs/info.txt
```

---

## Архитектура (слой → путь)

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Source JSON | `docs/device-board-scripts/device-scenario-*.json` | Legacy branch exports (MVP flat) |
| Bundle folder | `docs/device-board-scripts/usercase-<id>/` | manifest + `01–06` branch files |
| Build scripts | `scripts/build-usercase*.mjs`, `scripts/usercase.mjs` | Embed TS, layout canon, verify |
| Pack logic | `packages/device-board/src/graph/usercase-competition-pack.ts` | Programmatic collapse + comment groups |
| Collapse core | `packages/device-board/src/graph/collapse-to-function.ts` | Pin dedupe, boundary exec |
| Hydrate | `packages/device-board/src/graph/hydrate-board-from-document.ts` | Block pins sync |
| Runtime | `packages/device-board/src/runtime/*` | function-input bridge, exec-successor, subgraph data pull |
| Catalog | `packages/device-board/src/catalog/bundled-user-case-entries.ts` | Picker entries |

**Запрещено:** править `*.generated.ts` вручную — только через build scripts.

---

## Workflow генерации (новый fork)

### Phase 0 — Baseline

1. Прочитать [`USERCASE_COMPETITION_LESSONS.md`](../device-board-scripts/USERCASE_COMPETITION_LESSONS.md) (L1–L12).
2. Убедиться, что MVP flat собирается и Run зелёный:
   ```bash
   yarn usercase:build usercase-mvp-microphone
   yarn workspace @membrana/device-board test default-usercase-mvp-microphone
   ```

### Phase 1 — Spec (CONCEPT)

Зафиксировать в `docs/competition-sprint/<sprint-id>/team-<name>/CONCEPT.md` или в task-промпте:

- **Collapse order** (leaf → root): trends/gate/policy — см. `TEAM_MAIN_COLLAPSES` в `usercase-competition-pack.ts`
- **Pin budget:** ≤ 9 pins per side (`MAX_SCENARIO_FUNCTION_PINS` — см. CONCEPT)
- **Pure nodes:** policy constructors — data-only; не ставить на exec chain
- **onConnect collapse:** опционально (alpha pattern); beta/gamma — flat onConnect OK
- **Comment group profile:** `alpha` | `beta` | `gamma` | новый в `usercase-comment-group-profiles.ts`

### Phase 2 — Implement pack

1. Добавить team id в `CompetitionTeamId` + `TEAM_MAIN_COLLAPSES` (+ `TEAM_ONCONNECT_COLLAPSES` при необходимости).
2. Unit-test в `usercase-competition-pack.test.ts`:
   - function count, verify-layout
   - **pre-run** после hydrate
   - data edges на observation/trends block (см. alpha test)
3. Зарегистрировать builder в `scripts/build-usercase.mjs` `BUILDERS`.

### Phase 3 — Build & verify

```bash
yarn usercase:build usercase-mvp-microphone-<team>
node scripts/usercase.mjs verify-pack usercase-mvp-microphone-<team>
yarn workspace @membrana/device-board test usercase-competition-pack collapse-to-function
```

### Phase 4 — Run gate (обязательно)

Manual в browser (`yarn workspace @membrana/client dev`):

| Check | Ожидание в `info.txt` |
|-------|------------------------|
| Tick 1..N | только gate, **без** trends/observation |
| После window full | stop-recording → make-track → fft-trends-done → publish-report |
| Нет | `scenario-runtime error`, `ResolveInputError`, `insufficient-subsample` на **каждом** tick |

Сохранить лог: `docs/device-board-scripts/logs/info.txt`.

---

## Правила collapse (из L1–L12, норматив)

### Pack-time

- **L1:** fan-in policy → dedupe pins; grep duplicate edges `source:handle → block:pin`
- **L2:** exec-in/out только по **boundary edges**, не по `firstInternalExecIn`
- **L6:** node ids только из актуального MVP generated
- **L7:** не более 9 pins на сторону function
- **L10:** multi-collapse — `deserializeScenarioSubgraph(..., functions)` перед следующим collapse

### Hydrate

- **L3/L5:** `syncAllSubgraphBlocksFromFunctionDrafts` на любом apply/load path
- **L4:** Event/is-valid boundary — проверять socketType pins

### Runtime contracts

- **L9:** parent data → function-input (`augmentResolveContextForFunctionCall`)
- **L11:** named exec pins (`exec-false-out`) → `function-output` → propagate `execOutHandle`
- **L12:** pure/data-only function block → `resolveNodeOutput` для `blockKind=subgraph` (policy-build pattern)

### Packaging patterns (reference, не «победитель»)

| Pattern | Teams | Functions | Policy |
|---------|-------|-----------|--------|
| Observation + gate | alpha | 3 (+ bootstrap onConnect) | on main |
| Modular 3-block | beta | 3 (policy-build + gate + trends) | collapsed pure function |
| Poster 2-block | gamma | 2 (gate + trends) | on main |

Все три **Run-green** после runtime fixes 2026-06-21. Выбор варианта — продуктовый, не блокер merge.

---

## DoD (Definition of Done)

```text
[ ] CONCEPT / collapse spec written
[ ] usercase-competition-pack.test.ts green (или dedicated pack test)
[ ] yarn usercase:build <id>
[ ] node scripts/usercase.mjs verify-pack <id>
[ ] Manual Run: reports + tracks in journal, no runtime errors
[ ] Entry in bundled-user-case-entries.ts (if catalog visibility needed)
[ ] Lesson added to USERCASE_COMPETITION_LESSONS.md if new failure mode
[ ] *.generated.ts not hand-edited
```

---

## Out of scope

- Выбор «победителя» sprint / merge одного fork в bundled MVP
- Marketplace upload, tariff billing
- Новые node kinds без epic в `@membrana/core`
- Правка `apps/client` без catalog prompt (`docs/catalog/client/registry.json`)

---

## Связанные документы

| Doc | Path |
|-----|------|
| Lessons diary | [`USERCASE_COMPETITION_LESSONS.md`](../device-board-scripts/USERCASE_COMPETITION_LESSONS.md) |
| **Regulation (normative)** | [`USERCASE_GENERATION_REGULATION.md`](../device-board-scripts/USERCASE_GENERATION_REGULATION.md) |
| Sprint closure | [`CLOSURE.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/CLOSURE.md) |
| U9 epic (catalog) | [`DEVICE_BOARD_USERCASES_EPIC_PROMPT.md`](./DEVICE_BOARD_USERCASES_EPIC_PROMPT.md) |
| Device board concept | [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) |

---

## Промпт целиком (копировать агенту)

```text
Задача: сгенерировать/пересобрать Device-Board UserCase `<usercase-id>`.

Прочитай:
- docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md
- docs/device-board-scripts/USERCASE_COMPETITION_LESSONS.md

Baseline: usercase-mvp-microphone Run parity с flat graph.

Если programmatic collapse:
- правки в usercase-competition-pack.ts + collapse-to-function.ts
- tests: usercase-competition-pack.test.ts, collapse-to-function.test.ts

Сборка и verify:
  yarn usercase:build <id>
  node scripts/usercase.mjs verify-pack <id>
  yarn workspace @membrana/device-board test usercase-competition-pack

Не редактировать *.generated.ts вручную.
Manual Run gate: mic device, info.txt без scenario-runtime error.
Зафиксируй новый урок в USERCASE_COMPETITION_LESSONS.md при новом классе ошибок.
```

---

*Обновлять при новых runtime/pack контрактах или новых yarn usercase:* командах.*
