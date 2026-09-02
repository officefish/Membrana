/**
 * Исполняемые стабы соседних блоков коворка `cowork-library-open-api` — ТОЛЬКО для зубов
 * блока `contract`. Чужого кода не импортируют, в production graph не входят, на интеграции
 * удаляются. Стаб, доживший до прода, — дефект интеграции.
 */

import type { AccessOutcome } from '../src/open-api/errors.js';
import type { PageNumbers } from '../src/open-api/page-envelope.js';
import type { TrackKeyGrant } from '../src/open-api/temporary-key.js';
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
 * Стаб блока ключа и срока (M3). Отдаёт выдачу — адрес и срок.
 *
 * `undefined` больше НЕ отдаётся: по решению консилиума поле ключа обязательное, и «ключ не
 * выдан» — это отказ ЗАПРОСА, а не проба без поля. Стаб, умеющий вернуть `undefined`, учил бы
 * зубы жить с формой, которой контракт не допускает.
 */
export function stubTrackKeyIssuer(): (sampleId: string) => TrackKeyGrant {
  return (sampleId: string): TrackKeyGrant => ({
    url: `https://library.example/k/${sampleId}/opaque-token`,
    expiresAt: '2026-09-02T12:15:00.000Z',
  });
}

/**
 * Тот же стаб для случая СНЯТОГО срока: `expiresAt === null`.
 *
 * Единственный законный источник `null` — подписанное движение владельца (`source: 'lifted'`
 * у соседа). Отдельный стаб нужен затем, чтобы зуб проверял именно эту форму, а не получал
 * `null` случайно.
 */
export function stubLiftedTrackKeyIssuer(): (sampleId: string) => TrackKeyGrant {
  return (sampleId: string): TrackKeyGrant => ({
    url: `https://library.example/k/${sampleId}/opaque-token`,
    expiresAt: null,
  });
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
