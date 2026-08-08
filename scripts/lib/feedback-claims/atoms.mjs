/**
 * Атомы утверждений вечернего протокола — извлечение и классификация.
 *
 * Долг попугая `#team-feedback-claims-code-unverified` (birth 07.08), карточка
 * `feedback-claims-code-probe` (#1795), блок b1 ратифицированного плана
 * `docs/sprint/cut/feedback-claims-code-probe.json`.
 *
 * ПОВОД. `yarn team-evening-feedback` порождает протокол, который утверждает о коде —
 * называет символы, файлы, PR, карточки — и делает это уверенно. Ни один шаг не сверял
 * эти утверждения с деревом. 07.08 протокол сказал «`decideTransition` вызван из серверного
 * роута» (роута нет), попросил ревью клиентской части #1776 (клиентских файлов в PR нет),
 * назвал тип `PromoDeclineReason` (его нет нигде) и предложил реализовать ADR-0024, влитый
 * в тот же день. Поймала это ведущая глазом, вечером, уже после генерации.
 *
 * РАСКРОЙ снят с готового канона `scripts/lib/main-day-probe.mjs` (#533, консилиум
 * `main-day-issue-accuracy-2026-07-16`): ядро ЧИСТОЕ и ТОТАЛЬНОЕ — без I/O, без сети, без
 * исключений; сбор фактов живёт в обвязке. Второй реализации того же здесь нет: у утреннего
 * гейта своя семантика (посылка утверждает ОТСУТСТВИЕ работы, и найденный маркер её
 * опровергает), у вечернего — зеркальная (утверждение ССЫЛАЕТСЯ на сущность, и нарушение —
 * когда сущности по её адресу нет).
 *
 * ГЛАВНАЯ ОПАСНОСТЬ — АДРЕС, а не объём. Прецедент 03.08 (вещдок вшит в
 * `docs/tasks/main-day-assertions.json`, ключ `//retired-redact-wrong-address-03-08`):
 * посылка три дня давала `holds` и рождала ложное «резак не написан», потому что маркер
 * проверял НЕ ТОТ файл. Отсюда два правила этого модуля: токен несёт МНОЖЕСТВО
 * классов-кандидатов, а неопознанная форма честно становится `opaque` — гейт, который врёт
 * про вранье, учит команду не верить гейтам.
 */

/**
 * Классы атома. Список закрыт: класс вне списка означал бы адрес проверки, о котором
 * обвязка не знает, — то есть молчаливый `unknown` под видом факта.
 */
export const ATOM_CLASSES = Object.freeze({
  /** Символ кода: `decideTransition`, `PromoDeclineReason`. Адрес — исходники пакетов. */
  SYMBOL: 'symbol',
  /** Путь в дереве: `scripts/lib/evening-gates.mjs`. Адрес — файловая система. */
  PATH: 'path',
  /** Документ репозитория: `MAIN_DAY_ISSUE`, `HANDOFF.md`. Адрес — `docs/**`. */
  DOC: 'doc',
  /** Карточка реестра: `morning-gates-two-moments`. Адрес — `docs/tasks/registry.json`. */
  CARD: 'card',
  /** Глагол мастерской: `yarn code-review:pr`. Адрес — `scripts` в `package.json`. */
  VERB: 'verb',
  /** Ссылка на PR/Issue: `#1776`. Адрес — сквош-коммит ствола. */
  PR: 'pr',
  /** Форма не опознана — строковые константы, snake_case, проза. Проверять нечем. */
  OPAQUE: 'opaque',
});

/**
 * Слова, при которых утверждение про PR читается как утверждение о КЛИЕНТСКОЙ части.
 *
 * Узкий и явный список, а не «похожесть»: вещдок 2 звучал как «ревью клиентской части
 * #1776 — пять `PromoDeclineReason` → i18n → UI-состояние». Без этих слов номер PR сам по
 * себе ничего о слое не утверждает, и гейт не имеет права домысливать.
 */
