/**
 * Зубы общего ядра управляемой сборки мусора (#2204).
 *
 * Несущий вещдок — 22.08: в буфере нашлись восемь проб, на которые ссылается приёмочный
 * документ закрытого спринта, и они не помечены никак. «Самые ранние» бьют по ним первыми.
 * Порча этих зубов = молчаливое удаление вещдока, поэтому они здесь, у ядра, а не у дома.
 */
import { describe, expect, it } from 'vitest';

import {
  BUFFER_CLEANUP_PRINCIPLES,
  BUFFER_CLEANUP_VOLUMES,
  describeCleanupPlan,
  isBufferCleanupVolume,
  isPinnedByHuman,
  planBufferCleanup,
  type SampleReference,
} from '../src/buffer-cleanup.js';
import type { MediaSample } from '../src/types.js';

const MB = 1048576;

function sample(over: Partial<MediaSample> & { id: string }): MediaSample {
  return {
    collectionId: 'buffer',
    title: over.id,
    class: 'unknown',
    label: 'unlabeled',
    source: 'mic-recording',
    durationSec: 12,
    sampleRate: 48000,
    channels: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    storageRef: `ref/${over.id}`,
    sizeBytes: MB,
    ...over,
  } as MediaSample;
}

/** Буфер из n проб: день d, минута i — порядок в массиве НЕ совпадает с порядком времени. */
function buffer(n: number): MediaSample[] {
  const made = Array.from({ length: n }, (_, i) =>
    sample({
      id: `s${String(i).padStart(3, '0')}`,
      createdAt: new Date(Date.UTC(2026, 7, 1, 0, i)).toISOString(),
      sizeBytes: MB,
    }),
  );
  return made.reverse(); // дом отдаёт как отдаёт; ключ отбора — время, не индекс
}

describe('словари ручек человека', () => {
  it('два принципа и четыре объёма — закрытые списки заказа владельца 27.08', () => {
    expect(BUFFER_CLEANUP_PRINCIPLES.map((p) => p.value)).toEqual(['oldest', 'newest']);
    expect([...BUFFER_CLEANUP_VOLUMES]).toEqual([20, 50, 100, 200]);
  });
});

describe('отбор по принципу и объёму', () => {
  it('«самые ранние, 100» берёт ровно 100 самых старых по времени, а не первые 100 массива', () => {
    const plan = planBufferCleanup(buffer(300), { principle: 'oldest', volume: 100 });
    expect(plan.doomed).toHaveLength(100);
    expect(plan.doomed[0]?.id).toBe('s000');
    expect(plan.doomed[99]?.id).toBe('s099');
    expect(plan.remaining).toBe(200);
    expect(plan.shortfall).toBeNull();
  });

  it('«самые поздние» разворачивают порядок — это другой отбор, не тот же список наоборот', () => {
    const plan = planBufferCleanup(buffer(300), { principle: 'newest', volume: 20 });
    expect(plan.doomed[0]?.id).toBe('s299');
    expect(plan.doomed.map((s) => s.id)).not.toContain('s000');
  });

  it('мегабайты — следствие счёта: план называет объём, но выбором остаётся счёт', () => {
    const plan = planBufferCleanup(buffer(50), { principle: 'oldest', volume: 20 });
    expect(plan.freedBytes).toBe(20 * MB);
    expect(describeCleanupPlan(plan)).toMatch(/удалить 20 самых ранних · освободится 20\.0 МБ · останется 30/);
  });

  it('буфер короче запроса — недобор НАЗВАН, а не выдан за выполненный объём', () => {
    const plan = planBufferCleanup(buffer(7), { principle: 'oldest', volume: 100 });
    expect(plan.doomed).toHaveLength(7);
    expect(plan.shortfall).toMatch(/набралось 7 из 100/);
  });
});

