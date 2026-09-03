/**
 * Зубы генератора ключа-предъявителя (DoD блока `key-ttl`, пункты 4 и 5) плюс масштаб
 * выключателя.
 *
 * 4 — ротация гасит ВСЕ ссылки разом: предикат с зубом, а не обещание;
 * 5 — поштучного отзыва НЕТ: зуб на отсутствие такого глагола, а не комментарий о нём.
 */
import { describe, expect, it } from 'vitest';

import * as generatorModule from './track-key.generator';
import {
  TRACK_KEY_GENERATOR_SURFACE,
  TrackKeyGenerator,
  buildTrackUrl,
  type IssuedTrackLink,
} from './track-key.generator';
import { DEFAULT_TRACK_KEY_TTL } from './track-key-ttl';
import { fixedClock, stubKeyStore, stubSampleRow, stubSettingsStore } from './stubs/neighbors.stub';

const MEMBRANE = 'membrane-1';
const OTHER_MEMBRANE = 'membrane-2';

function makeGenerator(settings: Record<string, unknown> = {}, startAt = '2026-09-02T12:00:00.000Z') {
  const now = fixedClock(startAt);
  const keys = stubKeyStore();
  const store = stubSettingsStore(settings);
  return { gen: new TrackKeyGenerator({ keys, settings: store, now }), now, keys, settings: store };
}

async function issueOrThrow(
  gen: TrackKeyGenerator,
  membraneId: string | null,
  sampleId: string,
): Promise<IssuedTrackLink> {
  const outcome = await gen.issue({ membraneId, sampleId });
  if (outcome.outcome !== 'issued') throw new Error(`ожидалась выдача, пришло: ${outcome.verdict}`);
  return outcome.link;
}

describe('выдача опирается на умолчание, а не на молчание', () => {
  it('настройки мембраны нет → ссылка живёт DEFAULT_TRACK_KEY_TTL, а не вечно', async () => {
    const { gen, now } = makeGenerator();
    const link = await issueOrThrow(gen, MEMBRANE, 'sample-1');

    expect(link.expiresAt).toBe(new Date(now().getTime() + DEFAULT_TRACK_KEY_TTL * 1000).toISOString());
    expect(link.ttl.source).toBe('default');
    expect(link.ttl.reason).toBe('absent');
  });

  it('прибор без мембраны — отказ, а не ссылка с умолчанием', async () => {
    // M1: «угадывать владельца дверь не вправе». Подставить здесь срок значило бы выдать
    // ключ на пробу, чей владелец неизвестен.
    const { gen } = makeGenerator();
    for (const membraneId of [null, undefined, '', '   ']) {
      const outcome = await gen.issue({ membraneId: membraneId as string | null, sampleId: 'sample-1' });
      expect(outcome.outcome).toBe('refused');
      expect(outcome.outcome === 'refused' && outcome.verdict).toBe('unknown_membrane');
    }
  });

  it('выданный ключ проверяется и умирает по сроку', async () => {
    const { gen, now } = makeGenerator({ [MEMBRANE]: { mode: 'seconds', seconds: 60 } });
    const link = await issueOrThrow(gen, MEMBRANE, 'sample-1');

    expect((await gen.verify(link.key)).verdict).toBe('ok');
    now.advance(61);
    expect((await gen.verify(link.key)).verdict).toBe('expired');
  });

  it('правленое тело ключа — tampered, а не тихое «ok»', async () => {
    const { gen } = makeGenerator();
    const link = await issueOrThrow(gen, MEMBRANE, 'sample-1');
    const [payload, signature] = link.key.split('.');
    const forged = `${Buffer.from(
      Buffer.from(payload, 'base64url').toString('utf8').replace('sample-1', 'sample-9'),
      'utf8',
    ).toString('base64url')}.${signature}`;

    expect((await gen.verify(forged)).verdict).toBe('tampered');
    expect((await gen.verify('мусор')).verdict).toBe('malformed');
  });
});

