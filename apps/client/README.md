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
Любая новая бизнес-логика должна жить в соответствующем пакете (`agenda`, `device-board`) или
в новом пакете при необходимости.
