# @membrana/agenda

Модуль управления расписанием. Предоставляет API для создания, редактирования и просмотра событий, напоминаний и календарных представлений.

## Что делает пакет

- **События** — создание, обновление, удаление, поиск.
- **Напоминания** — настройка триггеров до и после события.
- **Календарные представления** — день / неделя / месяц.
- **Повторения** — RRULE-совместимые правила.

## Зависимости

- `@membrana/core` — базовые типы, контракты, ошибки.

Не зависит от `@membrana/device-board`.

## Установка (внутри монорепо)

```json
{
  "dependencies": {
    "@membrana/agenda": "*"
  }
}
```

## Использование

```ts
import { AgendaService, type AgendaEvent } from '@membrana/agenda';

const agenda = new AgendaService();
const event: AgendaEvent = await agenda.create({
  title: 'Daily standup',
  start: Date.now(),
  durationMs: 15 * 60_000,
});
```

## Публичное API

Экспортируется из `src/index.ts`. См. JSDoc в исходниках.
