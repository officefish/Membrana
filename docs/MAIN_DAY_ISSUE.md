<!-- Обновлено: 2026-06-15 (SLD3 — sample-library-drone-detection epic) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) -->
<!-- Эпик: docs/prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md -->
<!-- Реестр: sld3-dsp-detectors-free-v1 -->

# MAIN_DAY_ISSUE — 2026-06-15

**Дата:** 2026-06-15 · **Хранитель:** Teamlead (Vesnin)

---

## Один обязательный фокус дня

### **SLD3: cepstral + spectral-flux на free-v1 (120)**

**GitHub Issue:** [#47](https://github.com/officefish/Membrana/issues/47)  
**Эпик:** `sample-library-drone-detection`  
**Фаза:** `sld3-dsp-detectors-free-v1`  
**Промпт:** [`docs/prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](./prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md)

**Закрыто сегодня:** SLD1 (`analyzeSample`), SLD2 (плагин) — PR [#77](https://github.com/officefish/Membrana/pull/77).

---

## Цель

Три DSP-детектора (harmonic, cepstral, spectral-flux) в **benchmark** и **плагине библиотеки**; метрики на 120 free-v1.

---

## Definition of Done (SLD3)

- [x] `@membrana/cepstral-detector-service` — working `detect()`
- [x] `@membrana/spectral-flux-detector-service` — working `detect()`
- [x] Плагин показывает 3 строки вердикта
- [x] `yarn benchmark:detectors` — три строки в `DETECTOR_BENCHMARK.md`

**Baseline v0.2 (120):** harmonic F1≈0.53 · cepstral F1≈0.67 · spectral-flux F1≈0.61

**Следующее:** SLD4 калибровка порогов + stage-gate отчёт.

---

## Команды

```bash
yarn turbo run lint typecheck test build --filter=@membrana/cepstral-detector-service --filter=@membrana/spectral-flux-detector-service
yarn turbo run lint typecheck --filter=@membrana/client
yarn benchmark:detectors
```
