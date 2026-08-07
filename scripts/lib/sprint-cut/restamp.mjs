/**
 * Одноразовый перенос дайджестов нарезки на расширенную канонизацию (долг
 * `#plan-comment-keys-outside-digest`, 07.08).
 *
 * Зачем вообще перенос. `canonicalJson` перестал выбрасывать `//`-ключи, и это меняет
 * значение хеша у КАЖДОГО плана, где такие ключи есть (25 из 46). Без переноса все они
 * разом стали бы `plan_unratified`, то есть внедрение зуба завело бы ложное красное на
 * всей истории дерева — ровно та цена, которую `ratification.js` уже отказался платить
 * один раз (см. комментарий в `stampRevisions` про первую простановку `revisionOf`).
 *
 * Чем перенос НЕ является. Он не переносит согласие на изменённый контракт: тело плана
 * не трогается ни в одном байте, `by` и `at` остаются владельца. Меняется только
 * функция хеширования того же самого тела. Поэтому единственная законная операция —
 * пересчёт, и только там, где согласие было годным ДО правки.
 *
 * Нужна ли перератификация владельцем — НЕТ, и это померено, а не выведено: после переноса
 * `sprint:cut` прогнан по всем 46 живым планам, находки `plan_unratified` нет ни у одного.
 * Гейт принимает перенесённые дайджесты как есть. Стоячая проверка того же — сухой прогон
 * `yarn sprint:cut:restamp`: он печатает отказом всякий план, чьё тело правили после
 * согласия, и такому плану перенос запрещён.
 *
 * Отсюда главное правило: если дайджест не сходится ни по старому правилу, ни по новому,
 * план НЕ перештамповывается. Такое расхождение значит «тело правили после согласия», и
 * миграция, которая его пересчитает, отмоет сломанное согласие в годное. Такой план
 * уезжает в отказ с причиной.
 *
 * Часов и ФС здесь нет: чистые функции над значением.
 */
import { createHash } from 'node:crypto';

import { blockRevisionDigest, cutDigestOf, isIsoWithOffset, RATIFIED_BY } from './ratification.mjs';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/**
 * Канонизация ДО правки 07.08: `//`-ключи выброшены из хеша.
 *
 * Копия живёт здесь СОЗНАТЕЛЬНО и только ради одноразовой сверки: чтобы отличить
 * «согласие было годным по прежнему правилу» от «тело правили после согласия», нужен
 * прежний хеш. Держать её в `ratification.mjs` нельзя — там она была бы вторым живым
 * правилом канонизации, то есть приглашением спутать.
 */
function legacyCanonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(legacyCanonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((k) => !k.startsWith('//') && value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${legacyCanonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Прежний дайджест тела плана. @param {object} plan @returns {string} */
export function legacyCutDigestOf(plan) {
  const { ratification: _skip, ...body } = plan ?? {};
  return sha256(legacyCanonicalJson(body));
}

/** Прежний дайджест тела блока. @param {object} block @returns {string} */
export function legacyBlockRevisionDigest(block) {
  const body = { ...block };
  delete body.revisionAt;
  delete body.revisionOf;
  return sha256(legacyCanonicalJson(body));
}

/**
 * Перештамповать `revisionOf` блоков, у которых метка была В СИНХРОНЕ по прежнему правилу.
 *
 * `revisionAt` не двигается ни у одного блока: тело не менялось, менялась функция хеша.
 * Блок, чей `revisionOf` разошёлся с телом уже до миграции, не трогается — это живой
 * сигнал перерезки, и гасить его миграцией значит терять вещдок.
 *
 * @param {unknown} blocks
 * @returns {{blocks: unknown, restamped: number, untouched: number}}
 */
export function restampBlocks(blocks) {
  if (!Array.isArray(blocks)) return { blocks, restamped: 0, untouched: 0 };
  let restamped = 0;
  let untouched = 0;
  const next = blocks.map((b) => {
    if (!b || typeof b !== 'object' || b.revisionOf === undefined) {
      untouched += 1;
      return b;
    }
    if (b.revisionOf === blockRevisionDigest(b)) {
      untouched += 1; // уже по новому правилу
      return b;
    }
    if (b.revisionOf === legacyBlockRevisionDigest(b)) {
      restamped += 1;
      return { ...b, revisionOf: blockRevisionDigest(b) };
    }
    untouched += 1; // разошёлся до миграции — чужой вещдок не гасим
    return b;
  });
  return { blocks: next, restamped, untouched };
}

/**
 * @typedef {object} RestampResult
 * @property {'restamped'|'skipped'} action
 * @property {object} plan план после переноса (при `skipped` — исходный, байт в байт)
 * @property {string} reason причина словами: читается в отчёте прогона
 * @property {number} blocksRestamped сколько блоков получили новый `revisionOf`
 */

/**
 * Перенести дайджест одного плана. Тело не трогается; `by`/`at`/`revisionAt` сохраняются.
 *
 * @param {object} plan
 * @returns {RestampResult}
 */
export function restampPlan(plan) {
  const skip = (reason) => ({ action: 'skipped', plan, reason, blocksRestamped: 0 });

  if (!plan || typeof plan !== 'object') return skip('план не объект — переносить нечего');

  const r = plan.ratification;
  if (!r || typeof r !== 'object') return skip('ратификации нет — согласия для переноса не существует');
  if (r.by !== RATIFIED_BY) return skip(`by=«${r.by ?? '—'}» не владелец — согласия для переноса не существует`);
  if (!isIsoWithOffset(r.at)) return skip(`at=«${r.at ?? '—'}» не ISO-8601 со смещением — согласие негодно и до миграции`);

  if (r.digest === cutDigestOf(plan)) return skip('дайджест уже по новому правилу');

  if (r.digest !== legacyCutDigestOf(plan)) {
    return skip('дайджест не сходится ни по старому правилу, ни по новому: тело правили после согласия — перенос запрещён');
  }

  // Блоки перештамповываются ДО пересчёта дайджеста тела: `revisionOf` — часть тела.
  const { blocks, restamped } = restampBlocks(plan.blocks);
  const body = blocks === plan.blocks ? { ...plan } : { ...plan, blocks };
  delete body.ratification;
  const digest = cutDigestOf(body);

  // Порядок ключей сохраняется ПОИМЁННО, а не пересборкой `{ ...body, ratification }`.
  // Сборка со `ratification` в хвосте уводила бы узел подписи в конец файла, а всё, что
  // стояло за ним, — вперёд: на `subconscious-lift-c3.json` так всплыли три `//recut-*`
  // ключа, и дифф вырос впятеро без единого изменения содержания. Дайджест от порядка не
  // зависит, значит перестановка не давала ничего, кроме шума в ревью.
  const next = {};
  for (const key of Object.keys(plan)) {
    if (key === 'ratification') next[key] = { ...r, digest };
    else if (key === 'blocks') next[key] = blocks;
    else next[key] = plan[key];
  }

  return {
    action: 'restamped',
    plan: next,
    reason: 'дайджест пересчитан по расширенной канонизации; тело, by, at и порядок ключей не тронуты',
    blocksRestamped: restamped,
  };
}
