/**
 * ПРЕДИКАТЫ гейта. Только предикаты: вердикт — ровно один из семи закрытых,
 * находка — с именем (`toothId`), отказ — легальным «нет с причиной», не пустым полем.
 *
 * Запрещено внутри: `fs`, сеть, `git`/`gh`, `Date.now()`, `Math.random()`.
 * Время приходит параметром: окно и `revisionAt` — от плана, метка `at` — от следа.
 * Гейт временем не владеет: иначе один и тот же вход в другой час даёт другой вердикт.
 */

import { DISQUALIFICATIONS, FINDINGS, VERDICTS } from './gate-exit-codes.mjs';
import { MODES } from './plan-reader.mjs';
import { TRACE_KINDS } from './trace-kinds.mjs';

/**
 * @typedef {import('./plan-reader.mjs').NormalizedBlock} NormalizedBlock
 * @typedef {import('./trace-corpus.mjs').NormalizedTrace} NormalizedTrace
 *
 * @typedef {object} BlockJudgement
 * @property {string} blockId
 * @property {string} personaId
 * @property {string} verdict
 * @property {string[]} evidenceRefs
 * @property {string} reason                       НИКОГДА не пустой
 * @property {boolean} stopped
 * @property {{toothId:string, blockId:string, reason:string}[]} findings
 * @property {{toothId:string, blockId:string, traceId:string, reason:string}[]} disqualified
 */

/** След внутри полуинтервала `[from, to)`. @param {NormalizedTrace} t @param {NormalizedBlock} b */
export function inWindow(t, b) {
  return t.at >= b.from && t.at < b.to;
}

/** След в допуске позднего закрытия `[to, to + graceMs)`; grace = 0 по умолчанию `//provisional`. */
export function inGrace(t, b) {
  return b.graceMs > 0 && t.at >= b.to && t.at < b.to + b.graceMs;
}

/** Протух ⟺ след старше ревизии ПРЕДМЕТА блока. Календарного TTL нет — числа суток владелец не называл. */
export function isStale(t, b) {
  return t.at < b.revisionAt;
}

/**
 * Следы, дисквалифицированные порядком: прогон через контекст РАНЬШЕ подписи контракта
 * того же субъекта. Старт возможен только при «назначен И принял» (M2), поэтому такой
 * прогон не свидетельствует о принятой ответственности и в множество вещдоков не входит
 * («работавший без назначения API не получает», M4).
 *
 * Подпись ищется по ВСЕЙ ленте блока, не только внутри окна: подпись, доехавшая после
 * закрытия окна, всё равно означает, что в момент прогона согласия ещё не было.
 * Если подписи в ленте нет вовсе — дисквалификации нет: носителя рода сегодня не существует
 * (`//provisional`), и вменять отсутствие носителя исполнителю нельзя.
 *
 * @param {readonly NormalizedTrace[]} candidates следы-кандидаты в вещдоки (в окне)
 * @param {readonly NormalizedTrace[]} signatureSource вся лента блока
 * @returns {Set<string>} traceId
 */
export function disqualifiedByOrder(candidates, signatureSource = candidates) {
  /** @type {Map<string, number>} */
  const firstSignature = new Map();
  for (const t of signatureSource) {
    if (t.kind !== TRACE_KINDS.CONTRACT_SIGNATURE) continue;
    const prev = firstSignature.get(t.subject);
    if (prev === undefined || t.at < prev) firstSignature.set(t.subject, t.at);
  }
  const out = new Set();
  for (const t of candidates) {
    if (t.kind !== TRACE_KINDS.CONTEXT_RUN) continue;
    const sig = firstSignature.get(t.subject);
    if (sig !== undefined && t.at < sig) out.add(t.traceId);
  }
  return out;
}

/**
 * Вердикт по одному блоку плана. Лестница вердиктов ФИКСИРОВАНА и проверяется в этом порядке:
 * refused_with_reason → plan_lied → wrong_performer → stale_trace → unresolvable_ref → honest_pair.
 * Пустой корпус до сюда не доходит: `no_corpus` выносится выше, на уровне прогона (M5).
 *
 * @param {NormalizedBlock} block
 * @param {readonly NormalizedTrace[]} corpus     вся лента (сопоставление — ТОЛЬКО по blockId)
 * @param {{ resolveRef: (ref: string) => boolean }} ctx
 * @returns {BlockJudgement}
 */
