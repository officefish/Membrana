/**
 * validateWorkshop — зуб контракта «домашней мастерской» (Ф2, заседание home-workshop).
 *
 * Канон: [`docs/patterns/HOME_WORKSHOP.md`](../../docs/patterns/HOME_WORKSHOP.md),
 * вердикты `m1-contract` (поля манифеста) и `m2-vocabulary` (словарь глаголов).
 * Шов Ф2↔Ф5: `inspectElement` — SHOULD (отсутствие = предупреждение, не провал).
 * Amendment g0 / #1056 (V2 wins): `audit`+`decompose` — ключи MUST; значение —
 * непустая строка (инвентарь в этой мастерской) или `null` (вынесены в соседний
 * контур / CI; ⚠, не провал). MUST покрытия **дома** остаётся в паттерне.
 *
 * Детерминирована, без сети; файловая система — единственный вход (при резолве pattern/kit).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/** Обязательные ключи манифеста мастерской (вердикт Ф1). */
const REQUIRED_KEYS = ['pattern', 'name', 'worksOn', 'kit', 'verbs'];
/**
 * Опциональные поля иерархии / семантики (tasks-workshop V1).
 * Носитель правил: docs/audit/workshop-semantics.json.
 */
const OPTIONAL_KEYS = ['role', 'dependentOn', 'mirrorsFrom', 'rulesVersion', 'usage'];

/** Обязательные поля записи `usage` (поправка Ф1 от 31.07). */
export const USAGE_RECORD_KEYS = Object.freeze(['what', 'sample', 'measuredAt']);

/** Дата прогона примера: `YYYY-MM-DD`. */
const MEASURED_AT_RE = /^\d{4}-\d{2}-\d{2}$/u;
const ALLOWED_KEYS = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];
/** MUST-ключи инвентаря (вердикт Ф2 + g0): отсутствие ключа — дефект; null — ⚠. */
const REQUIRED_VERB_KEYS = ['audit', 'decompose'];
/**
 * Известные ключи словаря. Decision-verbs (V2 wins): list/board/bookkeeping/reviewing
 * — ядро мастерской docs/tasks; audit/decompose остаются ключами (часто null).
 */
