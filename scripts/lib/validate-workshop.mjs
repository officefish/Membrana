/**
 * validateWorkshop — зуб контракта «домашней мастерской» (Ф2, заседание home-workshop).
 *
 * Канон: [`docs/patterns/HOME_WORKSHOP.md`](../../docs/patterns/HOME_WORKSHOP.md),
 * вердикты `m1-contract` (поля манифеста) и `m2-vocabulary` (словарь глаголов).
 * Шов Ф2↔Ф5 разрешён Ф5: `audit`+`decompose` — MUST, `inspectElement` — SHOULD
 * (отсутствие = предупреждение, не провал), т.к. у живущих мастерских его пока нет.
 *
 * Детерминирована, без сети; файловая система — единственный вход (при резолве pattern/kit).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/** Обязательные ключи манифеста мастерской (вердикт Ф1). */
const REQUIRED_KEYS = ['pattern', 'name', 'worksOn', 'kit', 'verbs'];
/** MUST-глаголы словаря (вердикт Ф2): их отсутствие — дефект. */
const REQUIRED_VERB_KEYS = ['audit', 'decompose'];
/** Все известные ключи словаря (прочие — «свалка»). `inspectElement` — SHOULD. */
const KNOWN_VERB_KEYS = ['audit', 'decompose', 'inspectElement', 'stackLike', 'domain'];
/** Допустимые ключи доменной записи (прочие — «свалка»). */
const KNOWN_DOMAIN_KEYS = ['name', 'worksOn', 'tool'];

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Проверить схему манифеста мастерской.
 * @param {unknown} m распарсенный манифест
 * @returns {{problems: string[], warnings: string[]}}
 */
export function workshopSchemaProblems(m) {
  const problems = [];
  const warnings = [];
  if (m === null || typeof m !== 'object' || Array.isArray(m)) {
    return { problems: ['workshop.manifest.json — не объект'], warnings };
  }
  const keys = Object.keys(m);
  for (const k of REQUIRED_KEYS) if (!keys.includes(k)) problems.push(`нет поля ${k}`);
  for (const k of keys) if (!REQUIRED_KEYS.includes(k)) problems.push(`лишнее поле ${k}`);

  if (keys.includes('pattern') && !isNonEmptyString(m.pattern)) {
    problems.push('pattern — не непустая строка');
  }
  if (keys.includes('name') && !isNonEmptyString(m.name)) {
    problems.push('name — не непустая строка');
  }
  // worksOn — ровно один дом (строка, не массив); кратность 1 (Ф1).
  if (keys.includes('worksOn')) {
    if (Array.isArray(m.worksOn)) problems.push('worksOn — массив; мастерская работает над ОДНИМ домом (кратность 1)');
    else if (!isNonEmptyString(m.worksOn)) problems.push('worksOn — не непустая строка');
  }
  // kit — null (интерактивная мастерская) или строка kits/<id> (Ф5: null объявлен явно).
  if (keys.includes('kit') && m.kit !== null && !isNonEmptyString(m.kit)) {
    problems.push('kit — не строка и не null');
  }

  if (keys.includes('verbs')) {
    const v = m.verbs;
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      problems.push('verbs — не объект');
    } else {
      const vkeys = Object.keys(v);
      for (const k of REQUIRED_VERB_KEYS) if (!vkeys.includes(k)) problems.push(`verbs: нет ключа ${k}`);
      for (const k of vkeys) {
        if (!KNOWN_VERB_KEYS.includes(k)) problems.push(`verbs: лишний ключ ${k}`);
      }
      // audit / decompose — MUST (непустые строки).
      for (const k of ['audit', 'decompose']) {
        if (vkeys.includes(k) && !isNonEmptyString(v[k])) problems.push(`verbs.${k} — MUST, но не непустая строка`);
      }
      // inspectElement — SHOULD: отсутствие ключа ИЛИ null → предупреждение (⚠), не провал (шов Ф2↔Ф5).
      if (!vkeys.includes('inspectElement') || v.inspectElement === null) {
        warnings.push('inspectElement отсутствует (SHOULD) — ⚠ мастерская не спускается в элемент');
      } else if (!isNonEmptyString(v.inspectElement)) {
        problems.push('verbs.inspectElement — не строка и не null');
      }
      // stackLike — опц. массив строк.
      if (vkeys.includes('stackLike')) {
        if (!Array.isArray(v.stackLike) || v.stackLike.some((s) => !isNonEmptyString(s))) {
          problems.push('verbs.stackLike — не массив непустых строк');
        }
      }
      // domain — опц. массив {name, worksOn}; каждый доменный инструмент несёт worksOn (Ф2/Ф4).
      if (vkeys.includes('domain')) {
        if (!Array.isArray(v.domain)) {
          problems.push('verbs.domain — не массив');
        } else {
          v.domain.forEach((d, i) => {
            if (d === null || typeof d !== 'object' || Array.isArray(d)) {
              problems.push(`verbs.domain[${i}] — не объект`);
            } else {
              if (!isNonEmptyString(d.name)) problems.push(`verbs.domain[${i}].name — не непустая строка`);
              if (!isNonEmptyString(d.worksOn)) problems.push(`verbs.domain[${i}].worksOn — не непустая строка (каждый доменный инструмент несёт worksOn)`);
              for (const dk of Object.keys(d)) {
                if (!KNOWN_DOMAIN_KEYS.includes(dk)) problems.push(`verbs.domain[${i}] — лишний ключ ${dk}`);
              }
            }
          });
        }
      }
    }
  }
  return { problems, warnings };
}

