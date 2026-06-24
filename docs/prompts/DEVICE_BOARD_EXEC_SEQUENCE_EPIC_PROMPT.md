# Промпт (эпик): Device-Board — optional pins, exec fan-out, Sequence node

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`device-board-exec-sequence-ux`**  
> **Статус:** **active** — спринт после view-only UX (#163)  
> **Пакет:** `@membrana/device-board` (+ точечно `@membrana/core` для контрактов узла — см. §архитектура)

---

## Контекст

Операторский feedback после merge PR #164–#165: три связанные, но раздельные проблемы **читаемости портов**, **законности exec-графа** и **последовательного control flow**.

| # | Требование оператора | Текущее состояние (gap) |
|---|----------------------|-------------------------|
| 1 | Неочевидные порты `& null` | `formatSocketPortLabel` / `resolveContextValuePortLabel` возвращают голый `& null` без типа и без маркера optional; пользователь не знает, обязателен ли pin и с чем совместим |
| 2 | Exec-out → несколько узлов запрещён | `findExecSuccessor` берёт **первое** ребро; fan-out не блокируется при connect/pre-run; в MVP-графах встречается несколько `exec-out` с одного узла |
| 3 | Последовательность без fan-out | Нет узла **Sequence**; оператор тянет несколько exec-рёбер с одного блока (антипаттерн) |
| 4 | Async parallel ветки | Нет режима «запустить несколько async-цепочек» с явным контрактом Promise |

**Референс UX (не копировать код):** Unreal Engine Blueprint **Sequence** — один exec-in, упорядоченные выходы **Then 0 … Then N** (сверху вниз), синхронное прохождение цепочек по индексу; latent/async узлы **не блокируют** переход к следующему Then (см. consilium §R0).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Exec model, pure nodes, validators |
| [`SCENARIO_RUNTIME.md`](../SCENARIO_RUNTIME.md) | Runtime phases, exec-subgraph |
| [`docs/catalog/client/prompts/modules/device-board.md`](../catalog/client/prompts/modules/device-board.md) | Catalog prompt |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы core vs device-board |

**GitHub Issue:** [#166](https://github.com/officefish/Membrana/issues/166)

---

## Product / tech scope

### In scope

#### ES1 — Optional pin labels (`?`)

1. Единая функция форматирования data-pin label с поддержкой **optional**:
   - nullable reference: `& device ?` (не `& null`)
   - nullable value type: `number ?`, `string ?` — по `socketType`
   - контекстные порты без ребра: показывать **ожидаемый тип + `?`**, не голый `& null`
2. Визуально: `?` в конце mono-label на handle (как TypeScript optional property).
3. Tooltip/title на handle дублирует полную подпись.
4. Unit-тесты: `socket-port-label.test.ts`, `resolve-context-port-label.test.ts` — обновить и расширить.

**Канон подписи (operator AC):**

| Ситуация | Было | Стало |
|----------|------|-------|
| `nullable: true`, `socketType: DeviceRef`, нет ребра | `& null` | `& device ?` |
| `nullable: true`, без socketType | `& null` | `?` или `any ?` (Teamlead выбрать в R0) |
| variable-set value без ребра | `& null` | `& <inferred or variable type> ?` |

#### ES2 — Exec fan-out ban

1. **Инвариант:** от одного `(source, sourceHandle)` exec/data-event — **не более одного** исходящего exec-ребра с `targetHandle === exec-in` (и эквиваленты function-output).
2. Блокировка при `onConnect` в graph context + ошибка pre-run (`validate-*`).
3. Сообщение оператору: «Exec-выход уже подключён. Используйте узел Sequence для нескольких веток.»
4. Миграция: существующие UserCase с fan-out — **warning** в validator + подсветка на канвасе (не silent fix в v1).

#### ES3 — Sequence node (sync, до 9 Then)

1. Новый `nodeKind: 'sequence'` (имя в палитре: **Sequence**).
2. Pins: `exec-in` + `then-0` … `then-8` (динамическое добавление до 9, порядок = индекс, UI сверху вниз).
3. **Sync runtime:** при входе exec — для `i = 0..N-1` выполнить exec-цепочку от `then-i` до return/yield; затем следующий pin (UE Sequence semantics, §R0).
4. Палитра scenario + function branch; инспектор: количество Then (1–9), порядок pin.
5. `block-executor` dispatch + тесты runtime.

#### ES4 — Sequence async mode

1. Checkbox в инспекторе Sequence: **«Параллельный async»** (`parallelAsync: boolean` в node config).
2. Когда включено: все Then-ветки **стартуют параллельно**; runtime ждёт `Promise.all` (или documented subset — зафиксировать в R0).
3. **Gate:** узел/подграф на Then-ветке должен иметь `supportsAsync: true` в контракте (новое поле metadata узла в scenario document — **согласовать с Vesnin**; если затрагивает `@membrana/core` public types → ветка `vesnin`).
4. Синхронный impure-узел на async-Then → **ошибка pre-run** с pin binding.
5. User functions: async только если тело функции объявлено async-capable (отдельный подпункт DoD; может быть ES4b follow-up если scope раздувается).

### Out of scope

- Полный порт UE latent nodes (Delay, Timeline) — только контракт yield/Promise для уже async-capable блоков.
- Авто-миграция fan-out → Sequence в сохранённых документах (только validator warning).
- Signal layer exec semantics.
- Competition mode structure lock changes.

---

## Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Pin labels | `graph/socket-port-label.ts`, `resolve-context-port-label.ts` | `?` suffix, type noun |
| Connect guard | `device-board-graph-context.tsx` | reject exec fan-out |
| Validators | `runtime/validators/*`, `graph/validate-pre-run.ts` | fan-out, async gate |
| Sequence editor | `graph/palette-node.ts`, `board-flow-node.tsx`, inspector | pins Then 0..8 |
| Sequence runtime | `runtime/exec-sequence.ts`, `block-executor.ts` | sync + async modes |
| Core (optional) | `packages/core` scenario node config | `supportsAsync`, `sequence` kind — **vesnin** если public API |

**Запрещено:**

- Web Audio / `new AudioContext()` вне audio-engine.
- Дублировать `findExecSuccessor` логику — Sequence вызывает существующий exec traversal.
- Ломать pure-node exec-transparent semantics без тестов.

---

## Фазы спринта

| Фаза | Task id | Ответственный | Артефакт |
|------|---------|---------------|----------|
| **R0** | `db-es-r0-consilium` | **Vesnin** | Gap table (этот промпт) + consilium + UE Sequence notes |
| **R1** | `db-es-r1-optional-pin-labels` | **Rodchenko** | `?` labels, tests |
| **R2** | `db-es-r2-exec-fanout-ban` | **Ozhegov** | connect guard + validator |
| **R3** | `db-es-r3-sequence-editor` | **Rodchenko** + Ozhegov | palette, pins, inspector |
| **R4** | `db-es-r4-sequence-runtime-sync` | **Ozhegov** | sync runtime + tests |
| **R5** | `db-es-r5-sequence-async` | **Dynin** + Ozhegov | async mode + promise gate |
| **R6** | `db-es-r6-docs-tests` | **Ozhegov** | CONCEPT §, catalog, CI |
| **R7** | `db-es-r7-archive` | **Vesnin** | `yarn task:archive device-board-exec-sequence-ux` |

**Порядок PR (default):** R1 → R2 можно параллельно; R3 перед R4; R5 после R4; R6 в конце.

---

## R0 — Consilium notes (Perplexity + operator AC)

**UE Blueprint Sequence (кратко для runtime design):**

- Один exec-in; выходы **Then 0, Then 1, …** в **фиксированном индексном порядке** (UI top-to-bottom = index).
- **Sync mode:** цепочка Then-i выполняется до return/yield интерпретатора, затем Then-(i+1).
- **Latent/async в UE:** не блокируют Sequence — VM считает ветку «завершённой» при yield; Membrana **async mode** (operator AC) — иное: явный `parallelAsync` + `Promise.all`, не смешивать с UE latent без документации.
- **Fan-out:** в UE для параллельных веток используют отдельные узлы (Sequence / DoOnce / custom), не несколько wire с одного exec-out — согласуется с ES2.

**Решения R0 (зафиксировать в consilium markdown):**

1. Суффикс optional: всегда ` ?` (пробел + вопрос), mono 9px на canvas.
2. Max Then pins: **9** (operator AC).
3. Async v1: только узлы с `supportsAsync: true`; subgraph/user-fn — follow-up если > 3d effort.

Артефакт: `docs/discussions/device-board-exec-sequence-consilium-<date>.md` (опционально `yarn consilium`).

---

## Definition of Done (эпик)

- [ ] Optional pins: нет голого `& null` на canvas; `?` на необязательных портах.
- [ ] Exec fan-out: connect blocked + pre-run error с понятным текстом.
- [ ] Sequence: 1–9 Then, sync runtime, smoke на user-edit сценарии.
- [ ] Async Sequence: checkbox; validator ловит sync-узел на async-ветке.
- [ ] `yarn workspace @membrana/device-board test` + turbo CI green.
- [ ] CONCEPT + catalog абзац.
- [ ] LGTM Teamlead; Issue #166 закрыт; epic archived.

---

## Промпт целиком (для агента)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Реализуй эпик **device-board-exec-sequence-ux** по фазам R0–R7.
>
> **Шаг 0:** Прочитай `socket-port-label.ts`, `resolve-context-port-label.ts`, `exec-successor.ts`, `device-board-graph-context.tsx` (onConnect), `block-executor.ts`. Подтверди gap-таблицу.
>
> **Шаг 1 (R1):** Введи `formatOptionalPortLabel(socketType, nullable)` → `& device ?`. Обнови все call sites и тесты.
>
> **Шаг 2 (R2):** Запрети второе exec-ребро с того же `(source, sourceHandle)` на `exec-in`. Validator code `exec-fan-out-forbidden`.
>
> **Шаг 3 (R3–R4):** Узел `sequence`, pins `then-0..then-8`, sync runtime: цикл по индексу, `runExecChainFromPin` reuse.
>
> **Шаг 4 (R5):** `parallelAsync` config; parallel start + await promises; `supportsAsync` gate.
>
> **Шаг 5 (R6):** CONCEPT, catalog, CI.
>
> **Шаг 6:** PR `Closes #166`. Не трогать competition mode.
>
> **Формат ответа:** virtual team labels + файлы + чеклист DoD.

---

## Заметки для постановщика

1. Issue: [#166](https://github.com/officefish/Membrana/issues/166).
2. Perplexity использован при R0 для UE Sequence semantics.
3. Ручная проверка: variable-set без ребра → `& <type> ?`; fan-out → ошибка; Sequence Then 0→1→2; async toggle.

### Проверка после PR

```bash
yarn workspace @membrana/device-board test
yarn turbo run lint typecheck test build --filter=@membrana/device-board --filter=@membrana/core --continue
```
