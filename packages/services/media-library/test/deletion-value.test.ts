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
  DELETION_GATE_CLOSED,
  EVIDENCE_WINDOWS,
  assessDeletion,
  assessDeletionValue,
  deletionGateReducer,
  evidenceWindowOf,
  isDeletionBlocked,
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

  it('ПОРЧА: проба, уехавшая из набора в набор, ОСТАЁТСЯ разобранной руками', () => {
    // Оговорка владельца к переносу набор→набор: запись, уехавшая из именованного набора в
    // другой, не должна стать рядовой и потерять защиту при уборке.
    //
    // Держит это не память автора, а форма правила: ступень берётся по ТЕКУЩЕМУ набору пробы,
    // а не по истории переездов, и `moveTargets` в обоих домах исключает буфер и системные —
    // значит адресат всегда пользовательский. Зуб пришпиливает оба конца: начни кто-нибудь
    // считать ступень по происхождению — покраснеет здесь.
    const cols: Collection[] = [
      ...collections,
      { id: 'col-listening', name: 'Разбор на слух 21 августа', kind: 'user', createdAt: '', updatedAt: '' },
    ];
    const before = assessDeletionValue(sample({ collectionId: 'col-night' }), { collections: cols, deviceId: DEVICE });
    const after = assessDeletionValue(sample({ collectionId: 'col-listening' }), { collections: cols, deviceId: DEVICE });

    expect(before.level).toBe('curated');
    expect(after.level, 'переезд между наборами не делает пробу рядовой').toBe('curated');
    // Довод называет НОВЫЙ набор: человеку нужно, где проба лежит сейчас, а не где лежала.
    expect(after.why).toContain('Разбор на слух 21 августа');
    expect(after.why).toContain('положили руками');
  });

  it('перенос из буфера в набор ПОДНИМАЕТ ступень, а не только сохраняет', () => {
    // Обратная сторона той же формы: рядовая проба лотка, уехав в именованный набор, становится
    // разобранной. Иначе разбор улова не менял бы в защите ничего — а он и есть разбор.
    const inBuffer = assessDeletionValue(sample({ collectionId: '__buffer__' }), { collections, deviceId: DEVICE });
    const inSet = assessDeletionValue(sample({ collectionId: 'col-night' }), { collections, deviceId: DEVICE });
    expect(inBuffer.level).toBe('ordinary');
    expect(inSet.level).toBe('curated');
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

describe('ворота удаления — поведение во времени', () => {
  const evidenceInput = { willDelete: 1, evidence: 1, acknowledged: false } as const;

  it('ПОРЧА РЕВЬЮ: второе движение НЕ переживает окно', () => {
    // Отметил «понимаю» → отменил → открыл окно для ДРУГОГО удаления. Галочка обязана
    // сброситься, иначе предохранитель срабатывает один раз за сеанс.
    let st = deletionGateReducer(DELETION_GATE_CLOSED, { type: 'open', key: 'удаление-1' });
    st = deletionGateReducer(st, { type: 'acknowledge', value: true });
    expect(isDeletionBlocked({ ...evidenceInput, acknowledged: st.acknowledged })).toBe(false);

    // БЕЗ 'close' намеренно: закрытие обнуляет и в сломанной редакции, поэтому тест,
    // идущий через него, дефекта не видит — проверено порчей. Несущий инвариант ровно
    // один: ЛЮБОЕ открытие обнуляет второе движение.
    st = deletionGateReducer(st, { type: 'open', key: 'удаление-2' });

    expect(st.acknowledged, 'галочка пережила окно — предохранитель сломан').toBe(false);
    expect(isDeletionBlocked({ ...evidenceInput, acknowledged: st.acknowledged })).toBe(true);
  });

  it('повторное открытие ТОГО ЖЕ удаления тоже обнуляет: закрытие можно пропустить', () => {
    let st = deletionGateReducer(DELETION_GATE_CLOSED, { type: 'open', key: 'одно-и-то-же' });
    st = deletionGateReducer(st, { type: 'acknowledge', value: true });
    st = deletionGateReducer(st, { type: 'open', key: 'одно-и-то-же' });
    expect(st.acknowledged).toBe(false);
  });

  it('галочку нельзя поставить у закрытого окна', () => {
    const st = deletionGateReducer(DELETION_GATE_CLOSED, { type: 'acknowledge', value: true });
    expect(st.acknowledged).toBe(false);
  });

  it('блокировка: пустой список, занятость и неподтверждённый вещдок', () => {
    expect(isDeletionBlocked({ willDelete: 0, evidence: 0, acknowledged: true })).toBe(true);
    expect(isDeletionBlocked({ willDelete: 5, evidence: 0, acknowledged: false, busy: true })).toBe(true);
    expect(isDeletionBlocked({ willDelete: 5, evidence: 2, acknowledged: false })).toBe(true);
    expect(isDeletionBlocked({ willDelete: 5, evidence: 2, acknowledged: true })).toBe(false);
    expect(isDeletionBlocked({ willDelete: 5, evidence: 0, acknowledged: false })).toBe(false);
  });
});

describe('ложный вещдок при неизвестном приборе', () => {
  it('ПОРЧА РЕВЬЮ: без прибора окно НЕ объявляет вещдоком чужую запись', () => {
    const v = assessDeletionValue(sample({ createdAt: '2026-08-23T18:24:03.788Z' }), {});
    expect(v.level, 'совпадение по одному времени вещдоком не является').not.toBe('evidence');
  });

  it('но и не молчит: неопределённость названа словами и отсылает к документу', () => {
    const v = assessDeletionValue(sample({ createdAt: '2026-08-23T18:24:03.788Z' }), {});
    expect(v.level).toBe('curated');
    expect(v.why).toContain('дом не знает прибора');
    expect(v.why).toContain('docs/field/2026-08-23-night-duty-journal-congestion.md');
  });

  it('чужой прибор в окно не попадает вовсе', () => {
    const v = assessDeletionValue(sample({ createdAt: '2026-08-23T18:24:03.788Z' }), {
      deviceId: 'другое-устройство',
    });
    expect(v.level).toBe('ordinary');
  });
});

describe('НЕИЗВЕСТНОСТЬ — РИСК, а не его отсутствие (третий вход класса, ревью #2232)', () => {
  it('шапка считает по УХОДЯЩЕМУ, а не по разобранному', () => {
    const s = assessDeletion([sample()], { declaredTotal: 1747 });
    expect(s.willDelete).toBe(1747);
    expect(s.unknown).toBe(1746);
    expect(s.headline).toContain('1747');
    expect(s.headline, 'разобранное число не должно выдаваться за уходящее').not.toMatch(
      /безвозвратно 1 /u,
    );
    expect(s.headline).toContain('об остальных 1746 сказать нечего');
  });

  it('ПОРЧА: очистка буфера с неполной страницей требует второго движения', () => {
    // Вещдоки могут лежать ЗА пределами загруженной страницы. Прежняя редакция снимала
    // предохранитель ровно тогда, когда дом знал меньше всего.
    const s = assessDeletion([sample()], { declaredTotal: 1747 });
    expect(s.evidence).toBe(0);
    expect(
      isDeletionBlocked({
        willDelete: s.willDelete,
        evidence: s.evidence,
        unknown: s.unknown,
        acknowledged: false,
      }),
      'неразобранный остаток обязан требовать галочки',
    ).toBe(true);
    expect(
      isDeletionBlocked({
        willDelete: s.willDelete,
        evidence: s.evidence,
        unknown: s.unknown,
        acknowledged: true,
      }),
    ).toBe(false);
  });

  it('когда разобрано ВСЁ и ценного нет — второго движения не требуется', () => {
    const s = assessDeletion([sample()], { collections: [], deviceId: DEVICE });
    expect(s.unknown).toBe(0);
    expect(
      isDeletionBlocked({ willDelete: s.willDelete, evidence: 0, unknown: 0, acknowledged: false }),
      'лишняя ступень на рядовой уборке приучает жать «да»',
    ).toBe(false);
  });

  it('declaredTotal меньше разобранного не занижает: побеждает большее', () => {
    const s = assessDeletion([sample({ id: 'a' }), sample({ id: 'b' })], { declaredTotal: 1 });
    expect(s.willDelete).toBe(2);
    expect(s.unknown).toBe(0);
  });
});
