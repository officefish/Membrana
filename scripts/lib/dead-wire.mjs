/**
 * Мёртвые провода — чистое ядро предиката связи (#1447).
 *
 * Предмет: объявление вида `node scripts/x.mjs` в package.json обязано иметь носитель
 * на диске ЛИБО стоять в явном перечне pending с причиной из закрытого списка и датой.
 * Третьего, молчаливого состояния нет — норма B10 (легальное «нет» называет $why).
 *
 * Ядро чистое: ни fs, ни сети, ни process. Существование пути приходит инъекцией,
 * «сейчас» приходит аргументом. Обвязка — scripts/dead-wire-check.mjs.
 */

/** Причины pending — закрытый перечень, не свободный текст (норма B9 «Проза»). */
export const PENDING_REASONS = Object.freeze([
  'awaits-implementation', // место объявлено, тело пишется в известной задаче
  'blocked-by-epic', // ждёт мерджа эпика, ссылка обязательна
  'external-dependency', // ждёт внешнюю поставку вне нашего контроля
  'migration-in-progress', // носитель переезжает, старое имя ещё нужно
  // Носитель сознательно вне git (#1911, вещдок 13.08 cabinet:mp7:prod): локально файл
  // есть, в CI его нет ПО ПОСТРОЕНИЮ (.gitignore) — без этого класса локальный прогон
  // требовал снять запись (pending_orphan), а CI требовал держать (dead_wire).
  // Протухание меряется не календарём, а gitignore-покрытием: паттерн выпал → запись
  // обязана уйти (pending_invalid «названа ложно»).
  'local-only-carrier',
]);

/** Вердикты разбора — закрытый enum. Прочерк вердиктом не считается. */
export const VERDICTS = Object.freeze(['implement', 'pending', 'remove']);

/** Роды находок — закрытый список. Род вне списка есть ошибка входа, а не «прочее». */
export const FINDING_KINDS = Object.freeze([
  'dead_wire', // носителя нет и записи pending нет
  'pending_invalid', // запись pending есть, но не проходит валидацию
  'pending_expired', // запись pending есть и валидна, но срок вышел
  'pending_orphan', // запись pending есть, а провод жив — запись протухла
  // Пятый род введён актом владельца 01.08: поле `script` каталога мастерской означает
  // «что запускается», а не «чем сделано», поэтому расхождение с package.json — дефект.
  'carrier_mismatch', // каталог обещает агенту один носитель, package.json запускает другой
]);

/** Раннеры, которые принимают путь к файлу первым позиционным аргументом. */
const FILE_RUNNERS = Object.freeze(['node', 'tsx', 'ts-node', 'node--test']);

/** Расширения носителей, которые вообще имеет смысл искать на диске. */
const CARRIER_EXT = /\.(mjs|cjs|js|ts)$/;

/**
 * Разбить составную команду на простые по операторам оболочки.
 * `a && b || c ; d | e` → ['a','b','c','d','e'].
 * @param {string} commandText
 * @returns {string[]}
 */