/**
 * Проверить манифест мастерской.
 * @param {string} manifestPath путь к workshop.manifest.json
 * @param {string} [repoRoot] корень репозитория (для резолва pattern/kit); опционально
 * @returns {{valid: boolean, schemaOk: boolean, resolvable: boolean, problems: string[], warnings: string[]}}
 */
export function validateWorkshop(manifestPath, repoRoot) {
  const problems = [];
  const warnings = [];

  if (!existsSync(manifestPath)) {
    return { valid: false, schemaOk: false, resolvable: false, problems: ['workshop.manifest.json отсутствует'], warnings };
  }

  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return { valid: false, schemaOk: false, resolvable: false, problems: ['workshop.manifest.json — битый JSON'], warnings };
  }

  const schema = workshopSchemaProblems(manifest);
  problems.push(...schema.problems);
  warnings.push(...schema.warnings);
  const schemaOk = schema.problems.length === 0;

  // resolvable: pattern и (если задан) kit резолвятся от repoRoot.
  let resolvable = true;
  if (repoRoot && schemaOk) {
    if (isNonEmptyString(manifest.pattern) && !existsSync(join(repoRoot, manifest.pattern))) {
      problems.push(`pattern не резолвится: ${manifest.pattern}`);
      resolvable = false;
    }
    if (isNonEmptyString(manifest.kit)) {
      const kitManifest = join(repoRoot, manifest.kit, 'MANIFEST.json');
      if (!existsSync(kitManifest)) {
        problems.push(`kit не резолвится как кит: ${manifest.kit}`);
        resolvable = false;
      }
    }
  }

  return {
    valid: problems.length === 0,
    schemaOk,
    resolvable,
    problems,
    warnings,
  };
}

/**
 * Все workshop.manifest.json под docs/ (рекурсивно).
 * @param {string} repoRoot
 * @returns {string[]} абсолютные пути манифестов
 */
export function listWorkshopManifests(repoRoot) {
  const root = join(repoRoot, 'docs');
  const found = [];
  if (!existsSync(root)) return found;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'cache') continue;
        walk(p);
      } else if (e.name === 'workshop.manifest.json') {
        found.push(p);
      }
    }
  };
  walk(root);
  return found;
}

/** Утилита: имя дома-контейнера мастерской по пути манифеста. */
export function workshopHome(manifestPath) {
  return basename(dirname(manifestPath));
}
