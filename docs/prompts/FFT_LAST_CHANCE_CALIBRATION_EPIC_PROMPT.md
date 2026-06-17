# Промпт: FFT — последний шанс (калибровка порога и trends на free-v1)

> **Стратегический task-промпт (эпик)** — Cursor IDE / Claude.
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **L** (5 фаз FL1–FL5).
> Ожидаемый артефакт: новый плагин библиотеки сэмплов + Node-харнесс калибровки + отчёт go/no-go.
> Реестр: `id` = **`fft-last-chance-calibration`** в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

DSP/template детекторы (#47, SLD/VDR) не дотягивают до stage-gate на реальном корпусе. Прежде чем окончательно сменить фокус на иные технологии анализа звука (нейро/эшелон-2 по [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md)), даём **FFT-методам последний шанс**: формально, на корпусе `free-v1` (120 сэмплов, 60 дрон / 60 не-дрон, `data/detectors-benchmark/v0.2/`), измеряем, способны ли **пороговый FFT-тест** и **анализатор тенденций FFT** одновременно дать **recall дронов ≥ 80%** и **FPR на не-дронах ≤ 40%**.

**Что переиспользуем (не переписываем):**

| Компонент | Путь | Роль |
|-----------|------|------|
| FFT threshold math | `@membrana/fft-analyzer-service` (`math/threshold-test.ts`) | `evaluateFrameVerdict`, `evaluateThresholdTest` |
| Trends scoring | `@membrana/trends-detector-service` (`classifyTrends`) | scene/drone scoring |
| Template builder | `@membrana/template-match-detector-service` | `collectMetricSamples`, `buildTemplateFromMetricSamples`, `mergeCuratedDroneTemplate` |
| Корпус | `data/detectors-benchmark/v0.2/manifest.json` | 120 размеченных WAV, split train/val |
| Бенчмарк-утилиты | `scripts/lib/{wav-read,benchmark-metrics,manifest-labels}.mjs` | декод WAV, confusion, recall |
| Плагин-эталон библиотеки | `apps/client/src/plugins/sample-library-drone-analysis/` | offline post-playback + журнал |

**Связанные документы:** [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md), [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md), [`SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](./SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md).

---

## Промпт целиком (для вставки агенту)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Дай FFT-анализам последний шанс на корпусе free-v1.
>
> **Цель:** найти конфигурацию, дающую **recall дронов ≥ 80%** при **FPR на не-дронах ≤ 40%**. Дисциплина train/val: пороги и шаблоны строятся на `split=train` (80), вердикт считается на `split=val` (40).
>
> **Запрещено:** новые `*-detector-service`, нейро/ensemble, `new AudioContext()`/`getUserMedia` вне `audio-engine`, прямая регистрация модулей в store (только `MembranaRegistry`). Работаем **только** с существующими чистыми функциями (эшелон 0).
>
> **Фазы:**
> 1. **FL1** — плагин `sample-library-fft-threshold-test` (opt-in) для прогона существующих сэмплов через пороговый тест; отчёт `fft-threshold-test/v0.2` в журнал.
> 2. **FL2** — Node-харнесс `scripts/benchmark-fft-trends.mjs` (`yarn benchmark:fft-trends`): WAV → interval-кадры → threshold/trends, recall/FPR/precision/F1 по train/val, JSON-отчёт + распределения по классам.
> 3. **FL3** — 3 конфигурации порогового теста (recall-first / balanced / precision-first), data-driven по распределениям; поиск ≥80%/≤40%.
> 4. **FL4** — 3 комбинации trends-шаблонов (`DRONE_*` curated: tight / merged / subtypes) + sweep `minConfidence`; экспорт лучшего шаблона.
> 5. **FL5** — отчёт `docs/datasets/week-2026-06-14/fft-last-chance-report.md` с вердиктом go/no-go и архивация.

---

## Архитектурный / математический контракт

- **Метрики:** `recall = TP/(TP+FN)`, `FPR = FP/(FP+TN)`, `precision = TP/(TP+FP)`, `F1`. Цель: `recall ≥ 0.8 && FPR ≤ 0.4` на `split=val`.
- **Пороговый тест:** кадр проходит при `metricsInRangeCount ≥ {easy:1, normal:2, strict:3}`; серия — при `passRate ≥ {0.3, 0.6, 0.9}`. Тюнятся `thresholds` (centroid/flux/rms), `strictness`, `frameCount`, `intervalMs`.
- **Trends `isDrone`:** `result.isDetected && detectedState.startsWith('DRONE')`. Кастомные шаблоны должны иметь ключ `DRONE_*` (user:* для isDrone не годятся).
- **Плагин FL1:** `active: false`, `analysisSource` фиксирован sample-library, схема журнала `fft-threshold-test/v0.2` (рендер уже есть в `@membrana/journal-report-views`).

---

## Definition of Done

- [ ] FL1: плагин `sample-library-fft-threshold-test` зарегистрирован на модуле `sample-library` (opt-in), панель монтируется, отчёт пишется в журнал; unit-тест зелёный; `yarn workspace @membrana/client typecheck` зелёный.
- [ ] FL2: `yarn benchmark:fft-trends` работает, печатает распределения и метрики, пишет `data/detectors-benchmark/v0.2/reports/fft-trends-latest.json`.
- [ ] FL3: 3 конфигурации порога прогнаны; результат (достигнута цель или нет) зафиксирован.
- [ ] FL4: 3 комбинации trends прогнаны; лучший `DRONE_*` шаблон экспортирован (`fft-last-chance-best-template.json`).
- [ ] FL5: `fft-last-chance-report.md` с таблицами 3+3 попыток и явным вердиктом go/no-go.
- [ ] Запись в реестре, `yarn task:archive fft-last-chance-calibration`.

## Out of scope

- Продакшн-интеграция выигравшего шаблона в curated-каталог детекции (отдельная задача, если go).
- Нейро/CLAP/YAMNet, ensemble, мультиузловые сценарии.
- Live-микрофонные SLO (это LP-эпик).

## Порядок ролей

1. **Teamlead** — границы «только эшелон 0», LGTM формулы метрик, вердикт go/no-go.
2. **Математик** — распределения, дизайн порогов/шаблонов, train/val дисциплина.
3. **Структурщик** — плагин FL1, харднесс FL2 по паттернам существующих скриптов.
4. **Музыкант** — ручная проверка плагина на 3–5 сэмплах в браузере.
5. **Верстальщик** — панель FL1 по `DESIGN.md`, состояния loading/empty.

## Заметки для постановщика

- GitHub Issue (wish): «FFT последний шанс: калибровка порога и trends на free-v1». Проставить номер в реестр после создания.
- После архивации — решение: продолжать FFT (go) или окончательно сменить фокус (no-go).
