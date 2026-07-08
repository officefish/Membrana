# Плагин: `mic-proximity-alarm` — Alarm-loop «ближе/дальше»

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**
> Реестр: `docs/catalog/client/registry.json` · задача дня: B (alarm-loop, 2026-07-08)

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `mic-proximity-alarm` |
| **parentModuleId** | `microphone` |
| **Lead** | Kuryokhin + Rodchenko |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Обратная связь по громкости живого потока: индикатор говорит **приближается /
удаляется / стабильно** по тренду громкости сцены. Порог реальной тревоги завязан на
`combinedScore` из fusion-ядра (спектр+нейро), а не на самой громкости — громкость это
грубый индикатор сцены, **не координата и не расстояние** (честно помечено в UI).

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| поток остановлен | подсказка «Запустите поток микрофона» |
| накопление окна | метка «(накопление окна…)» до готовности трекера |
| live | тренд ▲ приближается / ▼ удаляется / ＝ стабильно + шкала громкости |
| тревога | блок combined: `active/rising/easing` (пока нет combined-продюсера — «ожидает combined-плагин») |

---

## 4. install / teardown

- **install**: подписка на `microphoneStreamHub` → `LiveSampler` поверх shared MediaStream;
  на кадр — `frameLoudness` → `LoudnessTrendTracker` → `evaluateProximityAlarm`.
- **teardown**: `stopSampler()` (`tracker.reset()`, `setLive(false)`) + `state.reset()`, guard `disposed`.

Аудио — только через `audio-engine-service`, прямого Web Audio нет.

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/mic-proximity-alarm/micProximityAlarmPlugin.ts` |
| Panel | `MicProximityAlarmPanel.tsx` (role="status" aria-live на блоке тревоги) |
| State | `micProximityPluginState.ts` (useSyncExternalStore singleton) |
| Trend math | `@membrana/fft-analyzer-service` — `LoudnessTrendTracker`, `evaluateProximityAlarm` (pure) |
| Fusion | `@membrana/core` — `fuseDetectorConfidences` (источник combinedScore) |

---

## 6. Аудио-контракт

| Поле | Значение |
|------|----------|
| Live | `LiveSampler` (bufferSize 2048, smoothing 0.75) поверх shared MediaStream |
| Метрика | `frameLoudness` = max(RMS, peak×k) — грубая громкость сцены |

---

## 7. Тестирование

| Область | Файл |
|---------|------|
| Unit (тренд+гейт) | `packages/services/fft-analyzer/src/math/loudness-trend.test.ts` (16+6) |
| Unit (конфиг+форма) | `apps/client/src/plugins/mic-proximity-alarm/types.test.ts` |

Ручной smoke: активировать плагин → поток микрофона → телефон с дрон-звуком как
источник; индикатор реагирует «ближе/дальше/стабильно».

---

## 8. Связанные task-промпты

- Задача дня B (2026-07-08) — `docs/MAIN_DAY_ISSUE.md`
- Fusion-ядро (A): `packages/core/src/contracts/detection-fusion.ts`

---

## 9. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-07-08 | Создан (B): тренд громкости + гейт тревоги по combinedScore |
