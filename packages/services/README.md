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
| [`fft-analyzer`](./fft-analyzer) | analyzer | Спектральный анализ через FFT: центроид, flux, RMS, детекция, пресеты. | Математик |

**Планируется добавить:**

| Сервис | Слой | Назначение |
|--------|------|-----------|
| `neural-analyzer` (планируется) | analyzer | Анализ нейронными сетями (TF.js / ONNX) |
| `llm-analyzer` (планируется) | analyzer | Анализ через LLM-модели |

Все analyzer-сервисы используют один и тот же `audio-engine` для получения данных.

## Как добавить новый сервис

1. Создай папку `packages/services/<имя>/` по образцу `audio-engine/` (foundation) или `fft-analyzer/` (analyzer).
2. Заполни `package.json`, `tsconfig.json`, `vite.config.ts`, `src/index.ts`.
3. Если analyzer — пропиши `@membrana/audio-engine-service` в `dependencies` и `references` в tsconfig.
4. Пропиши alias в `apps/client/vite.config.ts` и `apps/client/tsconfig.app.json`.
5. Добавь сервис в таблицу выше.
6. Получи `LGTM` от Teamlead.

Полный чек-лист — в [SERVICES.md](../../docs/SERVICES.md#создание-нового-сервиса).
