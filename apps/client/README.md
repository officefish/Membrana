# @membrana/client

Клиентское приложение Membrana. Объединяет модули `@membrana/agenda` и `@membrana/device-board`, использует базовые типы из `@membrana/core`.

## Зависимости

- `@membrana/core`
- `@membrana/agenda`
- `@membrana/device-board`

## Запуск

```bash
# Из корня монорепо
npm run dev --workspace=@membrana/client

# Или из папки apps/client
npm run dev
```

## Структура

```
src/
└── main.ts        # Точка входа приложения
```

## Архитектура

Клиент — это **композиционный слой**: он не содержит бизнес-логики, а связывает сервисы из пакетов.

## Логи (browser / dev)

В браузере device-board trace — только **Console**; для отладки paste в `logs/apps/client/logs.txt` (gitignored). Парсер: `yarn logs:parse`.

**Настольные** Membrana Studio и Membrana Device — отдельная политика путей и support: [`docs/DESKTOP_APP_LOGGING_POLICY.md`](../../docs/DESKTOP_APP_LOGGING_POLICY.md). Studio README: [`../membrana-studio/README.md`](../membrana-studio/README.md).
Любая новая бизнес-логика должна жить в соответствующем пакете (`agenda`, `device-board`) или
в новом пакете при необходимости.
