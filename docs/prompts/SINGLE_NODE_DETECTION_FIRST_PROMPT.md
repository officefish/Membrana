# Промпт: Single-Node Detection First — пересмотр дорожной карты (stage-gate)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **L**.
> Ожидаемый артефакт: **1 PR** — документы + scaffolding `packages/services/detectors/*` + заморозка TDOA; реализация детекторов — отдельными промптами.
> Реестр: `id` = **`single-node-detection-first`** в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Текущая дорожная карта (`WHITE_PAPER.md` § Этапы 1–2) ведёт от одного «слушателя» к многоузловой сети с TDOA через **один** референсный детектор. Это создаёт эпистемологический, инженерный и контрактный риски. **Решение:** разбить Этап 1 на **1.A (DSP)** и **1.B (Neural & Agentic)**, ввести stage-gate с измеримыми метриками, **отодвинуть** Этап 2 до прохождения шлюза.

**Скоуп этого промпта:** только обновление документов + scaffolding пакетов; реализация детекторов — отдельными task-промптами.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`WHITE_PAPER.md`](../WHITE_PAPER.md) | Дорожная карта, метрики |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей, семейства детекторов |
| [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md) | Эшелоны интеграций |
| [`SERVICES.md`](../SERVICES.md) | Структура `packages/services/*` |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR / milestones |

