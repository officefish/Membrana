# Night Hunt: services-api-contract-drift

| Поле | Значение |
|------|----------|
| Week | 2026-38 |
| Generated (UTC) | 2026-09-14T11:00:33.135Z |
| Channel | claude |

---

# Weekly-отчёт: `services-api-contract-drift` — неделя 2026-38

## Находки

- **Дублирование дефолт-конфигов между слоями.** `audio-engine` экспортирует `DEFAULT_LIVE_CAPTURE_CONFIG` (`LiveCaptureConfig.bufferSize`), а `fft-analyzer` — `DEFAULT_CONFIG` (`AudioAnalyzerConfig.fftSize`). Норматив v0.1 требует `fftSize/bufferSize = 2048` в обоих местах, но контракты не связаны типом: дрейф значения в одном пакете не ловится компилятором. Единого источника истины для параметра нет.
- **Живой deprecated-контур в публичном API `fft-analyzer`.** Через `index.ts` наружу всё ещё торчат `AudioAnalyzer`, `useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer` (все помечены `@deprecated`) параллельно с новыми `FftAnalyzer` / `useFftAnalyzer` / `useFftFileAnalyzer` / `useFftMicrophoneAnalyzer`. Двойная поверхность API — источник расхождения потребителей.
- **`fft-analyzer` экспортирует крупный «плоский» математический слой** (`SpectralFluxTracker`, `spectralFluxL2`, `spectralCentroid`, `rms`, `zeroCrossingRate`, `spectralRolloff`, `spectralFlatness`, `estimateNoiseFloor`, `evaluateThresholdTest` и др.) напрямую из `src/index.ts`. Это широкий контракт `math/*`, который по SERVICES.md является внутренней деталью реализации — каждый такой символ повышает риск дрейфа при рефакторинге.
- **Асимметрия соглашений об именовании констант.** `audio-engine` использует `DEFAULT_LIVE_CAPTURE_CONFIG`, `fft-analyzer` — `DEFAULT_CONFIG` (без префикса домена, вопреки примеру `DEFAULT_FFT_CONFIG` из контракта публичного API в SERVICES.md).
- **Граф зависимостей соблюдён.** `fft-analyzer` (analyzer) зависит от `audio-engine` (foundation) — направление корректное; импортов между analyzer-сервисами и обратных зависимостей на `apps/client`/`agenda` в проверенных `index.ts` не обнаружено.

## Риски

- **Тихий дрейф параметров захвата (v0.1).** Поскольку `bufferSize` и `fftSize` фиксируются как «2048» в двух независимых константах, рассинхронизация при правке одного пакета не будет выявлена типами и всплывёт только в поле (полевые тесты Этапа 1) — высокий риск для точности анализа.
- **Расширение blast-radius из-за широкого API.** Экспорт всего `math/*` наружу означает, что любой внешний потребитель может завязаться на внутреннюю функцию (`spectralFlatness`, `stabilityFromFlux` и т.п.); последующий рефакторинг ядра станет breaking change без явного намерения.
- **Накопление deprecated без даты удаления.** Наличие старого (`AudioAnalyzer`/`useAudioAnalyzer`) и нового API одновременно провоцирует новых потребителей выбирать устаревший путь; отсутствие плана снятия увеличивает долг контракта.
- **Неявный fallback sampleRate (48000 → 44100).** Контракт допускает fallback с пометкой в telemetry, но на уровне типов API это не отражено — потребитель может не различить целевой и fallback-режим, что даёт скрытый дрейф семантики метрик.

## Рекомендации

- **Ввести единый источник истины для параметров захвата.** Вынести `2048`, `sampleRate`, `overlap` в общий контракт (в `@membrana/core` или разделяемый тип), на который ссылаются и `DEFAULT_LIVE_CAPTURE_CONFIG`, и `DEFAULT_CONFIG`, чтобы рассинхрон ловился компилятором.
- **Сузить публичную поверхность `fft-analyzer`.** Перевести чистую математику `math/*` во внутренний импорт; наружу оставить только контракт публичного API (класс ядра, типы вход/выход, хуки, `DEFAULT_*`). При необходимости — отдельный явный sub-path экспорт для «продвинутых» метрик.
- **Зафиксировать deprecation-план.** Для `AudioAnalyzer` и трёх legacy-хуков указать целевую версию удаления и добавить в CI линт-правило, запрещающее новые импорты deprecated-символов.
- **Выровнять именование дефолтов.** Переименовать `DEFAULT_CONFIG` → `DEFAULT_FFT_CONFIG` (с временным ре-экспортом-алиасом) для соответствия примеру в SERVICES.md и единообразия с `audio-engine`.
- **Отразить fallback sampleRate в типах.** Добавить в возвращаемый контракт явный признак фактического `sampleRate` / флаг fallback, чтобы потребители метрик различали 48k и 44.1k режимы без обращения к telemetry.
