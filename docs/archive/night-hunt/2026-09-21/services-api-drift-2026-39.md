# Night Hunt: services-api-contract-drift

| Поле | Значение |
|------|----------|
| Week | 2026-39 |
| Generated (UTC) | 2026-09-21T14:05:13.247Z |
| Channel | claude |

---

# Weekly-отчёт: `services-api-contract-drift` — неделя 2026-39

## Находки

- **Deprecated-поверхность в `fft-analyzer` разрастается.** Публичный `index.ts` продолжает экспортировать целый пласт устаревших сущностей: класс `AudioAnalyzer` и три хука (`useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer`), помеченные `@deprecated`, но остающиеся в основном контракте наравне с актуальными `FftAnalyzer` / `useFftAnalyzer`. Дрейф: старый и новый API сосуществуют без явной даты удаления или мажорной вехи.

- **`fft-analyzer` экспортирует «сырую» математику как публичный контракт.** Из `src/math/` наружу торчат `FftCore`, `spectralFluxL2`, `SPECTRAL_FLUX_BYTE_SCALE`, `SPECTRAL_FLUX_L2_DIVISOR`, `mean`, `std`, `minOf`, `maxOf` и т.д. Это внутренние детали слоя `math/`, но они закреплены в API-поверхности — любое изменение алгоритма становится breaking change.

- **Расхождение конфигов между слоями по имени.** В `audio-engine` дефолт называется `DEFAULT_LIVE_CAPTURE_CONFIG` (тип `LiveCaptureConfig.bufferSize`), в `fft-analyzer` — `DEFAULT_CONFIG` (поле `fftSize`). Норматив v0.1 (SERVICES.md) требует согласованных значений (`bufferSize`/`fftSize = 2048`), но именование/структура двух дефолтов не выражают этой связи в типах — контракт держится «на словах».

- **Соблюдение слоёв в экспортах корректно.** `audio-engine` не экспортирует React-компоненты и analyzer-зависимостей; `fft-analyzer` зависит только от `audio-engine` (foundation) и `core`. Нарушений графа foundation→analyzer в публичных точках входа не обнаружено.

## Риски

- **Скрытый breaking change через math-экспорты.** Пока `FftCore` и служебные константы/функции в публичном API, рефакторинг DSP-логики ломает внешних потребителей без предупреждения. Высокий риск незаметного мажорного дрейфа при «внутренней» правке.

- **Неопределённый срок жизни deprecated-API.** Отсутствие целевой версии удаления `AudioAnalyzer` и старых хуков ведёт к вечному сосуществованию, росту тестовой матрицы и путанице у ролей Музыканта/Математика при выборе точки входа.

- **Рассинхрон нормативных параметров захвата.** Значения sampleRate/fftSize/overlap заданы в двух местах (`DEFAULT_LIVE_CAPTURE_CONFIG` и `DEFAULT_CONFIG`) независимо. При правке одного из них цепочка `микрофон → audio-engine → fft-analyzer` может молча разъехаться, что критично перед полевыми тестами (Этап 1 WHITE_PAPER).

- **Готовность к будущему `dsp-drone-detector-service`.** Норматив уже упоминает будущий детектор как потребителя цепочки; при нынешней «широкой» поверхности fft-analyzer детектор рискует завязаться на нестабильные math-экспорты вместо стабильных метрик высокого уровня.

## Рекомендации

- **Зафиксировать deprecation-политику.** Проставить в JSDoc `@deprecated since` и целевую мажорную версию удаления для `AudioAnalyzer`, `useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer`; вынести список в CHANGELOG/RELEASE-заметку сервиса.

- **Сузить публичный контракт fft-analyzer.** Разделить экспорт на стабильный (`FftAnalyzer`, хуки, типы `Fft*`, `DEFAULT_CONFIG`/`PRESETS`) и явно-внутренний. Кандидаты на скрытие или на пометку «unstable»: `FftCore`, `spectralFluxL2`, `SPECTRAL_FLUX_*`, чистые `mean/std/minOf/maxOf`.

- **Ввести единый источник нормативных параметров.** Вынести v0.1-значения (sampleRate 48000, fftSize/bufferSize 2048, overlap 50%) в общий константный контракт (в `@membrana/core` или общий `constants`), из которого оба дефолта производятся, чтобы дрейф ловился типами/тестом.

- **Добавить контрактный snapshot-тест API.** Зафиксировать публичные экспорты `audio-engine` и `fft-analyzer` snapshot-тестом (api-extractor или ручной список), чтобы любой drift поверхности требовал явного апдейта в PR и попадал под ревью Teamlead.

- **Согласовать точку входа для будущего детектора.** До старта `dsp-drone-detector-service` определить, какие именно метрики fft-analyzer являются стабильным контрактом для детекторов, и задокументировать это в README сервиса.