describe('DoD-4 · ротация гасит ВСЕ ссылки разом', () => {
  it('предикат: после одного движения ни одна выданная ссылка не проходит', async () => {
    const { gen } = makeGenerator({ [MEMBRANE]: { mode: 'seconds', seconds: 3600 } });

    // Ссылки на пробы из ТРЁХ родов наборов, включая приёмный лоток.
    const rows = [
      stubSampleRow({ id: 'sample-user', collectionKind: 'user', collectionId: 'named-set' }),
      stubSampleRow({ id: 'sample-system', collectionKind: 'system', collectionId: 'system-set' }),
      stubSampleRow({ id: 'sample-tray', collectionKind: 'buffer', collectionId: 'inbox-tray' }),
    ];
    const links = await Promise.all(rows.map((row) => issueOrThrow(gen, MEMBRANE, row.id)));

    for (const link of links) expect((await gen.verify(link.key)).verdict).toBe('ok');

    const rotated = await gen.rotate(MEMBRANE);
    expect(rotated.outcome).toBe('rotated');
    expect(rotated.outcome === 'rotated' && rotated.killedGeneration).toBe(1);
    expect(rotated.outcome === 'rotated' && rotated.generation).toBe(2);

    // ПРЕДИКАТ: множество живых ссылок после ротации пусто. Не «часть», не «истекут сами».
    const alive: string[] = [];
    for (const link of links) {
      const verdict = (await gen.verify(link.key)).verdict;
      if (verdict === 'ok') alive.push(link.sampleId);
      else expect(verdict).toBe('stale_generation');
    }
    expect(alive, `ротация оставила живые ссылки: ${alive.join(', ')}`).toEqual([]);
  });

  it('гасит и НЕВЫДОХШИЕ ссылки: поколение спрашивается раньше срока', async () => {
    // Если бы порядок был обратным, ссылка со сроком в час пережила бы ротацию, и «гасит
    // разом» означало бы «гасит по мере истечения».
    const { gen, now } = makeGenerator({ [MEMBRANE]: { mode: 'seconds', seconds: 3600 } });
    const link = await issueOrThrow(gen, MEMBRANE, 'sample-1');

    await gen.rotate(MEMBRANE);
    now.advance(1);

    expect((await gen.verify(link.key)).verdict).toBe('stale_generation');
  });

  it('гасит и БЕССРОЧНЫЕ ссылки — задний борт работает при снятом сроке', async () => {
    // M3 называет ротацию единственным механизмом; при снятом сроке она — единственный
    // механизм вообще, потому что переднего борта нет.
    const { gen } = makeGenerator({
      [MEMBRANE]: { mode: 'lifted', liftedAt: '2026-09-02T09:00:00.000Z', liftedBy: 'owner' },
    });
    const link = await issueOrThrow(gen, MEMBRANE, 'sample-1');
    expect(link.expiresAt).toBeNull();
    expect((await gen.verify(link.key)).verdict).toBe('ok');

    await gen.rotate(MEMBRANE);
    expect((await gen.verify(link.key)).verdict).toBe('stale_generation');
  });

  it('ротация одной мембраны не трогает ссылки другой', async () => {
    const { gen } = makeGenerator();
    const mine = await issueOrThrow(gen, MEMBRANE, 'sample-1');
    const foreign = await issueOrThrow(gen, OTHER_MEMBRANE, 'sample-2');

    await gen.rotate(MEMBRANE);

    expect((await gen.verify(mine.key)).verdict).toBe('stale_generation');
    expect((await gen.verify(foreign.key)).verdict).toBe('ok');
  });

  it('ссылки, выданные ПОСЛЕ ротации, живы — движение гасит прошлое, не будущее', async () => {
    const { gen } = makeGenerator();
    const before = await issueOrThrow(gen, MEMBRANE, 'sample-1');
    await gen.rotate(MEMBRANE);

    const fresh = await issueOrThrow(gen, MEMBRANE, 'sample-1');
    expect(fresh.generation).toBe(2);
    expect((await gen.verify(fresh.key)).verdict).toBe('ok');
    expect((await gen.verify(before.key)).verdict).toBe('stale_generation');
  });

  it('ротация мембраны без ключа заводит первое поколение и гасить ей нечего', async () => {
    const { gen } = makeGenerator();
    const rotated = await gen.rotate(MEMBRANE);
    expect(rotated.outcome === 'rotated' && rotated.killedGeneration).toBeNull();
    expect(rotated.outcome === 'rotated' && rotated.generation).toBe(1);
  });

  it('одновременные первые выдачи подписаны ОДНИМ ключом — гонка не рожает мёртвых ссылок', async () => {
    // Вещдок 02.09: ленивое заведение ключа при параллельной выдаче заводило его дважды,
    // второй секрет затирал первый, и ссылка приходила с вердиктом `tampered` — диагноз лгал
    // о причине (тела никто не правил). Лечится атомарным `createIfAbsent` в хранилище.
    const { gen, keys } = makeGenerator();
    const links = await Promise.all(
      ['a', 'b', 'c', 'd'].map((id) => issueOrThrow(gen, MEMBRANE, `sample-${id}`)),
    );

    for (const link of links) expect((await gen.verify(link.key)).verdict).toBe('ok');
    expect(keys.snapshot()).toHaveLength(1);
    expect(new Set(links.map((l) => l.generation))).toEqual(new Set([1]));
  });
});

