# GitHub #45 → harmonic-detector: мост исполнения

> **Issue:** [#45 — DSP-детектор дрона](https://github.com/officefish/Membrana/issues/45)  
> **Реестр:** `dsp-drone-detector`  
> **Консилиум:** [`single-node-detection-first-2026-05-16.md`](../seanses/single-node-detection-first-2026-05-16.md)  
> **Дата:** 2026-05-16

---

## Решение Teamlead (зафиксировано)

**Не создаём второй пакет `@membrana/dsp-drone-detector-service`.**  
Фаза 1 issue #45 выполняется как **`@membrana/harmonic-detector-service`** в `packages/services/detectors/harmonic/` с контрактом `DroneDetector` из `@membrana/detector-base`.

| Фаза #45 (оригинал) | Где исполняем сейчас |
|---------------------|----------------------|
| 1. Сервис `dsp-drone-detector-service` | **`@membrana/harmonic-detector-service`** + ADR [`dsp-drone-detector-v0.1.md`](./dsp-drone-detector-v0.1.md) |
| 2. Демо в пакете сервиса | `packages/services/detectors/harmonic/demo/` (порт UI из DSP_DRONE_DETECTOR_PROMPT фаза 2) |
| 3. Плагин `dsp-drone-detector-viz` | `apps/client/src/plugins/harmonic-detector-viz/` (или `drone-detector-viz` — id в PR) |

**Out of scope #45 без изменения Issue:** отдельный пакет с именем `dsp-drone-detector-service` (дублировал бы harmonic).

---

## Контракты (согласование ADR ↔ detector-base)

| ADR v0.1 (`dsp-drone-detector-v0.1`) | `DroneDetector` (stage-gate) |
|--------------------------------------|------------------------------|
| Вход: `magnitudes`, `sampleRate`, `fftSize` | Вход: `AudioWindow` (сэмплы + sr) |
| Выход: `isDrone`, `confidence`, `reasoning`, `fundamentals?` | Выход: `DetectionResult` + `latencyMs` |

**Интеграция:** в `hooks/` — FFT через `@membrana/fft-analyzer-service` из `AudioWindow.samples`; в `math/` — `classifySpectrum(magnitudes, …)` по ADR (pure TS).

---

## Порядок PR (рекомендация)

1. **PR-1 (Dynin / `dynin` или `techies68`):** harmonic math + core + hooks + тесты → `Closes #45` (фаза 1).
2. **PR-2:** demo harmonic (фаза 2).
3. **PR-3:** плагин + публикация в `droneDetectionHub` для header sensor (фаза 3).

Допустим один PR после LGTM Teamlead, если объём согласован.

---

## Готовность репозитория (чеклист)

- [x] Scaffold `detector-base`, `harmonic-detector-service` (placeholder).
- [x] ADR v0.1, DSP_DRONE_DETECTOR_PROMPT, реестр `dsp-drone-detector`.
- [x] Промпт исполнения: [`HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md`](../prompts/HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md).
- [x] Алиасы client: `@membrana/detector-base`, `@membrana/harmonic-detector-service`.
- [x] `DroneDetectionHeaderSensor` + `droneDetectionHub` (плагин должен вызывать `publishDroneDetected`).
- [ ] Реализация math/hooks (следующий шаг).
- [ ] `yarn benchmark:detectors` (отдельный промпт, параллельно #47).

---

## Команды перед кодом

```bash
git checkout techies68
git pull origin techies68

# Прочитать (порядок):
# 1. этот файл
# 2. docs/prompts/HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md
# 3. docs/discussions/dsp-drone-detector-v0.1.md

yarn workspace @membrana/harmonic-detector-service test
yarn turbo run lint typecheck test build --filter=@membrana/harmonic-detector-service --continue
```

---

## Связь с #47

`single-node-detection-first` задаёт **семейство** детекторов и stage-gate. Issue **#45** — **первая реализация** DSP-эшелона (harmonic); закрывает acceptance criteria «первый рабочий детектор» для этапа 1.A.
