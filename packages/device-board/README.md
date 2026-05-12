# @membrana/device-board

Модуль управления устройствами. Учёт инвентаря, состояния, телеметрии и команд.

## Что делает пакет

- **Устройства** — регистрация, обновление метаданных.
- **Состояние** — online/offline, health, последняя активность.
- **Команды** — отправка команд на устройство.
- **Телеметрия** — приём и хранение метрик.

## Зависимости

- `@membrana/core` — базовые типы, контракты, ошибки.

Не зависит от `@membrana/agenda`.

## Установка (внутри монорепо)

```json
{
  "dependencies": {
    "@membrana/device-board": "*"
  }
}
```

## Использование

```ts
import { DeviceBoardService, type Device } from '@membrana/device-board';

const board = new DeviceBoardService();
const device = board.register({
  name: 'Thermostat-01',
  kind: 'thermostat',
});
```

## Публичное API

Экспортируется из `src/index.ts`. См. JSDoc в исходниках.