**GitHub Issue:** [#47](https://github.com/officefish/Membrana/issues/47)

**Консилиум:** [`docs/seanses/`](../seanses/) — `single-node-detection-first-*`

**Конфликт с активной задачей:** [`dsp-drone-detector`](./DSP_DRONE_DETECTOR_PROMPT.md) (#45) — см. итог консилиума; не расширять scope без согласования Teamlead.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководствием **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

**Приоритет:** блокирующий — работы по `tdoa-service`, локализации, многоузловой архитектуре **заморожены** до завершения этого пересмотра.

**Роли на исполнение:** Teamlead (Vesnin) — оркестрация и LGTM; Структурщик (Ozhegov) — scaffolding и границы; Математик (Dynin) — интерфейс `DroneDetector` / `DetectionResult`.

---

### SINGLE_NODE_DETECTION_FIRST — спецификация

#### 1. Контекст и обоснование

Текущая дорожная карта (`WHITE_PAPER.md` § Этапы 1–2) проходит от одного «слушателя» к многоузловой сети с TDOA-локализацией через **один** референсный детектор. Это создаёт три риска:

1. **Эпистемологический.** Мы не знаем, какой подход к детекции работает лучше в реальных условиях: классические DSP-признаки, предобученные нейросети, fine-tune, agentic-подходы. Без сравнения хотя бы по 2–3 представителя из каждого семейства любые архитектурные решения на сетевом уровне — преждевременны.
2. **Инженерный.** Многоузловая сеть **усиливает** надёжный детектор, но не **компенсирует** слабый. Если на одном узле precision 50%, сеть из пяти узлов даст в пять раз больше ложных тревог, а не более точную локализацию.
3. **Контрактный.** `AcousticObservation`, который потребляет `tdoa-service`, имеет смысл только при достоверном содержимом. Сначала «герметичный» узел — потом сеть.

**Решение.** Разбить Этап 1 на **1.A (DSP-эшелон)** и **1.B (Neural & Agentic эшелон)**, ввести stage-gate с измеримыми метриками, **отодвинуть** Этап 2 (TDOA, мультиузел) до прохождения шлюза. Текущая работа по `tdoa-service` — **заморозить**, типы синхронизации (`SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult`) **мигрировать** в milestone «Stage 2 — Network» как preserved-артефакт без активной разработки.

#### 2. Принцип «Single-Node Detection First»

**Формулировка.** До перехода к многоузловой архитектуре система обязана продемонстрировать качество детекции дрона на одном узле, измеренное сравнением нескольких независимых реализаций на едином датасете.

**Эшелон A — DSP:** `harmonic-detector-service`, `cepstral-detector-service`, `spectral-flux-detector-service`.

**Эшелон B — Neural & Agentic:** `yamnet-detector-service`, `clap-detector-service`, `agentic-detector-service`.

**Общий контракт:**

```typescript
interface DroneDetector {
  readonly name: string;
  readonly family: 'dsp' | 'neural' | 'agentic';
  detect(window: AudioWindow): Promise<DetectionResult>;
}

interface DetectionResult {
  isDrone: boolean;
  confidence: number;
  reasoning?: string;
  features?: Record<string, number>;
  latencyMs: number;
}
```

`AudioWindow` — контракт из `@membrana/audio-engine` (Float32Array + sample rate + timestamp).

#### 3. Definition of Done

См. полный чеклист в репозитории (разделы 3.1–3.6 исходного промпта): обновление `WHITE_PAPER.md`, `ARCHITECTURE.md`, `INTEGRATIONS_STRATEGY.md`; скелеты `DETECTOR_BENCHMARK.md`, `DATASET.md`; scaffolding `packages/services/detectors/`; заморозка TDOA; 10 GitHub issues; CI зелёный; LGTM Vesnin.

**Stage-gate 1→2:** precision ≥ 85%, recall ≥ 90% на тестовом наборе для лучшего детектора либо ensemble.

#### 4. Out of scope

- Не реализуем сами детекторы (только placeholder + `NotImplementedError`).
- Не пишем `yarn benchmark:detectors` (только скелет `DETECTOR_BENCHMARK.md`).
- Не собираем датасет (только скелет `DATASET.md`).
- Не реализуем `detection-ensemble-service` (только описание в ARCHITECTURE).
- Не удаляем код TDOA.
- Не пересматриваем DESIGN.md, MODULE_AND_PLUGIN_UI.md, SERVICES.md.

#### 5. Таймбокс

2–3 рабочих дня (один исполнитель) или 1 день при параллели трёх ролей.

#### 6. Следующие task-промпты

`HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md` → `DATASET_BOOTSTRAP_PROMPT.md` → `BENCHMARK_RUNNER_PROMPT.md` → остальные детекторы → `STAGE_GATE_1_TO_2_REVIEW_PROMPT.md`.

---

## Заметки для человека-постановщика

- После merge: `yarn main-day-issue` — переориентировать день на harmonic-detector scaffolding / первый DSP-промпт.
- Связь с #45 (`dsp-drone-detector`): по итогу консилиума — пауза, слияние в harmonic, или параллельный трек (см. `docs/seanses/`).
- Закрытие: [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) → `yarn task:archive single-node-detection-first`.

---

## Приложение: полный чеклист DoD (детально)

### 3.1. Обновлённые документы

- [ ] **`WHITE_PAPER.md` § Дорожная карта** — Этап 1.A / 1.B, stage-gate, Этап 2 после шлюза
- [ ] **`WHITE_PAPER.md` § Метрики** — отсылка на `docs/DETECTOR_BENCHMARK.md`
- [ ] **`docs/ARCHITECTURE.md`** — раздел «Семейства детекторов», mapping пакетов
- [ ] **`docs/INTEGRATIONS_STRATEGY.md` § 4** — четыре эшелона + trade-off таблица
- [ ] **`docs/STRATEGIC_PLAN_DAY.md`** / **`MAIN_DAY_ISSUE.md`** — после merge

### 3.2. Новые документы (скелеты)

- [ ] **`docs/DETECTOR_BENCHMARK.md`**
- [ ] **`docs/DATASET.md`**

### 3.3. Scaffolding пакетов

```
packages/services/detectors/
├── base/          # @membrana/detector-base
├── harmonic/      # @membrana/harmonic-detector-service
├── cepstral/
├── spectral-flux/
├── yamnet/
├── clap/
└── agentic-claude/  # @membrana/agentic-detector-service
```

Каждый пакет: `package.json`, `tsconfig` composite, placeholder `DroneDetector` + `NotImplementedError`, README, turbo + tsconfig references.

### 3.4. Заморозка TDOA

- [ ] Milestone «Stage 2 — Network»
- [ ] Issues TDOA перенесены; `@experimental @stage 2` в core types
- [ ] `packages/services/tdoa/` — frozen, исключён из CI build при необходимости

### 3.5. GitHub Issues

- [ ] 8 issues детекторов + 2 мета (benchmark, dataset)

### 3.6. Финализация

- [ ] `yarn lint`, `typecheck`, `build`, `test` — зелёные
- [ ] LGTM Vesnin

**Источники:** WHITE_PAPER.md · ARCHITECTURE.md · INTEGRATIONS_STRATEGY.md · SERVICES.md · DAILY_STANDUP (2026-05-16) · MAIN_DAY_ISSUE (2026-05-16)
