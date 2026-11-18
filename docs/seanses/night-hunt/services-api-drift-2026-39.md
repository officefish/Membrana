# Night Hunt: services-api-contract-drift

| Поле | Значение |
|------|----------|
| Week | 2026-39 |
| Generated (UTC) | 2026-09-25T12:45:19.540Z |
| Channel | claude |

---

# Weekly-отчёт: services-api-contract-drift — 2026-39

## Находки

- **Отсутствует обязательная константа-`DEFAULT_*` в контракте `audio-engine`.** SERVICES.md («Контракт публичного API») требует экспорт категории «Константы/defaults». В `audio-engine index.ts` из defaults экспортируется только `DEFAULT_LIVE_CAPTURE_CONFIG` (блок `// Типы`). Формально категория закрыта, дрейфа нет — но константа выведена не в отдельную секцию, а внутри `export { DEFAULT_LIVE_CAPTURE_CONFIG } from './types.js'` рядом с типами. Адрес: `DEFAULT_LIVE_CAPTURE_CONFIG` в `audio-engine/src/index.ts`.

- **Deprecated-экспорты остаются в публичной точке входа `fft-analyzer`.** В `fft-analyzer/src/index.ts` публично реэкспортируются помеченные `@deprecated` символы: `AudioAnalyzer` (из `./core/audio-analyzer.js`), `useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer` (из соответствующих `./hooks/*`). Контракт SERVICES.md описывает актуальный API (`FftAnalyzerService`/`useFftAnalyzer`), но не регламентирует срок удаления устаревших — это точка дрейфа между «эталонным» именем и фактическим содержимым `index.ts`.

- **Расхождение имени класса ядра.** SERVICES.md («Контракт публичного API», строка-пример) декларирует класс ядра `FftAnalyzerService`. В `fft-analyzer/src/index.ts` фактически экспортируется `FftAnalyzer` (из `./core/fft-analyzer.js`); экспорт `FftAnalyzerService` отсутствует. Адрес недостающего символа: `FftAnalyzerService` — нет в `fft-analyzer/src/index.ts`.

- **Норматив захвата v0.1 привязан к двум разным именам конфигов.** SERVICES.md («Параметры захвата») указывает `fftSize`/`bufferSize` через `AudioAnalyzerConfig.fftSize` и `DEFAULT_CONFIG`/`DEFAULT_LIVE_CAPTURE_CONFIG`. `AudioAnalyzerConfig` соответствует deprecated-`AudioAnalyzer`, тогда как актуальный публичный тип конфигурации в приведённом фрагменте `fft-analyzer/src/index.ts` не виден (секция «Типы» обрезана). Проверяемый адрес: `DEFAULT_CONFIG` в `fft-analyzer/src/constants.js` — присутствует; `AudioAnalyzerConfig` — по индексу не подтверждён в приведённом фрагменте.

## Риски

- Норматив захвата (v0.1) ссылается на `AudioAnalyzerConfig.fftSize`, а этот тип принадлежит deprecated-ветке (`AudioAnalyzer`). При удалении устаревших экспортов документ станет ссылаться на несуществующий символ — риск «висячей» нормы.

- Название `FftAnalyzerService` в контракте не совпадает с фактическим `FftAnalyzer`: потребители, ориентирующиеся на SERVICES.md, импортируют несуществующее имя — риск ломки внешнего потребления через `dist/`.

- Совмещение `DEFAULT_LIVE_CAPTURE_CONFIG` в секции «Типы» вместо секции defaults в `audio-engine` затрудняет автоматическую проверку категорий контракта — риск ложноотрицательного результата drift-джобы.

## Рекомендации

- Привести SERVICES.md к факту: заменить пример `FftAnalyzerService` на `FftAnalyzer` **либо** добавить/переименовать экспорт до `FftAnalyzerService` в `fft-analyzer/src/index.ts` — выбрать одну сторону и синхронизировать.

- Заменить в «Параметры захвата» ссылку `AudioAnalyzerConfig.fftSize` на актуальный тип конфигурации fft-analyzer (не из deprecated-ветки), чтобы норматив не зависел от устаревших экспортов.

- Назначить срок и версию удаления `@deprecated`-экспортов (`AudioAnalyzer`, `useAudioAnalyzer`, `useFileAnalyzer`, `useMicrophoneAnalyzer`) и зафиксировать его в README сервиса, чтобы drift-джоба отслеживала выпил по плану.

- Вынести `DEFAULT_LIVE_CAPTURE_CONFIG` в `audio-engine/src/index.ts` в явную секцию defaults (отдельно от `// Типы`), чтобы категория «Константы/defaults» из контракта проверялась однозначно.
