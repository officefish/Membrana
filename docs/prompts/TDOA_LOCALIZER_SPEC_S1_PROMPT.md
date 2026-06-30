# TDOA/localizer spec S1: контракты Stage 2/3 без разморозки реализации

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / Codex).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — спецификация и experimental contract draft для TDOA/localizer без runtime/client integration.
> Реестр: `id` = `tdoa-localizer-spec-s1` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Membrana держит Stage 2 (TDOA, multi-node sync, localization) в режиме freeze до stage-gate 1→2: precision >= 85% и recall >= 90% на согласованном single-node detector / ensemble benchmark. При этом дорожная карта разрешает подготовить design-review и preserved contracts, чтобы после gate не начинать Stage 2 с пустого листа.

Текущие preserved-типы в `@membrana/core` минимальны: `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult`. Этот sprint должен превратить их в осмысленную спецификацию: единицы измерения, качество синхронизации, входы/выходы TDOA, геометрию узлов, localization hypothesis, failure modes и границы будущих сервисов.

**Связанные документы:**

| Документ | Зачем |
|----------|-------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Регламент task-промпта, registry, Issue, closure |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли виртуальной команды |
| [`WHITE_PAPER.md`](../WHITE_PAPER.md) | Stage-gate, TDOA, multilateration, risks |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Freeze Stage 2, границы сервисов |
| [`packages/core/src/contracts/acoustic-network.ts`](../../packages/core/src/contracts/acoustic-network.ts) | Текущие preserved-типы Stage 2 |
| [`packages/services/tdoa/README.md`](../../packages/services/tdoa/README.md) | Frozen service placeholder |
| [`docs/prompts/FREE_V1_SOUND_CATALOG_EPIC_PROMPT.md`](./FREE_V1_SOUND_CATALOG_EPIC_PROMPT.md) | Параллельная связь: TDOA/localizer spec-design |

