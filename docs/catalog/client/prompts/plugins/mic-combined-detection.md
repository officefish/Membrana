# Плагин: `mic-combined-detection` — Combined-детекция (спектр→fusion)

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**
> Реестр: `docs/catalog/client/registry.json` · магистраль S2 (2026-07-09)
> Task-промпт: `docs/prompts/DETECTION_ENSEMBLE_SERVICE_PROMPT.md`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `mic-combined-detection` |
| **parentModuleId** | `microphone` |
| **Lead** | Dynin (Математик) + Kuryokhin |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Продюсер `combinedScore` — **честного консенсуса детекторов**, а не бинарного OR.
Гоняет DSP-детекторы (harmonic / cepstral / spectral-flux) на окне живого потока и
сливает их **сырой** confidence через fusion-ядро `@membrana/core`. Даёт alarm-loop
(`mic-proximity-alarm`) вход, завязанный на детекцию сцены, а не на громкость.

Нейро (yamnet) добавляется в набор детекторов, когда подключён его model-provider —
тогда combinedScore сливает DSP↔нейро (ND3: слабо коррелированные профили ошибок).

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| поток остановлен | подсказка «Запустите поток микрофона» |
| live | шкала combinedScore (мгновенный + сглаженный), agreement, разложение по источникам |
| источник молчит | в списке помечен «молчит» (present:false), не влияет на score |

---

## 4. install / teardown

- **install**: подписка на `microphoneStreamHub` → `LiveSampler` поверх shared MediaStream;
  `StreamWindowCollector` аккумулирует окно (`windowSec`) → `EnsembleProducer.analyze(window)`
  (detection-ensemble-service) → публикация в `combinedDetectionState`. Rolling-окна,
  guard `analyzing` от наложения прогонов.
- **teardown**: `stopSampler()` (collector.reset, producer.reset, setLive false) + `state.reset()`, guard `disposed`.

Аудио — только через `audio-engine-service`, прямого Web Audio нет.

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/mic-combined-detection/micCombinedDetectionPlugin.ts` |
| Panel | `MicCombinedDetectionPanel.tsx` (role="status" aria-live) |
| State (мост) | `combinedDetectionState.ts` — источник combinedScore для alarm-loop |
| Детекторы | `createCombinedStreamDetectors.ts` — DSP `DroneDetector` через `analyzeSample` |
| Продюсер | `@membrana/detection-ensemble-service` — `EnsembleProducer` (fuse + EMA) |
| Fusion | `@membrana/core` — `fuseDetectorConfidences` (сырой confidence, не OR) |

---

## 6. Аудио-контракт

| Поле | Значение |
|------|----------|
| Live | `LiveSampler` (bufferSize 2048, smoothing 0.75) поверх shared MediaStream |
| Окно | `StreamWindowCollector` (`windowSec` сек, default 2) → `analyzeSample` per detector |

---

## 7. Тестирование

| Область | Файл |
|---------|------|
| Слияние (pure) | `packages/services/detection-ensemble-service/src/service.test.ts` (14) |
| Bridge + конфиг + реальный DSP-путь | `apps/client/src/plugins/mic-combined-detection/combinedDetection.test.ts` |

Ручной smoke: активировать плагин → поток микрофона → дрон-звук как источник;
combinedScore > 0, alarm-loop реагирует на него.

---

## 8. Связанные task-промпты

- Магистраль S2 (2026-07-09) — `docs/MAIN_DAY_ISSUE.md`, `docs/prompts/DETECTION_ENSEMBLE_SERVICE_PROMPT.md`
- Fusion-ядро: `packages/core/src/contracts/detection-fusion.ts`
- Потребитель: `docs/catalog/client/prompts/plugins/mic-proximity-alarm.md`

---

## 9. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-07-09 | Создан (магистраль S2): combined-продюсер combinedScore из fusion-ядра |
