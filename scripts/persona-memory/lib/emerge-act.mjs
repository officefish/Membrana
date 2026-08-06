/**
 * Акт персоны над облаком подсознания (C3, блок `lift-persona-act`).
 *
 * **Лифт подаёт — выбирает персона.** Ядро возвращает `emerged: []` и `rejected: false`
 * пустыми по построению; наполнить их вправе только этот модуль, и только разобрав то, что
 * персона сказала сама. Модуль чист: ни файловой системы, ни сети, ни вызовов LLM.
 *
 * Три состояния акта, и все три названы. Молчаливое «не разобрали — значит отказ» и
 * молчаливое «не разобрали — значит ничего» лгут оба: первое приписывает персоне суждение,
 * второго она не выносила, второе прячет, что облако показали впустую.
 */

/** Приставка строки протокола (вердикт M3). По ней и только по ней ищется акт. */
export const PROTOCOL_PREFIX = '[память:подсознание]';

/**
 * λ для MMR при включении. Это НЕ калибровка — калибровка предмет C5, и ядро правильно
 * держит λ без умолчания, роняя вызов без неё. Но включение обязано чем-то позвать, и число
 * здесь названо явно, с провенансом: 0.7 — умолчание MMR из литературы, то же, на котором
 * стоят зубы ядра. Когда C5 назначит своё, менять здесь одну строку.
 */
export const LIFT_LAMBDA_V1 = 0.7;

/**
 * Исходы акта. Закрыт: открытый список означал бы, что «непонятно» можно назвать новым
 * словом вместо того, чтобы признать непонятность.
 */
export const ACT_OUTCOMES = Object.freeze(['emerged', 'rejected', 'silent']);

/** Строка-образец для персоны. Синтаксис прост нарочно: разбирать текст LLM и так рискованно. */
export const ACT_INSTRUCTION = [
  `${PROTOCOL_PREFIX} emerge <id> — <почему именно оно>`,
  `${PROTOCOL_PREFIX} cloud_rejected reason: «<почему не всплыло НИЧЕГО>»`,
  '',
  'Отказ — про облако ЦЕЛИКОМ, а не про остаток. Если всплыло хоть что-то, строки отказа',
  'быть не должно: невсплывшее объяснять не нужно, молчание о нём и есть ответ.',
  'Обе строки разом — противоречие, и такой акт не засчитывается вовсе.',
].join('\n');

/**
 * Приставка протокола НЕОБЯЗАТЕЛЬНА при разборе, и это вывод из живого прогона, а не
 * послабление ради удобства. 02.08 при включении Веснин увидел свой архив и назвал подлинные
 * идентификаторы записей — но оформил их markdown-ом (`**emerge** \`id\` — …`) без приставки.
 * Строгий разбор дал `silent`: облако показано, акт потерян. Контур, мёртвый на практике, —
 * ровно тот дефект, ради устранения которого блок и делался.
 *
 * Ослабления защиты здесь нет. Подлог сторожит не приставка, а `validateAct`: предмет обязан
 * быть В ОБЛАКЕ и обязан нести объяснение. Проза, упомянувшая слово «emerge», этих двух
 * условий не выполнит, а строка с выдуманным идентификатором будет отброшена с причиной.
 */
/**
 * Оформление снимается ОТДЕЛЬНЫМ шагом, а не выражается в самом образце. Первая редакция
 * вплетала украшения в образец повторяющейся группой — и разбор ушёл в катастрофический
 * откат: зуб не упал, а завис. Снятие до разбора делает образцы плоскими и линейными.
 */
