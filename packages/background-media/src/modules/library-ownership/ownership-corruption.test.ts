/**
 * Зуб собственного DoD, пункт 4: попытка вывести владельца из `deviceId` или `collectionId`
 * роняет проверку.
 *
 * Проверяемость здесь достигается порчей, а не словами. Набор случаев прогоняется дважды:
 * по честной реализации (обязан быть ноль провалов) и по каждой испорченной (обязаны упасть
 * ПОИМЁННО названные случаи). Если однажды набор ослабнет — красным станет он сам, а не только
 * чей-то будущий неверный код.
 */

import { describe, expect, it } from 'vitest';

import { OWNERSHIP_CORRUPT_RESOLVERS } from './conformance/corrupt-resolvers';
import {
  HONEST_OWNERSHIP_RESOLVER,
  OWNERSHIP_CONFORMANCE_CASES,
  runOwnershipConformance,
} from './conformance/ownership-conformance';

describe('ось владения: честная реализация', () => {
  it('проходит весь набор без единого провала', () => {
    expect(runOwnershipConformance(HONEST_OWNERSHIP_RESOLVER)).toEqual([]);
  });
});

describe('ось владения: порча роняет зуб', () => {
  it.each(OWNERSHIP_CORRUPT_RESOLVERS.map((corrupt) => [corrupt.name, corrupt] as const))(
    'порча «%s» проваливает набор',
    (_name, corrupt) => {
      const failures = runOwnershipConformance(corrupt.resolve);
      expect(failures.length, `порча не поймана: ${corrupt.lie}`).toBeGreaterThan(0);
    },
  );

  it.each(OWNERSHIP_CORRUPT_RESOLVERS.map((corrupt) => [corrupt.name, corrupt] as const))(
    'порча «%s» роняет именно те случаи, которые обязана',
    (_name, corrupt) => {
      const failedCases = new Set(runOwnershipConformance(corrupt.resolve).map((f) => f.case));
      for (const expectedCase of corrupt.mustFail) {
        expect(
          failedCases.has(expectedCase),
          `случай ${expectedCase} не поймал порчу «${corrupt.name}» (${corrupt.lie})`,
        ).toBe(true);
      }
    },
  );

  it('каждый случай набора кем-то из порч удостоверен — мёртвых случаев нет', () => {
    const pinned = new Set(OWNERSHIP_CORRUPT_RESOLVERS.flatMap((corrupt) => corrupt.mustFail));
    for (const conformanceCase of OWNERSHIP_CONFORMANCE_CASES) {
      expect(
        pinned.has(conformanceCase),
        `случай ${conformanceCase} не проверен ни одной порчей: он зелен всегда`,
      ).toBe(true);
    }
  });

  it('вывод владельца из deviceId ловится обеими формами — и прямой, и запасной веткой', () => {
    const always = OWNERSHIP_CORRUPT_RESOLVERS.find(
      (corrupt) => corrupt.name === 'owner-always-from-device-id',
    );
    const fallback = OWNERSHIP_CORRUPT_RESOLVERS.find(
      (corrupt) => corrupt.name === 'device-id-as-fallback',
    );
    expect(always && fallback).toBeTruthy();
    for (const corrupt of [always!, fallback!]) {
      const cases = runOwnershipConformance(corrupt.resolve).map((f) => f.case);
      expect(cases).toContain('membrane-never-equals-device-id');
    }
  });

  it('вывод владельца из collectionId ловится обеими формами — и прямой, и запасной веткой', () => {
    const always = OWNERSHIP_CORRUPT_RESOLVERS.find(
      (corrupt) => corrupt.name === 'owner-always-from-collection-id',
    );
    const fallback = OWNERSHIP_CORRUPT_RESOLVERS.find(
      (corrupt) => corrupt.name === 'collection-id-as-fallback',
    );
    expect(always && fallback).toBeTruthy();
    for (const corrupt of [always!, fallback!]) {
      const cases = runOwnershipConformance(corrupt.resolve).map((f) => f.case);
      expect(cases).toContain('membrane-never-equals-collection-id');
    }
  });

  it('провалы читаемы: каждый несёт имя случая и подробность', () => {
    const failures = runOwnershipConformance(OWNERSHIP_CORRUPT_RESOLVERS[0]!.resolve);
    for (const failure of failures) {
      expect(OWNERSHIP_CONFORMANCE_CASES).toContain(failure.case);
      expect(failure.detail.length).toBeGreaterThan(0);
    }
  });

  it('реализация, которая бросает вместо ответа, проваливает КАЖДЫЙ случай, а не роняет прогон', () => {
    const failures = runOwnershipConformance(() => {
      throw new Error('boom');
    });
    const failedCases = new Set(failures.map((f) => f.case));
    expect([...failedCases].sort()).toEqual([...OWNERSHIP_CONFORMANCE_CASES].sort());
  });
});
