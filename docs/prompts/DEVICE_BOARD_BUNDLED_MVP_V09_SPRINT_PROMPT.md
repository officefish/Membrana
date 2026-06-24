# Промпт (day sprint): Bundled MVP v0.9-functions — cutover & хвосты

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр (draft):** эпик **`device-board-bundled-mvp-v09-sprint-2026-06-25`**  
> **Статус:** **closed** (2026-06-24)
> **Предшественники:** runtime smoke `runId 1cf4983b` (2026-06-24); [`USERCASE_MVP_MICROPHONE.md`](../device-board-scripts/USERCASE_MVP_MICROPHONE.md) § v0.9-functions; CONCEPT §16.5.1  
> **Связанный эпик (W1):** `usercase-mvp-v2-groups-async` — async track/report **вне** этого спринта (фаза P7)  
> **Пакеты:** `@membrana/device-board`, `docs/device-board-scripts`, `scripts/build-usercase-mvp-microphone.mjs`

---

## Контекст

Пользовательский microphone-сценарий с **user functions** (`fn-1` StartRecording, `fn-3` GetAudioStream) прошёл live smoke: recording windows, `upload-ok` треков, `publish-done` trends-reports на server journal.

**Цель спринта:** закрыть хвосты bundled `usercase-mvp-microphone` — cutover codegen с flat v0.8 на v0.9-functions, экспорт/импорт с функциями, тесты/миграция, operator sign-off.

**Не в scope сегодня:** async exec для MakeTrack / PublishReport (roadmap `ucv2-2-freeze-async-tracks`).

---

## Backlog (хвосты)

| ID | Хвост | Приоритет |
|----|-------|-----------|
| T1 | Codegen всё ещё flat v0.8 (`functions: []`) | P0 blocker |
| T2 | Нет golden `device-scenario` с `scenario.functions[]` в repo | P0 blocker |
| T3 | `branch-scenario` import без merge `functions[]` | P1 |
| T4 | `referencedFunctions[]` в export — нет контракта | P0 decision |
| T5 | `02-onStart` — bootstrap через `fn-1-block`, не inline nodes | P2 |
| T6 | Main: ребро `∞` после 2-го PublishReport (в export `(8)` не было; на доске есть) | P2 |
| T7 | `MakeReportFromTrack` → `drone-skip: track-not-in-journal` (гонка sync upload) | P3 doc/defer |
| T8 | `fn-3` is-valid false в логах (не блокирует Run) | P3 optional |
| T9 | `default-usercase-mvp-microphone.test.ts` — миграция flat → functions | P2 |
| T10 | `USERCASE_MVP_MICROPHONE_LGTM` — только v0.8 | P5 |
| T11 | `USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md` — missing file в registry | P1 |
| T12 | cabinet `live-records` 500 при Stop | P7 infra |
| T13 | Comment groups + layout canon на bundled | P4 optional |

---

## Product decisions (зафиксировано Teamlead 2026-06-25)

| ID | Решение |
|----|---------|
| **BD1** | **По умолчанию:** cutover только через **full `device-scenario`** (все ветки + `functions[]`). `branch + referencedFunctions[]` — follow-up (P3), не блокер bundled. |
| **BD2** | **Два `PublishReport`** на hot path — **keep** (под будущие async-процессы). |
| **BD3** | **`CollectSamples`** на hot path — **keep**. |
| **BD4** | Канонические id функций: **`fn-{functionName}`**, где `functionName` — имя в UI (`fn-StartRecording`, `fn-GetAudioStream`). Миграция с `fn-1`/`fn-3` в golden + codegen. |
| **BD5** | **auto-replace** flat v0.8 → v0.9-functions при hydrate (`needsBundledV09Migration`). |

**Экспорт golden (P0.1):** launcher device-board → кнопка **JSON** у «Мои сценарии» или **Export full UserCase** в ⚙ на доске → полный `device-scenario` с `meta.hash`.

---

## Phases

### P0 — Operator / Teamlead (**требуется от вас**)

| # | Действие | Артефакт | Блокирует |
|---|----------|----------|-----------|
| P0.1 | **Экспорт golden document** с рабочей доски: полный `device-scenario` JSON (все 6 веток + `scenario.functions[]` с телами `fn-1`, `fn-3`) | `docs/device-board-scripts/golden/usercase-mvp-microphone-v09-functions.document.json` (git) | P2, P3 |
| P0.2 | **Решения BD1–BD5** (можно в комментарии к Issue или в OPEN sprint) | запись в § Product decisions этого промпта | P1 consilium, P2 |
| P0.3 | Подтвердить: onStart на доске уже через `fn-1-block` (как в smoke) | да/нет + при необходимости правка до экспорта | P2 |
| P0.4 | **LGTM критерии** cutover: Run ≥60s, ≥2 windows, server tracks + trends reports | чеклист в P5 | P5 |