function undecorate(line) {
  // Одиночное подчёркивание НЕ трогаем: оно несущее в самом имени `cloud_rejected`.
  // Снимается только парное, которым markdown выделяет жирным.
  return String(line).replace(/(?:`|\*+|__)/gu, '').trim();
}

const EMERGE_LINE = /^(?:\[память:подсознание\]\s*)?emerge\s+(\S+)\s*[—–-]+\s*(.*)$/u;
const REJECT_LINE = /^(?:\[память:подсознание\]\s*)?cloud_rejected\s*(?:reason:)?\s*[—–-]*\s*[«"]?(.*?)[»"]?$/u;

/**
 * Показать облако персоне. Текстом, а не JSON: прецедент RAG-блока в `yarn ask` — персона
 * читает, а не разбирает. Полный текст НЕ выкладывается: `snippetRef.fullRef` даёт дорогу,
 * и персона дотягивает его только для выбранного.
 *
 * @param {{cloudId: string, queryPlan: object, items: object[]}} cloud
 * @returns {string}
 */
export function formatCloudForPersona(cloud) {
  const items = cloud?.items ?? [];
  const axes = cloud?.queryPlan?.axes ?? [];
  const plan = axes
    .map((a) => {
      const mode = a.mode === 'reduced' ? ` · урезана (${a.modeReason ?? 'без причины'})` : '';
      return `  ${a.axis}: ${a.status}, попаданий ${a.hitCount}${mode}`;
    })
    .join('\n');

  if (items.length === 0) {
    // Пустое облако показывается ТОЖЕ: «архив молчит» — сведение, а не отсутствие сведения.
    return [
      `## Всплытие (облако ${cloud?.cloudId ?? '—'})`,
      '',
      'Ничего не всплыло. План запроса:',
      plan,
      '',
      `Здоровье плана: ${cloud?.queryPlan?.health ?? '—'}.`,
      'Если считаешь, что всплывать было нечему, скажи это строкой:',
      `${PROTOCOL_PREFIX} cloud_rejected reason: «…»`,
    ].join('\n');
  }

  const body = items
    .map((it, i) => {
      const head = `[${i + 1}] id=${it.id} · слот=${it.slot} · класс=${it.class ?? '—'}`;
      const ref = it.snippetRef?.fullRef ? `\n    полностью: ${it.snippetRef.fullRef}` : '';
      return `${head}\n    ${String(it.snippetRef?.text ?? it.text ?? '').slice(0, 400)}${ref}`;
    })
    .join('\n\n');

  return [
    `## Всплытие (облако ${cloud.cloudId})`,
    '',
    'Это твоя собственная память, поднятая из архива. Выбираешь ты, не лифт.',
    'Если что-то из этого относится к делу — назови его строкой и объясни, ЧЕМ относится.',
    'Объяснение обязательно: строка без него недействительна.',
    'Если не относится ничего — скажи это прямо, тоже строкой.',
    '',
    ACT_INSTRUCTION,
    '',
    'План запроса:',
    plan,
    '',
    body,
  ].join('\n');
}

/**
 * Разобрать акт из ответа персоны. Только разбор — судить о годности будет `validateAct`:
 * разделение нужно, чтобы «персона так сказала» и «сказанное годно» не смешались в одно.
 *
 * @param {string} answer
 * @returns {{emerged: Array<{id: string, why: string}>, rejected: {reason: string}|null}}
 */
export function parseAct(answer) {
  const emerged = [];
  let rejected = null;
  for (const raw of String(answer ?? '').split('\n')) {
    const line = undecorate(raw);
    const e = EMERGE_LINE.exec(line);
    if (e !== null) {
      emerged.push({ id: e[1], why: e[2].trim() });
      continue;
    }
    const r = REJECT_LINE.exec(line);
    if (r !== null) rejected = { reason: r[1].trim() };
  }
  return { emerged, rejected };
}

/**
 * Проверить акт против облака. Здесь и только здесь стоит запрет подлога памяти.
 *
 * Негодная строка НЕ чинится и не домысливается — она отбрасывается с названной причиной.
 * Починить её значило бы написать акт за персону, а это ровно то, чего контур не допускает.
 *
 * @param {{emerged: Array<{id: string, why: string}>, rejected: {reason: string}|null}} parsed
 * @param {{items: Array<{id: string}>}} cloud
 * @returns {{outcome: 'emerged'|'rejected'|'silent', emerged: object[], rejected: object|null, problems: string[]}}
 */