export function splitComposite(commandText) {
  return String(commandText ?? '')
    .split(/&&|\|\||[;|]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Извлечь пути носителей, которые команда обязана иметь на диске.
 *
 * Возвращает пустой массив для команд без файлового носителя — turbo, yarn workspace,
 * npm run, встроенные оболочки: у них предмет не файл, и «проверка» была бы выдумкой.
 *
 * @param {string} commandText
 * @returns {string[]} нормализованные пути (без ведущего ./)
 */
export function extractCarrierPaths(commandText) {
  const found = [];
  for (const simple of splitComposite(commandText)) {
    const tokens = simple.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;

    // Префикс переменных окружения: `NODE_ENV=prod node scripts/x.mjs`.
    // На 01.08 таких команд у нас ноль — снято профилактически, чтобы будущая
    // не проехала мимо предиката молчаливым ложным зелёным.
    let cursor = 0;
    while (cursor < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[cursor])) cursor += 1;

    let head = tokens[cursor];
    let rest = tokens.slice(cursor + 1);
    if (head === undefined) continue;

    // `npx tsx x.ts` / `yarn node x.mjs` — раннер стоит вторым словом.
    if ((head === 'npx' || head === 'yarn') && rest.length > 0) {
      head = rest[0];
      rest = rest.slice(1);
    }
    if (!FILE_RUNNERS.includes(head)) continue;

    // Первый позиционный аргумент, не флаг и не значение флага.
    for (const token of rest) {
      if (token.startsWith('-')) continue;
      if (!CARRIER_EXT.test(token)) continue;
      found.push(token.replace(/^\.\//, ''));
      break;
    }
  }
  return found;
}

/**
 * Проверить запись pending. Возвращает список проблем; пустой список — запись годна.
 * @param {unknown} entry
 * @returns {string[]}
 */
export function pendingEntryProblems(entry) {
  const problems = [];
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return ['запись pending не объект'];
  }
  const { reason, until, ref } = /** @type {Record<string, unknown>} */ (entry);

  if (typeof reason !== 'string' || !PENDING_REASONS.includes(reason)) {
    problems.push(`причина вне закрытого перечня: ${JSON.stringify(reason)}`);
  }
  if (reason === 'local-only-carrier') {
    // Срок этому классу запрещён, а не «не нужен»: мёртвое поле лгало бы о механике
    // протухания — она gitignore-покрытием, не календарём (#1911).
    if (until !== undefined) {
      problems.push('local-only-carrier не несёт срока until — протухание меряется gitignore-покрытием, не календарём');
    }
    return problems;
  }
  if (typeof until !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    problems.push(`срок не дата YYYY-MM-DD: ${JSON.stringify(until)}`);
  } else if (Number.isNaN(Date.parse(`${until}T00:00:00Z`))) {
    problems.push(`срок не разбирается как дата: ${until}`);
  }
  if (reason === 'blocked-by-epic' && (typeof ref !== 'string' || ref.length === 0)) {
    problems.push('причина blocked-by-epic обязана нести ссылку ref');
  }
  return problems;
}

/**
 * Истёк ли срок записи. Сравнение календарное, по дате, без часов.
 * @param {{until: string}} entry
 * @param {string} today дата прогона, YYYY-MM-DD
 * @returns {boolean}
 */
export function pendingExpired(entry, today) {
  return String(entry.until) < String(today);
}

/**
 * Предикат связи для одного объявления.
 *
 * @param {object} input
 * @param {string} input.name имя команды в package.json — субъект записи pending
 * @param {string} input.command тело команды
 * @param {(path: string) => boolean} input.fileExists инъекция существования пути
 * @param {Record<string, unknown>} input.pending перечень pending, ключ — имя команды
 * @param {string} input.today дата прогона, YYYY-MM-DD
 * @returns {Array<{kind: string, name: string, carrier: string|null, detail: string}>}
 */
export function checkWire({ name, command, fileExists, pending, today, isIgnored }) {
  const findings = [];
  const carriers = extractCarrierPaths(command);
  const entry = Object.prototype.hasOwnProperty.call(pending, name) ? pending[name] : undefined;

  // local-only-carrier (#1911): носитель сознательно вне git. Существование файла
  // НЕ является сигналом ни в одну сторону (локально есть, в CI нет по построению) —
  // ни pending_orphan при живом, ни dead_wire при отсутствующем. Честность записи
  // держит gitignore-покрытие: предикат приходит инъекцией из обвязки; без предиката
  // покрытие честно не проверяется (unknown), а не считается ложью.
  if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)
    && (/** @type {{reason?: unknown}} */ (entry)).reason === 'local-only-carrier') {
    const problems = pendingEntryProblems(entry);
    if (problems.length > 0) {
      findings.push({ kind: 'pending_invalid', name, carrier: carriers[0] ?? null, detail: problems.join('; ') });
      return findings;
    }
    if (typeof isIgnored === 'function') {
      for (const carrier of carriers) {
        if (!isIgnored(carrier)) {
          findings.push({
            kind: 'pending_invalid',
            name,
            carrier,
            detail: 'причина local-only-carrier названа ложно: путь не покрыт .gitignore — паттерн выпал, запись обязана уйти',
          });
        }
      }
    }
    return findings;
  }

  const missing = carriers.filter((path) => !fileExists(path));

  if (missing.length === 0) {
    // Провод жив. Запись pending на живом проводе — протухший вещдок, а не тишина.
    if (entry !== undefined) {
      findings.push({
        kind: 'pending_orphan',
        name,
        carrier: carriers[0] ?? null,
        detail: 'носитель на месте, а запись pending всё ещё держится',
      });
    }
    return findings;
  }

  for (const carrier of missing) {
    if (entry === undefined) {
      findings.push({
        kind: 'dead_wire',
        name,
        carrier,
        detail: 'носителя нет и записи pending нет',
      });
      continue;
    }
    const problems = pendingEntryProblems(entry);
    if (problems.length > 0) {
      findings.push({
        kind: 'pending_invalid',
        name,
        carrier,
        detail: problems.join('; '),
      });
      continue;
    }
    if (pendingExpired(/** @type {{until: string}} */ (entry), today)) {
      findings.push({
        kind: 'pending_expired',
        name,
        carrier,
        detail: `срок ${/** @type {{until: string}} */ (entry).until} вышел на ${today}`,
      });
    }
    // Валидная непросроченная запись — легальное «нет с причиной». Находки нет.
  }
  return findings;
}

