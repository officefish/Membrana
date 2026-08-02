/**
 * review-referenced-states — живые состояния PR и иссью, упомянутых в предмете ревью.
 *
 * ПОВОД, замерен 01–02.08. Ревьюер трижды за сутки заблокировал по ложной посылке о
 * состоянии PR: «#1562 не влит» (влит 01.08 в 10:02), «#1584 не влит» (влит 01.08),
 * «ядра нет в диффе» (было, 232 строки). Корень один: `code-review.mjs` обращался к `gh`
 * ровно за `headRefOid` и состояний упомянутых номеров не запрашивал НИКОГДА. На входе у
 * ревьюера оставалась проза диффа — а в ней живёт вчерашнее «не мерджим #1562», написанное
 * до мерджа. Проверить ему было нечем, и он верил тексту.
 *
 * Здесь состояние приходит ДАННЫМИ. Сеть недоступна — честное «не знаю» с причиной, а не
 * молчание: молчаливый пропуск неотличим от «упоминаний нет», и ревьюер снова доверился бы
 * прозе.
 */

/** Потолок номеров за прогон: батч дешёв, но дифф может нести сотни ссылок. */
export const MAX_REFERENCED = 40;

/**
 * Номера PR и иссью, упомянутые в тексте.
 *
 * Отбрасываются номера внутри ссылок вида `.../pull/123` — они и так адресуемы, а их
 * повтор раздувал бы батч. Берётся только форма `#N`, которой пишут в прозе.
 *
 * @param {string} text
 * @param {{max?: number}} [opts]
 * @returns {number[]} по возрастанию, без повторов
 */
export function referencedNumbers(text, { max = MAX_REFERENCED } = {}) {
  // Потолок ЖЁСТКИЙ, а не умолчание: вызывающий, передавший своё число, иначе раздул бы
  // батч диффом на сотни ссылок — и снятие состояний стало бы дороже самого ревью.
  const cap = Math.max(1, Math.min(Number(max) || MAX_REFERENCED, MAX_REFERENCED));
  const found = new Set();
  for (const m of String(text ?? '').matchAll(/(^|[\s(«"'`,;:])#(\d{2,6})\b/gu)) {
    const n = Number(m[2]);
    if (Number.isInteger(n) && n > 0) found.add(n);
  }
  return [...found].sort((a, b) => a - b).slice(0, cap);
}

/**
 * Блок фактов для промпта ревью.
 *
 * @param {number[]} numbers
 * @param {{unknown: true, reason: string} | {unknown: false, states: Record<number,string>, missing: number[]}} result
 * @returns {string} пустая строка, если упоминаний нет вовсе
 */
export function renderStatesBlock(numbers, result) {
  if (!Array.isArray(numbers) || numbers.length === 0) return '';

  const head =
    '## Живые состояния упомянутых PR и иссью (факт, не проза диффа)\n\n' +
    'Ниже — состояния, снятые у GitHub на момент прогона. **Текст диффа и документов может ' +
    'утверждать иное: он писался раньше.** При расхождении верна эта таблица, и вердикт о ' +
    'состоянии PR обязан опираться на неё, а не на фразу в документе.\n\n';

  if (result?.unknown === true) {
    return (
      head +
      `⚠ состояния НЕ известны: ${result.reason}\n\n` +
      'Поэтому утверждать, влит PR или нет, **нельзя вовсе** — ни «влит», ни «не влит». ' +
      'Замечание о состоянии в таком прогоне есть выдумка.\n'
    );
  }

  const states = result?.states ?? {};
  const missing = new Set(result?.missing ?? []);
  const rows = numbers.map((n) => {
    const state = states[n];
    if (state) return `| #${n} | ${state} |`;
    if (missing.has(n)) return `| #${n} | не найден в репозитории |`;
    return `| #${n} | не запрошен |`;
  });

  return head + '| Номер | Состояние |\n|---|---|\n' + rows.join('\n') + '\n';
}

/**
 * Собрать блок целиком: вытащить номера, снять состояния, отрисовать.
 *
 * @param {string} text предмет ревью (дифф и контекст)
 * @param {(numbers: number[]) => object} fetchStates инъекция — ядро без сети
 * @param {{max?: number}} [opts]
 * @returns {{numbers: number[], block: string}}
 */
export function buildReferencedStatesBlock(text, fetchStates, opts = {}) {
  const numbers = referencedNumbers(text, opts);
  if (numbers.length === 0) return { numbers, block: '' };
  if (typeof fetchStates !== 'function') {
    throw new Error('review-referenced-states: fetchStates обязателен — состояния не выдумываются');
  }
  const result = fetchStates(numbers);
  // Контракт синхронный намеренно. Если снятие однажды станет асинхронным, необёрнутый
  // Promise прошёл бы дальше молча: `result.unknown` неопределён, `states` пуст — и таблица
  // наполнилась бы строками «не запрошен», то есть соврала бы тем же способом, от которого
  // этот модуль и заведён. Поэтому подмена ловится здесь, а не проявляется в промпте.
  if (result !== null && typeof result?.then === 'function') {
    throw new Error(
      'review-referenced-states: fetchStates вернул Promise — контракт синхронный; ' +
        'неразрешённое обещание дало бы таблицу «не запрошен» вместо состояний',
    );
  }
  return { numbers, block: renderStatesBlock(numbers, result) };
}
