/**
 * Лицензия контракта процедурного слоя (Ф3 #1220 / срез #1227).
 *
 * Парсер выдаёт лицензию: происхождение ∧ соответствие. Версия парсера
 * наследуется генератором и штампом контракта. Канон: docs/procedures/LICENSE.md.
 *
 * Детерминирован; файловая система — единственный вход (без сети).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { registryProblems, renderRegistryMd } from './procedures-registry.mjs';
import {
  PARSER_VERSION,
  parseContractHeader,
  stampContractHeader,
} from './procedure-contract-stamp.mjs';
import { renderVocabularyMd, vocabularySchemaProblems } from './vocabulary-check.mjs';

export { PARSER_VERSION, parseContractHeader, stampContractHeader };

/**
 * @param {string} repoRoot
 * @returns {{parserVersion: string, compat: string[], rootOfTrust: string, contracts: object[]}}
 */
export function loadContractsRegistry(repoRoot) {
  const path = join(repoRoot, 'docs/procedures/contracts.registry.json');
  const reg = JSON.parse(readFileSync(path, 'utf8'));
  if (!reg || typeof reg !== 'object') throw new Error('contracts.registry.json — не объект');
  if (!Array.isArray(reg.contracts)) throw new Error('contracts.registry.json: нет contracts[]');
  return reg;
}

/**
 * Проблемы схемы реестра лицензий.
 * @param {unknown} reg
 * @returns {string[]}
 */
export function contractsRegistryProblems(reg) {
  const problems = [];
  if (reg === null || typeof reg !== 'object' || Array.isArray(reg)) {
    return ['contracts.registry — не объект'];
  }
  const r = /** @type {Record<string, unknown>} */ (reg);
  if (typeof r.parserVersion !== 'string' || !/^\d+\.\d+\.\d+$/u.test(r.parserVersion)) {
    problems.push('parserVersion — не semver X.Y.Z');
  }
  if (!Array.isArray(r.compat) || r.compat.length === 0) {
    problems.push('compat — непустой массив');
  }
  if (typeof r.rootOfTrust !== 'string' || r.rootOfTrust.trim() === '') {
    problems.push('rootOfTrust — не непустая строка');
  }
  if (!Array.isArray(r.contracts) || r.contracts.length === 0) {
    problems.push('contracts — непустой массив');
  } else {
    const ids = new Set();
    for (let i = 0; i < r.contracts.length; i += 1) {
      const c = r.contracts[i];
      const label = `contracts[${i}]`;
      if (c === null || typeof c !== 'object' || Array.isArray(c)) {
        problems.push(`${label}: не объект`);
        continue;
      }
      const e = /** @type {Record<string, unknown>} */ (c);
      for (const k of ['id', 'path', 'generator', 'source', 'renderer']) {
        if (typeof e[k] !== 'string' || String(e[k]).trim() === '') {
          problems.push(`${label}: нет ${k}`);
        }
      }
      if (e.class !== 'contract') problems.push(`${label}: class обязан быть contract`);
      if (typeof e.id === 'string') {
        if (ids.has(e.id)) problems.push(`${label}: дубль id «${e.id}»`);
        else ids.add(e.id);
      }
    }
  }
  return problems;
}

/**
 * Пересобрать тело контракта из source (без штампа — штамп клеит caller).
 * @param {string} renderer
 * @param {string} repoRoot
 * @param {string} sourceRel
 * @returns {{ok: true, body: string}|{ok: false, error: string}}
 */
export function regenerateContractBody(renderer, repoRoot, sourceRel) {
  const abs = join(repoRoot, sourceRel);
  if (!existsSync(abs)) return { ok: false, error: `source не найден: ${sourceRel}` };
  let raw;
  try {
    raw = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    return { ok: false, error: `source битый JSON: ${/** @type {Error} */ (e).message}` };
  }
  if (renderer === 'vocabulary') {
    const probs = vocabularySchemaProblems(raw);
    if (probs.length) return { ok: false, error: `vocabulary schema: ${probs[0]}` };
    const full = renderVocabularyMd(raw);
    return { ok: true, body: stripFirstLine(full) };
  }
  if (renderer === 'procedures-registry') {
    const probs = registryProblems(raw);
    if (probs.length) return { ok: false, error: `registry schema: ${probs[0]}` };
    const full = renderRegistryMd(raw);
    return { ok: true, body: stripFirstLine(full) };
  }
  return { ok: false, error: `неизвестный renderer: ${renderer}` };
}

/**
 * @param {string} text
 * @returns {string}
 */
