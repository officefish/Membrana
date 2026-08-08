# Night Hunt: services-api-contract-drift

| Поле | Значение |
|------|----------|
| Week | 2026-32 |
| Generated (UTC) | 2026-08-03T11:00:33.058Z |
| Channel | claude |

---

# Weekly-отчёт: `services-api-contract-drift` — неделя 2026-32

## Находки

- **Двойной публичный контракт в `fft-analyzer`.** В `index.ts` одновременно экспортируются актуальный `FftAnalyzer` и `@deprecated AudioAnalyzer`, а также три пары хуков (актуальные `useFftAnalyzer`/`useFftFileAnalyzer`/`useFftMicrophoneAnalyzer` и устаревшие `useAudioAnalyzer`/`useFileAnalyzer`/`useMicrophoneAnalyzer`). Поверхность API удвоена — это накопленный дрейф без даты снятия deprecated-слоя.
- **Расхождение имён дефолт-конфигов между слоями цепочки.** `audio-engine` экспортирует `DEFAULT_LIVE_CAPTURE_CONFIG`, `fft-analyzer` — `DEFAULT_CONFIG`. В SERVICES.md норматив v0.1 ссылается сразу на оба (`AudioAnalyzerConfig.fftSize`, `LiveCaptureConfig.bufferSize`), при этом имя `AudioAnalyzerConfig` тяготеет к deprecated-классу `AudioAnalyzer`, а не к `FftAnalyzer`.
- **Смешение слоёв math/core в публичном экспорте.** `fft-analyzer/index.ts` выносит наружу большой объём «чистой математики» (`FftCore`, `spectralFluxL2`, `zeroCrossingRate`, `spectralRolloff`, `spectralFlatness` и др.) наравне с engine-классом. Формально контракту SERVICES.md это не противоречит, но раздувает публичную поверхность и затрудняет отслеживание breaking-changes в утилитах.
- **Комментарий-контракт `audio-engine` соблюдён.** Заголовок index.ts заявляет «не делает анализа — только поставляет данные»; фактические экспорты (LiveSampler, BufferPlayer, микрофон, helpers) этому соответствуют — дрейфа foundation→analyzer нет.
- **CT6/tariff v2 добавлен в foundation корректно.** `scheduleFadeOut`, `stopAllActivePlayback`, `FADE_OUT_FLOOR_GAIN` экспортированы из `audio-engine` без утечки React/analyzer-зависимостей.

## Риски

- **Backward-compat долг растёт молча.** Deprecated-экспорты (`AudioAnalyzer` + 3 хука) не имеют помеченного target-релиза для удаления. Потребители в `apps/client` могут молча оставаться на устаревшем API, а следующее удаление станет незапланированным breaking-change.
- **Неоднозначность имён конфигов → ошибки интеграции.** Пара `DEFAULT_CONFIG` / `DEFAULT_LIVE_CAPTURE_CONFIG` при неверной привязке `fftSize`/`bufferSize` даёт рассинхрон параметров захвата (2048 / overlap 50 %). При fallback sampleRate 44100 это риск некорректной телеметрии и метрик анализа.
- **Широкая math-поверхность = хрупкий контракт.** Любая рефакторизация в `src/math/` (переименование `spectralFluxL2`, изменение сигнатур trackers) автоматически становится публичным breaking-change, хотя эти функции по духу SERVICES.md — внутренняя реализация analyzer.
- **Отсутствие явной версии контракта.** В index.ts нет маркера semver/версии API; drift-детектор вынужден сравнивать сырой diff экспортов без опоры на объявленную версию.

## Рекомендации

1. **Ввести deprecation-политику с датой.** Пометить `AudioAnalyzer` и устаревшие хуки target-версией удаления (например, «remove in v0.3»), добавить в JSDoc ссылку на замену и завести issue на миграцию потребителей в `apps/client`.
2. **Унифицировать именование дефолт-конфигов.** Согласовать `DEFAULT_CONFIG` (fft) и `DEFAULT_LIVE_CAPTURE_CONFIG` (engine) с нормативом v0.1 в SERVICES.md: явно зафиксировать в README fft-analyzer, какое поле откуда берётся (`fftSize=2048`, `bufferSize=2048`, overlap 50 %), и синхронизировать при fallback 44100.
3. **Сократить публичную math-поверхность.** Оценить, какие функции из `src/math/` действительно нужны потребителям вне сервиса; неиспользуемые снаружи — убрать из `index.ts` в internal, оставив только контрактные типы (`FftConfig`, `FftResult`-эквиваленты).
4. **Добавить версионирование контракта.** Зафиксировать текущий набор публичных экспортов как baseline снапшот и включить в CI проверку drift относительно него, чтобы каждое изменение index.ts требовало явного апдейта версии.