export function validateAct(parsed, cloud) {
  const known = new Set((cloud?.items ?? []).map((i) => i.id));
  const problems = [];
  const emerged = [];

  for (const e of parsed?.emerged ?? []) {
    if (!known.has(e.id)) {
      problems.push(`«${e.id}» нет в облаке — всплыть может лишь то, что было подано`);
      continue;
    }
    if (e.why === '') {
      problems.push(`«${e.id}» без объяснения — строка без why недействительна (M3)`);
      continue;
    }
    if (emerged.some((x) => x.id === e.id)) {
      problems.push(`«${e.id}» назван дважды — второе объяснение отброшено`);
      continue;
    }
    emerged.push(e);
  }

  const rejected = parsed?.rejected ?? null;
  if (rejected !== null && rejected.reason === '') {
    problems.push('отказ без причины — «не всплыло» без объяснения неотличимо от молчания');
  }
  const validReject = rejected !== null && rejected.reason !== '';

  // Инвариант M3: rejected ⇒ emerged = ∅. Противоречие не разрешается в чью-либо пользу:
  // выбрать за персону, что она «на самом деле» имела в виду, — это и есть подлог.
  if (validReject && emerged.length > 0) {
    return {
      outcome: 'silent',
      emerged: [],
      rejected: null,
      problems: [
        ...problems,
        'персона и отвергла облако, и назвала всплывшее — акт противоречив и не засчитан',
      ],
    };
  }

  if (emerged.length > 0) return { outcome: 'emerged', emerged, rejected: null, problems };
  if (validReject) return { outcome: 'rejected', emerged: [], rejected, problems };
  return { outcome: 'silent', emerged: [], rejected: null, problems };
}

/**
 * Разложить акт в события журнала. Четыре глагола закрытого словаря C5, каждый со своим
 * моментом:
 *
 * - `cloud_query` — облако СОБРАНО. Пишется всегда, даже когда оно пусто: иначе «архив
 *   молчит» и «лифт не звали» неразличимы, а различать их — весь смысл `queryPlan`.
 * - `surface_invoke` — облако ПОКАЗАНО персоне, то есть в нём было что показывать. Момент
 *   отдельный от `cloud_query`: собранное пустым не всплывает ни к кому.
 * - `emerge` — по одному на каждое всплывшее, с объяснением персоны в `reason`.
 * - `reject` — персона отвергла показанное. Пишется вместе с `surface_invoke`, а не вместо:
 *   отвергнуть можно лишь то, что видел.
 *
 * @returns {Array<{persona: string, verb: string, ref: string, reason?: string, origin: string}>}
 */
export function actOpEvents(act, { persona, cloud, origin = 'ask-persona' }) {
  const events = [{ persona, verb: 'cloud_query', ref: cloud.cloudId, origin }];
  const shown = (cloud?.items ?? []).length > 0;
  if (shown) events.push({ persona, verb: 'surface_invoke', ref: cloud.cloudId, origin });
  for (const e of act.emerged) {
    events.push({ persona, verb: 'emerge', ref: e.id, reason: e.why, origin });
  }
  if (act.outcome === 'rejected') {
    events.push({ persona, verb: 'reject', ref: cloud.cloudId, reason: act.rejected.reason, origin });
  }
  return events;
}

/**
 * Кому лифт поднимается сам. Ангелина исключена по вердикту M3: она ведёт, а не советует, и
 * облако советующих не судит. Прочие персоны получают СВОЮ память — при условии, что архив
 * у них есть; проверку наличия делает вызывающий, здесь чистый предикат.
 */
export const LIFT_EXCLUDED = Object.freeze(['angelina']);

export function shouldLift({ persona, hasArchive, noLift = false, enableLift = false }) {
  if (noLift) return false;
  if (LIFT_EXCLUDED.includes(persona)) return enableLift && hasArchive;
  return hasArchive || enableLift;
}
