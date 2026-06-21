# Промпт (эпик): Device-Board Pure Getters — Blueprint parity (U)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`db-pure-getters-blueprint-parity`**  
> **Родитель:** [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](./DEVICE_BOARD_POST_USERCASE_ROADMAP.md) (направление **U**)  
> **Предшественник:** UserCase MVP LGTM · [`USERCASE_MVP_MICROPHONE_LGTM.md`](../device-board-scripts/USERCASE_MVP_MICROPHONE_LGTM.md)  
> **Статус:** **LGTM** (G0–G4 закрыты · 2026-06-21) — proposal **#1** из серии UX-эпиков  
> **Ветка:** `vesnin` (контракты `@membrana/core` + runtime `@membrana/device-board`)

---

## Контекст

После UserCase MVP оператор собирает граф вручную. Боль: **лишние exec-рёбра** к «геттерам», которые только питают data-in downstream-узлы.

**Референс:** Unreal Engine Blueprints — **Pure** vs **Impure** nodes.

| UE Blueprint | Membrana (цель) |
|--------------|-----------------|
| Pure: **нет exec pins** | Getter с `pure: true` — только data-out / data-in |
| Pure: eval **on demand** при resolve data downstream | `resolveInput` / `resolveNodeOutput` pull-цепочка |
| Pure: **без side-effects** | Только чтение variable / config узла |
| Impure: exec chain, результат **кэшируется** на шаг exec | `pure: false` — exec-in → exec-out; участвует в exec-цепочке |

**XYFlow / React Flow** не знают про Pure — семантика **полностью наша** (executor + validation + inspector).

**Текущее состояние (2026-06-21):**

- `variable-get` **de facto pure** — только data-out `value` (`variable-node.ts`).
- Runtime **уже pull-резолвит** variable-get без exec (`resolve-input.ts`).
- Inspector **ошибочно** запретил редактирование на get — только read-only имя; **исправить**: getter может задавать/редактировать значение на выходе (value-типы и inline config).
- `MakeRecordingPolicy` / `MakeFftTrendsPolicy` имеют exec pins, но в CONCEPT §15.7 названы «pure value» — **рассинхрон**; цель эпика — явный флаг `pure` + default pure для policy getters.

---

## Product proposal #1 (от Product Owner)

1. **Checkbox «Pure»** в sidebar getter-узла — переключатель **Pure ↔ Impure** (оба режима в v1).
2. **`pure: true`:**
   - узел **не участвует** в exec-цепочке;
   - достаточно **data-edge** к downstream с совместимым `SocketType`;
   - на canvas **нет** exec pins;
   - **при переключении с impure на pure** — все **exec-рёбра**, инцидентные этому узлу, **удаляются** из графа (не только скрытие pins).
3. **`pure: false` (impure getter):**
   - exec-in → exec-out;
   - узел выполняется на exec-тике;
   - при переключении на impure — exec pins появляются снова (рёбра оператор проводит вручную).
4. **Inspector getter (value-типы):** редактирование **выходных значений** на get-узле (`DateTime`, …) — как у Set, но без обязательного exec.
5. **Inspector getter (ref-типы):** **не редактирует** ссылку — только отображает текущую ссылку и статус **«связан с объектом» / «пустая ссылка»** (valid/invalid badge).
6. **Конструкторы (`MakeRecordingPolicy`, `MakeFftTrendsPolicy`, …):** правило **`CONSTRUCTOR_ALWAYS_PURE`** — только pure, без галочки и **без exec pins**; они **порождают** данные (первоисточник), а не протягивают поток.

