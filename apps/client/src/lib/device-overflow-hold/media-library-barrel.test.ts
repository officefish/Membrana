/**
 * Зуб адаптера C-2 (контракт интеграции `cowork-buffer-full-stop`): барель
 * `@membrana/media-library-service` отдаёт разбор отказа и его типы прямым импортом — клиент
 * больше не выводит `SampleRefusal` из сигнатуры `onSampleRefusal`.
 *
 * Предмет — `packages/services/media-library/src/index.ts` (vitest резолвит пакет в исходники
 * через alias). Порча: снять строку `parseSampleRefusal,` из бареля → красный. Типовые строки
 * бареля (`SampleRefusal`, `SampleUploadGate`) через свёрнутый `dist/index.d.ts` порчей не
 * ловятся (api-extractor поднимает тип, достижимый через `SampleRefusalListener`) — это
 * названное ограничение, поэтому судится рантайм-экспорт, а типы — `tsc` клиента на `wiring.ts`.
 */
import { describe, expect, it } from 'vitest';

import * as barrel from '@membrana/media-library-service';
import { isBufferOverflowRefusal } from '@membrana/plugin-contracts';

import { toOverflowRefusalSnapshot } from './wiring';

describe('C-2: барель media-library несёт разбор отказа', () => {
  it('parseSampleRefusal экспортирован барелем и разбирает тело отказа', () => {
    expect(typeof barrel.parseSampleRefusal).toBe('function');
    const body = {
      ok: false,
      reason: 'device_buffer_full',
      buffer: { usedBytes: 1, limitBytes: 1 },
      userStorage: { usedBytes: 0, limitBytes: 1 },
      overflowPolicy: 'stop',
      overflowId: 'ovf-1',
      overflowAt: '2026-09-05T21:40:18.000Z',
    };
    const refusal = barrel.parseSampleRefusal(body);
    expect(refusal?.reason).toBe('device_buffer_full');
    expect(isBufferOverflowRefusal(refusal?.raw)).toBe(true);
    expect(toOverflowRefusalSnapshot(refusal!)?.overflowId).toBe('ovf-1');
  });
});