describe('DoD-5 · поштучного отзыва НЕТ как глагола', () => {
  const prototypeSurface = Object.getOwnPropertyNames(TrackKeyGenerator.prototype).filter(
    (name) => name !== 'constructor',
  );

  it('поверхность генератора — ровно объявленный закрытый список', () => {
    expect([...prototypeSurface].sort()).toEqual([...TRACK_KEY_GENERATOR_SURFACE].sort());
  });

  it('ни в прототипе, ни в экспортах модуля нет глагола поштучного отзыва', () => {
    const forbidden = /revoke|unshare|invalidate|disable|kill|expireone|dropkey/i;
    const offenders = [...prototypeSurface, ...Object.keys(generatorModule)].filter((name) =>
      forbidden.test(name),
    );

    expect(
      offenders,
      `появился глагол поштучного отзыва: ${offenders.join(', ')} — предъявительская конструкция его не держит`,
    ).toEqual([]);
  });

  it('единственный гасящий глагол принимает мембрану и НЕ принимает пробу', async () => {
    // `rotate(membraneId)` — область действия названа сигнатурой: адреса одной ссылки в ней нет,
    // и просунуть его некуда.
    expect(TrackKeyGenerator.prototype.rotate.length).toBe(1);

    const { gen } = makeGenerator();
    const refused = await gen.rotate('');
    expect(refused.outcome).toBe('refused');
  });

  it('две ссылки одной мембраны равнозначны: погасить одну, не тронув другую, нечем', async () => {
    const { gen } = makeGenerator();
    const first = await issueOrThrow(gen, MEMBRANE, 'sample-1');
    const second = await issueOrThrow(gen, MEMBRANE, 'sample-2');

    await gen.rotate(MEMBRANE);

    // Обе умерли одним движением — это и есть «все ссылки равнозначны», выраженное фактом.
    expect((await gen.verify(first.key)).verdict).toBe('stale_generation');
    expect((await gen.verify(second.key)).verdict).toBe('stale_generation');
  });
});

describe('масштаб выключателя — мембрана, приёмный лоток внутри', () => {
  it('один срок на все роды наборов, лоток не исключение', async () => {
    const { gen } = makeGenerator({ [MEMBRANE]: { mode: 'seconds', seconds: 1800 } });
    const rows = [
      stubSampleRow({ id: 'in-named-set', collectionKind: 'user' }),
      stubSampleRow({ id: 'in-system-set', collectionKind: 'system' }),
      stubSampleRow({ id: 'in-inbox-tray', collectionKind: 'buffer' }),
    ];

    const expiries = new Set<string | null>();
    for (const row of rows) expiries.add((await issueOrThrow(gen, MEMBRANE, row.id)).expiresAt);

    expect(expiries.size, 'лоток или системный набор получили свой срок — выключатель не мембранный').toBe(1);
  });

  it('снятие срока на мембране снимает его и с записей двора — цена названа', async () => {
    const { gen } = makeGenerator({
      [MEMBRANE]: { mode: 'lifted', liftedAt: '2026-09-02T09:00:00.000Z', liftedBy: 'owner' },
    });
    const tray = await issueOrThrow(gen, MEMBRANE, 'in-inbox-tray');
    expect(tray.expiresAt).toBeNull();
  });

  it('запрос с областью уже мембраны отвергается: второй области управления нет', async () => {
    const { gen } = makeGenerator();
    const outcome = await gen.issue({
      membraneId: MEMBRANE,
      sampleId: 'sample-1',
      collectionId: 'inbox-tray',
    } as never);

    expect(outcome.outcome).toBe('refused');
    expect(outcome.outcome === 'refused' && outcome.verdict).toBe('malformed');
    expect(outcome.outcome === 'refused' && outcome.why).toContain('collectionId');
  });

  it('срок в запросе не передаётся: он берётся из настройки мембраны', async () => {
    const { gen } = makeGenerator();
    const outcome = await gen.issue({ membraneId: MEMBRANE, sampleId: 'sample-1', ttl: 99 } as never);
    expect(outcome.outcome).toBe('refused');
  });
});

describe('форма ссылки', () => {
  it('адрес собирается поверх базы, путь назначает не генератор', () => {
    const url = buildTrackUrl('https://media.example/v1/samples/', 'sample 1', 'k.e.y');
    expect(url).toBe('https://media.example/v1/samples/sample%201/blob?k=k.e.y');
  });

  it('ключ несёт срок внутри и повторно не выдаётся тем же', async () => {
    const { gen, now } = makeGenerator({ [MEMBRANE]: { mode: 'seconds', seconds: 600 } });
    const first = await issueOrThrow(gen, MEMBRANE, 'sample-1');
    now.advance(5);
    const second = await issueOrThrow(gen, MEMBRANE, 'sample-1');

    expect(second.key).not.toBe(first.key);
    expect(new Date(second.expiresAt!).getTime() - new Date(first.expiresAt!).getTime()).toBe(5000);
  });
});
