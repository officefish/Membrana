# Membrana

Модульная TypeScript-монорепо: полевой клиент, личный кабинет, аудио-анализ и обнаружение дронов на узле.

> **Стратегический контекст:** конечная цель — распределённая сеть пространственной разведки нижнего неба (обнаружение и трекинг дронов в заданном квадрате). См. [`WHITE_PAPER.md`](./WHITE_PAPER.md).  
> **Платформа:** веб-кабинет, pairing узлов, data-plane — [`docs/MEMBRANE_PLATFORM.md`](./docs/MEMBRANE_PLATFORM.md).

## Архитектура

```
membrana/
├── packages/
│   ├── core/                 # Базовые сущности, контракты, утилиты
│   ├── agenda/               # Модули, плагины, store (зависит от core)
│   ├── device-board/         # Сценарии устройств (зависит от core)
│   ├── libs/                 # Shared UI/отчёты (audioDataViz, detector-report, …)
│   ├── services/             # Автономные TS-сервисы (foundation + analyzer)
│   ├── background-office/    # NestJS: Claude, Linear, GitHub (:3000)
│   ├── background-media/     # NestJS: сэмплы + trends по deviceId (:3010, #58)
│   └── background-cabinet/   # NestJS: auth, мембраны, узлы, ключи (:3020, #67)
│
└── apps/
    ├── client/               # Vite + React — полевой клиент (:5173)
    ├── cabinet/              # SPA личного кабинета
    ├── membrana-studio/      # Electron: расширенный desktop-клиент
    └── docs/                 # Mintlify-документация (публикация отдельно)
```

**Границы:** `packages/services/*` — чистая бизнес-логика + React-хуки; `background-*` — NestJS data-plane и интеграции, **не** входят в граф сервисов. Канон: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/BACKGROUND_SERVERS.md`](./docs/BACKGROUND_SERVERS.md), [`docs/SERVICES.md`](./docs/SERVICES.md).

## Принципы

1. **Один источник истины** — общие типы и контракты живут в `@membrana/core`.
2. **Композитные сборки** — каждый пакет имеет `composite: true` в `tsconfig.json`, что ускоряет инкрементальную компиляцию.
3. **Изоляция модулей** — `agenda` и `device-board` не знают друг о друге, только о `core`.
4. **Единая точка входа** — каждый пакет экспортирует API только через `src/index.ts`.
5. **Аудио только через сервисы** — Web Audio API не вызывается из модулей напрямую; канон — `@membrana/audio-engine-service`.

## Быстрый старт

Используется **Yarn 4** (через Corepack) с `nodeLinker: node-modules`.

```bash
# Один раз — включить Corepack и активировать Yarn 4
corepack enable
corepack prepare yarn@4.5.0 --activate

# Установка зависимостей
yarn install

# Полевой клиент (Vite, http://localhost:5173)
yarn workspace @membrana/client dev

# Личный кабинет (SPA)
yarn cabinet:app:dev

# Все пакеты в dev-режиме (Turbo)
yarn dev

# Сборка, типы, линт, тесты
yarn build
yarn typecheck
yarn lint
yarn test

