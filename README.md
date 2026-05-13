# Membrana

Модульная монорепо-платформа на TypeScript для управления расписанием и устройствами.

> **Стратегический контекст:** конечная цель проекта — распределённая сеть пространственной разведки нижнего неба (обнаружение и трекинг дронов в заданном квадрате). См. [`WHITE_PAPER.md`](./WHITE_PAPER.md).

## Архитектура

```
membrana/
├── packages/         # Переиспользуемые библиотеки
│   ├── core/         # Базовые сущности, контракты, утилиты
│   ├── agenda/       # Модуль расписания (зависит от core)
│   └── device-board/ # Модуль устройств (зависит от core)
│
└── apps/
    └── client/       # Клиентское приложение
```

## Принципы

1. **Один источник истины** — общие типы и контракты живут в `@membrana/core`.
2. **Композитные сборки** — каждый пакет имеет `composite: true` в `tsconfig.json`, что ускоряет инкрементальную компиляцию.
3. **Изоляция модулей** — `agenda` и `device-board` не знают друг о друге, только о `core`.
4. **Единая точка входа** — каждый пакет экспортирует API только через `src/index.ts`.

## Быстрый старт

Используется **Yarn 4** (через Corepack) с `nodeLinker: node-modules`.

```bash
# Один раз — включить Corepack и активировать Yarn 4
corepack enable
corepack prepare yarn@4.5.0 --activate

# Установка зависимостей
yarn install

# Запуск клиента в dev-режиме (Vite, http://localhost:5173)
yarn workspace @membrana/client dev

# Запуск всех пакетов в dev-режиме (через Turbo)
yarn dev

# Сборка всех пакетов
yarn build

# Проверка типов
yarn typecheck

# Линтинг
yarn lint

# Тесты
yarn test
```

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

| Пакет | Описание | Зависимости |
|-------|----------|-------------|
| `@membrana/core` | Базовые типы, утилиты, контракты | — |
| `@membrana/agenda` | Управление расписанием | `@membrana/core` |
| `@membrana/device-board` | Управление устройствами | `@membrana/core` |
| `@membrana/client` | Клиентское приложение | все вышеперечисленные |

## Инструменты разработки

- **TypeScript 5.4+** с project references
- **Turbo** для оркестрации задач в монорепо
- **ESLint + Prettier** для качества кода
- **Cursor / Claude** — правила в `.cursorrules` и `.claude/`

## Виртуальная команда AI (аудио / архитектура UI)

Промпты и нормативные документы для оркестрации ролей (Teamlead, структурщик, математик, музыкант, верстальщик) лежат в каталоге [`docs/`](./docs/README.md). В GitHub Actions доступен ручной запуск workflow **Virtual team context** (`.github/workflows/virtual-team-context.yml`): в summary появятся пути к файлам и чеклист для агента.

## Документация по пакетам

Каждый пакет содержит свой `README.md` с описанием API и примерами использования.
