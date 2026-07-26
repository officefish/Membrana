/**
 * Резак секретов (#1240, веха горизонта `secret-parser-built`).
 *
 * Сканер `night-triage-secret-scan.mjs` НАХОДИТ, но не режет. Здесь — вырезание
 * ПОВЕРХ его правил: ни одного нового паттерна, иначе два детектора разойдутся
 * (урок #537). Импортируем `SECRET_PATTERNS` / `SENSITIVE_JSON_KEY_RE` как есть.
 *
 * Канон (кристаллы правды, слово владельца 17.07):
 * - `session-backup-requires-secret-redaction` — секреты вырезаются ДО бэкапа сессий;
 * - `secret-parser-cuts-aggressively` — режем агрессивно: асимметрия цены, перерезать
 *   в архиве не стоит ничего (его не читает ни код, ни промпт), недорезать = утечка.
 *   Поэтому заменяется ВЕСЬ матч правила, а не «чувствительная часть» ради читаемости.
 * - `archive-cleanup-rotate-then-single-dated-pass` — сначала ротация ключей, потом
 *   ОДИН датированный проход с манифестом; после даты правка архива запрещена. Модуль
 *   даёт материал для манифеста, но датой и ротацией распоряжается владелец.
 *
 * НАЗВАННЫЙ ПРЕДЕЛ (limit кристалла `secret-parser-cuts-aggressively`): что делать,
 * если агрессивный рез снесёт саму цитату владельца и кристалл потеряет доказательство —
 * НЕ сказано. Здесь это не решается молча: рез не трогает файлы на месте, а `cuts[]`
 * позволяет увидеть, что именно было вырезано, до того как копия куда-то поедет.
 */
import { SECRET_PATTERNS, SENSITIVE_JSON_KEY_RE } from '../night-triage-secret-scan.mjs';

/** Хвост PEM-блока: строки тела ключа (base64 + армор-символы), без текста. */
const PEM_BODY_LINE_RE = /^[A-Za-z0-9+/=\s:.,-]*$/u;
const PEM_END_RE = /-----END [A-Z ]*PRIVATE KEY-----/u;

/**
 * Заглушка детерминирована: без счётчиков, времени и длины исходного значения —
 * два прогона по одному входу дают побайтово равные копии, иначе сверка следов
 * архива невозможна.
 *
 * @param {string} name имя правила из SECRET_PATTERNS
 * @returns {string}
 */
export function redactionPlaceholder(name) {
  return `[секрет вырезан: ${name}]`;
}

/**
 * Глобальный клон правила сканера. Сам паттерн не переписываем — только просим
 * искать все вхождения: `scanTextForSecrets` берёт первое (ему хватает для гейта),
 * резаку нужны все, иначе второй ключ той же формы выживет.
 *
 * @param {RegExp} re
 * @returns {RegExp}
 */
function globalClone(re) {
  return new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
}

/**
 * Конец PEM-блока. Если END-маркера нет, съедаем следующие строки, пока они выглядят
 * телом ключа. Обрезать до конца файла было бы «агрессивнее», но именно это и есть
 * «молча испортить носитель» — а тело ключа кончается на первой обычной строке.
 *
 * @param {string} text
 * @param {number} from индекс конца BEGIN-маркера
 * @returns {{ end: number; unterminated: boolean }}
 */
function pemBlockEnd(text, from) {
  const rest = text.slice(from);
  const end = rest.match(PEM_END_RE);
  if (end && typeof end.index === 'number') {
    return { end: from + end.index + end[0].length, unterminated: false };
  }
  let cursor = from;
  while (cursor < text.length) {
    const nl = text.indexOf('\n', cursor + 1);
    const lineEnd = nl === -1 ? text.length : nl;
    const line = text.slice(cursor, lineEnd);
    if (!PEM_BODY_LINE_RE.test(line) || line.trim() === '') break;
    cursor = lineEnd;
    if (nl === -1) break;
  }
  if (cursor === from) {
    // Ни END-маркера, ни построчного тела: так выглядит PEM внутри ОДНОЙ строки —
    // а это ровно формат сессий (jsonl, один JSON-объект на строку). Останавливаться
    // здесь нельзя: вырезался бы только BEGIN-маркер, тело ключа осталось бы в тексте,
    // и повторный скан дал бы ноль находок при живом секрете — театральный рез.
    // Режем остаток строки: агрессивно (кристалл secret-parser-cuts-aggressively),
    // но ограниченно — за пределы строки не выходим, и метка unterminated идёт в манифест.
    const nl = text.indexOf('\n', from);
    cursor = nl === -1 ? text.length : nl;
  }
  return { end: cursor, unterminated: true };
}

