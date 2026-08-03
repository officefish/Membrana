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
import { TRACE_KIND_CARRIER_EXISTS, TRACE_KINDS } from './trace-kinds.mjs';

/**
 * Рода, ОБЯЗАТЕЛЬНЫЕ для `honest_pair` (#1641): пара «прогон контекста + ревью» — то, что имя
 * вердикта обещало всегда и что до 03.08 не проверялось вовсе.
 *
 * Список ЯВНЫЙ, а не выведенный из `TRACE_KIND_CARRIER_EXISTS`: появление носителя у
 * `contract_signature` не должно молча ужесточить требование и перекрасить историю — такое
 * расширение делается актом, как и любое движение закрытого списка. Зуб же держит обратное
 * включение: каждый ТРЕБУЕМЫЙ род обязан иметь носитель сегодня — требовать неисполнимое
 * запрещено.
 */
export const REQUIRED_PAIR_KINDS = Object.freeze([TRACE_KINDS.CONTEXT_RUN, TRACE_KINDS.REVIEW_PASS]);

/**
 * Каких родов пары не хватает в наборе следов. Пустой список ⟺ пара полна.
 * @param {readonly NormalizedTrace[]} traces
 * @returns {string[]}
 */
export function missingPairKinds(traces) {
  const present = new Set(traces.map((t) => t.kind));
  return REQUIRED_PAIR_KINDS.filter((k) => TRACE_KIND_CARRIER_EXISTS[k] && !present.has(k));
}

/**
 * Отозван ли протухший след актом перерезки (#1638).
 *
 * УСЛОВИЕ ВРЕМЕННОЕ, и это несущее (слово резчика 03.08): голый факт «в ленте актов есть
 * `recut_act` этого спринта» легализовал бы старый акт, случайно лежащий в ленте, — дверь
 * распахнулась бы на весь спринт, и отзыв стал бы неотличим от изъятия.
 *
 * Формула: `t_stale.at ≤ act.at ≤ revisionAt` — акт лежит МЕЖДУ протухшим следом и ревизией
 * предмета, то есть судит именно тот контракт, который след успел застать. Требование «свежий
 * след после акта» отдельной проверки не требует: свежесть определена как `t.at ≥ revisionAt`,
 * а `revisionAt ≥ act.at` уже входит в формулу.
 *
 * Направление неравенства НЕ как в черновике резчика (`act.at ≥ revisionAt`): акт перерезки
 * пишется ДО ратификации, а ратификация и проставляет `revisionAt` — при обратной сверке дверь
 * не открылась бы никогда. Довод записан в акте нарезки v1.
 *
 * Допуск ε = 0 сознательно: старые ленты с грязными метками (Z-суффикс на местном времени)
 * дверь не откроют — и не должны. Дверь для будущих перерезок с честными метками.
 *
 * @param {NormalizedTrace} staleTrace протухший след (`t.at < revisionAt` уже установлено)
 * @param {NormalizedBlock} block
 * @param {readonly {kind:string, at:number}[]} recutActs акты перерезки ЭТОГО спринта, `at` в epoch ms
 * @returns {boolean}
 */
