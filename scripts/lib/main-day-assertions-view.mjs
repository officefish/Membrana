/**
 * Проекция вещдока дня `docs/tasks/main-day-assertions.json` для промпта каркаса
 * MAIN_DAY_ISSUE — чистое ядро, без ФС, сети и часов (блок b1 спринта
 * `ritual-reads-done-work`, И8 недельного плана 28.09).
 *
 * ЧТО ЧИНИТСЯ. Генератор подкладывал файл В ТЕКСТЕ через `readBounded(…, 22_000)`, а файл —
 * 115 531 байт. В окне 22k модель видела мета-ключ `//date` = «Перечеканено 24.09 …» и
 * `sources[0].date = 2026-09-29`; заметки `//recut-29-09` и архив `//retired-*` лежали за
 * границей чтения. Противоречие разрешалось в пользу `//date`, и каркас 29.09 написал:
 * «файл несёт снимок 24.09, перечеканить» — при вердикте `yarn main-day-probe` «aligned».
 * Гипотеза «читатель принимает архивные ключи за текущее» замером опровергнута: он их не
 * читал вовсе. Корень — читатель судил о свежести по комментарию в файле, а не предикатом.
 *
 * КАК ЧИНИТСЯ. В промпт идёт не файл, а проекция: строка свежести ТЕМ ЖЕ импортом
 * `magistralFreshness`, что у probe (условие резчика: один экспорт, не два синонима);
 * `sources[0]` дословно; прежние источники — датами и origin; посылки `assertions[]` —
 * дословно (это предмет probe); все `//`-ключи и `archivedFork` — ЧИСЛОМ, без содержимого.
 * Комментарии чеканщика — след решений владельца для человека, а не вход суждения о
 * свежести; их дата ничего не доказывает по построению.
 *
 * Испорченный вход (не JSON, не объект) даёт блок с причиной, а не сырой текст: подложить
 * текст «на всякий случай» значило бы вернуть ровно ту болезнь, которая здесь лечится.
 */
import { formatFreshness, magistralFreshness } from './main-day-magistral-freshness.mjs';

/** Где лежит вещдок дня — тот же путь, что читают probe и стендап. */
export const ASSERTIONS_REL = 'docs/tasks/main-day-assertions.json';

/** Метка вещдока, объявленная сырым текстом. Зуб на неё держит порчу «вернули дамп». */
const STALE_META_MARK = /Перечеканено \d\d\.\d\d/u;

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFilled = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Разобрать текст вещдока. Отказ — с причиной, а не с догадкой.
 * @param {string|null|undefined} text
 * @returns {{ok: true, doc: object} | {ok: false, reason: string}}
 */
export function parseAssertionsText(text) {
  if (!isFilled(text)) return { ok: false, reason: 'файл пуст или отсутствует' };
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    return { ok: false, reason: `не разбирается как JSON: ${e?.message ?? e}` };
  }
  if (!isPlainObject(doc)) return { ok: false, reason: 'корень документа не объект' };
  return { ok: true, doc };
}

/**
 * Свести документ вещдока к значению-проекции. Часов нет: `today` — параметр.
 *
 * @param {object} doc разобранный вещдок
 * @param {{magistral?: string, day?: string}|null} gate состояние утреннего гейта значением
 * @param {string} today YYYY-MM-DD
 */
export function projectAssertions(doc, gate, today) {
  const sources = Array.isArray(doc?.sources) ? doc.sources : [];
  const assertions = Array.isArray(doc?.assertions) ? doc.assertions : [];
  const metaKeys = Object.keys(doc ?? {}).filter((k) => k.startsWith('//'));
  const retiredKeys = metaKeys.filter((k) => k.startsWith('//retired'));
  return {
    freshness: magistralFreshness(doc, gate, today),
    owner: sources[0] ?? null,
    earlier: sources.slice(1).map((s) => ({
      date: isFilled(s?.date) ? s.date : null,
      origin: isFilled(s?.origin) ? s.origin : null,
      author: isFilled(s?.author) ? s.author : null,
    })),
    assertions,
    meta: {
      commentKeys: metaKeys.length,
      retiredKeys: retiredKeys.length,
      archivedFork: isPlainObject(doc?.archivedFork),
    },
  };
}

