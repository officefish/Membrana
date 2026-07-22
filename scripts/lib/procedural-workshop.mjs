/**
 * procedural-workshop — три глагола мастерской процедурного дома (спринт procedural-workshop).
 *
 * Дом `docs/procedures/` уникален — контейнер контейнеров (2D-массив: список процедур ×
 * собственный список каждой). Глаголы (паттерн HOME_WORKSHOP):
 *   audit         — инвентарь: сверка реестра с реальностью + validateProcedure;
 *   decompose     — раскладка процедур по правилу (holder / status / kit);
 *   inspectElement— рассмотрение ОДНОЙ процедуры вглубь (её второе измерение:
 *                   engines/precedents/kitVersion). Полиморфная рекурсия по фреймам —
 *                   ждёт #900 (frames[]); здесь второе измерение = подграф манифеста.
 *
 * Канон: docs/patterns/HOME_WORKSHOP.md · заседание home-workshop (Ф2/Ф3).
 * Операции обзора — чтение, идемпотентны.
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { listProcedureDirs, validateProcedure } from './validate-procedure.mjs';

/**
 * Прочитать реестр процедур. Битый/непустой-но-нечитаемый реестр — ОШИБКА (не []),
 * чтобы гейт отличал «нет процедур» от «реестр не читается».
 * @returns {object[]}
 * @throws Error если registry.json есть, но не парсится / procedures не массив
 */
export function loadProcedureRegistry(repoRoot) {
  const p = join(repoRoot, 'docs', 'procedures', 'registry.json');
  if (!existsSync(p)) return [];
  let d;
  try {
    d = JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    throw new Error('docs/procedures/registry.json — битый JSON');
  }
  const arr = d.procedures ?? (Array.isArray(d) ? d : null);
  if (!Array.isArray(arr)) throw new Error('docs/procedures/registry.json: procedures — не массив');
  return arr;
}

function readManifest(repoRoot, id) {
  const p = join(repoRoot, 'docs', 'procedures', id, 'MANIFEST.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * audit — инвентарь процедур: сверка флага container.value с реальностью.
 * @returns {{id, holder, declaredBuilt, dirExists, valid, state, problems}[]}
 */
export function auditProcedures(repoRoot) {
  const reg = loadProcedureRegistry(repoRoot);
  const rows = [];
  const seen = new Set();
  for (const p of reg) {
    if (typeof p?.id !== 'string' || p.id.trim() === '') {
      rows.push({ id: '(без id)', holder: p?.holder ?? '—', declaredBuilt: false, dirExists: false, valid: false, state: 'invalid-entry', problems: ['запись реестра без строкового id'] });
      continue;
    }
    seen.add(p.id);
    const dir = join(repoRoot, 'docs', 'procedures', p.id);
    const dirExists = existsSync(dir);
    const declaredBuilt = p.container?.value === true;
    const problems = [];
    let valid = false;
    let state;
    if (declaredBuilt && !dirExists) {
      state = 'drift-declared-missing';
      problems.push(`container.value=true, но каталога docs/procedures/${p.id} нет`);
    } else if (declaredBuilt && dirExists) {
      const r = validateProcedure(dir, repoRoot);
      valid = r.valid;
      state = r.valid ? 'built-valid' : 'built-invalid';
      if (!r.valid) problems.push(...r.problems.map((x) => `validateProcedure: ${x}`));
    } else if (!declaredBuilt && dirExists) {
      state = 'drift-built-undeclared';
      problems.push(`каталог есть, но container.value≠true (реестр отстаёт)`);
    } else {
      state = 'declared-not-built';
    }
    rows.push({ id: p.id, holder: p.holder ?? '—', declaredBuilt, dirExists, valid, state, problems });
  }
  // Каталог-сирота: физически есть, но в реестре его нет вообще (дрейф в другую сторону).
  for (const dir of listProcedureDirs(repoRoot)) {
    const id = basename(dir);
    if (!seen.has(id)) {
      rows.push({ id, holder: '—', declaredBuilt: false, dirExists: true, valid: false, state: 'drift-built-undeclared', problems: [`каталог docs/procedures/${id} есть, но в реестре его нет`] });
    }
  }
  return rows;
}

/** Состояния, роняющие CI (реальный дефект, не легальный бэклог). */
export const FAILING_STATES = new Set(['built-invalid', 'drift-declared-missing', 'drift-built-undeclared', 'invalid-entry']);

const DECOMPOSE_KEYS = {
  holder: (a) => a.holder,
  status: (a) => a.state,
};

/**
 * decompose — раскладка процедур по правилу. by ∈ {holder, status, kit}.
 * @param {ReturnType<typeof auditProcedures>} audited
 * @param {string} by
 * @param {string} [repoRoot] нужен для by=kit (чтение манифестов)
 * @returns {Map<string, string[]>}
 */
export function decomposeProcedures(audited, by, repoRoot) {
  const out = new Map();
  const push = (k, id) => out.set(k, [...(out.get(k) ?? []), id]);
  if (by === 'kit') {
    for (const a of audited) {
      let kit;
      if (!a.dirExists) kit = 'не построена';
      else {
        const man = readManifest(repoRoot, a.id);
        if (!man) kit = 'манифест битый/отсутствует';
        else kit = typeof man.kitVersion === 'string' ? man.kitVersion : 'null';
      }
      push(kit, a.id);
    }
    return out;
  }
  const keyOf = DECOMPOSE_KEYS[by] ?? DECOMPOSE_KEYS.holder;
  for (const a of audited) push(keyOf(a) ?? '—', a.id);
  return out;
}

/**
 * inspectElement — рассмотрение одной процедуры вглубь (её второе измерение).
 * @returns {{id, built, readmePresent, kitVersion, engines, precedents, secondDimension, note}}
 */
export function inspectProcedure(repoRoot, id) {
  const dir = join(repoRoot, 'docs', 'procedures', id);
  if (!existsSync(dir)) {
    return { id, built: false, note: 'процедура объявлена в реестре, но контейнер не построен (declared-not-built)' };
  }
  const man = readManifest(repoRoot, id);
  const readmePresent = existsSync(join(dir, 'README.md'));
  const engines = Array.isArray(man?.engines) ? man.engines : [];
  const precedents = Array.isArray(man?.precedents) ? man.precedents : [];
  return {
    id,
    built: true,
    readmePresent,
    leadPersona: man?.leadPersona ?? null,
    kitVersion: man?.kitVersion ?? null,
    engines,
    precedents,
    // Второе измерение процедуры (её собственный список): подграф манифеста.
    // Полиморфная рекурсия по frames[] — ждёт #900; сейчас список = engines + precedents.
    secondDimension: { enginesCount: engines.length, precedentsCount: precedents.length },
    note: man ? null : 'MANIFEST.json отсутствует или битый',
  };
}