/**
 * Все совпадения правил в тексте, с разрешением перекрытий.
 *
 * @param {string} text
 * @returns {Array<{ name: string; start: number; end: number; unterminated?: boolean }>}
 */
function collectSpans(text) {
  /** @type {Array<{ name: string; start: number; end: number; unterminated?: boolean }>} */
  const spans = [];
  for (const { name, re } of SECRET_PATTERNS) {
    const g = globalClone(re);
    for (const m of text.matchAll(g)) {
      if (typeof m.index !== 'number' || m[0] === '') continue;
      const start = m.index;
      let end = start + m[0].length;
      let unterminated;
      if (name === 'private-key-pem') {
        const block = pemBlockEnd(text, end);
        end = block.end;
        unterminated = block.unterminated;
        // Иначе вырезался бы только заголовок -----BEGIN …-----, а тело ключа
        // осталось бы в тексте: повторный скан дал бы ноль находок при живом секрете.
      }
      spans.push(unterminated === undefined ? { name, start, end } : { name, start, end, unterminated });
    }
  }
  // Перекрытия: одно и то же значение может подойти двум правилам (Bearer вокруг ключа).
  // Оставляем более раннее, при равном начале — более длинное: реже недорезаем.
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  /** @type {typeof spans} */
  const accepted = [];
  let guard = -1;
  for (const span of spans) {
    if (span.start < guard) continue;
    accepted.push(span);
    guard = span.end;
  }
  return accepted;
}

/**
 * @param {string} text
 * @param {number} index
 * @returns {number} 1-based номер строки
 */
function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

/**
 * Вырезает секреты из текста. Чистая функция: ни ФС, ни сети, ни времени.
 *
 * Инварианты (закреплены тестами):
 * - идемпотентность: `redactSecrets(redactSecrets(x).text).text === redactSecrets(x).text`;
 * - переводы строк не трогаются — CRLF остаётся CRLF (Windows это не теория);
 * - `cuts[]` НЕ содержит вырезанных значений, иначе резак сам становится утечкой;
 * - текст без секретов возвращается байт в байт.
 *
 * @param {string} text
 * @returns {{ text: string; cuts: Array<{ name: string; start: number; end: number; length: number; line: number; unterminated?: boolean }> }}
 */
export function redactSecrets(text) {
  if (typeof text !== 'string') throw new TypeError('redactSecrets: ожидалась строка');
  const spans = collectSpans(text);
  if (spans.length === 0) return { text, cuts: [] };

  let out = '';
  let cursor = 0;
  /** @type {Array<{ name: string; start: number; end: number; length: number; line: number; unterminated?: boolean }>} */
  const cuts = [];
  for (const span of spans) {
    out += text.slice(cursor, span.start) + redactionPlaceholder(span.name);
    cuts.push({
      name: span.name,
      start: span.start,
      end: span.end,
      length: span.end - span.start,
      line: lineAt(text, span.start),
      ...(span.unterminated ? { unterminated: true } : {}),
    });
    cursor = span.end;
  }
  out += text.slice(cursor);
  return { text: out, cuts };
}

