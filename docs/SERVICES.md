# SERVICES — соглашения о пакетах-сервисах

> Документ для роли **Структурщика** и для всех агентов, добавляющих новые сервисы.
> Любой новый сервис обязан соответствовать этому документу; иначе Teamlead отклоняет PR.

## Что такое «сервис» в Membrana

**Сервис** — это автономный пакет с **чистой бизнес-логикой** + **тонким слоем React-хуков**, размещённый в `packages/services/<name>`. Каждый сервис:

- Имеет **собственный** `package.json`, `tsconfig.json`, `vite.config.ts`.
- Разрабатывается **независимо** от других сервисов и приложения.
- Экспортирует две вещи: ядро (pure TS) и хуки для React-компонентов.
- Не знает ни о других сервисах, ни о других плагинах. Любая зависимость от `@membrana/core` — допустима.

## Зачем такая структура

1. **Локальная разработка** — сервис можно поднять как standalone Vite-проект и отладить без клиента.
2. **Бандл независим** — Vite собирает каждый сервис в свою библиотеку (`dist/`), что позволяет переиспользовать его за пределами монорепо.
3. **Чёткое разграничение слоёв** — pure-логика в `service.ts`, React-обёртка в `hooks.ts`. Структурщик контролирует, чтобы они не смешивались.
4. **Параллельная разработка** — несколько ролей (Математик, Музыкант) могут вести свои сервисы одновременно без конфликтов.

## Граф зависимостей

Сервисы делятся на **два слоя**:

```
@membrana/core
   │
   ├── @membrana/<foundation>-service        ← foundation: общая инфраструктура
   │       │   (audio-engine, io-engine, ...)
   │       │
   │       ├── @membrana/<analyzer>-service   ← analyzer: специализированный
   │       │       (fft-analyzer, neural-analyzer, llm-analyzer, ...)
   │       │
   │       └── @membrana/<analyzer-2>-service
   │
   └── используется в @membrana/agenda / device-board / apps/client
```

### Правила

- **Foundation-сервисы** зависят ТОЛЬКО от `@membrana/core` + внешних npm-пакетов.
- **Analyzer-сервисы** зависят от `@membrana/core` + одного или нескольких foundation-сервисов. **НЕ** зависят от других analyzer-сервисов.
- Циклические зависимости запрещены на любом уровне.
- Сервисы **не зависят** от `@membrana/agenda` / `@membrana/device-board` / `apps/client`. Только наоборот.
- Сервис **не импортирует** React-компоненты — только React API (`useState`, `useEffect`, …).

### Подкаталог `packages/services/detectors/*`

Семейства детекторов дрона (Single-Node Detection First) живут в отдельной иерархии:

- `@membrana/detector-base` — контракты `DroneDetector`, `DetectionResult`, `AudioWindow`.
- `@membrana/<name>-detector-service` — одна реализация на пакет; **без импортов** между детекторами.
- Зависимости: `detector-base` → `core` + `audio-engine-service`; каждый детектор → `core` + `detector-base`.

