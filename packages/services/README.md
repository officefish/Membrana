# packages/services — раздел сервисов

Этот раздел содержит **автономные пакеты-сервисы** с чистой бизнес-логикой и тонким React-слоем.

Каждый подкаталог — самостоятельный vite-ts-react пакет, разрабатываемый независимо от остального кода. Подробные соглашения: [../../docs/SERVICES.md](../../docs/SERVICES.md).

## Слои сервисов

| Слой | Назначение | Допустимые зависимости |
|------|-----------|------------------------|
| **Foundation** | Базовая инфраструктура (Web Audio, IO, общие утилиты) | `@membrana/core` |
| **Analyzer** | Анализаторы поверх foundation: FFT, нейросетевые, LLM, и т.д. | `@membrana/core` + foundation-сервисы |

Запрещены циклические зависимости и связи между сервисами одного уровня (analyzer ↔ analyzer).

## Доступные сервисы

| Сервис | Слой | Назначение | Роль |
|--------|------|-----------|------|
| [`audio-engine`](./audio-engine) | foundation | Web Audio, файлы, микрофон, `LiveSampler` — поток `AudioSampleFrame`. Не делает анализа. | Структурщик + Музыкант |
| [`sample-playback`](./sample-playback) | foundation | Shared hub воспроизведения сэмплов (BufferPlayer + waveform) для client/cabinet. | Структурщик |
| [`fft-analyzer`](./fft-analyzer) | analyzer | Спектральный анализ через FFT: центроид, flux, RMS, детекция, пресеты. | Математик |
| [`detectors/`](./detetectors/) | analyzer | Семейства детекторов дрона (Single-Node Detection First): `detector-base` + 6 реализаций. | Математик + Структурщик |
| [`drone-detection-orchestrator`](./drone-detection-orchestrator) | analyzer | Оркестрация полного DDR (4 DSP + template-match) над Float32; общий код client/server (LP1b). | Математик + Структурщик |
| [`telemetry`](./telemetry) | foundation | RAM-буфер телеметрии (legacy writers, MP5 upload) | Структурщик |
| [`telemetry-journal`](./telemetry-journal) | foundation | Live journal: track + report items, storage backends (TJ1–TJ6) | Структурщик |
| [`media-library`](./media-library) | foundation | Sample library storage port + quota | Структурщик |
| [`usercase-catalog`](./usercase-catalog) | platform facade | UserCase entitlement над инъецируемым `UserCaseCatalogPort` | Структурщик |
| [`rag`](./rag) | foundation-infra | Dual-circuit RAG for rituals (LanceDB + repo operative) | Структурщик |
| [`tdoa`](./tdoa) | analyzer | TDOA — **frozen** до stage-gate 1→2. | — |

### Детекторы (`detectors/`)

| Пакет | Семейство | Статус |
|-------|-----------|--------|
| [`detector-base`](./detectors/base) | контракт | scaffold |
| [`harmonic`](./detectors/harmonic) | dsp | scaffold |
| [`cepstral`](./detectors/cepstral) | dsp | scaffold |
| [`spectral-flux`](./detectors/spectral-flux) | dsp | scaffold |
| [`template-match`](./detectors/template-match) | dsp | benchmark (VDR5) |
| [`yamnet`](./detectors/yamnet) | neural | scaffold |
| [`clap`](./detectors/clap) | neural | scaffold |
| [`agentic-claude`](./detectors/agentic-claude) | agentic | scaffold |

**Планируется добавить:**

| Сервис | Слой | Назначение |
|--------|------|-----------|
| `neural-analyzer` (планируется) | analyzer | Анализ нейронными сетями (TF.js / ONNX) |
| `llm-analyzer` (планируется) | analyzer | Анализ через LLM-модели |

Все analyzer-сервисы используют один и тот же `audio-engine` для получения данных.

## Политика тестов (CRDC / CI)

| Правило | Детали |
|---------|--------|
| Скрипт `test` | `vitest run` — **без** `--passWithNoTests`, если в `src/` есть `*.test.ts` |
| Foundation | Минимум unit-тесты на pure TS; Web Audio — smoke в браузере |
| Analyzer | Unit-тесты на математику/классификацию; тяжёлые suite — `pool: 'forks'` в `vitest.config.ts` |
| Turbo | `yarn turbo run test` должен падать при регрессии, а не молча пропускать пакет |

## Как добавить новый сервис

1. Создай папку `packages/services/<имя>/` по образцу `audio-engine/` (foundation) или `fft-analyzer/` (analyzer).
2. Заполни `package.json`, `tsconfig.json`, `vite.config.ts`, `src/index.ts`.
3. Если analyzer — пропиши `@membrana/audio-engine-service` в `dependencies` и `references` в tsconfig.
4. Пропиши alias в `apps/client/vite.config.ts` и `apps/client/tsconfig.app.json`.
5. Добавь сервис в таблицу выше.
6. Получи `LGTM` от Teamlead.

Полный чек-лист — в [SERVICES.md](../../docs/SERVICES.md#создание-нового-сервиса).
