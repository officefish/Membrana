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

```
@membrana/core
   │
   └── @membrana/services/<name>   ← один сервис
            │
            ├── используется в @membrana/agenda / device-board (опционально)
            └── используется в apps/client (через хуки в плагинах и модулях)
```

**Запреты:**

- Сервис **не зависит** от других сервисов. Если возникла нужда — переноси общий код в `@membrana/core`.
- Сервис **не зависит** от `@membrana/agenda` / `@membrana/device-board` / `apps/client`. Только наоборот.
- Сервис **не импортирует** React-компоненты — только React API (`useState`, `useEffect`, …).

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

**Папочная (для сложных сервисов, эталон — `audio-analyzer`):**

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

## Создание нового сервиса

1. Скопировать `packages/services/_template/` (если он есть) или взять `audio-analyzer` как образец.
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

## Эталонный сервис

См. `packages/services/audio-analyzer/` — образцовый пример. Любое сомнение в архитектуре — сравнивай с ним.
