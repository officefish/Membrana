/**
 * Исполняемые стабы соседних блоков коворка `cowork-library-open-api` — ТОЛЬКО для зубов
 * блока `contract`. Чужого кода не импортируют, в production graph не входят, на интеграции
 * удаляются. Стаб, доживший до прода, — дефект интеграции.
 */

import type { AccessOutcome } from '../src/open-api/errors.js';
import type { PageNumbers } from '../src/open-api/page-envelope.js';
import type { MediaSample } from '../src/types.js';

/**
 * Стаб блока оси владения (M1). Три исхода, не булево: `absent` → 404, `forbidden` → 403.
 * Блок `contract` не знает, чем считается владение, и знать не обязан.
 */
export function stubOwnershipDecision(
  known: ReadonlySet<string>,
  owned: ReadonlySet<string>,
): (resourceId: string) => AccessOutcome {
  return (resourceId: string): AccessOutcome => {
    if (!known.has(resourceId)) return 'absent';
    return owned.has(resourceId) ? 'allow' : 'forbidden';
  };
}

/**
 * Стаб блока ключа и срока (M3). Отдаёт непрозрачную строку либо `undefined` — поле ключа
 * необязательно. Форма значение не разбирает.
 */
export function stubTemporaryKeyIssuer(
  issuedFor: ReadonlySet<string>,
): (sampleId: string) => string | undefined {
  return (sampleId: string): string | undefined =>
    issuedFor.has(sampleId) ? `https://library.example/k/${sampleId}/opaque-token` : undefined;
}

/** Стаб блока границ выемки (M4): нарезка страницы и `total` всего множества. */
export function stubPageSlice<T>(
  all: readonly T[],
  page: number,
  limit: number,
): { readonly slice: readonly T[]; readonly numbers: PageNumbers } {
  const start = (page - 1) * limit;
  return {
    slice: all.slice(start, start + limit),
    numbers: { total: all.length, page, limit },
  };
}

/** Внутренняя проба со ВСЕМИ полями, включая `storageRef` и `notes`. */
export function internalSample(id: string, overrides: Partial<MediaSample> = {}): MediaSample {
  return {
    id,
    collectionId: 'collection-1',
    title: `MakeTrack ${id}`,
    class: 'unclassified',
    label: 'unlabeled',
    source: 'mic-recording',
    durationSec: 12.5,
    sampleRate: 48000,
    channels: 1,
    createdAt: '2026-09-02T10:00:00.000Z',
    storageRef: `/var/lib/media/blobs/${id}.wav`,
    notes: 'человек записал: ночная смена, ветер',
    sizeBytes: 1_200_000,
    ...overrides,
  };
}

export function internalSamples(count: number): MediaSample[] {
  return Array.from({ length: count }, (_unused, index) => internalSample(`sample-${index + 1}`));
}
