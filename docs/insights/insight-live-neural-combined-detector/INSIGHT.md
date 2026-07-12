# INSIGHT: Живой нейро-combined детектор (эшелон-2-live): yamnet в combinedScore

| Поле | Значение |
|------|----------|
| **ID** | `insight-live-neural-combined-detector` |
| **Статус** | deferred |
| **Источник** | user |
| **Создан** | 2026-07-12 |

---

## Проблема / наблюдение

`combinedScore` сейчас **DSP-only** во всех точках, хотя дух ND3 требует слияния спектр+нейро:
- клиентский `createCombinedStreamDetectors` (`apps/client/src/plugins/mic-combined-detection/`) возвращает только 3 DSP-детектора (harmonic + cepstral + spectral-flux), без yamnet;
- `neural-drone-analyzer` (yamnet) зарегистрирован только для `sample-library` (офлайн-анализ сэмплов), не для `microphone` / живого combined;
- device-board `make-detection-fusion` фьюзит `DetectionAnalysisRef` (trends+ensemble) — тоже DSP, нейро-узла в палитре нет.

То есть `fuse(yamnetRaw, trendsScore)` из плана S2 в коде пока не существует — combined живёт без нейро-модальности, а yamnet (лучший на free-v1, F1 0.803) в живой fusion не участвует.

## Гипотеза

Если подключить yamnet как **живой** detector в combined-контур (сырой confidence, не бинарный вердикт — ND3), то `combinedScore` станет реальным слиянием слабо коррелированных модальностей (спектр DSP + нейро AudioSet), что поднимет точность там, где DSP «молчит» — прямой путь к stage-gate 1→2 (WP §8) и честному S2 «спектр+нейро».

## Scope (черновик)

- **In scope:** yamnet model-provider на живом потоке; добавить нейро в `createCombinedStreamDetectors` (client) И/ИЛИ нейро-узел device-board, питающий `make-detection-fusion`; перф-бюджет модели на live-каденсе; честная метка «спектр+нейро» в UserCase.
- **Out of scope:** переобучение модели; TDOA/мультиузел (эшелоны 2–4 заморожены); полная валидация качества (ждёт VDR-железо ~17.07).

## Связи

- Эпики / PR: detection-ensemble-service (#317, combined-продюсер); loop-transition-policy (#357); ND-плагин yamnet (#266/#268, F1 0.803).
- Отложено из S2 combined UC: выбран **вариант A DSP-only** (2026-07-12) — combined UC собирается на DSP-fusion, живой нейро — этот отдельный шаг.
- Документы: `DETECTOR_BENCHMARK.md` (ND3, yamnet vs DRONE_TIGHT); WHITE_PAPER §8 (stage-gate 1→2).

## Вопросы для research (Q1–Q3)

1. **Landscape:** как гоняют yamnet/CLAP-класс на живом браузерном аудиопотоке в реальном времени (TF.js, воркеры, каденс, латентность) без просадки UI?
2. **Fit (Membrana):** где дешевле подключить нейро в живой combined — клиентский `DroneDetector`-список или device-board detector-узел, питающий `make-detection-fusion`? Как не нарушить границы пакетов и контракт `fuseDetectorConfidences`?
3. **Risk:** перф-бюджет модели на live-каденсе (тик ~0.5 с) vs полнота окна; деградация combined при «молчащем» нейро-входе (present:false); зависимость валидации от VDR-железа.