Подробности: [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1e, [`WHITE_PAPER.md`](./WHITE_PAPER.md) §8.

### Когда выделять foundation

Создавай новый foundation-сервис, если **несколько** будущих analyzer-сервисов будут переиспользовать одну и ту же инфраструктуру. Пример: `audio-engine` появился, когда стало ясно, что FFT-, нейросетевой- и LLM-анализаторы будут получать данные одинаково (микрофон / файл / поток).

Если общий код нужен только одному сервису — не выделяй, держи внутри.

## Структура файлов

Для маленьких сервисов хватит плоской структуры. Для сложных (с математикой,
engine-слоем поверх Web Audio, несколькими хуками) — папочная:

**Плоская (минимум):**

```
packages/services/<name>/
├── README.md           # ЧТО делает сервис, API, примеры
├── package.json        # имя @membrana/<name>-service
├── tsconfig.json       # composite: true, references на core
├── vite.config.ts      # library mode + alias на @membrana/core
└── src/
    ├── index.ts        # ЕДИНАЯ публичная точка входа
    ├── service.ts      # ЧИСТОЕ ядро: классы/функции без React
    ├── hooks.ts        # React-хуки, оборачивающие service.ts
    └── types.ts        # Типы и интерфейсы
```

**Папочная (для сложных сервисов, эталон — `fft-analyzer` поверх `audio-engine`):**

```
packages/services/<name>/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── math/           # ЧИСТЫЕ функции: математика, статистика, алгоритмы
    │   ├── fft.ts      # никаких React/DOM/Web Audio
    │   └── metrics.ts
    ├── core/           # ENGINE: жизненный цикл, Web Audio, MediaStream
    │   ├── <name>.ts   # главный класс — единственный с побочными эффектами
    │   └── helpers.ts  # createAudioContext, loadAudioBuffer и т.п.
    ├── hooks/          # ТОНКИЕ React-обёртки
    │   ├── use-<name>.ts
    │   ├── use-file-<name>.ts
    │   └── use-microphone-<name>.ts
    ├── constants.ts    # DEFAULT_CONFIG, PRESETS
    ├── types.ts
    └── index.ts        # ЕДИНАЯ публичная точка входа
```

### Правило разделения слоёв

| Слой | Может импортировать | НЕ может импортировать |
|------|---------------------|------------------------|
| `src/math/` | TypeScript std, `@membrana/core` (типы/ошибки/утилиты) | React, DOM, Web Audio, AudioContext, navigator |
| `src/core/` | всё из `src/math/`, `@membrana/core`, Web Audio API, DOM | React |
| `src/hooks/` | всё из `src/math/` и `src/core/`, React | — |

## Контракт публичного API

Каждый сервис обязан экспортировать из `src/index.ts`:

| Категория | Пример | Назначение |
|-----------|--------|------------|
| **Класс/функции ядра** | `FftAnalyzerService` | Создание экземпляра, чистые методы |
| **Типы** | `FftConfig`, `FftResult` | Контракты входа/выхода |
| **Хуки** | `useFftAnalyzer(config)` | Использование сервиса в React-компоненте |
| **Константы/defaults** | `DEFAULT_FFT_CONFIG` | Безопасные значения по умолчанию |

## Правило для хуков

Хуки — **тонкая обёртка**. Запрещено:

- Внутри хука писать бизнес-логику — она живёт только в `service.ts`.
- Передавать React-объекты (refs, Element) внутрь `service.ts`.
- Хранить состояние сервиса в хуке (Zustand/Context — отдельный слой; хук просто инстанцирует сервис).

Разрешено:

- Мемоизировать инстанс сервиса через `useMemo`.
- Подписываться на события сервиса через `useEffect`.
- Возвращать derived state и стабильные коллбэки.

## Сборка и потребление

**В dev:** клиент (`apps/client`) видит сервис через alias в `vite.config.ts` клиента, который указывает на `packages/services/<name>/src/index.ts`. Никакой сборки сервиса для dev не требуется.

**В prod:** `yarn build` (через Turbo) собирает каждый сервис в `dist/` через Vite в library mode. Клиент при prod-сборке тоже резолвит через alias, так что dist сервисов нужен только для внешнего потребления / тестов сервиса в изоляции.

## Параметры захвата для анализа (v0.1)

Норматив для цепочки **микрофон → `@membrana/audio-engine-service` → `@membrana/fft-analyzer-service` → analyzer-сервисы** (в т.ч. будущий `@membrana/dsp-drone-detector-service`). Задача Музыканта / подготовка к полевым тестам ([`DAY_ISSUES.md`](./DAY_ISSUES.md), Этап 1 WHITE_PAPER).

| Параметр | Значение v0.1 | Где задаётся |
|----------|---------------|--------------|
| **sampleRate** | **48 000 Гц** (целевой); **44 100 Гц** — допустимый fallback браузера/устройства | `AudioContext.sampleRate`; в telemetry при fallback — явная пометка `sampleRate` в записи |
| **fftSize / bufferSize** | **2048** (степень 2) | `LiveCaptureConfig.bufferSize` в audio-engine; `AudioAnalyzerConfig.fftSize` в fft-analyzer (`DEFAULT_CONFIG`, `DEFAULT_LIVE_CAPTURE_CONFIG`) |
| **overlap (наложение окон)** | **50 %** между соседними спектральными кадрами для **классификаторов по гармоникам** | Целевой hop = `fftSize / 2` (1024 сэмпла ≈ 21,3 мс при 48 kHz); см. [`discussions/dsp-drone-detector-v0.1.md`](./discussions/dsp-drone-detector-v0.1.md) |

**Почему 48 kHz:** Nyquist 24 kHz покрывает гармоники дрона до 2–5 kHz (WHITE_PAPER §5.1) с запасом; единый rate упрощает сравнение полевых записей и синтетических тестов.

**Почему 2048:** компромисс разрешения по частоте Δf ≈ `sampleRate / fftSize` (≈ 23,4 Гц при 48 kHz) и задержки окна; достаточно для несущей 80–250 Гц и нескольких гармоник.

**Почему 50 % overlap:** сглаживает дребезг confidence при live-потоке; соседние БПФ-кадры коррелированы — усреднение/голосование по 2–3 кадрам стабильнее, чем один снимок.

**Связанные пакеты:** [`packages/services/audio-engine/`](../packages/services/audio-engine/) (кадры `AudioSampleFrame`), [`packages/services/fft-analyzer/`](../packages/services/fft-analyzer/) (магнитуды и метрики). Analyzer **не** создаёт второй `AudioContext` — только потребляет кадры engine.

**Не путать с legacy-демо:** centroid/flux/RMS-пороги из `packages/temp/fft/` — отдельный эксперимент; production-детектор дрона — гармонический классификатор поверх magnitudes (см. ADR выше).

---

## Создание нового сервиса

1. Скопировать подходящий эталон: `audio-engine` (для foundation) или `fft-analyzer` (для analyzer).
2. Переименовать в `package.json`: `@membrana/<имя>-service`.
3. Прописать алиас в `apps/client/vite.config.ts`:
   ```ts
   '@membrana/<имя>-service': fileURLToPath(
     new URL('../../packages/services/<имя>/src/index.ts', import.meta.url),
   ),
   ```
4. Прописать `paths` в `apps/client/tsconfig.app.json` (для IDE).
5. Добавить `dependencies` в `apps/client/package.json`:
   ```json
   "@membrana/<имя>-service": "*"
   ```
6. Запустить `yarn install` — Yarn создаст симлинк.
7. Получить `LGTM` от Teamlead на PR.

## Definition of Done для нового сервиса

- [ ] Чистое ядро `service.ts` не импортирует React, DOM, Web Audio.
- [ ] Хуки в `hooks.ts` не содержат бизнес-логики (только инстанцирование и подписки).
- [ ] `src/index.ts` — единственная публичная точка входа.
- [ ] Есть `README.md` с разделами **Что делает**, **API**, **Использование**.
- [ ] Прописан alias в `apps/client/vite.config.ts` и `tsconfig.app.json`.
- [ ] `yarn typecheck` и `yarn build` проходят.
- [ ] (Желательно) есть unit-тесты на `service.ts` через Vitest.

## Эталонные сервисы

- **Foundation**: `packages/services/audio-engine/` — поставка кадров, без анализа.
- **Analyzer**: `packages/services/fft-analyzer/` — поверх engine, чистая математика + хуки.

Любое сомнение в архитектуре — сравнивай с этими двумя.