/**
 * Второй класс: чувствительные ключи JSON (`token`/`secret`/`password`/`api_key`/…).
 * Правило берётся у сканера (`SENSITIVE_JSON_KEY_RE`), структура сохраняется —
 * путь до ключа остаётся видимым, значение уходит.
 *
 * ЗНАЧЕНИЕ ОПУСТОШАЕТСЯ (`''`), а не подменяется заглушкой. Причина найдена тестом:
 * правило сканера считает находкой ЛЮБОЕ непустое значение под таким ключом
 * (`typeof child === 'string' && child.trim() !== ''`), поэтому текстовая заглушка
 * оставляла бы находку живой — «ни один секрет не выжил» не выполнялось бы по тому же
 * детектору, которым мы проверяем. Пустая строка удовлетворяет правилу и сохраняет тип
 * поля; факт реза несёт `cuts[]` и манифест, а не сам архив (кристалл
 * `secret-parser-cuts-aggressively`: архив не читают ни код, ни промпт).
 *
 * @param {unknown} value
 * @param {string} [path]
 * @returns {{ value: unknown; cuts: Array<{ name: string; path: string; length: number }> }}
 */
export function redactJsonSensitiveValues(value, path = '$') {
  /** @type {Array<{ name: string; path: string; length: number }>} */
  const cuts = [];

  /** @param {unknown} node @param {string} nodePath @param {boolean} sensitiveKey */
  function walk(node, nodePath, sensitiveKey) {
    if (typeof node === 'string') {
      if (sensitiveKey && node.trim() !== '') {
        cuts.push({ name: 'sensitive-json-key', path: nodePath, length: node.length });
        return '';
      }
      const inner = redactSecrets(node);
      if (inner.cuts.length > 0) {
        for (const c of inner.cuts) cuts.push({ name: c.name, path: nodePath, length: c.length });
        return inner.text;
      }
      return node;
    }
    if (Array.isArray(node)) return node.map((item, i) => walk(item, `${nodePath}[${i}]`, sensitiveKey));
    if (node !== null && typeof node === 'object') {
      /** @type {Record<string, unknown>} */
      const next = {};
      for (const [key, child] of Object.entries(node)) {
        next[key] = walk(child, `${nodePath}.${key}`, SENSITIVE_JSON_KEY_RE.test(key));
      }
      return next;
    }
    return node;
  }

  return { value: walk(value, path, false), cuts };
}

/**
 * Манифест «что тронуто» для датированного прохода архива
 * (кристалл `archive-cleanup-rotate-then-single-dated-pass`).
 *
 * Дата приходит параметром, а не берётся из часов: манифест должен быть
 * воспроизводим, а дату прохода назначает владелец.
 *
 * @param {Array<{ name: string; line?: number; path?: string; length: number; unterminated?: boolean }>} cuts
 * @param {{ file: string; date: string; dryRun?: boolean }} meta
 * @returns {string} markdown без вырезанных значений
 */
export function formatRotationManifest(cuts, meta) {
  const byName = new Map();
  for (const c of cuts) byName.set(c.name, (byName.get(c.name) ?? 0) + 1);
  const head = [
    `# Манифест реза секретов — ${meta.file}`,
    '',
    `- Дата прохода: ${meta.date}`,
    `- Режим: ${meta.dryRun ? 'сухой прогон (файл не пишется)' : 'запись очищенной копии'}`,
    `- Вырезано фрагментов: ${cuts.length}`,
    '',
  ];
  if (cuts.length === 0) {
    return [...head, 'Секретов не найдено — ротация не требуется.', ''].join('\n');
  }
  const classes = ['## Классы (кандидаты на ротацию ключа)', '', '| Правило | Вхождений |', '|---|---|'];
  for (const [name, count] of [...byName.entries()].sort((a, b) => b[1] - a[1])) {
    classes.push(`| \`${name}\` | ${count} |`);
  }
  const places = ['', '## Места (без значений)', '', '| Правило | Где | Длина, симв. |', '|---|---|---|'];
  for (const c of cuts) {
    const where = c.path ?? (c.line != null ? `строка ${c.line}` : '—');
    places.push(`| \`${c.name}\` | ${where}${c.unterminated ? ' · PEM без END-маркера' : ''} | ${c.length} |`);
  }
  return [
    ...head,
    ...classes,
    ...places,
    '',
    '> Значения не приводятся намеренно: манифест сам не должен быть утечкой.',
    '> Порядок канона — сначала ротация ключей владельцем, затем датированный проход.',
    '',
  ].join('\n');
}