> Следующие UX-proposals (#2, #3, …) — отдельными секциями после закрытия эпика #1.

---

## Product decisions (LGTM · Product Owner · 2026-06-21)

| # | Тема | Решение |
|---|------|---------|
| **D1** | Pure vs Impure | Оба режима; галочка Pure в sidebar. Переключение **pure ← impure** → **удалить** exec-edges узла. |
| **D2** | Ref getter sidebar | Read-only: текущая ссылка + индикатор bound / empty ref. Редактирование — в variable constructor слева. |
| **D3** | Policy constructors | **Только pure**, без impure-режима; exec pins не показывать; data-edge к consumer достаточен. |
| **D4** | Кэширование runtime | **Не кэшировать** выходы pure, если есть риск инвалидации. UE-style re-read на каждый `resolveInput`. `useMemo` — только там, где безопасно (UI/React), не для scenario data path. |
| **D5** | Bundled MVP | После G3 — убрать exec-hop через policy constructors; только data-wires. |

---

## Мнение виртуальной команды (planning session)

```text
[Teamlead — Vesnin]:
P0 LGTM. D1–D5 зафиксированы. G0: pure + CONSTRUCTOR_ALWAYS_PURE в core.
Toggle pure → strip exec edges — graph mutation в editor layer (G2).

[Структурщик — Ozhegov]:
PURE_ELIGIBLE: variable-get, variable-set(?), … — impure optional.
CONSTRUCTOR_NODE_KINDS: pure locked true, no exec pins in node factory.
exec-subgraph: skip pure + all constructors.
validatePreRun: no exec requirement through pure/constructor nodes.
On pure toggle: removeEdgesWhere(nodeId, exec socket types).

[Математик — Dynin]:
D4: resolveInput без tick-cache; каждый read → fresh variable store / node config.
useMemo только UI; runtime store не мемоизировать policy/ref без invalidation contract.

[Музыкант]:
GetSample / GetFFTFrame — impure-only (host I/O). Constructors — always pure per D3.

[Верстальщик — Rodchenko]:
Sidebar: Pure checkbox (hidden/disabled для constructors + badge «constructor · pure»).
Ref getter: bound vs empty ref indicator. Value getter: editable output fields.
Toggle pure: confirm если будут удалены exec edges (optional toast).
```

---

## UE Blueprint reference (Perplexity, 2026-06-21)

- Pure node: **no exec pins**; evaluated when impure consumer needs data; **re-run per read** (no cache).
- Impure: exec flow; outputs cached at execution moment.
- Pure must be side-effect free.

Источники: UE docs/community — см. planning notes в PR P0.

---

## Scope

### In scope

- Contract `pure?: boolean` on eligible node kinds; **`CONSTRUCTOR_ALWAYS_PURE`** kinds (pure locked)
- Inspector Pure checkbox (toggle) + **exec edge removal** on switch to pure
- Output value editing for value-type getters; ref getters read-only + bound/empty indicator
- Runtime / validation: no exec walk for pure + constructors; **no data cache** on resolve path (D4)
- Canvas pin visibility + badges (`pure`, `constructor`)
- Tests: pure/impure toggle, edge strip, resolve without exec, constructor-only data path
- G3: MVP main JSON without exec through policy constructors

### Out of scope (v1)

- Automatic graph layout «pull pure nodes left»
- UserCase picker UI (отдельный U1 из roadmap)
- Server-specific `pure` handling (inherits from scenario JSON)
- Tick-level cache layer for impure getter outputs (explicit cache API — later if needed)

---

## Фазы (draft)

| Фаза | id | PR scope | DoD |
|------|-----|----------|-----|
| **P0** | `db-pure-getters-p0-spec-lgtm` | Product decisions D1–D5 | **LGTM** ✓ |
| **G0** | `db-pure-getters-g0-core-contract` | `pure`, `CONSTRUCTOR_ALWAYS_PURE`, `PURE_ELIGIBLE` sets | **done** ✓ |
| **G1** | `db-pure-getters-g1-runtime-validation` | exec-subgraph skip; validatePreRun hints; resolve без data-cache | **done** ✓ |
| **G2** | `db-pure-getters-g2-inspector-canvas` | Pure toggle; strip exec edges; ref bound/empty; value edit | **done** ✓ |
| **G3** | `db-pure-getters-g3-constructor-mvp` | Constructors exec-free; MVP JSON data-only policy wires | **done** ✓ |
| **G4** | `db-pure-getters-g4-lgtm` | CONCEPT §15.7 update; sign-off doc | **done** ✓ |

---

## Acceptance (epic LGTM)

1. `variable-get` **pure** → только data-edge к downstream — Run OK; pre-run не требует exec через getter.
2. `variable-get` **impure** → exec chain проходит через getter; toggle **pure ✓** удаляет exec-edges узла.
3. Ref getter sidebar: **bound / empty ref**, без редактирования ссылки.
4. Value getter sidebar: редактирование выходного value (`DateTime` и т.д.).
5. `MakeRecordingPolicy` / `MakeFftTrendsPolicy`: **только pure**, без exec pins; MVP main loop — data-only к `StartRecording` / consumers.
6. Runtime: повторный `resolveInput` не использует устаревший кэш (D4).
7. `yarn workspace @membrana/device-board test` + typecheck green.

---

## Node kind rules (implementation reference)

| Категория | nodeKind (примеры) | Pure | Exec pins | Sidebar Pure checkbox |
|-----------|-------------------|------|-----------|---------------------|
| **Constructor** | `MakeRecordingPolicy`, `MakeFftTrendsPolicy` | **always true** (locked) | **never** | hidden / disabled |
| **Variable getter** | `variable-get` | default **true** | when `pure: false` | **toggle** |
| **Host I/O getter** | `GetAudioStream`, FFT collect, … | **always false** | always | hidden |
| **Impure-only** | gates, `StartRecording`, … | N/A | always | N/A |


## Затрагиваемые пакеты

| Пакет | Изменения |
|-------|-----------|
| `@membrana/core` | `pure`, `CONSTRUCTOR_ALWAYS_PURE`, `PURE_ELIGIBLE`, serialize defaults |
| `@membrana/device-board` | toggle + strip exec edges, sidebar, exec-subgraph, resolve (no stale cache) |

---

## Связанные документы

- [`PURE_GETTERS_LGTM.md`](../device-board-scripts/PURE_GETTERS_LGTM.md) — sign-off
- [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §15.7 constructors
- [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](./DEVICE_BOARD_POST_USERCASE_ROADMAP.md)
- [`DEVICE_BOARD_UX_PORTS_HEADER_PROMPT.md`](./DEVICE_BOARD_UX_PORTS_HEADER_PROMPT.md)

---

## Proposal queue (следующие UX-эпики)

| # | Статус | Кратко |
|---|--------|--------|
| **1** | **closed** | Pure Getters — [`PURE_GETTERS_LGTM.md`](../device-board-scripts/PURE_GETTERS_LGTM.md) |
| 2 | _pending_ | _(опишет Product Owner после закрытия #1)_ |
| 3 | _pending_ | … |