**Без P0.1 агент не может честно обновить embedded default.**

---

### P1 — Spec & consilium (S)

| Registry id (draft) | DoD |
|---------------------|-----|
| `db-bmv09-p1-consilium` | Короткий consilium/seanse: BD1 export strategy, `referencedFunctions` schema sketch, связь с `usercase-mvp-v2-groups-async` |
| `db-bmv09-p1-v2-prompt` | Создать или слить `USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md` (сейчас missing) с §16.5.1 |

**Команды:** `yarn consilium` (опционально) · обновить `docs/tasks/registry.json`.

---

### P2 — Bundled cutover / codegen (M)

| Registry id (draft) | DoD |
|---------------------|-----|
| `db-bmv09-p2-build-pipeline` | `build-usercase-mvp-microphone.mjs`: источник = golden document или split branches из него; `scenario.functions[]` ≠ `[]` |
| `db-bmv09-p2-embedded` | `default-usercase-mvp-microphone.generated.ts` пересобран; `yarn usercase:build-mvp-microphone` |
| `db-bmv09-p2-bundle-json` | `usercase-mvp-microphone/*.json` + legacy root files синхронизированы |
| `db-bmv09-p2-onstart` | `02-onStart.json` — bootstrap через `fn-1` (если в golden) |

**Проверки:**

```bash
yarn usercase:build-mvp-microphone
yarn workspace @membrana/device-board test -- src/graph/default-usercase-mvp-microphone.test.ts
yarn catalog:verify-client
```

---

### P3 — Import/export functions (M) — после BD1

Если **BD1=A** (только full document): минимальный PR — документировать, что branch-import по-прежнему требует функции на доске.

Если **BD1=B** (branch + functions):

| Registry id (draft) | DoD |
|---------------------|-----|
| `db-bmv09-p3-export-schema` | `BranchScenarioExport.referencedFunctions[]` + serialize |
| `db-bmv09-p3-import-merge` | `applyBranchScenarioImport` — merge/create functions, pin sync |
| `db-bmv09-p3-import-tests` | `import-branch-scenario.test.ts` + conflict cases |

---

### P4 — Layout & UX polish (S, optional)

| Registry id (draft) | DoD |
|---------------------|-----|
| `db-bmv09-p4-layout` | `applyUserCaseLayoutCanon` на новом bundled; `yarn usercase:verify-layout usercase-mvp-microphone` |
| `db-bmv09-p4-groups` | Comment groups profile для fn-blocks (если есть на golden) |

---

### P5 — Smoke & sign-off (S)

| Registry id (draft) | DoD |
|---------------------|-----|
| `db-bmv09-p5-smoke` | Matrix: fresh user hydrate → Run 60s → chain-log markers (см. `SCENARIO_CHAIN_LOG_COOKBOOK.md`) |
| `db-bmv09-p5-lgtm` | `USERCASE_MVP_MICROPHONE_LGTM.md` addendum v0.9-functions **или** новый sign-off; Teamlead LGTM |
| `db-bmv09-p5-migrate` | Реализовать `needsBundledV09Migration` + smoke flat→v0.9 |

**Operator (вы):** один manual Run на prod/stage cabinet после merge; подтвердить треки+отчёты в UI.

---

### P6 — Tests & CI (S)

- Обновить `default-usercase-mvp-microphone.test.ts` (functions present, main subgraph blocks `fn-1`/`fn-3`)
- Turbo: bundled build в scheduled-ci / usercase-competition path если затронуто
- `yarn turbo run lint typecheck test build --filter=@membrana/device-board`

---

### P7 — Explicit defer (следующий эпик)

| ID | Тема | Эпик |
|----|------|------|
| D1 | Async MakeTrack / PublishReport без блокировки tick | `ucv2-2-freeze-async-tracks` |
| D2 | `live-records` 500 telemetry | background-office / cabinet |
| D3 | Убрать гонку `track-not-in-journal` | часть D1 или reorder exec |

---

## Порядок выполнения

```text
P0 (вы) → P1 → P2 → P6 ─┐
         └→ P3 (после BD1) │
P4 (parallel)              ├→ P5 (вы: manual LGTM) → archive sprint
```

---

## Definition of Done (эпик)

1. Новый пользователь microphone получает **v0.9-functions** embedded document (не flat v0.8).
2. `yarn usercase:build-mvp-microphone` детерминирован от golden / codegen.
3. Документация: USERCASE + CONCEPT §16.5.1 актуальны; LGTM addendum подписан.
4. CI green для `@membrana/device-board`.
5. Решения BD1–BD5 зафиксированы в промпте или consilium.

---

## Закрытие

```bash
yarn task:archive device-board-bundled-mvp-v09-sprint-2026-06-25
# дочерние: db-bmv09-p*
```

`docs/day-sprint/device-board-bundled-mvp-v09-sprint-2026-06-25/CLOSURE.md`
