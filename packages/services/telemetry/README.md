# @membrana/telemetry-service

Foundation-сервис: **буфер записей телеметрии** (анализ, события, старт/стоп модулей), подписка для UI, лимит размера, дедупликация отчётов по ключу из `data`.

## Зависимости

- `@membrana/core` — логгер.
- `react` — peer, только для `useTelemetryJournal`.

## Что не делает

- Нет `localStorage` / `persist` в v1 (только память вкладки).
- Нет React-компонентов журнала — их подключает клиентский модуль.

## Схема записи

Поле `schemaVersion` на каждой записи (`TELEMETRY_ENTRY_SCHEMA_VERSION`). При несовместимом изменении формы полей журнала — поднять версию и описать миграцию в CHANGELOG пакета.

## API (ядро)

- `createTelemetryJournal(config?)` — отдельный инстанс (тесты, изоляция).
- `getDefaultTelemetryJournal()` — синглтон на вкладку.
- `TelemetryJournal`: `registerModule`, `unregisterModule`, `addEntry`, `addReportEntry`, `getEntries`, `getEntriesByModule`, `getEntriesByType`, `clearEntries`, `clearOldEntries`, `getStats`, `subscribe`, `getSnapshot`.

`addReportEntry` требует в `data` строковый `reportUniqueId` или `id` (строка/число); дубликаты по этому ключу отбрасываются. При вытеснении старых записей из-за лимита буфера ключ удаляется из множества дедупа, отчёт можно добавить снова.

## API (React)

```ts
import { useTelemetryJournal, createTelemetryJournal } from '@membrana/telemetry-service';
import { useMemo } from 'react';

function Panel() {
  const journal = useMemo(() => createTelemetryJournal(), []);
  const { snapshot, journal: j } = useTelemetryJournal(journal);

  // snapshot.entries, snapshot.modules, snapshot.version
  // j.addEntry({ ... })
}
```

## Сборка

Из корня монорепо: `yarn workspace @membrana/telemetry-service build`.
