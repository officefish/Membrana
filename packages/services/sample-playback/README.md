# @membrana/sample-playback-service

Shared playback hub for sample library UI (`apps/client`, `apps/cabinet`).

## Что делает

- Singleton `BufferPlayer` via `@membrana/audio-engine-service`
- Waveform peak envelope (512 points)
- React hook `useSamplePlayback()`

## Использование

```typescript
import {
  bindSamplePlaybackBlobReader,
  selectSample,
  togglePlayPause,
  useSamplePlayback,
} from '@membrana/sample-playback-service';
```

## API

See `src/index.ts`.