const KNOWN_VERB_KEYS = [
  'audit',
  'decompose',
  'inspectElement',
  'list',
  'board',
  'bookkeeping',
  'reviewing',
  'stackLike',
  'domain',
];
/** Decision-глаголы сверх inspectElement — строка (в т.ч. planned:) или отсутствие ключа. */
const DECISION_VERB_KEYS = ['list', 'board', 'bookkeeping', 'reviewing'];
/** Допустимые ключи доменной записи (прочие — «свалка»). */
const KNOWN_DOMAIN_KEYS = ['name', 'worksOn', 'tool'];
const KNOWN_ROLES = ['primary', 'derivative'];

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
  for (const k of keys) if (!ALLOWED_KEYS.includes(k)) problems.push(`лишнее поле ${k}`);

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

  // Иерархия (V1): role / dependentOn / mirrorsFrom / rulesVersion.
  if (keys.includes('role')) {
    if (!KNOWN_ROLES.includes(m.role)) {
      problems.push(`role — ожидается ${KNOWN_ROLES.join('|')}`);
    }
  }
  if (keys.includes('dependentOn')) {
    if (!Array.isArray(m.dependentOn) || m.dependentOn.length === 0 || !m.dependentOn.every(isNonEmptyString)) {
      problems.push('dependentOn — непустой массив непустых строк');
    }
  }
  if (keys.includes('mirrorsFrom') && !isNonEmptyString(m.mirrorsFrom)) {
    problems.push('mirrorsFrom — не непустая строка');
  }
  if (keys.includes('rulesVersion') && !isNonEmptyString(m.rulesVersion) && typeof m.rulesVersion !== 'number') {
    problems.push('rulesVersion — непустая строка или число');
  }

  // `usage` — поле-сосед `verbs` (поправка Ф1, 31.07): что даёт вызов и как выглядит вывод.
  //
  // НЕОБЯЗАТЕЛЬНО: отсутствие не делает манифест хуже, и MUST мимо комнаты не вводится.
  // Но если поле есть — его форма проверяется целиком: половина записи хуже её отсутствия,
  // потому что выглядит документацией, ею не будучи.
  if (keys.includes('usage')) {
    const u = m.usage;
    if (u === null || typeof u !== 'object' || Array.isArray(u)) {
      problems.push('usage — не объект');
    } else {
      const verbKeys = m.verbs !== null && typeof m.verbs === 'object' && !Array.isArray(m.verbs)
        ? Object.keys(m.verbs)
        : [];
      for (const [k, rec] of Object.entries(u)) {
        // Подмножество verbs: пример для несуществующего глагола описывает дверь, которой
        // нет. Тот же класс, что пойман 31.07 в полу сессии и в атласе.
        if (!verbKeys.includes(k)) {
          problems.push(`usage.${k} — глагола нет в verbs: пример описывает дверь, которой не существует`);
          continue;
        }
        if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) {
          problems.push(`usage.${k} — не объект`);
          continue;
        }
        for (const f of USAGE_RECORD_KEYS) {
          if (!isNonEmptyString(rec[f])) problems.push(`usage.${k}.${f} — не непустая строка`);
        }
        // Дата обязательна: сверить вывод с реальностью машинно нельзя, но возраст снимка
        // показать можно. Без даты пример через полгода читается как факт.
        if (isNonEmptyString(rec.measuredAt) && !MEASURED_AT_RE.test(rec.measuredAt)) {
          problems.push(`usage.${k}.measuredAt — не YYYY-MM-DD`);
        }
        for (const f of Object.keys(rec)) {
          if (!USAGE_RECORD_KEYS.includes(f)) problems.push(`usage.${k}: лишнее поле ${f}`);
        }
      }
    }
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
      // audit / decompose — ключи MUST; значение: непустая строка (в этой мастерской)
      // или null (вынесены вовне — ⚠; g0 V2 / #1056). Пустая строка — дефект.
      for (const k of ['audit', 'decompose']) {
        if (!vkeys.includes(k)) continue;
        if (v[k] === null) {
          warnings.push(
            `${k} = null (инвентарь вне этой мастерской — соседний контур/CI; покрытие дома MUST остаётся)`,
          );
        } else if (!isNonEmptyString(v[k])) {
          problems.push(`verbs.${k} — непустая строка или null`);
        }
      }
      // inspectElement — SHOULD: отсутствие ключа ИЛИ null → предупреждение (⚠), не провал (шов Ф2↔Ф5).
      if (!vkeys.includes('inspectElement') || v.inspectElement === null) {
        warnings.push('inspectElement отсутствует (SHOULD) — ⚠ мастерская не спускается в элемент');
      } else if (!isNonEmptyString(v.inspectElement)) {
        problems.push('verbs.inspectElement — не строка и не null');
      }
      // Decision-verbs (V2): если ключ есть — непустая строка (адрес/planned), не null.
      for (const k of DECISION_VERB_KEYS) {
        if (!vkeys.includes(k)) continue;
        if (!isNonEmptyString(v[k])) {
          problems.push(`verbs.${k} — непустая строка (состав мастерской / planned:)`);
        }
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
 * `RootPolicy` — где вообще ищутся дома. Поправка к §3 контракта `workshop-wires`,
 * ратифицирована владельцем 31.07 ([`AMENDMENT_S3`](../../docs/meeting/workshop-wires/AMENDMENT_S3.md)).
 *
 * ДВА КЛАССА, И ЭТО СУЩЕСТВЕННО. Первый — поддерево `docs/`: правило по форме пути, любой
 * новый дом под ним подхватывается сам. Второй — **поимённый** список контейнеров в корне
 * репозитория: правила по форме тут быть не может, иначе домом становилась бы любая папка с
 * README, а §3 это запрещает прямо.
 *
 * Почему список именно поимённый, а не «корневые каталоги с манифестом»: обнаружение по
 * наличию манифеста замкнуло бы круг — кто положил манифест, тот и дом. Тогда `RootPolicy`
 * перестаёт быть политикой и становится эхом того, что уже лежит в дереве.
 *
 * Расширять этот список — вносить строку сюда, и только так: молчаливое расширение
 * `RootPolicy` §3 запрещает отдельным пунктом.
 */
export const ROOT_CONTAINER_ALLOWLIST = Object.freeze(['scripts']);

/** Каталоги, в которые обход не заходит ни при каком классе. */
const SKIP_DIRS = new Set(['node_modules', 'cache']);

/**
 * Все `workshop.manifest.json` в области `RootPolicy` (рекурсивно).
 *
 * До поправки корень был зашит одной строкой `join(repoRoot, 'docs')`, и этим питались оба
 * живых потребителя — `validate:workshop` и справочник. Следствие ловилось руками 31.07:
 * канонически валидный манифест `scripts/workshop.manifest.json` не читал НИКТО, поэтому
 * §4 опирался на предпосылку, которой в проде не было.
 *
 * @param {string} repoRoot
 * @returns {string[]} абсолютные пути манифестов
 */
export function listWorkshopManifests(repoRoot) {
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(p);
      } else if (e.name === 'workshop.manifest.json') {
        found.push(p);
      }
    }
  };
  for (const top of ['docs', ...ROOT_CONTAINER_ALLOWLIST]) {
    const root = join(repoRoot, top);
    if (existsSync(root)) walk(root);
  }
  // Порядок обхода закреплён: `docs` раньше корневых, внутри — как отдаёт readdir. Без
  // сортировки отчёт и атлас перетасовывались бы от файловой системы, и дрейф справочника
  // ловил бы перестановку как расхождение.
  return found.sort();
}

/** Утилита: имя дома-контейнера мастерской по пути манифеста. */
export function workshopHome(manifestPath) {
  return basename(dirname(manifestPath));
}
