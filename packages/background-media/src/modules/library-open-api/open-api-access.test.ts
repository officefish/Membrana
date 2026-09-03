/**
 * Зубы порядка проверок двери (#2271).
 *
 * ПОРЧА ИЗ БИЛЕТА ДОСЛОВНО: «поменять порядок проверок местами → зуб краснеет».
 *
 * Проверяется не текст функции, а ПОВЕДЕНИЕ: несуществующий прибор обязан давать `404` при
 * ЛЮБОМ обратившемся — и при своём, и при чужом, и при безмембранном. Если владение спросить
 * первым, чужой получит `403` на прибор, которого нет, и `403` перестанет доказывать
 * существование. Зуб ловит именно это, а не порядок строк.
 */
import { describe, expect, it } from 'vitest';

import { accessForDevice, statusForAccess } from './open-api-access';

const OWNER = 'membrane-owner';
const STRANGER = 'membrane-stranger';

describe('порядок: существование → владение', () => {
  it('ПОРЧА: прибора нет — 404 при ЛЮБОМ обратившемся, включая чужого', () => {
    // Именно этот случай ломается при перестановке проверок: спросив владение первым, чужой
    // получил бы `forbidden` и узнал бы, что прибор «есть, но закрыт», — про несуществующий.
    for (const caller of [OWNER, STRANGER, null, '', '   ']) {
      expect(
        accessForDevice(null, caller as string | null),
        `обратившийся ${JSON.stringify(caller)} узнал о несуществующем приборе больше, чем должен`,
      ).toBe('absent');
    }
  });

  it('403 ДОКАЗЫВАЕТ существование: он бывает только у найденного прибора', () => {
    expect(accessForDevice({ membraneId: OWNER }, STRANGER)).toBe('forbidden');
    expect(accessForDevice(null, STRANGER)).not.toBe('forbidden');
  });

  it('свой прибор — allow', () => {
    expect(accessForDevice({ membraneId: OWNER }, OWNER)).toBe('allow');
  });

  it('прибор без мембраны закрыт для ВСЕХ — угадывать владельца дверь не вправе', () => {
    // «Ничей» не значит «общий». M1: прибор без мембраны — законное состояние, но операции,
    // требующие владельца, на нём не выполняются.
    for (const owner of [null, undefined, '', '  ']) {
      expect(accessForDevice({ membraneId: owner }, OWNER)).toBe('forbidden');
    }
  });

  it('обратившийся без мембраны не получает ничего — по той же причине', () => {
    for (const caller of [null, '', '   ']) {
      expect(accessForDevice({ membraneId: OWNER }, caller as string | null)).toBe('forbidden');
    }
  });

  it('пустота нормализуется fail-closed одинаково с осью владения', () => {
    // Ось (`ownership`) считает пробельную мембрану отсутствием. Дверь обязана судить так же,
    // иначе одна и та же запись будет владельцем для двери и никем для выборки.
    expect(accessForDevice({ membraneId: '  ' }, '  ')).toBe('forbidden');
  });

  it('коды разведены: absent → 404, forbidden → 403', () => {
    expect(statusForAccess('absent')).toBe(404);
    expect(statusForAccess('forbidden')).toBe(403);
  });

  it('ИНВАРИАНТ ПЕРЕБОРОМ: 403 никогда не встречается там, где прибора нет', () => {
    // Свойство, а не список примеров: верно при любой будущей редакции функции.
    const callers: (string | null)[] = [OWNER, STRANGER, null, '', ' '];
    for (const caller of callers) {
      const verdict = accessForDevice(null, caller);
      expect(verdict, `caller=${JSON.stringify(caller)}`).toBe('absent');
    }
  });
});