# Полный CI-контур локально
yarn turbo run lint typecheck test build --continue
yarn check:boundaries
```

### Фоновые серверы (опционально)

| Сервер | Команда | Порт | Назначение |
|--------|---------|------|------------|
| office | `yarn office:dev` | 3000 | Claude, Linear, GitHub |
| media | `yarn media:db:up` → `yarn media:migrate` → `yarn media:dev` | 3010 | Sample library, trends |
| cabinet | `yarn cabinet:db:up` → `yarn cabinet:migrate` → `yarn cabinet:dev` | 3020 | Auth, мембраны, pairing |

Подробнее: [`docs/BACKGROUND_SERVERS.md`](./docs/BACKGROUND_SERVERS.md). Клиент работает без `.env` и без серверов (localStorage / IndexedDB).

## Ритм разработки (утро / вечер / неделя)

Подробный регламент: **[`docs/DEVELOPER_RHYTHM.md`](./docs/DEVELOPER_RHYTHM.md)**.

| Когда | Что запустить |
|-------|----------------|
| **Утро** | `yarn morning-care` → `yarn plan:day` → `yarn standup` → **`yarn main-day-issue`** (учитывает вчерашний `DAILY_CODE_REVIEW.md`) |
| **Вечер** | **`yarn archive:daily-day`** → **`yarn code-review`** → `yarn task:archive <id>` → `yarn save-code-review` → `yarn task:close-github` |
| **Неделя** | `yarn analyzers:research:week` → `yarn plan:week` |
| **По ситуации** | `yarn consilium "…"` (консенсус всех ролей), `yarn ask <persona> …` (совет одной роли) |
| **Триаж issues** | `yarn issues:audit --manifest docs/issues/manifests/github-issues-audit-YYYY-MM-DD.json` |

Для скриптов с Claude нужен `ANTHROPIC_API_KEY` в `.env`. Утро: `yarn ritual:day`. Вечер: `yarn ritual:evening` (сначала архив плана/стендапа/фокуса, затем code-review). Code-review **не** утром. Фокус дня: `docs/MAIN_DAY_ISSUE.md`. Архив: [`docs/archive/README.md`](./docs/archive/README.md).

## Полезные yarn-команды

```bash
# Добавить зависимость в конкретный пакет
yarn workspace @membrana/agenda add some-lib
yarn workspace @membrana/client add -D @types/some-lib

# Выполнить любую команду из конкретного пакета
yarn workspace @membrana/client <script>

# Выполнить во ВСЕХ пакетах сразу
yarn workspaces foreach -A run build
```

## Структура пакетов

| Слой | Пакеты | Зависимости |
|------|--------|-------------|
| **Core** | `@membrana/core` | — |
| **Client libs** | `@membrana/agenda`, `@membrana/device-board` | `@membrana/core` |
| **Shared libs** | `packages/libs/*` (`audioDataViz`, `detector-report`, `journal-report-views`) | по пакету |
| **Services** | `packages/services/*` — foundation + analyzer | см. [`packages/services/README.md`](./packages/services/README.md) |
| **Background** | `background-office`, `background-media`, `background-cabinet` | NestJS, см. [`docs/BACKGROUND_SERVERS.md`](./docs/BACKGROUND_SERVERS.md) |
| **Apps** | `@membrana/client`, `@membrana/cabinet`, `@membrana/membrana-studio` | зависят от libs/services по сценарию |

## Инструменты разработки

- **TypeScript 5.4+** с project references
- **Turbo** для оркестрации задач в монорепо
- **ESLint + Prettier** для качества кода
- **Cursor** — правила в [`.cursorrules`](./.cursorrules) и [`AGENTS.md`](./AGENTS.md)

## Виртуальная команда AI (аудио / архитектура / UI)

Промпты и нормативные документы для оркестрации ролей (Teamlead, структурщик, математик, музыкант, верстальщик) лежат в каталоге [`docs/`](./docs/README.md). Ритм вызова скриптов — [`docs/DEVELOPER_RHYTHM.md`](./docs/DEVELOPER_RHYTHM.md).

В GitHub Actions доступен ручной запуск workflow **Virtual team context** (`.github/workflows/virtual-team-context.yml`): в summary появятся пути к файлам и чеклист для агента.

## Документация

| Куда | Что |
|------|-----|
| [`docs/README.md`](./docs/README.md) | Навигация по нормативным документам |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Границы пакетов, плагины, аудио-слои |
| [`docs/MEMBRANE_PLATFORM.md`](./docs/MEMBRANE_PLATFORM.md) | Кабинет, pairing, SKU (web / Studio / Device) |
| [`packages/services/README.md`](./packages/services/README.md) | Каталог сервисов и детекторов |
| `apps/docs/` | Mintlify-сайт (dev: `yarn workspace @membrana/docs dev`) |
| Каждый пакет | Свой `README.md` с API и примерами |
