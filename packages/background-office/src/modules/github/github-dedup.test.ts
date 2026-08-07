/**
 * Зубы дедупа открытых PR (долг `#night-triage-yield-zero`, 07.08).
 *
 * Регресс, который они держат: ключ дедупа был заголовочным и потому работал только для
 * той формы заголовка, под которую написан. Ночной триаж кладёт дату прямо в заголовок —
 * и заслонка молчала 13 ночей подряд.
 */
import { describe, expect, it } from 'vitest';

import { findDuplicateByBranchPrefix, isMechanismBranch } from './github.service';

const pr = (number: number, headRef: string) => ({ number, headRef });

/**
 * Тот же предикат держит и карантин ночного триажа: метки для отбора «своих» PR не хватает —
 * её может нести чужой PR (хоть ручной разбор механизма), и его закрытие поставило бы
 * механизму ложный карантин.
 */
describe('isMechanismBranch', () => {
  it('своя ветка механизма — префикс, дефис, метка времени', () => {
    expect(isMechanismBranch('claude/night-triage-1785886201230', 'claude/night-triage')).toBe(true);
  });

  it('ручная ветка про тот же предмет своей не считается', () => {
    expect(isMechanismBranch('fix/night-triage-publication-threshold', 'claude/night-triage')).toBe(false);
    expect(isMechanismBranch('claude/night-triage-manual', 'claude/night-triage')).toBe(false);
    expect(isMechanismBranch('claude/night-triage', 'claude/night-triage')).toBe(false);
  });
});

describe('findDuplicateByBranchPrefix', () => {
  it('ловит открытый PR ночного триажа, хотя заголовки ночей разные', () => {
    const open = [pr(1720, 'claude/night-triage-1785886201230')];
    expect(findDuplicateByBranchPrefix(open, 'claude/night-triage')?.number).toBe(1720);
  });

  it('пусто → дубля нет, механизм публикует', () => {
    expect(findDuplicateByBranchPrefix([], 'claude/night-triage')).toBeUndefined();
  });

  it('чужой механизм с той же меткой не считается дублем', () => {
    const open = [pr(1700, 'night-hunt/deps-watch-1785000000000')];
    expect(findDuplicateByBranchPrefix(open, 'claude/night-triage')).toBeUndefined();
  });

  it('после дефиса обязаны быть только цифры: задание не глушит соседа, чей slug начинается так же', () => {
    const open = [pr(1701, 'night-hunt/deps-watch-extra-1785000000000')];
    expect(findDuplicateByBranchPrefix(open, 'night-hunt/deps-watch')).toBeUndefined();
    expect(findDuplicateByBranchPrefix(open, 'night-hunt/deps-watch-extra')?.number).toBe(1701);
  });

  it('ветка без метки времени дублем не считается — форму ветки задаёт сам создатель PR', () => {
    expect(findDuplicateByBranchPrefix([pr(1, 'claude/night-triage')], 'claude/night-triage')).toBeUndefined();
    expect(findDuplicateByBranchPrefix([pr(2, 'claude/night-triage-manual')], 'claude/night-triage')).toBeUndefined();
  });

  it('первый из нескольких открытых — дубль (копить нечего, одного достаточно)', () => {
    const open = [pr(1720, 'claude/night-triage-1'), pr(1734, 'claude/night-triage-2')];
    expect(findDuplicateByBranchPrefix(open, 'claude/night-triage')?.number).toBe(1720);
  });
});
