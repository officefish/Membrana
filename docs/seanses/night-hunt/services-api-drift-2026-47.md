# Night Hunt: services-api-contract-drift

| Поле | Значение |
|------|----------|
| Week | 2026-47 |
| Generated (UTC) | 2026-11-17T16:52:11.563Z |
| Channel | claude |

---

## Находки

- **`DEFAULT_CONFIG` вместо нормативного имени в `fft-analyzer/src/constants.ts`.** SERVICES.md §«Контракт публичного API» приводит эталон `DEFAULT_FFT_CONFIG`, а норматив захвата (v0.1) ссылается на `AudioAnalyzerConfig.fftSize` в `DEFAULT_CONFIG`. Пакет экспортирует именно `DEFAULT_CONFIG` (`export { DEFAULT_CONFIG, PRESETS, applyPreset } from './constants.js'`). Имя константы разошлось с примером в контракте — либо документ, либо экспорт требуют выравнивания.

- **Деприкированные символы остаются в публичной точке входа `fft-analyzer/src/index.ts`.** Экспортируются `AudioAnalyzer` (`./core/audio-analyzer.js`), `useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer` — все помечены `@deprecated`. SERVICES.md определяет `src/index.ts` как «ЕДИНУЮ публичную точку входа» с чётким контрактом из 4 категорий; устаревшие дубли API в контракте не описаны.

- **Отсутствует экспорт основного класса-ядра у `fft-analyzer` в терминах документа.** Контракт требует «Класс/функции ядра» на примере `FftAnalyzerService`. Фактически экспортируется `FftAnalyzer` (`./core/fft-analyzer.js`), без суффикса `Service`. Расхождение именования класса-ядра с эталоном контракта.

- **`audio-engine/src/index.ts` не экспортирует класс-ядро с суффиксом `Service`.** Контракт («Класс/функции ядра») ожидает единый сервисный класс; пакет вместо этого отдаёт набор классов `LiveSampler`, `BufferPlayer` и свободные функции (`createAudioContext`, `acquireMicrophone`, …). Для foundation-сервиса это допустимо структурно, но ни один экспорт не соответствует категории «Класс/функции ядра» в виде именованного сервиса.

## Риски

- **Дрейф имени дефолтного конфига (`DEFAULT_CONFIG` vs `DEFAULT_FFT_CONFIG`).** Норматив захвата v0.1 прямо адресует `DEFAULT_CONFIG`/`DEFAULT_LIVE_CAPTURE_CONFIG`; потребители, написанные по SERVICES.md под `DEFAULT_FFT_CONFIG`, упрутся в несуществующий экспорт. Молчаливый сбой контракта на этапе интеграции analyzer-сервисов.

- **Публичная поверхность `fft-analyzer` раздута `@deprecated`-дублями.** Три устаревших хука и класс `AudioAnalyzer` в `index.ts` увеличивают риск того, что новые сервисы/клиент подхватят старый API; teamlead-проверка контракта на «тонкость» точки входа усложняется.

- **Несовпадение именования класса-ядра (`FftAnalyzer`/`AudioAnalyzer` vs эталон `FftAnalyzerService`)** снижает автоматическую проверяемость контракта: линтер/скрипт на правило «экспорт `*Service`» даст ложные срабатывания либо пропуски.

## Рекомендации

- Устранить расхождение имени: либо переименовать экспорт в `DEFAULT_FFT_CONFIG` в `fft-analyzer/src/constants.ts` и `index.ts`, либо обновить пример в SERVICES.md §«Контракт публичного API» до фактического `DEFAULT_CONFIG` — зафиксировать один источник истины.

- Вынести `@deprecated`-экспорты (`AudioAnalyzer`, `useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer`) из `fft-analyzer/src/index.ts` в план удаления с датой/версией; до удаления — пометить их в документе как «переходные», чтобы контракт точки входа оставался проверяемым.

- Привести SERVICES.md к реальной практике именования: явно указать, что foundation-сервисы (пример `audio-engine`) допускают несколько классов-ядро и свободные функции вместо единого `*Service`, иначе категория «Класс/функции ядра» нарушается у `audio-engine/src/index.ts` формально.

- Решить по `FftAnalyzer`: либо переименовать в `FftAnalyzerService` для соответствия эталону контракта, либо зафиксировать в SERVICES.md, что суффикс `Service` относится к имени пакета, а не класса-ядра.
