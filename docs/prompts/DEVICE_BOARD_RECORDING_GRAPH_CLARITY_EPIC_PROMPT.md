# Промпт (эпик): Device-Board — recording graph clarity (StartRecording anti-pattern)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`device-board-recording-graph-clarity`**  
> **Статус:** **active** — мини-спринт после MVP LGTM (#usercase-mvp-microphone)  
> **Пакет:** `@membrana/device-board` (+ `yarn usercase:build-mvp-microphone` для bundled JSON)

---

## Контекст

Операторский разбор MVP main loop: узел **StartRecording** на **безусловном** exec-пути каждого tick
маскируется host-идемпотентностью (`start-recording-idempotent`). Граф врёт о намерении;
звук «с треском» и прочие артефакты — следствие **плохой топологии**, а не бага gate runtime.

**Принцип продукта:** плохой сценарий — ответственность автора; платформа **не чинит граф молча**,
но **предсказуема**: статический lint (warning), operator notes в инспекторе, host остаётся
предохранителем.

| # | Gap | Целевое состояние |
|---|-----|-------------------|
| 1 | Bootstrap StartRecording на каждом main tick | Старт в **onStart** (после StartStreaming) или рестарт **только** после StopRecording на gate-true |
| 2 | Идемпотентность только в chain-log | **Warning** pre-run: `start-recording-unconditional-loop-path` |
| 3 | Оператор не видит защиту host | **Operator notes** в правом инспекторе (`scenario-node-inspector-notes.ts`) |
| 4 | Bundled MVP демонстрирует антипаттерн | Пересборка `default-usercase-mvp-microphone.generated.ts` |

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | §15.5.1 operator notes; §16.5 recording gate |
| [`USERCASE_MVP_MICROPHONE.md`](../actions/device-board/specs/USERCASE_MVP_MICROPHONE.md) | Канон веток MVP |
| [`SCENARIO_CHAIN_LOG_COOKBOOK.md`](../actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md) | Маркеры recording |
| [`DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md`](./DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md) | Исходный gate |

**GitHub Issue:** [#167](https://github.com/officefish/Membrana/issues/167)

---

## Product / tech scope

### In scope

#### RGC1 — Operator notes (реестр инспектора)

1. `graph/scenario-node-inspector-notes.ts` — заметки по `nodeKind`, не в JSON сценария.
2. `components/board-node-inspector-notes.tsx` — `alert-info` / `alert-warning`.
3. Первый кейс: `start-recording` — идемпотентный skip + канон размещения на графе.
4. CONCEPT §15.5.1 + catalog prompt.

#### RGC2 — Pre-run lint (warning)

1. `validate-start-recording-loop.ts`:
   - на loop-ветках (`main`, `alarm`): если `start-recording` **exec-достижим** от `entry` (onTick)
     **без** предшествующего `stop-recording` на том же пути до этого узла → warning.
2. Код: `start-recording-unconditional-loop-path`.
3. Сообщение согласовано с текстом operator note (не дублировать противоречиво).
4. `severity: warning` — **не блокирует** Run (как `pure-exec-edge-hint`, legacy fan-out).
5. Подключить в `validate-pre-run.ts` для всех scenario subgraphs с loop entry.
6. Unit-тесты: MVP broken topology → warning; канон после RGC3 → нет warning.

#### RGC3 — MVP usercase topology

1. Убрать bootstrap `StartRecording` с hot path каждого main tick.
2. **Канон:**
   - `initial` (onStart): после `StartStreaming` → `StartRecording` (bootstrap, policy dataflow).
   - `main`: gate path без безусловного bootstrap; рестарт только `stop → make-track → start-recording`.
3. `yarn usercase:build-mvp-microphone` → обновить embedded document.
4. `needsRecordingGateBootstrapMigration(doc)` остаётся `false`; smoke matrix green.

#### RGC4 — Docs / smoke

1. `USERCASE_MVP_MICROPHONE.md` — схема веток после фикса.
2. Cookbook §: когда видеть `start-recording-idempotent` vs `start-recording`.
3. `yarn workspace @membrana/device-board test` + parity smoke при необходимости.

### Out of scope

- Отключение host-идемпотентности (аудио-катастрофа при плохом графе).
- Auto-fix графа (миграция рёбер в JSON).
- Новые nodeKind (`is-recording-active`).
- Runtime counter «>1 real start за window» (follow-up v1.1).
- Изменения competition mode / Sequence sprint (#166).

---

## Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Operator notes | `graph/scenario-node-inspector-notes.ts`, `board-node-inspector-notes.tsx` | Статические подсказки инспектора |
| Loop lint | `graph/validate-start-recording-loop.ts` | Топология start на hot path |
| Pre-run | `graph/validate-pre-run.ts` | merge warnings |
| UserCase | `docs/device-board-scripts/usercase-mvp-microphone/*.json`, `default-usercase-mvp-microphone.generated.ts` | Bundled MVP |
| Host (без изменений) | `scenarioMicJournalBridge.startRecorderRecording` | idempotent skip |

**Запрещено:**

- Сериализовать operator notes в `DeviceScenarioDocument`.
- Error severity для user-authored loop topology (только warning).
- Web Audio вне client bridge.

---

## Фазы спринта

| Фаза | Task id | Ответственный | Артефакт |
|------|---------|---------------|----------|
| **R0** | `db-rgc-r0-inspector-notes` | Rodchenko | notes registry + UI + CONCEPT §15.5.1 |
| **R1** | `db-rgc-r1-loop-lint` | Ozhegov | `validate-start-recording-loop` + tests |
| **R2** | `db-rgc-r2-mvp-usercase` | Ozhegov + оператор | onStart bootstrap; main без hot-path start |
| **R3** | `db-rgc-r3-docs-smoke` | Ozhegov | USERCASE doc, cookbook, CI |
| **R4** | `db-rgc-r4-archive` | Vesnin | `yarn task:archive device-board-recording-graph-clarity` |

**Ветка:** `feature/device-board-recording-graph-clarity` (от `main` или текущего merge-base).

---

## Definition of Done (эпик)

- [ ] R0: инспектор `start-recording` показывает warning-note; реестр расширяемый.
- [ ] R1: bundled MVP **до** R2 даёт lint warning; после R2 — нет.
- [ ] R2: `yarn usercase:build-mvp-microphone`; main loop без bootstrap на каждом tick.
- [ ] R3: docs + `yarn workspace @membrana/device-board test` green.
- [ ] R4: archive + PR `Closes #N`.
- [ ] Ручная проверка: Run 60s — `start-recording` в chain-log не на каждом tick; publish bundle OK.

---

## Промпт целиком (для агента)

> **Шаг 0:** Прочитай CONCEPT §15.5.1, §16.5, `scenario-node-inspector-notes.ts`, `validate-pre-run.ts`, `default-usercase-mvp-microphone.test.ts` (`needsRecordingGateBootstrapMigration`).
>
> **Шаг 1 (R0):** Operator notes — если ещё не в main, закоммитить registry + `BoardNodeInspectorNotes`.
>
> **Шаг 2 (R1):** Lint unconditional loop path; message = operator note; warning only.
>
> **Шаг 3 (R2):** Правка JSON main + initial; rebuild embedded; verify migration helpers.
>
> **Шаг 4 (R3):** Docs + smoke.
>
> **Шаг 5:** PR + archive.
>
> **Формат ответа:** virtual team labels + файлы + чеклист DoD.

---

## Заметки для постановщика

1. Отдельный эпик от `device-board-exec-sequence-ux` (#166).
2. Host idempotent — **оставить**; честность через lint + notes.
3. Оператор может править usercase вручную на доске; bundled default обязан быть каноническим после R2.

### Проверка после PR

```bash
yarn workspace @membrana/device-board test
yarn usercase:build-mvp-microphone
yarn turbo run lint typecheck test build --filter=@membrana/device-board --continue
```