describe('вещдоки (22.08): ссылка защищает пробу и называет, кто ссылается', () => {
  const refs: readonly SampleReference[] = Array.from({ length: 8 }, (_, i) => ({
    sampleId: `s00${i}`,
    referencedBy: 'docs/acceptance/sprint-closed.md',
  }));

  it('восемь помянутых проб НЕ попадают в удаление, хотя они самые ранние', () => {
    const plan = planBufferCleanup(buffer(300), { principle: 'oldest', volume: 100, references: refs });
    const doomedIds = new Set(plan.doomed.map((s) => s.id));
    for (let i = 0; i < 8; i += 1) expect(doomedIds.has(`s00${i}`)).toBe(false);
  });

  it('защищённые названы отдельно с причиной — не выброшены молча', () => {
    const plan = planBufferCleanup(buffer(300), { principle: 'oldest', volume: 100, references: refs });
    expect(plan.protectedOut).toHaveLength(8);
    expect(plan.protectedOut[0]?.why).toContain('docs/acceptance/sprint-closed.md');
    expect(describeCleanupPlan(plan)).toMatch(/защищено 8/);
  });

  it('объём добирается следующими по времени: 100 запрошено — 100 и уйдёт, но других', () => {
    const plan = planBufferCleanup(buffer(300), { principle: 'oldest', volume: 100, references: refs });
    expect(plan.doomed).toHaveLength(100);
    expect(plan.doomed[0]?.id).toBe('s008');
    expect(plan.shortfall).toBeNull();
  });

  it('защита пометкой человека: метка или заметка «хранить» держат пробу так же, как ссылка', () => {
    expect(isPinnedByHuman(sample({ id: 'a', notes: 'keep for demo' }))).toBe(true);
    expect(isPinnedByHuman(sample({ id: 'b', notes: 'не удалять — образец' }))).toBe(true);
    expect(isPinnedByHuman(sample({ id: 'c', label: 'drone' }))).toBe(true);
    expect(isPinnedByHuman(sample({ id: 'd' }))).toBe(false);
  });

  it('пометка человека защищает В ОТБОРЕ, а не только в предикате: помеченная ранняя проба не уйдёт', () => {
    const all = buffer(50);
    const earliest = all.find((s) => s.id === 's000');
    const marked = all.map((s) => (s.id === 's000' ? { ...s, notes: 'keep — образец для приёмки' } : s));
    expect(earliest).toBeDefined();
    const plan = planBufferCleanup(marked, { principle: 'oldest', volume: 10 });
    expect(plan.doomed.map((s) => s.id)).not.toContain('s000');
    expect(plan.doomed[0]?.id).toBe('s001');
    expect(plan.protectedOut.map((s) => s.id)).toContain('s000');
    expect(plan.protectedOut[0]?.why).toMatch(/помечена человеком/);
  });

  it('весь буфер защищён — уйдёт ноль, и это сказано вслух', () => {
    const all = buffer(5);
    const plan = planBufferCleanup(all, {
      principle: 'oldest',
      volume: 100,
      references: all.map((s) => ({ sampleId: s.id, referencedBy: 'docs/x.md' })),
    });
    expect(plan.doomed).toHaveLength(0);
    expect(plan.freedBytes).toBe(0);
    expect(plan.shortfall).toMatch(/5 защищено/);
  });
});

describe('края, названные ревью #2207', () => {
  it('непрочитанное время — защита, а не место «где придётся»: такая проба не уходит под нож', () => {
    const all = [...buffer(30), sample({ id: 'broken', createdAt: 'позавчера' })];
    const plan = planBufferCleanup(all, { principle: 'oldest', volume: 30 });
    expect(plan.doomed.map((s) => s.id)).not.toContain('broken');
    expect(plan.protectedOut.map((s) => s.id)).toContain('broken');
    expect(plan.protectedOut.find((s) => s.id === 'broken')?.why).toMatch(/время создания не прочитано/);
  });

  it('объём судится словарём, а не доверием: 17 не из словаря, 100 — из словаря', () => {
    expect(isBufferCleanupVolume(100)).toBe(true);
    expect(isBufferCleanupVolume('50')).toBe(true); // форма дома отдаёт строкой
    expect(isBufferCleanupVolume(17)).toBe(false);
    expect(isBufferCleanupVolume(null)).toBe(false);
  });
});

describe('план — не удаление', () => {
  it('исходный массив не тронут: ядро отдаёт намерение, исполняет дом после «да»', () => {
    const src = buffer(10);
    const copy = src.map((s) => s.id);
    planBufferCleanup(src, { principle: 'oldest', volume: 5 });
    expect(src.map((s) => s.id)).toEqual(copy);
  });
});
