/**
 * one-shot S-predicate — чистая функция допуска формата «one shot» (Issue #1022).
 *
 * Канон: docs/prompts/ONE_SHOT_FIRST_FRAME_PROMPT.md · insight-one-shot-format REVIEW.
 * Рядом с checkBaseFreshness: детерминированный вход → вердикт с названными основаниями.
 *
 * Двойной гейт (T3): размер S И не сервер. Плюс контрмера capability chaining (research Q3):
 * смотрим не только текущий дифф, но и цепочку недавних one shot'ов по смежным путям.
 */

/** @typedef {{ paths: string[], linesChanged: number }} OneShotDiff */
/** @typedef {{ paths: string[], linesChanged: number, at: number }} OneShotHistoryEntry */
/**
 * @typedef {object} OneShotSLimits
 * @property {number} maxFiles
 * @property {number} maxLines
 * @property {number} chainWindowMs
 * @property {number} chainMaxFiles
 * @property {number} chainMaxLines
 * @property {number} chainMaxShots
 * @property {string[]} forbiddenPrefixes
 * @property {RegExp[]} forbiddenPathRes
 */

/** Пороги S по умолчанию (документированы в docs/procedures/one-shot/). */
export const ONE_SHOT_S_DEFAULTS = Object.freeze({
  maxFiles: 8,
  maxLines: 200,
  /** Окно цепочки: 7 суток. */
  chainWindowMs: 7 * 24 * 60 * 60 * 1000,
  /** Сумма файлов по смежным one shot'ам в окне (включая текущий). */
  chainMaxFiles: 8,
  chainMaxLines: 200,
  /** Число смежных выстрелов в окне (включая текущий) — выше порога = chaining. */
  chainMaxShots: 3,
  forbiddenPrefixes: Object.freeze([
    'packages/background-office/',
    'packages/background-media/',
    'packages/background-cabinet/',
    'deploy/',
  ]),
  forbiddenPathRes: Object.freeze([/\/prisma\/migrations\//u, /^prisma\/migrations\//u]),
});

/**
 * Нормализовать путь к posix-форме без ведущего `./`.
 * @param {string} p
 * @returns {string}
 */
export function normalizeRepoPath(p) {
  return String(p ?? '')
    .replace(/\\/gu, '/')
    .replace(/^\.\//u, '')
    .replace(/^\/+/u, '');
}

/**
 * Семейство пути для смежности цепочки (первые 2–3 сегмента).
 * @param {string} p
 * @returns {string}
 */
export function pathFamily(p) {
  const parts = normalizeRepoPath(p).split('/').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts[0] === 'packages' && parts.length >= 3) return parts.slice(0, 3).join('/');
  if (parts.length >= 2) return parts.slice(0, 2).join('/');
  return parts[0];
}

/**
 * @param {string} path
 * @param {Pick<OneShotSLimits, 'forbiddenPrefixes' | 'forbiddenPathRes'>} limits
 * @returns {boolean}
 */
export function isForbiddenServerPath(path, limits = ONE_SHOT_S_DEFAULTS) {
  const n = normalizeRepoPath(path);
  if (!n) return false;
  for (const prefix of limits.forbiddenPrefixes ?? ONE_SHOT_S_DEFAULTS.forbiddenPrefixes) {
    if (n === prefix.slice(0, -1) || n.startsWith(prefix)) return true;
  }
  for (const re of limits.forbiddenPathRes ?? ONE_SHOT_S_DEFAULTS.forbiddenPathRes) {
    if (re.test(n)) return true;
  }
  return false;
}

/**
 * @param {string[]} a
 * @param {string[]} b
 * @returns {boolean}
 */
export function pathsAreAdjacent(a, b) {
  const fa = new Set((a ?? []).map(pathFamily).filter(Boolean));
  for (const p of b ?? []) {
    if (fa.has(pathFamily(p))) return true;
  }
  return false;
}

/**
 * Чистый вердикт S-ности one shot.
 *
 * @param {object} input
 * @param {OneShotDiff} [input.diff]
 * @param {OneShotHistoryEntry[]} [input.recentShots]
 * @param {number} [input.now]
 * @param {Partial<OneShotSLimits>} [input.limits]
 * @returns {{
 *   ok: boolean,
 *   reasons: string[],
 *   details: {
 *     fileCount: number,
 *     linesChanged: number,
 *     serverPaths: string[],
 *     chainShots: number,
 *     chainFiles: number,
 *     chainLines: number,
 *     limits: OneShotSLimits,
 *   },
 * }}
 */
/**
 * Моменты прогона предиката (вердикт M3 заседания one-shot-manifest, 03.08).
 * Прибор ОДИН и бежит дважды: `forecast` при штампе — гейт входа, `fact` при
 * «код дописан» — стоп. Список закрыт и заморожен.
 */
export const EVALUATION_MOMENTS = Object.freeze(['forecast', 'fact']);

/**
 * Измеримое основание тематической однородности (вердикт M4) — агрегат поверх
 * `pathFamily`. Основание ПОД суждением тимлида, а не вместо него: поля
 * `isHomogeneous` здесь нет и быть не может (BLOCK заседания M4).
 *
 * Слепота названа полем: классификация идёт по форме пути, не по семантической
 * связности — модуль в пакете, его зуб в скриптах и потребитель в третьем месте
 * дадут три семейства при одном предмете.
 *
 * TODO(graph): когда появится граф зависимостей уровня «путь к пути» — заменить
 * вычислитель внутри ЭТОЙ функции на предикат связности; интерфейс возврата не
 * меняется, `basis` станет 'dependency-graph', поле `blind` уйдёт.
 *
 * @param {string[]} paths
 * @returns {{families: string[], familyCount: number, basis: 'pathFamily-v1', blind: 'no-graph'}}
 */
export function shotThematicBasis(paths) {
  const families = [...new Set((paths ?? []).map(normalizeRepoPath).filter(Boolean).map(pathFamily))].sort();
  return { families, familyCount: families.length, basis: 'pathFamily-v1', blind: 'no-graph' };
}

/**
 * @param {object} input
 * @param {'forecast'|'fact'} input.evaluationMoment момент прогона — ЯВНЫЙ, без умолчания (M3)
 * @throws {Error} если момент не назван или вне закрытого списка
 */
export function evaluateOneShotS(input = {}) {
  // Момент — ЯВНЫЙ, умолчания нет (приговор держателя): тихий «forecast по
  // умолчанию» лгал бы о моменте на каждом факте, где параметр забыли, — ровно
  // тот класс, ради которого M3 и вводился. Бросок виден сразу; ложь — никогда.
  if (!EVALUATION_MOMENTS.includes(input.evaluationMoment)) {
    throw new Error(
      `evaluationMoment «${String(input.evaluationMoment)}» вне {${EVALUATION_MOMENTS.join('|')}} — момент прогона называется явно (M3)`,
    );
  }
  const limits = {
    ...ONE_SHOT_S_DEFAULTS,
    ...(input.limits ?? {}),
    forbiddenPrefixes: input.limits?.forbiddenPrefixes ?? ONE_SHOT_S_DEFAULTS.forbiddenPrefixes,
    forbiddenPathRes: input.limits?.forbiddenPathRes ?? ONE_SHOT_S_DEFAULTS.forbiddenPathRes,
  };

  const paths = [...new Set((input.diff?.paths ?? []).map(normalizeRepoPath).filter(Boolean))];
  const linesChanged = Number(input.diff?.linesChanged ?? 0);
  const fileCount = paths.length;
  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now();

  /** @type {string[]} */
  const reasons = [];
  const serverPaths = paths.filter((p) => isForbiddenServerPath(p, limits));

  if (fileCount === 0 || (fileCount === 0 && linesChanged === 0)) {
    if (fileCount === 0) reasons.push('empty_diff');
  }
  if (fileCount > limits.maxFiles) reasons.push('exceeds_file_count');
  if (linesChanged > limits.maxLines) reasons.push('exceeds_line_count');
  if (linesChanged < 0) reasons.push('invalid_lines');
  if (serverPaths.length > 0) reasons.push('touches_server');

  const windowStart = now - limits.chainWindowMs;
  const related = (input.recentShots ?? []).filter((shot) => {
    if (!shot || typeof shot !== 'object') return false;
    const at = Number(shot.at);
    if (!Number.isFinite(at) || at < windowStart || at > now) return false;
    return pathsAreAdjacent(paths, (shot.paths ?? []).map(normalizeRepoPath));
  });

  const chainShots = related.length + (fileCount > 0 ? 1 : 0);
  const chainFiles =
    related.reduce((n, s) => n + new Set((s.paths ?? []).map(normalizeRepoPath).filter(Boolean)).size, 0) +
    fileCount;
  const chainLines =
    related.reduce((n, s) => n + Math.max(0, Number(s.linesChanged) || 0), 0) + Math.max(0, linesChanged);

  if (fileCount > 0) {
    if (chainShots > limits.chainMaxShots) reasons.push('capability_chaining');
    else if (chainFiles > limits.chainMaxFiles) reasons.push('capability_chaining');
    else if (chainLines > limits.chainMaxLines) reasons.push('capability_chaining');
  }

  // Позитивные основания только если нет блокирующих.
  if (reasons.length === 0) {
    reasons.push('within_file_limit', 'within_line_limit', 'no_server_paths', 'chain_clear');
  }

  return {
    ok: !reasons.some((r) =>
      [
        'empty_diff',
        'exceeds_file_count',
        'exceeds_line_count',
        'invalid_lines',
        'touches_server',
        'capability_chaining',
      ].includes(r),
    ),
    // Момент — корнем результата, не деталью: это входной параметр записи, а не
    // вычисленное. В reasons момент НЕ просачивается (никаких `@fact`-суффиксов):
    // закрытый набор строк остаётся закрытым, корреляции строит потребитель.
    evaluationMoment: input.evaluationMoment,
    reasons,
    details: {
      fileCount,
      linesChanged,
      serverPaths,
      chainShots,
      chainFiles,
      chainLines,
      limits,
      // M4: основание бежит В прогоне предиката, без отдельного запуска.
      thematicBasis: shotThematicBasis(paths),
    },
  };
}