const CLIENT_SIDE_MARKERS = Object.freeze([
  'клиент',
  'клиентск',
  'i18n',
  'ui-',
  ' ui',
  'ui ',
  'вёрстк',
  'верстк',
  'фронт',
]);

/** Каталоги, которыми клиентская часть себя предъявляет в этом монорепо. */
export const CLIENT_PATH_PREFIXES = Object.freeze(['apps/', 'packages/client', 'packages/ui']);

/**
 * Маркеры МОДАЛЬНОСТИ: строка не утверждает, а предполагает или спрашивает.
 *
 * Вещдок 08.08, прогон протокола 06.08: строка «собрать список UI-долгов из oversized-очереди
 * (#1740 1916 строк — там МОГУТ БЫТЬ UI-фрагменты, требующие отдельного прохода)» получала
 * красное — гейт спорил с гипотезой. Утверждения о коде проверяются, догадки — нет: hard
 * означает «сказано как факт, а факта нет», и предположение под это не подходит.
 */
const HEDGE_MARKERS = Object.freeze([
  'могут быть',
  'может быть',
  'могло',
  'возможно',
  'вероятно',
  'есть ли',
  'требующ',
  'если ',
  'похоже',
  'кажется',
  'предполож',
  'не видно',
]);

/** Строка-разделитель frontmatter. */
const FRONTMATTER_FENCE = /^---\s*$/;

