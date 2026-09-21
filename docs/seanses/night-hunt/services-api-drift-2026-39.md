# Night Hunt: services-api-contract-drift

| Поле | Значение |
|------|----------|
| Week | 2026-39 |
| Generated (UTC) | 2026-09-21T11:00:30.629Z |
| Channel | claude |

---

# Weekly-отчёт: `services-api-contract-drift` — неделя 2026-39

## Находки

- **Дублирование deprecated-контрактов в `fft-analyzer`.** Публичный API одновременно экспортирует новое ядро (`FftAnalyzer`, `useFftAnalyzer`, `useFftFileAnalyzer`, `useFftMicrophoneAnalyzer`) и полный набор legacy-аналогов (`AudioAnalyzer`, `useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer`). Дрейф: старый и новый контракт живут параллельно без указанного окна удаления.
- **Утечка «чистой математики» в публичный API.** Из `fft-analyzer/index.ts` наружу экспортируется большой объём low-level функций из `src/math/` (`spectralFluxL2`, `SPECTRAL_FLUX_BYTE_SCALE`, `zeroCrossingRate`, `rms`, `mean`, `std` и т.д.). Это выходит за рамки минимального контракта из SERVICES.md (ядро / типы / хуки / defaults) и расширяет поверхность API без явного намерения.
- **Отсутствие явного экспорта `AudioAnalyzerConfig` в срезе.** SERVICES.md (§ параметры захвата) ссылается на `AudioAnalyzerConfig.fftSize` как на нормативную точку конфигурации, но в видимой части `index.ts` тип публично не подтверждён (обрезка на секции «Конфигурация и пресеты»). Требуется проверка, что нормативный тип реально в контракте.
- **Согласованность defaults между сервисами формально соблюдена.** `audio-engine` экспортирует `DEFAULT_LIVE_CAPTURE_CONFIG`, `fft-analyzer` — `DEFAULT_CONFIG`/`PRESETS`. Оба совпадают с нормативом v0.1 (fftSize/bufferSize = 2048) на уровне имён; числовой дрейф на этой неделе не зафиксирован.

## Риски

- **Скрытая ломающая эволюция через math-экспорты.** Пока `src/math/*` часть публичного контракта, любое изменение сигнатуры внутренней функции (напр. масштаба `SPECTRAL_FLUX_BYTE_SCALE`) становится breaking change для внешних потребителей — контракт дрейфует незаметно для авторов.
- **Накопление deprecated без deadline.** Три deprecated-хука + `AudioAnalyzer` создают риск «вечного legacy»: потребители не мигрируют, а два контракта надо поддерживать синхронно. Риск рассинхрона поведения new vs old.
- **Нормативная привязка к типу вне контракта.** Если `AudioAnalyzerConfig` не реэкспортируется явно, документная норма v0.1 (fftSize=2048) не подкреплена типом на границе API — риск тихого расхождения docs ↔ код.
- **Расширенная поверхность → сложнее semver.** Крупный плоский экспорт математики затрудняет автоматическое определение уровня версии при изменениях и повышает вероятность непреднамеренного мажора/минора.

## Рекомендации

1. **Зафиксировать окно удаления deprecated.** Проставить у `AudioAnalyzer`, `useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer` целевую версию удаления (напр. `@deprecated since 0.x, remove in 0.y`) и завести трекинг-issue миграции потребителей.
2. **Сузить публичный API до контракта SERVICES.md.** Вынести low-level `src/math/*` за границу `index.ts` либо в отдельный subpath-экспорт (`@membrana/fft-analyzer-service/math`), пометив его как нестабильный. Оставить в корневом контракте ядро, типы, хуки, defaults.
3. **Подтвердить экспорт нормативных типов конфигурации.** Убедиться, что `AudioAnalyzerConfig`/`LiveCaptureConfig` реально в публичном контракте, и добавить контрактный тест «docs v0.1 ↔ DEFAULT_CONFIG.fftSize === 2048».
4. **Ввести snapshot API-контракта в CI.** Зафиксировать текущий публичный экспорт (api-extractor / d.ts snapshot) обоих сервисов, чтобы drift ловился на PR, а не в weekly-скане.
5. **Проверить синхронность поведения new/old.** Добавить тест-эквивалентность между `FftAnalyzer` и `AudioAnalyzer` (и парами хуков) на референс-входе, чтобы deprecated-ветка не разъезжалась с актуальной.