function stripFirstLine(text) {
  const nl = text.indexOf('\n');
  return nl === -1 ? '' : text.slice(nl + 1);
}

/**
 * Полный текст контракта со штампом лицензии.
 * @param {{generator: string, source: string, renderer: string}} entry
 * @param {string} repoRoot
 * @returns {{ok: true, text: string}|{ok: false, error: string}}
 */
export function renderLicensedContract(entry, repoRoot) {
  const regen = regenerateContractBody(entry.renderer, repoRoot, entry.source);
  if (!regen.ok) return regen;
  const header = stampContractHeader({
    generator: entry.generator,
    source: entry.source,
    parserVersion: PARSER_VERSION,
  });
  return { ok: true, text: `${header}\n${regen.body}` };
}

/**
 * Выдать вердикт лицензии одному контракту.
 * @param {object} entry запись из contracts.registry.json
 * @param {string} repoRoot
 * @param {{compat?: string[]}} [opts]
 * @returns {{id: string, valid: boolean, provenance: string, compliance: string, problems: string[]}}
 */
export function licenseContract(entry, repoRoot, opts = {}) {
  const problems = [];
  const id = entry.id ?? entry.path ?? '?';
  const compat = opts.compat ?? [PARSER_VERSION];
  const abs = join(repoRoot, entry.path);

  if (!existsSync(abs)) {
    return {
      id,
      valid: false,
      provenance: 'missing',
      compliance: 'unchecked',
      problems: [`файл отсутствует: ${entry.path}`],
    };
  }

  const text = readFileSync(abs, 'utf8');
  const header = parseContractHeader(text);
  let provenance = 'ok';
  if (!header) {
    provenance = 'missing';
    problems.push('нет штампа происхождения (contract/generated)');
  } else {
    if (header.generator !== entry.generator) {
      provenance = 'mismatch';
      problems.push(`generator в штампе «${header.generator}» ≠ реестр «${entry.generator}»`);
    }
    if (header.source !== entry.source) {
      provenance = 'mismatch';
      problems.push(`source в штампе «${header.source}» ≠ реестр «${entry.source}»`);
    }
    if (header.parserVersion != null && !compat.includes(header.parserVersion)) {
      provenance = 'mismatch';
      problems.push(`parser@${header.parserVersion} вне окна compat [${compat.join(', ')}]`);
    }
  }

  const expected = renderLicensedContract(entry, repoRoot);
  let compliance = 'ok';
  if (!expected.ok) {
    compliance = 'unchecked';
    problems.push(`пересборка невозможна: ${expected.error}`);
  } else if (text !== expected.text) {
    // Допуск: legacy-штамп при байт-совпадении тела
    const bodyOk = stripFirstLine(text) === stripFirstLine(expected.text);
    if (bodyOk && header?.legacy) {
      compliance = 'ok';
      problems.push('legacy-штамп: тело совпало — перегенерируй для parser@штампа');
    } else if (bodyOk && header && !header.legacy) {
      compliance = 'drift';
      problems.push('штамп/пробелы разъехались с каноном пересборки');
    } else {
      compliance = 'drift';
      problems.push('тело не совпало с пересборкой из source (невоспроизводим)');
    }
  }

  // Legacy warning не роняет valid, если provenance+compliance иначе ok
  const blocking = problems.filter((p) => !p.startsWith('legacy-штамп'));
  const valid = provenance === 'ok' && compliance === 'ok' && blocking.length === 0;

  return { id, valid, provenance, compliance, problems };
}

/**
 * Аудит всех контрактов слоя.
 * @param {string} repoRoot
 * @returns {{ok: boolean, parserVersion: string, results: ReturnType<typeof licenseContract>[], registryProblems: string[]}}
 */
export function auditProcedureContracts(repoRoot) {
  let reg;
  try {
    reg = loadContractsRegistry(repoRoot);
  } catch (e) {
    return {
      ok: false,
      parserVersion: PARSER_VERSION,
      results: [],
      registryProblems: [/** @type {Error} */ (e).message],
    };
  }
  const regProbs = contractsRegistryProblems(reg);
  if (reg.parserVersion !== PARSER_VERSION) {
    regProbs.push(
      `registry.parserVersion «${reg.parserVersion}» ≠ код PARSER_VERSION «${PARSER_VERSION}»`,
    );
  }
  const results = reg.contracts.map((c) =>
    licenseContract(c, repoRoot, { compat: reg.compat }),
  );
  return {
    ok: regProbs.length === 0 && results.every((r) => r.valid),
    parserVersion: PARSER_VERSION,
    results,
    registryProblems: regProbs,
  };
}