/** Открытие/закрытие fenced-блока: три и более обратных кавычек либо тильды. */
const CODE_FENCE = /^\s*(`{3,}|~{3,})/;

/** Строка таблицы. Таблица — сводка, а не утверждение: голоса ролей живут в прозе. */
const TABLE_ROW = /^\s*\|/;

/** Цитата — чужой голос. Протокол цитирует регламент и промпт; их утверждения не его. */
const QUOTE_LINE = /^\s*>/;

/** HTML-комментарий: шапка провенанса генератора, не текст команды. */
const HTML_COMMENT_OPEN = /<!--/;
const HTML_COMMENT_CLOSE = /-->/;

/** Одиночный backtick-span. Основной носитель утверждения: голая проза шумит. */
const INLINE_CODE = /`([^`\n]+)`/g;

/**
 * Номер PR/Issue в ПРОЗЕ — единственная форма, которую можно брать без обратных кавычек.
 *
 * Поправка по прогону пяти протоколов 08.08. Вещдок «ревью клиентской части #1776» не
 * ловился вовсе: протокол пишет номера как пишет их человек — `#1776`, без кавычек, и
 * требование кавычек теряло целый класс ссылок. Форма `#\d{3,}` однозначна, чужого не
 * захватывает (номера версий и даты так не пишут), а адрес у неё точный — сквош ствола.
 */
const BARE_REFERENCE = /(?<![\w`#])#(\d{3,})(?!\d)/g;

/** Хвост «:123» у пути к файлу — адрес строки, не часть имени. */
const LINE_SUFFIX = /:\d+(-\d+)?$/;

/** Расширения, по которым токен читается как путь либо документ. */
const KNOWN_EXTENSIONS = Object.freeze([
  '.mjs',
  '.js',
  '.ts',
  '.tsx',
  '.json',
  '.jsonl',
  '.md',
  '.mdx',
  '.prisma',
  '.yml',
  '.yaml',
]);

const hasKnownExtension = (t) => KNOWN_EXTENSIONS.some((ext) => t.endsWith(ext));

/**
 * Разложить протокол на строки, где утверждение имеет право жить.
 *
 * Отбрасываются: frontmatter, fenced-код, таблицы, цитаты, HTML-комментарии. Причина ровно
 * одна и та же — АДРЕС: токен из блока кода уже является кодом (обычно вывод команды), и
 * проверять его как утверждение значит проверять не то, что сказано. Это класс 03.08.
 *
 * @param {string} markdown
 * @returns {readonly {line: number, text: string}[]}
 */
export function claimLines(markdown) {
  const src = typeof markdown === 'string' ? markdown : '';
  const lines = src.split(/\r?\n/);
  const out = [];
  let inFence = false;
  let fenceMark = '';
  let inComment = false;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const text = raw ?? '';

    // Frontmatter только в самом начале файла: `---` посреди текста — это горизонтальная
    // черта (протокол 07.08 отделяет ею поправку ведущей), и съесть остаток файла нельзя.
    if (i === 0 && FRONTMATTER_FENCE.test(text)) {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (FRONTMATTER_FENCE.test(text)) inFrontmatter = false;
      continue;
    }

    const fence = text.match(CODE_FENCE);
    if (fence) {
      const mark = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceMark = mark;
      } else if (mark === fenceMark) {
        inFence = false;
        fenceMark = '';
      }
      continue;
    }
    if (inFence) continue;

    if (inComment) {
      if (HTML_COMMENT_CLOSE.test(text)) inComment = false;
      continue;
    }
    if (HTML_COMMENT_OPEN.test(text)) {
      if (!HTML_COMMENT_CLOSE.test(text)) inComment = true;
      continue;
    }

    if (TABLE_ROW.test(text) || QUOTE_LINE.test(text)) continue;
    if (text.trim() === '') continue;

    out.push({ line: i + 1, text });
  }
  return out;
}

/**
 * Классы-кандидаты токена.
 *
 * Возвращается МНОЖЕСТВО, а не один класс: формы пересекаются неустранимо (kebab-case —
 * и карточка, и строковый литерал; ALLCAPS — и документ, и константа). Разводит их не
 * форма, а факт по адресу, и правило разрешения одно: любой `holds` побеждает
 * (`verdict.mjs`). Ядро, которое угадывало бы класс само, повторяло бы 03.08.
 *
 * @param {string} token
 * @returns {readonly string[]}
 */
export function classifyToken(token) {
  const t = typeof token === 'string' ? token.trim() : '';
  if (!t) return [ATOM_CLASSES.OPAQUE];

  if (/^#\d{3,}$/.test(t)) return [ATOM_CLASSES.PR];
  if (/^(yarn|npm run|npx|pnpm)\s+\S/.test(t)) return [ATOM_CLASSES.VERB];

  const bare = t.replace(LINE_SUFFIX, '');

  // Путь предъявляет себя разделителем И расширением: `docs/HANDOFF.md`. Одного слэша мало —
  // `holder`/`moderator` в прозе тоже несут его.
  if (bare.includes('/') && hasKnownExtension(bare)) return [ATOM_CLASSES.PATH];
  if (bare.includes('/')) return [ATOM_CLASSES.OPAQUE];

  // Файл без каталога: `ritual-deliver-to-main.mjs`, `HANDOFF.md`. Оба адреса законны —
  // обвязка ищет и как путь, и как документ.
  if (hasKnownExtension(bare)) return [ATOM_CLASSES.PATH, ATOM_CLASSES.DOC];

  // ALLCAPS_WITH_UNDERSCORE: и документ дня (`MAIN_DAY_ISSUE`), и константа кода
  // (`DELIVERABLE_STATUSES`). Разводит факт, не форма.
  if (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(bare)) return [ATOM_CLASSES.DOC, ATOM_CLASSES.SYMBOL];

  // kebab-case: карточка реестра (`morning-gates-two-moments`) либо чужой slug. Символом
  // быть не может — дефис в идентификаторе не живёт.
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(bare)) {
    // Дата внутри — это идентификатор ПРОГОНА (`ritual-day-2026-08-07-r2`), а не карточка:
    // прогоны живут в журнале, и спрашивать о них реестр значит спрашивать не по адресу.
    // Поправка по живому прогону 08.08: без этого протокол 07.08 получал сомнение
    // «карточки нет» на честном имени незакрытого прогона.
    if (/\d{4}-\d{2}-\d{2}/.test(bare)) return [ATOM_CLASSES.OPAQUE];
    return [ATOM_CLASSES.CARD, ATOM_CLASSES.DOC];
  }

  // Идентификатор кода: camelCase, PascalCase, либо однословный с точкой (`state.day`).
  if (/^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(bare)) {
    // snake_case — строковый литерал протокола (`promo_revoked`), а не символ: закрытые
    // списки причин отказа пишутся так и в коде живут значениями, не именами.
    if (/_/.test(bare) && bare === bare.toLowerCase()) return [ATOM_CLASSES.OPAQUE];
    return [ATOM_CLASSES.SYMBOL];
  }

  return [ATOM_CLASSES.OPAQUE];
}

/** Читается ли утверждение вокруг токена как утверждение о клиентской части. */
export function mentionsClientSide(context) {
  const s = typeof context === 'string' ? context.toLowerCase() : '';
  return CLIENT_SIDE_MARKERS.some((m) => s.includes(m));
}

/** Говорит ли строка предположением, а не утверждением. */
export function isHedged(context) {
  const s = typeof context === 'string' ? context.toLowerCase() : '';
  return HEDGE_MARKERS.some((m) => s.includes(m));
}

/**
 * Извлечь атомы утверждений из тела протокола.
 *
 * @param {string} markdown
 * @returns {readonly {token: string, classes: readonly string[], line: number, context: string, clientSide: boolean}[]}
 */
export function extractAtoms(markdown) {
  const atoms = [];
  const seen = new Set();
  for (const { line, text } of claimLines(markdown)) {
    const push = (raw) => {
      const token = String(raw).trim();
      if (!token) return;
      // Один и тот же токен в одной строке дважды — один атом: вердикт не станет правдивее
      // от повторной печати, а таблица распухнет.
      const key = `${line}::${token}`;
      if (seen.has(key)) return;
      seen.add(key);
      atoms.push({
        token,
        classes: classifyToken(token),
        line,
        context: text.trim(),
        clientSide: mentionsClientSide(text),
        hedged: isHedged(text),
      });
    };

    INLINE_CODE.lastIndex = 0;
    let m;
    while ((m = INLINE_CODE.exec(text)) !== null) push(m[1]);

    // Проза читается ТОЛЬКО на номера ссылок; всё прочее вне кавычек остаётся прозой.
    const withoutCode = text.replace(INLINE_CODE, ' ');
    BARE_REFERENCE.lastIndex = 0;
    let ref;
    while ((ref = BARE_REFERENCE.exec(withoutCode)) !== null) push(`#${ref[1]}`);
  }
  return atoms;
}

/**
 * Свести атомы к уникальным токенам, сохранив первое вхождение и признак клиентского
 * контекста хотя бы в одном месте.
 *
 * Зачем: один символ упоминается в протоколе шестью ролями. Шесть одинаковых вердиктов —
 * это эхо-камера, ровно то, за что 16.07 план счёл три отражения одного снимка консенсусом.
 *
 * @param {readonly {token: string, classes: readonly string[], line: number, context: string, clientSide: boolean}[]} atoms
 */
export function dedupeAtoms(atoms) {
  const byToken = new Map();
  for (const a of atoms ?? []) {
    if (!a || typeof a.token !== 'string') continue;
    // Признак «сказано ТВЁРДО» считается ПО СТРОКЕ, а не по токену: иначе склейка сведёт
    // клиентский смысл из одной строки с модальностью из другой и объявит фактом то, чего
    // ни одна строка не утверждала. Вещдок 08.08: #1740 в протоколе 06.08 упомянут пять раз,
    // клиентский смысл несёт ровно та строка, что говорит «там МОГУТ БЫТЬ UI-фрагменты» —
    // и красное на ней было бы спором с догадкой.
    const firm = Boolean(a.clientSide) && a.hedged !== true;
    const prev = byToken.get(a.token);
    if (!prev) {
      byToken.set(a.token, { ...a, occurrences: 1, clientSideFirm: firm });
      continue;
    }
    byToken.set(a.token, {
      ...prev,
      occurrences: prev.occurrences + 1,
      clientSide: prev.clientSide || a.clientSide,
      clientSideFirm: prev.clientSideFirm || firm,
      hedged: Boolean(prev.hedged || a.hedged),
    });
  }
  return [...byToken.values()];
}