export function supersededByRecut(staleTrace, block, recutActs) {
  return (recutActs ?? []).some((a) => staleTrace.at <= a.at && a.at <= block.revisionAt);
}

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
 * refused_with_reason → plan_lied → wrong_performer → stale_trace → stale_partial →
 * unresolvable_ref → incomplete_trace → honest_pair.
 * Пустой корпус до сюда не доходит: `no_corpus` выносится выше, на уровне прогона (M5).
 * Состав родов проверяется ПОСЛЕДНИМ из stop-исходов: сначала «след есть и настоящий»
 * (исполнитель, свежесть, разрешимость), лишь затем «след полон» — иначе один протухший
 * context_run читался бы как «пары нет», хотя на деле «пара была, но судила другую вещь».
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
    const key = `${t.kind} ${t.ref}`;
    pairs.set(key, [...(pairs.get(key) ?? []), t.traceId]);
  }
  for (const [key, ids] of pairs) {
    if (ids.length < 2) continue;
    findings.push({
      toothId: FINDINGS.DUPLICATE_TRACE,
      blockId: block.blockId,
      reason: `пара (${key.split(' ')[0]}, ${key.split(' ')[1]}) встречается ${ids.length} раза: ${ids.join(', ')}`,
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
    // Свежих нет — отзыв НЕ работает и при записанном акте: «перерезал и не перепрогнал»
    // остаётся красным. Дверь #1638 открывается только сделанным перепрогоном.
    return done(
      VERDICTS.STALE_TRACE,
      `все ${own.length} следов ${block.assigned} старше ревизии предмета блока; перенос согласия на изменённый контракт запрещён`,
    );
  }

  // Отзыв протухшего следа актом перерезки (#1638): свежие следы ЕСТЬ (проверено выше), и
  // если протухание объяснено законным актом — след дисквалифицируется поимённо, а не
  // отравляет вердикт. Лента неприкосновенна; изъятие строки становится ненужным и потому
  // подозрительным. Протухшие БЕЗ акта идут прежней дорогой в stale_partial — вещдок #1566.
  const recutActs = ctx.recutActs ?? [];
  const superseded = new Set();
  for (const t of own) {
    if (!isStale(t, block)) continue;
    if (!supersededByRecut(t, block, recutActs)) continue;
    superseded.add(t.traceId);
    disqualified.push({
      toothId: DISQUALIFICATIONS.SUPERSEDED_BY_RECUT,
      blockId: block.blockId,
      traceId: t.traceId,
      reason:
        `след ${t.traceId} (${t.kind}) судил контракт до перерезки: акт recut_act лежит между ` +
        'ним и ревизией предмета — дисквалифицирован актом перерезки (не изъят)',
    });
  }
  const ownCounted = own.filter((t) => !superseded.has(t.traceId));
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
  const staleOwn = ownCounted.filter((t) => isStale(t, block));
  if (staleOwn.length > 0) {
    return done(
      VERDICTS.STALE_PARTIAL,
      `${staleOwn.length} из ${ownCounted.length} вещдоков ${block.assigned} старше ревизии предмета блока: ` +
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
  // Состав родов — ДЕВЯТЫЙ вердикт (#1641). До 03.08 сюда доходил любой непустой
  // `resolvable`, и блок с одним `review_pass` получал `honest_pair`: имя обещало пару,
  // условие проверяло «хотя бы один». Пропуск 02.08 (`report-surfacing-wire`) был виден в
  // самом тексте вердикта — «1 вещдоков рода review_pass» — но вердикта не менял, и в
  // итоговой строке блок был неотличим от полностью честного.
  const missing = missingPairKinds(resolvable);
  if (missing.length > 0) {
    return done(
      VERDICTS.INCOMPLETE_TRACE,
      `след ${block.assigned} валиден и свеж, но пары нет: отсутствует ${missing.join(' и ')} ` +
        `(есть только ${[...new Set(resolvable.map((t) => t.kind))].join('/')}, ${denom}); ` +
        'добыть недостающий род или признать, что работа шла без него',
      resolvable.map((t) => t.ref),
    );
  }
  if (others.length > 0) {
    findings.push({
      toothId: FINDINGS.EXTRA_PERFORMER,
      blockId: block.blockId,
      reason: `поверх честного плана есть следы: ${[...new Set(others.map((t) => t.subject))].join(', ')}`,
    });
  }
  // Слова вердикта утверждают ПРОВЕРЕННОЕ: «полная пара» здесь гарантирована предикатом
  // выше, а не дисциплиной докладчика. Прежний текст печатал найденные рода как достижение,
  // даже когда род был один.
  return done(
    VERDICTS.HONEST_PAIR,
    `${block.assigned} назначен и участвовал, пара полна (${REQUIRED_PAIR_KINDS.join(' + ')}): ` +
      `${resolvable.length} вещдоков (${denom})`,
    resolvable.map((t) => t.ref),
  );
}
