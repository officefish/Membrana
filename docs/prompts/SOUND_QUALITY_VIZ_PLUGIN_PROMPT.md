# Промпт: плагин визуализации качества звука (микрофон)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — плагин live-оценки качества сигнала с микрофона (SNR, clarity, dynamics, peak, общий балл).

---

## Контекст

Демо `packages/temp/three-param-analyzer` содержит блок **«Общее качество звука»** (`updateSoundQuality`, `calculateOverallQuality`):

- **SNR** — оценка по RMS vs noise floor (нижние 10% истории RMS);
- **Clarity** — эвристика по центроиду и flux;
- **Dynamics** — размах RMS за окно (~20–100 кадров), в %;
- **Peak** — пиковый уровень в dB относительно эталона;
- **Overall** — взвешенная сумма (30% SNR + 30% clarity + 20% dynamics + 20% «не клип»);
- UI: общая полоса, badge («Отличное» … «Очень плохое»), текст-подсказка.

В Membrana метрики кадра уже даёт `FftAnalyzer`; пороговый плагин их использует. **Этот плагин** — диагностика «пригоден ли поток для анализа», без детекции дрона.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`FFT_INDICES_VIZ_PLUGIN_PROMPT.md`](./FFT_INDICES_VIZ_PLUGIN_PROMPT.md) | Соседний плагин индексов; общий sampler |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | RMS/flux/centroid из того же пайплайна |
| `packages/temp/three-param-analyzer/src/main.js` | § `updateSoundQuality`, `estimateNoiseFloor`, `calculateClarity`, … |
| [`DESIGN.md`](../DESIGN.md) | Цвета badge по уровню качества |

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Формулы качества — **pure TS** в `@membrana/fft-analyzer-service`; UI — плагин клиента.

---

### Что построить (продуктовое описание)

**Плагин `sound-quality-viz`** (`SOUND_QUALITY_VIZ_PLUGIN_ID`):

1. **Live-анализ** на потоке микрофона (`LiveSampler` + `FftAnalyzer`), как у других FFT-плагинов.
2. **Накопление окна** RMS (кольцевой буфер, дефолт **100** сэмплов кадра — настраиваемо в config).
3. **Метрики** (обновление каждый кадр или каждые N мс):

| Метрика | Смысл | Единица UI |
|---------|--------|------------|
| `snr` | `20*log10(rms/noiseFloor)`, clamp 0…60 | dB |
| `clarity` | эвристика по centroid + flux (см. демо) | 0…100 % |
| `dynamics` | dynamic range по истории RMS | 0…100 % |
| `peakDb` | пик за последние 50 RMS vs ref | dB |
| `overall` | взвешенная оценка 0…100 | % |

4. **UI панель:**
   - главная полоса `overall` с цветом по порогам (≥80 зелёный, ≥60 …, <20 красный) — токены DaisyUI, не хардкод `#00ff00`;
   - badge: «Отличное» / «Хорошее» / «Удовлетворительное» / «Плохое» / «Очень плохое»;
   - четыре подписи SNR / Clarity / Dynamics / Peak;
   - **сообщение-рекомендация** (`qualityMessage`) — одна строка, меняется по правилам демо (клип, низкий SNR, низкая clarity, похвала).
5. **Config плагина:**
   - `rmsHistorySize` (50…200);
   - `loudnessRefMax` (дефолт **0.35**, согласовано с `METRIC_NORM` порогового плагина);
   - `weights` для overall (опционально, дефолт как в демо).

**Не делать:** классификатор сцен, пороговый тест, canvas-радар индексов, публикация в `droneDetectionHub`.

---

### Математический контракт (обязателен, pure TS)

Новый файл в сервисе, например `packages/services/fft-analyzer/src/math/sound-quality.ts`:

```ts
export interface SoundQualityInput {
  readonly centroidHz: number;
  readonly flux: number;
  readonly rms: number;
  readonly rmsHistory: readonly number[]; // последние N значений RMS
}

export interface SoundQualityMetrics {
  readonly snr: number;
  readonly clarity: number;   // 0…100
  readonly dynamics: number; // 0…100
  readonly peakDb: number;   // typically -60…0
  readonly overall: number;  // 0…100
}

export interface SoundQualityOptions {
  readonly loudnessRefMax?: number; // default 0.35
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
): string; // русский текст подсказки для UI
```

