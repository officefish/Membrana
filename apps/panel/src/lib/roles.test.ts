import { describe, expect, it } from 'vitest';
import {
  canAccess,
  canAccessSection,
  grantsAllowSection,
  isPanelRole,
  ROLE_LABELS,
  ROLE_ORDER,
} from './roles';
import { PANEL_SECTIONS } from './sections';

describe('roles (клиентское зеркало OP2)', () => {
  it('полный порядок public < ally < operator < owner', () => {
    expect(ROLE_ORDER.public).toBeLessThan(ROLE_ORDER.ally);
    expect(ROLE_ORDER.ally).toBeLessThan(ROLE_ORDER.operator);
    expect(ROLE_ORDER.operator).toBeLessThan(ROLE_ORDER.owner);
  });

  it('canAccess монотонен; у каждого уровня есть человеческая подпись', () => {
    expect(canAccess('ally', 'operator')).toBe(false);
    expect(canAccess('owner', 'ally')).toBe(true);
    for (const role of Object.keys(ROLE_ORDER)) {
      expect(ROLE_LABELS[role as keyof typeof ROLE_LABELS]).toBeTruthy();
    }
  });

  it('isPanelRole отбрасывает мусор', () => {
    expect(isPanelRole('operator')).toBe(true);
    expect(isPanelRole('root')).toBe(false);
  });
});

describe('гранты партнёров (PU2, #463)', () => {
  it("grantsAllowSection: точный грант и wildcard '*'; пусто/undefined — нет", () => {
    expect(grantsAllowSection(['detector-compare'], 'detector-compare')).toBe(true);
    expect(grantsAllowSection(['detector-compare'], 'drift-anchors')).toBe(false);
    expect(grantsAllowSection(['*'], 'любой-будущий-раздел')).toBe(true);
    expect(grantsAllowSection([], 'detector-compare')).toBe(false);
    expect(grantsAllowSection(undefined, 'detector-compare')).toBe(false);
  });

  it('canAccessSection: роль ≥ уровня ИЛИ грант; owner-разделы грантом не открываются только при отсутствии гранта', () => {
    // союзник без грантов не видит operator-раздел…
    expect(canAccessSection('ally', [], 'operator', 'detector-compare')).toBe(false);
    // …а с грантом (или wildcard) — видит.
    expect(canAccessSection('ally', ['detector-compare'], 'operator', 'detector-compare')).toBe(true);
    expect(canAccessSection('ally', ['*'], 'operator', 'detector-compare')).toBe(true);
    // роль работает независимо от грантов.
    expect(canAccessSection('operator', [], 'operator', 'detector-compare')).toBe(true);
    // public без грантов не видит ничего гейтированного.
    expect(canAccessSection('public', [], 'ally', 'ally-digest')).toBe(false);
  });
});

describe('sections (заглушки OP3)', () => {
  it('id уникальны, уровни валидны, public-разделов нет (welcome — не раздел)', () => {
    const ids = PANEL_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of PANEL_SECTIONS) {
      expect(isPanelRole(s.minRole)).toBe(true);
      expect(s.minRole).not.toBe('public');
      expect(s.title).toBeTruthy();
      expect(s.description).toBeTruthy();
    }
  });

  it('есть раздел для союзников и разделы будущих бордов (drift, детекторы)', () => {
    const ids = PANEL_SECTIONS.map((s) => s.id);
    expect(ids).toContain('ally-digest');
    expect(ids).toContain('drift-anchors');
    expect(ids).toContain('detector-compare');
  });
});
