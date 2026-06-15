# Консилиум: детекция дрона в модуле «Библиотека сэмплов»

> **Дата:** 2026-06-15  
> **Инициатор:** Teamlead (по запросу пользователя)  
> **Эпик:** [`SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](../prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md)  
> **Родитель:** `single-node-detection-first` · Issue [#47](https://github.com/officefish/Membrana/issues/47)  
> **Датасет:** `free-v1` — 120 × 5 с ([`DATASET.md`](../DATASET.md) v0.2)

---

## Запрос пользователя (3 пункта)

1. Детекторы — в **специальном плагине модуля `sample-library`**: после проигрывания сэмпла показать **тип детектора** и **вероятность** «дрон».
2. Экосистема = **5-секундные сэмплы**; кадры — промежуточный шаг, **итог = анализ сэмпла целиком**.
3. Тесты и калибровка — **только на free-v1 (120 треков)**, не на синтетике v0.1.

---

## [Teamlead — Vesnin]

**Принимаем** все три пункта как продуктовый канон этапа 1.A.

- **Один эпик** `sample-library-drone-detection` объединяет сегодняшний фокус (контракт + harmonic + бенчмарк) с плагином библиотеки и политикой датасета.
- **Микрофонный** `harmonic-detector-viz` остаётся для **live**; он **не** заменяется, но **не** является главным продуктом stage-gate. Главный UX — библиотека сэмплов + отчёт по 5 с.
- **Сервер** (`background-cabinet` / `background-media`) в этом эпике **не** запускает детекторы. Анализ — в браузере (`apps/client`) и в Node (`yarn benchmark:detectors`). Cabinet — опционально позже (тот же SPA-паттерн).
- **Синтетика v0.1** — только smoke CI (9 файлов); **stage-gate и «тренировка» порогов** — `data/detectors-benchmark/v0.2/` (free-v1).
- **LGTM** на границу: новый плагин `sample-library-drone-analysis` на модуле `sample-library`; детекторы только через `@membrana/*-detector-service` + агрегатор сэмпла.

---

## [Структурщик — Ozhegov]

**Слои:**

| Слой | Пакет / путь | Ответственность |
|------|----------------|-----------------|
| Контракт кадра | `@membrana/detector-base` | `DroneDetector`, `AudioWindow`, `DetectionResult` |
| Контракт сэмпла | `@membrana/detector-base` (новое) | `SampleDetectionVerdict`, `analyzeSample()` — агрегация кадров → один вердикт на 5 с |
| Детекторы | `packages/services/detectors/*` | Чистый `detect(window)`; без React |
| Анализ офлайн | `scripts/benchmark-detectors.mjs` | Тот же `analyzeSample()` что и UI |
| Плагин | `apps/client/src/plugins/sample-library-drone-analysis/` | Подписка на `sample-playback` + запуск анализа после play/по кнопке |
| Hub | `sampleDetectionReportHub` (тонкий) | Один отчёт на выбранный `sampleId`; без второго AudioContext |

**Запрещено:** импорт детекторов из `SampleLibraryModule.tsx`; дублирование логики агрегации в плагине и в benchmark.

**Интеграция с плеером:** `@membrana/sample-playback-service` уже даёт decode + waveform; плагин берёт `loadSampleBufferById` → `analyzeSample(buffer, detectors[])`.

---

## [Математик — Dynin]

**Вход детектора (кадр):** `AudioWindow` — mono `Float32Array`, `sampleRate` (48 kHz), `timestamp`, `durationSec`.

**Вход продукта (сэмпл):** декодированный буфер **5 с** → нарезка overlapping windows (hop = fftSize/2, как в `benchmark-detectors.mjs`).

**Агрегация на сэмпл (предложение v1):**

```typescript
interface SampleDetectionVerdict {
  detectorName: string;
  detectorFamily: 'dsp' | 'neural' | 'agentic';
  isDrone: boolean;           // агрегат по сэмплу
  confidence: number;         // 0..1, калиброванный итог
  frameCount: number;
  maxFrameConfidence: number;
  latencyMsTotal: number;
  fundamentalsHz?: number[];  // optional, harmonic
}
```

**Правило v1:** `isDrone = any(frame.isDrone)` ИЛИ `maxFrameConfidence >= threshold`; итоговая `confidence = max(frame.confidence)` (согласовано с текущим benchmark). Пороги калибруем на **120 free-v1**, не на синтетике.

**«Тренировка»** для DSP = подбор порогов / гиперпараметров на free-v1 (hold-out или k-fold внутри 120 — отдельная подзадача SLD4; пока все в `split: test`).

---

## [Музыкант]

- Все сэмплы **5 с, 48 kHz mono** — совпадает с tariff dataset и bundled catalog.
- При анализе **без проигрывания** (кнопка «Анализ») — тот же путь, что после end-of-playback; не зависеть от real-time clock.
- Ручная валидация: прослушать 10–15 сэмплов из free-v1 и сравнить с вердиктом harmonic в плагине.

---

## [Верстальщик — Rodchenko]

**Плагин `sample-library-drone-analysis`:**

- Панель в sidebar модуля `sample-library` (рядом с `sample-library-player`).
- После завершения воспроизведения (или по «Анализировать») — таблица:

  | Детектор | Семейство | Дрон? | Уверенность |
  |----------|-----------|-------|-------------|

- Состояния: idle, analyzing (progress), done, error; `role="region"`, `aria-live="polite"` для итога.
- Не дублировать крупный плеер — только блок **результатов анализа**.

---

## Итог консилиума

| Вопрос | Решение |
|--------|---------|
| Сколько детекторов в эпике? | **Волна 1:** harmonic (обязательно) + cepstral + spectral-flux (по одному PR/фазе). Neural — эпик 1.B. |
| Где в UI? | **Плагин модуля `sample-library`**, не модуль микрофона. |
| Где на сервере? | **Нигде** в этом эпике. |
| Единица продукта | **Сэмпл 5 с** → `SampleDetectionVerdict` на детектор. |
| Датасет | **free-v1 v0.2 (120)**; v0.1 — smoke only. |

**Следующий шаг:** `yarn task:sync-readme`; утром обновить `MAIN_DAY_ISSUE` на `sld1-sample-contract` или весь эпик как фокус недели.