**Портирование из демо** (с комментарием в коде «источник: three-param-analyzer»):

- `estimateNoiseFloor` — нижние 10% отсортированной истории, min 0.005;
- `calculateClarity` — пороги centroid 300–2000, flux 0.3–1.5;
- `calculateDynamics` — `20*log10(max/min)`, шкала /40 → 0…100%;
- `calculatePeakLevel` — последние 50 RMS, dB от `loudnessRefMax`;
- `calculateOverallQuality` — веса 0.3/0.3/0.2/0.2, штраф если `rms > loudnessRefMax`.

Unit-тесты: тишина → низкий overall; синтетическая «речь» (заглушки в input) → средний; клип (`rms > ref`) → низкий headroom component.

---

### Архитектура

| Слой | Путь |
|------|------|
| Математика | `fft-analyzer-service` → `sound-quality.ts` + tests |
| Плагин | `apps/client/src/plugins/sound-quality-viz/` |
| State | ring buffer RMS, последний `SoundQualityMetrics`, hint string |
| UI | `SoundQualityVizPanel.tsx` — полоса, badge, stats, message |

```
apps/client/src/plugins/sound-quality-viz/
  types.ts
  soundQualityVizPlugin.ts
  soundQualityVizPluginState.ts
  useSoundQualityViz.ts
  SoundQualityVizPanel.tsx
  soundQualityTelemetry.ts   # optional v0.1
  index.ts
```

---

### Визуальный дизайн

- Компактная карточка в колонке микрофона (не full-screen как демо).
- Badge — `badge badge-sm` с модификатором цвета по уровню.
- Полоса overall — `progress progress-error|warning|success` или кастомный div с `role="meter"` + `aria-valuenow`.
- Сообщение — `text-sm text-base-content/70`, `aria-live="polite"` при смене уровня (debounce 1 s).

---

### Телеметрия (опционально)

Раз в **60 с** при активном потоке и `overall < 40` — запись предупреждения:

`schema: 'sound-quality-viz/v0.1'`, tags `['audio-quality', 'warning']`. Не блокирует DoD.

---

### Definition of Done

- [ ] `evaluateSoundQuality` + тесты в `fft-analyzer-service`.
- [ ] Плагин на модуле `microphone`, teardown без утечек.
- [ ] Live UI совпадает по смыслу с демо (тишина / речь / перегруз).
- [ ] Подсказки на русском, a11y на главной полосе.
- [ ] Нет дублирования формул в React-компонентах.
- [ ] CI зелёный; LGTM Teamlead.

---

### Out of scope

- FFT-радар и треугольник индексов — [`FFT_INDICES_VIZ_PLUGIN_PROMPT.md`](./FFT_INDICES_VIZ_PLUGIN_PROMPT.md).
- Автоматическая калибровка noise floor в UI (только алгоритм из демо).
- AGC/NS на уровне браузера (модуль микрофона).
- Push при плохом качестве.

---

### Порядок работы ролей

1. **Teamlead** — утвердить веса и пороги badge.
2. **Математик (Dynin)** — `sound-quality.ts` + tests.
3. **Структурщик** — plugin wiring.
4. **Верстальщик** — panel.
5. **Музыкант** — сравнение с демо на live.
6. **Teamlead** — LGTM, README fft-analyzer § Sound quality API.

---

## Заметки для человека-постановщика

- Два независимых Issue/PR: качество звука **не обязан** ехать в одном PR с `fft-indices-viz`.
- Общий риск: два плагина на одном потоке — оба через hub, **два** `LiveSampler` допустимы (как сейчас с threshold + stream-viz) или вынести shared fft session в отдельную задачу **после** обоих PR.
- GitHub Issue: «Microphone plugin: sound quality monitor».

---

## Связь с дорожной картой

Повышает доверие к `fft-threshold-test`: оператор видит, что микрофон не в клипе и SNR достаточен, прежде чем интерпретировать «дрон обнаружен».
