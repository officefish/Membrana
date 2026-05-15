# Промпт: плагин визуализации качества звука (микрофон)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — плагин live-оценки качества сигнала (SNR, clarity, dynamics, peak, overall).
> Реестр: `id` = **`sound-quality-viz`** в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Демо `packages/temp/three-param-analyzer` содержит блок **«Общее качество звука»**: SNR, clarity, dynamics, peak, общий балл 0–100%, badge и текст-подсказка. В Membrana кадровые метрики даёт `FftAnalyzer`; нужен **диагностический** плагин «пригоден ли поток для анализа» — без детекции дрона.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Процесс постановки и закрытия |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли команды |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | GitHub Issue / PR |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Слои сервис / client |
| [`DESIGN.md`](../DESIGN.md) | Badge, полоса, a11y |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | Общий FFT-пайплайн |
| [`FFT_INDICES_VIZ_PLUGIN_PROMPT.md`](./FFT_INDICES_VIZ_PLUGIN_PROMPT.md) | Соседняя задача (отдельный PR) |
| `packages/temp/three-param-analyzer/src/main.js` | `updateSoundQuality`, `calculateOverallQuality`, … |

**GitHub Issue:** создать (`wish`) — «Добавить плагин мониторинга качества звука в модуль Микрофон»; в теле ссылка на этот файл и `id: sound-quality-viz`.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Формулы — **pure TS** в `@membrana/fft-analyzer-service`; UI — в плагине клиента.

---

### Что построить (продуктовое описание)

**Плагин `sound-quality-viz`** (`SOUND_QUALITY_VIZ_PLUGIN_ID`):

1. Live-анализ: `LiveSampler` + `FftAnalyzer` + `microphoneStreamHub`.
2. Кольцевой буфер RMS (дефолт 100 кадров, config 50…200).
3. Метрики на каждый кадр:

| Метрика | Смысл | UI |
|---------|--------|-----|
| `snr` | RMS vs noise floor (нижние 10% истории) | dB, 0…60 |
| `clarity` | эвристика centroid + flux | 0…100 % |
| `dynamics` | dynamic range по истории RMS | 0…100 % |
| `peakDb` | пик за ~50 последних RMS vs ref | dB |
| `overall` | взвешенная сумма | 0…100 % |

4. UI: полоса `overall` (цвет по порогам DaisyUI), badge («Отличное» … «Очень плохое»), четыре подписи, строка `qualityMessage` (рус.).
5. Config: `rmsHistorySize`, `loudnessRefMax` (дефолт **0.35**), опционально `weights` overall.

**Не в scope:** классификатор сцен, пороговый тест, FFT-радар, `droneDetectionHub`.

---

### Математический контракт (обязателен, pure TS)

Файл `packages/services/fft-analyzer/src/math/sound-quality.ts`:

```ts
export interface SoundQualityInput {
  readonly centroidHz: number;
  readonly flux: number;
  readonly rms: number;
  readonly rmsHistory: readonly number[];
}

export interface SoundQualityMetrics {
  readonly snr: number;
  readonly clarity: number;
  readonly dynamics: number;
  readonly peakDb: number;
  readonly overall: number;
}

export interface SoundQualityOptions {
  readonly loudnessRefMax?: number;
  readonly weights?: {
    readonly snr?: number;
    readonly clarity?: number;
    readonly dynamics?: number;
    readonly headroom?: number;
  };
}

export function estimateNoiseFloor(rmsHistory: readonly number[]): number;
export function evaluateSoundQuality(
  input: SoundQualityInput,
  options?: SoundQualityOptions,
): SoundQualityMetrics;
export function soundQualityHint(
  metrics: SoundQualityMetrics,
  input: SoundQualityInput,
  options?: SoundQualityOptions,
): string;
```

Портировать из демо `three-param-analyzer` (комментарий в коде): noise floor, clarity, dynamics, peak, overall (веса 0.3/0.3/0.2/0.2), правила hint (клип, низкий SNR, …).

---

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Математика | `fft-analyzer-service` → `sound-quality.ts` | pure TS + unit-тесты |
| Плагин | `apps/client/src/plugins/sound-quality-viz/` | install, state, panel |
| Регистрация | `registerClientModules.ts`, `MicrophoneModule.tsx` | как у FFT-плагинов |

```
apps/client/src/plugins/sound-quality-viz/
  types.ts
  soundQualityVizPlugin.ts
  soundQualityVizPluginState.ts
  useSoundQualityViz.ts
  SoundQualityVizPanel.tsx
  index.ts
```

**Запрещено:**

- Дублировать формулы в React-компонентах;
- импорт UI других плагинов.

---

### Визуальный дизайн

- Компактная карточка в `MicrophoneModule` (не full-screen как демо).
- `badge badge-sm`, `progress` или `role="meter"` с `aria-valuenow`.
- Сообщение: `aria-live="polite"`, debounce смены уровня ~1 с.
- Цвета — токены DaisyUI (`success`, `warning`, `error`), не `#00ff00`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| `sound-quality.ts` | тишина → низкий overall; клип → штраф headroom; синтетический «речевой» input |
| Плагин | state ring buffer, teardown |

---

### Definition of Done

- [ ] `evaluateSoundQuality` + `soundQualityHint` + unit-тесты в `fft-analyzer-service`.
- [ ] Плагин на `microphone`, teardown без утечек.
- [ ] Live UI по смыслу как демо (тишина / речь / перегруз).
- [ ] Подсказки на русском; a11y на главной полосе.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный.
- [ ] LGTM Teamlead; README fft-analyzer — § Sound quality API.

---

### Out of scope

- FFT-индексы и canvas-радар — задача `fft-indices-viz` (отдельный PR).
- Калибровка noise floor через UI; AGC/NS браузера.
- Телеметрия в journal (можно заглушку v0.1, не блокирует DoD).
- Push-уведомления при плохом качестве.

---

### Порядок работы ролей

1. **Teamlead** — веса, пороги badge.
2. **Математик (Dynin)** — `sound-quality.ts` + tests.
3. **Структурщик** — plugin wiring.
4. **Верстальщик** — panel.
5. **Музыкант** — live vs демо.
6. **Teamlead** — LGTM.

---

### Формат ответа координатора (планирование)

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

1. **Отдельный** GitHub Issue и PR от `fft-indices-viz`.
2. Запись в реестре: `sound-quality-viz`, `status: active`.
3. Два `LiveSampler` на одном потоке допустимы (как threshold + stream-viz); общая FFT-сессия — отдельная задача позже.
4. После merge: `yarn task:archive sound-quality-viz --notes "PR #…"`.

### Проверка после PR

```bash
yarn workspace @membrana/client dev
yarn workspace @membrana/fft-analyzer-service test
# тишина → низкий overall; громкая речь/шум → осмысленные SNR/clarity
```

---

## Связь с дорожной картой

Повышает доверие к `fft-threshold-test`: оператор видит качество сигнала до интерпретации «дрон обнаружен».