**GitHub Issue:** [#211](https://github.com/officefish/Membrana/issues/211).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — координатор виртуальной команды Membrana под руководством Vesnin (Teamlead). Перед любыми правками выполни pre-sprint gate: registry `tdoa-localizer-spec-s1` active, Issue #211 открыт, `OPEN.md` и `DAY_SPRINT_ACTIVE.md` указывают на этот sprint, task prompt прочитан полностью.

Обязательная особенность sprint: **каждый шаг реализации имеет ровно одного accountable owner из виртуальной команды Membrana**. Можно указывать `Consulted` и `Reviewer`, но поле `Owner` всегда одно.

---

### Что построить

Подготовить design/spec sprint для Stage 2/3 без разморозки runtime-реализации:

1. Спецификацию TDOA pair estimation: что такое synced acoustic observation, как считаются delta/uncertainty, какие metadata обязательны.
2. Спецификацию time sync quality: offset, jitter, source, timestamp, confidence, calibration validity.
3. Спецификацию node geometry: coordinate frame, node position, accuracy, baseline quality.
4. Спецификацию localization/multilateration: inputs, hypothesis, covariance/error ellipse, residuals, failure modes.
5. Experimental contract draft в `@membrana/core` или документированный diff, если Teamlead решит не менять код в S1.
6. Явный freeze boundary: Stage 2 remains frozen; no runtime, service implementation, client UI integration, or benchmark claims.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Sprint docs | `docs/day-sprint/tdoa-localizer-spec-s1-2026-06-30/` | OPEN/CLOSURE/notes |
| Task prompt | `docs/prompts/TDOA_LOCALIZER_SPEC_S1_PROMPT.md` | Полная постановка sprint |
| Architecture spec | `docs/architecture/tdoa-localization-contracts.md` | Единицы, модели, failure modes, service boundaries |
| Core contracts draft | `packages/core/src/contracts/acoustic-network.ts` | Только `@experimental @stage 2` типы; без runtime logic |
| Frozen service doc | `packages/services/tdoa/README.md` | Уточнить freeze/unfreeze criteria и ссылку на spec |

**Запрещено:**

- Реализовывать GCC-PHAT, multilateration, Kalman/IMM, tracker или association.
- Подключать TDOA/localizer в `apps/client`, `device-board`, realtime gateway или background services.
- Снимать freeze с `@membrana/tdoa-service` / будущего `@membrana/localizer-service`.
- Утверждать, что Stage 2 gate пройден.
- Делать шаг без одного конкретного `Owner`.

---

### Шаги реализации и ответственность

| Step | Owner | Consulted | Reviewer | Deliverable |
|------|-------|-----------|----------|-------------|
| TL0 Pre-sprint gate | Vesnin | - | Vesnin | Registry active, Issue #211, OPEN, ACTIVE, prompt read |
| S1 Architecture boundary | Ozhegov | Vesnin | Vesnin | `docs/architecture/tdoa-localization-contracts.md` skeleton and package boundaries |
| M1 TDOA math model | Dynin | Kuryokhin | Vesnin | Delta-time model, units, uncertainty, GCC-PHAT as future method |
| A1 Acoustic assumptions | Kuryokhin | Dynin | Vesnin | SNR, multipath, observability, speed-of-sound assumptions |
| S2 Core contract draft | Ozhegov | Dynin | Vesnin | `@experimental @stage 2` TypeScript interfaces or documented diff |
| M2 Localization model | Dynin | Ozhegov | Vesnin | Multilateration input, hypothesis, covariance, residuals, failure states |
| U1 Future UI contract | Rodchenko | Ozhegov | Vesnin | Future map/azimuth/error display contract; no UI implementation |
| TL1 Freeze/gate review | Vesnin | all | Vesnin | Confirms no runtime/client integration and no gate claim |
| TL2 Closure | Vesnin | - | Vesnin | `CLOSURE.md`, DoD report, archive command after PR/LGTM |

Rule: if a step needs a decision, the `Owner` decides inside the prompt boundary; Vesnin can veto only on architecture/freeze conflict.

---

### Contract guidance

Prefer separating layers:

- **TDOA layer:** pairwise estimation between two node observations. Output: delay, uncertainty, confidence, method, quality diagnostics.
- **Localization layer:** consumes multiple TDOA pairs plus node geometry. Output: one or more hypotheses with coordinates, covariance/error ellipse, confidence, residuals.
- **Tracker layer:** out of scope. No target association or Kalman state in this sprint.

Use explicit units in type names or field docs:

- time: `ms` for existing compatibility, document conversion to seconds for formulas;
- distance: meters;
- speed of sound: meters per second;
- confidence: normalized `[0, 1]`;
- uncertainty: use standard deviation or bounded interval, but document which one.

---

### Тесты / проверки

| Область | Минимум |
|---------|---------|
| Registry | `docs/tasks/registry.json` parses as JSON |
| Docs | Prompt, OPEN, architecture spec, and README links resolve locally |
| Core draft | If TypeScript contracts change: scoped typecheck for `@membrana/core` or clear note why skipped |
| Freeze boundary | Search confirms no runtime/client integration added |

---

### Definition of Done

- [ ] `docs/architecture/tdoa-localization-contracts.md` describes TDOA/localizer contracts, units, assumptions, failure modes, and freeze boundary.
- [ ] Every implementation step in OPEN/prompt has exactly one accountable `Owner`.
- [ ] `packages/core/src/contracts/acoustic-network.ts` is either updated with experimental interfaces or the spec explicitly defers code changes with Teamlead rationale.
- [ ] `packages/services/tdoa/README.md` links to the spec and keeps frozen status.
- [ ] No client/runtime/service implementation is added.
- [ ] `docs/day-sprint/tdoa-localizer-spec-s1-2026-06-30/CLOSURE.md` is written after acceptance.
- [ ] Teamlead LGTM.

---

### Out of scope

- Real TDOA algorithm implementation.
- Multilateration implementation.
- UI map/azimuth rendering.
- Realtime transport changes.
- Detector benchmark changes or stage-gate recalculation.
- GitHub/Linear automation beyond normal sprint reporting.

---

### Формат ответа координатора

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

## Заметки для человека-постановщика

1. Issue #211 создан и связан с registry id `tdoa-localizer-spec-s1`.
2. После PR: отчёт в Issue → `yarn task:archive tdoa-localizer-spec-s1 --notes "PR #…, TDOA/localizer spec S1 shipped"`.
3. Если в ходе sprint появится желание реализовать алгоритм, открыть новый Issue после stage-gate или явно deferred task.

### Проверка после PR

```bash
yarn task:list
yarn workspace @membrana/core typecheck
```

---

## Связь с дорожной картой

- WHITE_PAPER Stage 2: пара узлов и TDOA — remains frozen until stage-gate 1→2.
- WHITE_PAPER Stage 3: localization in plane — spec-only preparation.
- FREE_V1 sound catalog: this sprint is parallel design work and must not block detector calibration.
