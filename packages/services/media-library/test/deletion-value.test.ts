/**
 * Зубы гипотезы ценности (#2218).
 *
 * Порча, названная владельцем: подсунуть в удаление запись из именованного набора — окно
 * обязано назвать её ценной ПОИМЁННО, а не общей фразой «возможно, что-то важное».
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  EVIDENCE_WINDOWS,
  assessDeletion,
  assessDeletionValue,
  evidenceWindowOf,
} from '../src/deletion-value.js';
import type { Collection, MediaSample } from '../src/types.js';

const DEVICE = '1c04f0bc-29b0-4d3f-a437-d87dc879579d';

function sample(patch: Partial<MediaSample> = {}): MediaSample {
  return {
    id: 'id-1',
    collectionId: '__buffer__',
    title: 'MakeTrack 1',
    class: 'buffer',
    label: 'unlabeled',
    source: 'mic-recording',
    durationSec: 5,
    sampleRate: 48_000,
    channels: 1,
    createdAt: '2026-08-26T19:10:43.144Z',
    storageRef: 'ref.wav',
    sizeBytes: 460_000,
    ...patch,
  };
}

const collections: Collection[] = [
  { id: '__buffer__', name: 'Buffer', kind: 'buffer', createdAt: '', updatedAt: '' },
  { id: 'col-night', name: 'Ночное дежурство 23 августа', kind: 'user', createdAt: '', updatedAt: '' },
  { id: '__tariff__', name: 'Базовый набор (free-v1)', kind: 'system', createdAt: '', updatedAt: '' },
];

describe('гипотеза ценности перед удалением', () => {
  it('ПОРЧА ВЛАДЕЛЬЦА: запись из именованного набора названа ценной ПОИМЁННО', () => {
    const v = assessDeletionValue(sample({ collectionId: 'col-night' }), { collections, deviceId: DEVICE });
    expect(v.level).toBe('curated');
    expect(v.why).toContain('Ночное дежурство 23 августа');
    expect(v.why).toContain('положили руками');
  });

  it('запись из объявленного окна вещдока названа вещдоком и называет документ', () => {
    const v = assessDeletionValue(sample({ createdAt: '2026-08-23T18:24:03.788Z' }), { deviceId: DEVICE });
    expect(v.level).toBe('evidence');
    expect(v.why).toContain('night-duty-2026-08-23');
    expect(v.why).toContain('docs/field/2026-08-23-night-duty-journal-congestion.md');
  });

  it('пометка человека «хранить» сильнее всего остального', () => {
    const v = assessDeletionValue(sample({ notes: 'keep: вещдок' }), { collections });
    expect(v.level).toBe('evidence');
    expect(v.why).toContain('хранить');
  });

  it('разметка на дрон делает пробу разобранной, но не вещдоком', () => {
    const v = assessDeletionValue(sample({ label: 'drone' }), { collections });
    expect(v.level).toBe('curated');
    expect(v.why).toContain('дрон');
  });

  it('рядовая проба лотка названа рядовой СЛОВАМИ, а не молчанием', () => {
    const v = assessDeletionValue(sample(), { collections, deviceId: DEVICE });
    expect(v.level).toBe('ordinary');
    expect(v.why).toContain('рядовая проба');
    expect(v.why.length).toBeGreaterThan(20);
  });

  it('окно чужого устройства не притягивает пробу', () => {
    const v = evidenceWindowOf({ createdAt: '2026-08-23T18:24:03.788Z' }, 'другое-устройство');
    expect(v).toBeNull();
  });

  it('границы окна включительные', () => {
    expect(evidenceWindowOf({ createdAt: '2026-08-23T18:00:00.000Z' }, DEVICE)?.id).toBe('night-duty-2026-08-23');
    expect(evidenceWindowOf({ createdAt: '2026-08-23T19:40:00.000Z' }, DEVICE)?.id).toBe('night-duty-2026-08-23');
    expect(evidenceWindowOf({ createdAt: '2026-08-23T19:40:00.001Z' }, DEVICE)).toBeNull();
  });
});

describe('свод для окна подтверждения', () => {
  it('ценные идут первыми — худшее видно сверху, а не прокруткой', () => {
    const s = assessDeletion(
      [
        sample({ id: 'a' }),
        sample({ id: 'b', collectionId: 'col-night' }),
        sample({ id: 'c', createdAt: '2026-08-23T18:30:00.000Z' }),
      ],
      { collections, deviceId: DEVICE },
    );
    expect(s.verdicts.map((v) => v.id)).toEqual(['c', 'b', 'a']);
    expect(s.evidence).toBe(1);
    expect(s.curated).toBe(1);
    expect(s.ordinary).toBe(1);
  });

  it('шапка говорит числом и не скрывает вещдоков', () => {
    const s = assessDeletion([sample({ createdAt: '2026-08-23T18:30:00.000Z' })], { deviceId: DEVICE });
    expect(s.headline).toContain('Уйдёт безвозвратно 1');
    expect(s.headline).toContain('вещдоков: 1');
  });

  it('когда ценных нет — так и сказано, а не пустой строкой', () => {
    const s = assessDeletion([sample()], { collections, deviceId: DEVICE });
    expect(s.headline).toContain('ценных среди них не найдено');
  });

  it('пустой список не притворяется удалением', () => {
    const s = assessDeletion([], {});
    expect(s.total).toBe(0);
    expect(s.headline).toContain('0');
  });
});

describe('окна вещдоков — одна правда, два носителя', () => {
  it('ЗЕРКАЛО: константа ядра совпадает с реестром docs/field/evidence-windows.json', () => {
    // Скрипты читают JSON, дома читают константу. Разойдутся — окно подтверждения и
    // проверка ссылок станут судить одну и ту же пробу по-разному.
    const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
    const registry = JSON.parse(
      readFileSync(resolve(repo, 'docs/field/evidence-windows.json'), 'utf8'),
    ) as { windows: Array<Record<string, string>> };

    const fromJson = registry.windows.map((w) => `${w.id}|${w.deviceId}|${w.from}|${w.to}|${w.doc}`).sort();
    const fromCore = EVIDENCE_WINDOWS.map((w) => `${w.id}|${w.deviceId}|${w.from}|${w.to}|${w.doc}`).sort();
    expect(fromCore).toEqual(fromJson);
  });
});