/**
 * Проекция → markdown для промпта. Строка свежести — ПЕРВАЯ содержательная строка блока:
 * модель должна прочитать вердикт предиката до того, как увидит даты источников.
 *
 * @param {ReturnType<typeof projectAssertions>} view
 */
export function renderAssertionsView(view) {
  const lines = [
    '> Проекция вещдока, а не сырой файл: свежесть судит предикат `magistralFreshness` — тот же,',
    '> что у `yarn main-day-probe`. Комментарии чеканщика (`//…`) в проекцию не входят: их даты',
    '> о свежести ничего не доказывают. Ниже — единственное основание для строки о перечеканке.',
    '',
    `**${formatFreshness(view.freshness)}**`,
    '',
    '### Магистраль владельца — `sources[0]` (дословно)',
    '',
    view.owner ? '```json\n' + JSON.stringify(view.owner, null, 2) + '\n```' : '(источников нет — магистраль владельцем не задана)',
    '',
  ];

  if (view.earlier.length > 0) {
    lines.push(`### Прежние источники — ${view.earlier.length} (только даты; содержимое не входит)`, '');
    for (const s of view.earlier) {
      lines.push(`- ${s.date ?? '(без даты)'} · ${s.origin ?? '(без origin)'} · author=${s.author ?? '—'}`);
    }
    lines.push('');
  }

  lines.push(`### Посылки \`assertions[]\` — ${view.assertions.length}`, '');
  lines.push(
    view.assertions.length > 0
      ? '```json\n' + JSON.stringify(view.assertions, null, 2) + '\n```'
      : '(посылок нет — probe проверять нечего; это факт, не пропуск)',
  );
  lines.push(
    '',
    `### Мета и архив — счётом: комментариев \`//…\` ${view.meta.commentKeys}, из них отслуживших ` +
      `\`//retired-*\` ${view.meta.retiredKeys}, archivedFork: ${view.meta.archivedFork ? 'есть' : 'нет'}. ` +
      'Содержимое не подаётся — след решений владельца, читается человеком.',
  );
  return lines.join('\n');
}

/**
 * Готовый блок входа для `collectDocBlocks` генератора: заголовок + проекция либо отказ с
 * причиной. Испорченный вход НЕ подменяется сырым текстом.
 *
 * @param {{text: string|null|undefined, gate: object|null, today: string, label: string, rel?: string}} p
 * @returns {{block: string, ok: boolean, freshness: object|null}}
 */
export function assertionsDocBlock(p) {
  const rel = p.rel ?? ASSERTIONS_REL;
  const parsed = parseAssertionsText(p.text);
  if (!parsed.ok) {
    return {
      ok: false,
      freshness: null,
      block: `### ${p.label} (\`${rel}\`)\n\n(проекция не построена: ${parsed.reason}; сырой текст в промпт не подаётся)\n`,
    };
  }
  const view = projectAssertions(parsed.doc, p.gate, p.today);
  return {
    ok: true,
    freshness: view.freshness,
    block: `### ${p.label} (\`${rel}\`)\n\n${renderAssertionsView(view)}\n`,
  };
}

/**
 * Предикат честности блока: блок не несёт застрявшей метки чеканщика. Один и тот же предикат
 * применяется к проекции (обязан быть true) и к сырому дампу той же фикстуры (обязан быть
 * false) — так зуб доказывает, что различие сделано проекцией, а не удачной фикстурой.
 * @param {string} block
 */
export function blockFreeOfStaleMark(block) {
  return !STALE_META_MARK.test(String(block ?? ''));
}