export function judgeBlock(block, corpus, ctx) {
  /** @type {BlockJudgement['findings']} */
  const findings = [];
  /** @type {BlockJudgement['disqualified']} */
  const disqualified = [];
  const done = (verdict, reason, evidenceRefs = []) => ({
    blockId: block.blockId,
    personaId: block.assigned,
    verdict,
    evidenceRefs,
    reason,
    stopped: false, // выставляется вызывающим по таблице класса — единственный источник классификации
    findings,
    disqualified,
  });

  if (block.mode === MODES.NO_PERSONAL_RESPONSIBILITY) {
    // Вторая дверь (M7): отчёт говорит «не применимо», а не «пройдено». В зелёные блок не входит.
    return done(
      VERDICTS.REFUSED_WITH_REASON,
      `персональной ответственности нет по причине «${block.reason}» — честность блока не проверяется`,
    );
  }

  const mine = corpus.filter((t) => t.blockId === block.blockId);
  const counted = mine.filter((t) => inWindow(t, block) || inGrace(t, block));
  const outside = mine.filter((t) => !counted.includes(t));

  for (const t of outside) {
    if (t.at >= block.to && t.relatesToSprint) {
      findings.push({
        toothId: FINDINGS.LATE_CLOSE,
        blockId: block.blockId,
        reason: `след ${t.traceId} (${t.kind}) вне окна и связан со спринтом; в participated не входит`,
      });
    }
  }

  const dq = disqualifiedByOrder(counted, mine);
  for (const t of counted) {
    if (!dq.has(t.traceId)) continue;
    disqualified.push({
      toothId: DISQUALIFICATIONS.RUN_BEFORE_SIGNATURE,
      blockId: block.blockId,
      traceId: t.traceId,
      reason: 'прогон через контекст раньше подписи контракта — след не свидетельствует о принятой ответственности (M2)',
    });
  }
  const valid = counted.filter((t) => !dq.has(t.traceId));

  // Находка порядка: ревью судило непринятый контракт.
  const firstSig = Math.min(
    ...counted.filter((t) => t.kind === TRACE_KINDS.CONTRACT_SIGNATURE).map((t) => t.at),
    Number.POSITIVE_INFINITY,
  );
  // Подписи в ленте нет вовсе → сравнивать не с чем: носителя рода сегодня не существует
  // (`//provisional`), и отсутствие носителя находкой не вменяется.
  for (const t of Number.isFinite(firstSig) ? counted : []) {
    if (t.kind === TRACE_KINDS.REVIEW_PASS && t.at < firstSig) {
      findings.push({
        toothId: FINDINGS.ORDER_REVIEW_EARLY,
        blockId: block.blockId,
        reason: `${t.traceId}: review_pass раньше contract_signature — ревью судило непринятый контракт`,
      });
    }
  }

  // Находка дубля: тот же акт мог доехать двумя путями — решает человек, вердикт не меняется.
  /** @type {Map<string, string[]>} */
  const pairs = new Map();
  for (const t of counted) {
    const key = `${t.kind} ${t.ref}`;
    pairs.set(key, [...(pairs.get(key) ?? []), t.traceId]);
  }
  for (const [key, ids] of pairs) {
    if (ids.length < 2) continue;
    findings.push({
      toothId: FINDINGS.DUPLICATE_TRACE,
      blockId: block.blockId,
      reason: `пара (${key.split(' ')[0]}, ${key.split(' ')[1]}) встречается ${ids.length} раза: ${ids.join(', ')}`,
    });
  }

  const denom = `следов блока ${mine.length}, в окне ${counted.length}, валидных ${valid.length}`;
  const own = valid.filter((t) => t.subject === block.assigned);
  const others = valid.filter((t) => t.subject !== block.assigned);

  if (own.length === 0 && others.length === 0) {
    // «План соврал»: исполнитель назначен, следов его исполнения ноль при НЕПУСТОМ корпусе.
    return done(
      VERDICTS.PLAN_LIED,
      `назначен ${block.assigned}, вещдоков исполнения ноль (${denom}); добыть след или признать, что исполнения не было`,
    );
  }
  if (own.length === 0) {
    // Не тот исполнитель ≠ следа нет: лечится ПЛАНОМ, «ещё один след» добывать бессмысленно.
    const who = [...new Set(others.map((t) => t.subject))].join(', ');
    return done(
      VERDICTS.WRONG_PERFORMER,
      `назначен ${block.assigned}, исполняли: ${who} (${denom}); поправить план или признать shadow_work`,
    );
  }
  const fresh = own.filter((t) => !isStale(t, block));
  if (fresh.length === 0) {
    return done(
      VERDICTS.STALE_TRACE,
      `все ${own.length} следов ${block.assigned} старше ревизии предмета блока; перенос согласия на изменённый контракт запрещён`,
    );
  }
  // Частичное протухание — восьмой вердикт (акт владельца 01.08).
  //
  // Раньше здесь была дыра: `stale_trace` выше ловит только «протухли ВСЕ», а если уцелел
  // хоть один след, протухшие молча выпадали из `evidenceRefs` — и блок получал `honest_pair`
  // на неполном основании. Вещдок #1566: родитель разобран, из него нарезаны три ребёнка,
  // прогон контекста остался один, и все три вышли зелёными на разборе вещи, которой в той
  // форме не существовало. «honest_pair слабее, чем читается» — это про этот путь.
  //
  // Отбрасывать молча нельзя, и «понижать до stale_trace» тоже: «всё протухло» и «часть
  // протухла» — разные состояния, и слить их значило бы потерять различие, ради которого
  // предикат свежести вообще есть.
  const staleOwn = own.filter((t) => isStale(t, block));
  if (staleOwn.length > 0) {
    return done(
      VERDICTS.STALE_PARTIAL,
      `${staleOwn.length} из ${own.length} вещдоков ${block.assigned} старше ревизии предмета блока: ` +
        `они судили другую вещь. Свежих ${fresh.length} — пара не полна`,
      fresh.filter((t) => ctx.resolveRef(t.ref)).map((t) => t.ref),
    );
  }
  const resolvable = fresh.filter((t) => ctx.resolveRef(t.ref));
  if (resolvable.length === 0) {
    return done(
      VERDICTS.UNRESOLVABLE_REF,
      `все ${fresh.length} следов ${block.assigned} несут неразрешимый адрес; починить ленту — о неисполнении это ничего не говорит`,
    );
  }
  if (others.length > 0) {
    findings.push({
      toothId: FINDINGS.EXTRA_PERFORMER,
      blockId: block.blockId,
      reason: `поверх честного плана есть следы: ${[...new Set(others.map((t) => t.subject))].join(', ')}`,
    });
  }
  return done(
    VERDICTS.HONEST_PAIR,
    `${block.assigned} назначен и участвовал: ${resolvable.length} вещдоков рода ${[...new Set(resolvable.map((t) => t.kind))].join('/')} (${denom})`,
    resolvable.map((t) => t.ref),
  );
}
