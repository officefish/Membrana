# @membrana/telemetry-journal-service

Foundation-сервис **live-журнала телеметрии** (эпик TJ1–TJ6).

## Что делает

- Канонические DTO: `LiveJournalItem` (`kind: track | report`)
- Schema трека: `telemetry-track/v1`
- Port `IJournalStorageBackend` + memory backend (browser-limited fallback)
- `SyncJournalStorageBackend` — local cache + cabinet push/pull (TJ2)
- `ICabinetJournalPort` + mappers for MP5 `TelemetryReport` / `TelemetryLiveRecord`
- Electron FS stub backend (TJ2)
- `LiveJournalService` — append track/report, snapshot, filters
- Фильтры UI: `all | tracks | reports | detections`

## Установка

Workspace-зависимость: `"@membrana/telemetry-journal-service": "*"`.

## Использование

```ts
import {
  TELEMETRY_TRACK_SCHEMA_VERSION,
  createLiveJournalService,
  createMemoryJournalStorageBackend,
  liveJournalTrackClientEntryId,
} from '@membrana/telemetry-journal-service';

const service = createLiveJournalService(createMemoryJournalStorageBackend());
await service.init();

await service.appendTrack({
  clientEntryId: liveJournalTrackClientEntryId('track-uuid'),
  moduleId: 'microphone-mod',
  moduleName: 'microphone',
  track: {
    schema: TELEMETRY_TRACK_SCHEMA_VERSION,
    trackId: 'track-uuid',
    sampleId: 'sample-uuid',
    title: 'mic-auto-5s',
    durationSec: 5,
    sampleRate: 48_000,
    captureMode: 'auto',
    createdAtIso: new Date().toISOString(),
  },
});
```

## API

| Export | Назначение |
|--------|------------|
| `LiveJournalService` | CRUD snapshot поверх backend |
| `IJournalStorageBackend` | Server / electron / memory |
| `matchesLiveJournalFilter` | Фильтры журнала |
| `liveJournalTrackClientEntryId` | Dedupe key для трека |

Промпт эпика: `docs/prompts/TELEMETRY_JOURNAL_LIVE_EPIC_PROMPT.md`.