/**
 * Аудит всего перечня объявлений.
 *
 * @param {object} input
 * @param {Record<string, string>} input.scripts блок scripts из package.json
 * @param {(path: string) => boolean} input.fileExists
 * @param {Record<string, unknown>} [input.pending]
 * @param {string} input.today
 * @param {(path: string) => boolean} [input.isIgnored] gitignore-покрытие пути (для local-only-carrier); без инъекции покрытие честно не проверяется
 * @returns {{findings: Array<object>, checked: number, byKind: Record<string, number>}}
 */
export function auditWires({ scripts, fileExists, pending = {}, today, isIgnored }) {
  if (scripts === null || typeof scripts !== 'object') {
    throw new Error('auditWires: scripts обязан быть объектом package.json.scripts');
  }
  if (typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new Error('auditWires: today обязан быть датой YYYY-MM-DD — «сейчас» не выдумывается');
  }

  const findings = [];
  for (const [name, command] of Object.entries(scripts)) {
    findings.push(...checkWire({ name, command: String(command), fileExists, pending, today, isIgnored }));
  }

  // Записи pending о командах, которых в package.json уже нет.
  for (const name of Object.keys(pending)) {
    if (!Object.prototype.hasOwnProperty.call(scripts, name)) {
      findings.push({
        kind: 'pending_orphan',
        name,
        carrier: null,
        detail: 'запись pending о команде, которой нет в package.json',
      });
    }
  }

  const byKind = {};
  for (const kind of FINDING_KINDS) byKind[kind] = 0;
  for (const finding of findings) byKind[finding.kind] += 1;

  return { findings, checked: Object.keys(scripts).length, byKind };
}

/**
 * Имя команды, которым каталог ключует инструмент: `yarn task:board --flag` → `task:board`.
 * Прочерк и пустое поле означают доковый вход без команды — не провод.
 * @param {unknown} yarnField
 * @returns {string|null}
 */
export function commandNameFromYarn(yarnField) {
  const raw = String(yarnField ?? '').trim();
  if (raw === '' || raw === '—' || raw === '-') return null;
  const base = raw.replace(/^yarn\s+/u, '').split(/\s+/u)[0];
  return base || null;
}

/**
 * Аудит объявлений каталогов мастерских.
 *
 * Каталог — обещание агенту, а не машине: он называет глагол и файл, которым тот сделан.
 * Поэтому проверяются два разных утверждения. Первое — носитель существует (тот же предикат
 * связи, ключ берётся из поля `yarn`, свои ключи перечень pending не заводит). Второе —
 * каталог и package.json согласны о носителе.
 *
 * @param {object} input
 * @param {Array<{path: string, tools: Array<Record<string, unknown>>}>} input.catalogs
 * @param {Record<string, string>} input.scripts блок scripts из package.json
 * @param {(path: string) => boolean} input.fileExists
 * @param {Record<string, unknown>} [input.pending]
 * @param {string} input.today
 * @returns {{findings: Array<object>, checked: number}}
 */
export function auditCatalogs({ catalogs, scripts, fileExists, pending = {}, today }) {
  if (!Array.isArray(catalogs)) {
    throw new Error('auditCatalogs: catalogs обязан быть массивом разобранных каталогов');
  }
  if (typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new Error('auditCatalogs: today обязан быть датой YYYY-MM-DD');
  }

  const findings = [];
  let checked = 0;

  for (const catalog of catalogs) {
    for (const tool of catalog.tools ?? []) {
      const name = commandNameFromYarn(tool.yarn);
      const declared = typeof tool.script === 'string' ? tool.script.replace(/^\.\//u, '') : null;
      if (name === null || declared === null) continue;
      checked += 1;

      const known = Object.prototype.hasOwnProperty.call(scripts, name);

      // Субъект, известный package.json, уже прошёл предикат связи там. Считать его второй
      // раз значит удвоить одну находку: один провод — одна запись, сколько бы поверхностей
      // его ни объявляло. Каталог добавляет ровно то, чего package.json не видит.
      if (!known) {
        findings.push(
          ...checkWire({
            name,
            command: `node ${declared}`,
            fileExists,
            pending,
            today,
          }).map((f) => ({ ...f, source: catalog.path, tool: tool.id ?? name })),
        );
        continue;
      }

      const real = extractCarrierPaths(String(scripts[name]));
      if (real.length === 0 || real.includes(declared)) continue;

      findings.push({
        kind: 'carrier_mismatch',
        name,
        carrier: declared,
        detail: `каталог обещает ${declared}, а ${name} запускает ${real.join(', ')}`,
        source: catalog.path,
        tool: tool.id ?? name,
      });
    }
  }

  return { findings, checked };
}
