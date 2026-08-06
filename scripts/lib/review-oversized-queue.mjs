/**
 * Очередь oversized-коммитов на точечное ревью — чистое ядро, без ФС, git и часов.
 *
 * ЗАЧЕМ. «Ревьюить oversized по одному в день» двенадцать дней держалось на глазе, и глаз
 * не справился: замер 02.08 — 185 oversized-коммитов с 20.07, артефакт ревью есть у 17, без
 * него 168. «Какой сегодня» не решалось никак, потому что решать было нечем.
 *
 * ПОЧЕМУ ОЧЕРЕДЬ НЕЛЬЗЯ СТРОИТЬ ПО ОБЪЁМУ ДИФФА. По природе те же 185 делятся так: 60 —
 * только `docs/`, 6 — только код, 119 — смешанные. Ежевечерние ритуальные PR попадают в
 * oversized закономерно, и ревью #1624 это признало прямо: «объём обоснован природой
 * ежевечернего ритуального PR». Сортировка по общему объёму утопила бы шесть кодовых в
 * шестидесяти архивных — то есть очередь была бы длинной и бесполезной.
 *
 * МЕРКА РИСКА — СТРОКИ КОДА, вторичный ключ — ДОЛЯ кода в диффе (поправка резчика 02.08):
 * смешанный PR с большой докой и малым кодом иначе тонет вниз, а именно там кодовое
 * изменение и прячется под ворохом markdown.
 *
 * Порог не переобъявляется: `OVERSIZED_CHANGED_LINES` импортируется из `day-work-diff.mjs` —
 * носитель мерки один. Скопировать 400 к себе значило бы оставить возможность разъехаться на
 * единицу с ревью, у которого граница строгая.
 */
import { OVERSIZED_CHANGED_LINES, isSegmentOversized } from './day-work-diff.mjs';

export { OVERSIZED_CHANGED_LINES };

/** Корни, содержимое которых считается КОДОМ. Список закрыт и читается глазом. */
export const CODE_ROOTS = Object.freeze(['packages/', 'apps/', 'scripts/']);

/**
 * Исполняемое ВНЕ кодовых корней. Список закрыт.
 *
 * Разбор Дынина 02.08: мерка «где лежит» — не мерка «что делает». Под `docs/` живут задания,
 * которые читает движок, а в корне и в `.github/` — то, что исполняет CI. Молча отправить их в
 * «архивы и протоколы» значит вывести из-под ревью ровно то, что меняет поведение системы.
 * Здесь ложный минус дороже ложного плюса: пропущенный исполняемый промпт хуже лишнего
 * архивного PR в очереди.
 */
export const EXECUTABLE_OUTSIDE_ROOTS = Object.freeze([
  '.github/workflows/',
  '.githooks/',
  'docs/prompts/',
  'docs/procedures/',
]);

/** Имена в корне, исполняемые сборкой и CI. Список закрыт. */
const EXECUTABLE_ROOT_FILES = /^(Dockerfile|docker-compose[.\w-]*\.ya?ml|turbo\.json|package\.json)$/u;

/** Классы природы коммита. Список закрыт: четвёртого вида состава у диффа нет. */
export const NATURES = Object.freeze({
  /** Все изменённые файлы — код. */
  CODE: 'code',
  /** Ни одного файла кода: архивы, протоколы, ритуальные снимки. */
  DOCS: 'docs',
  /** И то и другое — здесь кодовое изменение и прячется. */
  MIXED: 'mixed',
});

/**
 * Считается ли файл КОДОМ — то есть тем, что меняет поведение системы.
 *
 * Порядок ветвей несущий и не переставляется:
 *   1. исполняемое вне кодовых корней — код, каким бы ни было расширение (задание движка
 *      лежит в `.md`, и это не делает его прозой);
 *   2. markdown в остальных местах — не код НИКОГДА, включая `packages/**\/README.md`:
 *      прежняя редакция считала его кодом по одному лишь префиксу — ошибка, симметричная первой;
 *   3. дальше — по кодовым корням.
 */
function isCode(rawPath) {
  const path = String(rawPath ?? '');
  if (EXECUTABLE_OUTSIDE_ROOTS.some((root) => path.startsWith(root))) return true;
  if (EXECUTABLE_ROOT_FILES.test(path)) return true;
  if (path.toLowerCase().endsWith('.md')) return false;
  return CODE_ROOTS.some((root) => path.startsWith(root));
}

export { isCode };

/** Номер PR числом; отсутствие номера уходит в конец, а не схлопывается с чужим. */
const prRank = (pr) => (pr === null || pr === undefined || pr === '' ? Number.MAX_SAFE_INTEGER : Number(pr));

/**
 * Разобрать один коммит: объёмы, природа, риск.
 *
 * @param {{pr?: string, sha?: string, date?: string, subject?: string,
 *   files?: ReadonlyArray<{path: string, changedLines: number}>}} commit
 */
export function describeCommit(commit) {
  const files = Array.isArray(commit?.files) ? commit.files : [];
  let total = 0;
  let code = 0;
  for (const f of files) {
    const n = Number(f?.changedLines) || 0;
    total += n;
    if (isCode(f?.path)) code += n;
  }
  const nature = code === 0 ? NATURES.DOCS : code === total ? NATURES.CODE : NATURES.MIXED;
  return {
    pr: commit?.pr ?? null,
    sha: commit?.sha ?? null,
    date: commit?.date ?? null,
    subject: commit?.subject ?? '',
    total,
    code,
    // Доля кода — второй ключ порядка. Пустой дифф даёт ноль, а не деление на ноль.
    codeShare: total === 0 ? 0 : code / total,
    nature,
    oversized: isSegmentOversized(total),
  };
}

/**
 * Построить очередь.
 *
 * СНЯТИЕ С ОЧЕРЕДИ — по наличию артефакта ревью, и это ЕДИНСТВЕННОЕ основание: «посмотрел и
 * не написал» очередь не сокращает, иначе она снова стала бы вопросом памяти.
 *
 * ОТБРОШЕННОЕ НЕ МОЛЧИТ. Возвращается не только очередь, но и разбивка отброшенного по
 * причинам с числами: молчаливо укороченная выборка читается как «столько и было» — ровно та
 * ложь, против которой построены остальные приборы этого дня.
 *
 * @param {ReadonlyArray<object>} commits
 * @param {{reviewed?: ReadonlyArray<string>, includeDocs?: boolean}} [ctx]
 *   `reviewed` — номера PR, у которых артефакт ревью уже есть, значением (ядро в ФС не ходит).
 * @returns {{queue: object[], dropped: {notOversized: number, reviewed: number, docs: number},
 *   denominator: number}}
 */
export function buildQueue(commits, ctx = {}) {
  // trackedReviewed — номера PR, чей артефакт ревью ОТСЛЕЖИВАЕТСЯ стволом (шот B, 03.08).
  // Источник списка — порт глагола (git ls-files), ядро о VCS не знает (граница Ожегова).
  // statusReviewed — номера PR, снятых по commit-status `review/teamlead=success`
  // (блок e2, 05.08). Машинный след живёт в ОБЩЕМ поле: его ставит сам шип-гейт, и он
  // виден любому клону — в отличие от артефакта ревью, который в .gitignore. Слово
  // владельца: снимает ТОЛЬКО success. `failure` гейт ставит и при вердикте BLOCK, и при
  // протухшем вердикте — снаружи неразличимо, и считать такие «рассмотренными» значило бы
  // выдать непроверенное за проверенное. Признак приносит скрипт: ядро в сеть не ходит.
  const { reviewed = [], statusReviewed = [], includeDocs = false, trackedReviewed = null } = ctx;
  const byArtifact = new Set(reviewed.map(String));
  const byStatus = new Set(statusReviewed.map(String));
  const done = new Set([...byArtifact, ...byStatus]);
  // Роды снятия различимы: `reviewed` — что сняли (всего), `byStatus` — на чём держится
  // общий след. Дробь остаётся об одном множестве: оба счётчика считают removedPrs.
  const dropped = { notOversized: 0, reviewed: 0, docs: 0, byStatus: 0 };
  const queue = [];
  /** PR, ФАКТИЧЕСКИ снятые с очереди — не все артефакты ФС: дробь обязана быть об одном множестве. */
  const removedPrs = new Set();

  for (const raw of Array.isArray(commits) ? commits : []) {
    const c = describeCommit(raw);
    if (!c.oversized) {
      dropped.notOversized += 1;
      continue;
    }
    if (c.pr !== null && done.has(String(c.pr))) {
      dropped.reviewed += 1;
      if (byStatus.has(String(c.pr))) dropped.byStatus += 1;
      removedPrs.add(String(c.pr));
      continue;
    }
    if (c.nature === NATURES.DOCS && !includeDocs) {
      dropped.docs += 1;
      continue;
    }
    queue.push(c);
  }

  // Порядок: риск по коду → доля кода → номер PR числом → sha.
  //
  // ВТОРОЙ КЛЮЧ НАЗВАН ЧЕСТНО (разбор Дынина 02.08): при равном `code` бо́льшая доля означает
  // просто меньший `total`, то есть это не вторая ось риска, а политика «при равном коде сначала
  // те, где меньше docs-обвязки». Выдавать её за меру риска было бы враньём словом.
  //
  // ЧЕТВЁРТЫЙ КЛЮЧ НЕ «НА ВСЯКИЙ СЛУЧАЙ»: номера сравниваются ЧИСЛОМ (лексикографически
  // «#1099 < #99», и читатель ждёт не этого), а коммиты без номера прежде схлопывались в пустую
  // строку — их взаимный порядок задавался входом. `sha` уникален по построению и замыкает.
  queue.sort(
    (a, b) =>
      b.code - a.code ||
      b.codeShare - a.codeShare ||
      prRank(a.pr) - prRank(b.pr) ||
      String(a.sha ?? '').localeCompare(String(b.sha ?? '')),
  );

  // Своя слепота счётом: сколько ФАКТИЧЕСКИХ снятий держится на файлах вне ствола.
  // Первый живой прогон дал «65/29» — числитель шёл по всем артефактам ФС, знаменатель по
  // снятым элементам очереди: дробь о двух разных множествах. Числитель приведён к removedPrs.
  // null — порт не подключён (зубы ядра без git): о слепоте не судим, а не «слепоты нет».
  // Снятие по commit-status слепотой НЕ является: след общий, на клоне он тот же. Поэтому
  // из host-local вычитаются и отслеживаемые стволом артефакты, и подтверждённые статусом —
  // иначе прибор пугал бы слепотой там, где вещдок виден всем (блок e2).
  const tracked = trackedReviewed === null ? null : new Set([...trackedReviewed].map(String));
  const hostLocalReviewed =
    tracked === null
      ? null
      : [...removedPrs].filter((pr) => !tracked.has(pr) && !byStatus.has(pr)).length;

  return {
    queue,
    dropped,
    hostLocalReviewed,
    // Пробрасывается как есть: прибор о них ЗНАЕТ, но снятыми не считает (слово владельца).
    statusFailurePrs: [...new Set((ctx.statusFailure ?? []).map(String))],
    denominator: Array.isArray(commits) ? commits.length : 0,
  };
}

/**
 * Отчёт строками. Пустая очередь — утверждение, а не молчание: «ревьюить нечего» и «выборка
 * схлопнулась» для читателя одно, если не сказать вслух.
 */
export function formatQueue(result, opts = {}) {
  const limit = opts.limit ?? 10;
  const { queue = [], dropped = {}, denominator = 0 } = result ?? {};
  const lines = [
    `review:oversized · рассмотрено коммитов ${denominator} · порог ${OVERSIZED_CHANGED_LINES} строк`,
  ];

  const byStatus = dropped.byStatus ?? 0;
  lines.push(
    `отброшено: ${dropped.notOversized ?? 0} не oversized · ${dropped.reviewed ?? 0} с готовым ревью` +
      (byStatus > 0 ? ` (из них ${byStatus} по общему следу — commit-status)` : '') +
      ` · ${dropped.docs ?? 0} без изменённых строк исходного кода`,
  );
  // PR со статусом `failure` — НЕ снятые: ревью могло быть, но вердикт не зачтён (BLOCK
  // либо протухание — снаружи неразличимо). Прибор называет их отдельно, вместо того
  // чтобы молча оставить в общей куче: разбирать их надо рукой, а не «когда-нибудь».
  const needHand = result?.statusFailurePrs ?? [];
  if (needHand.length > 0) {
    lines.push(
      `⚠ ${needHand.length} PR со статусом review/teamlead=failure — ревью было, вердикт не зачтён ` +
        `(BLOCK либо протух): ${needHand.slice(0, 8).map((p) => `#${p}`).join(', ')}${needHand.length > 8 ? ' …' : ''}`,
    );
  }
  // Предел прибора — вслух (шот B, 03.08): снятие читает рабочее дерево, а артефакты ревью
  // в .gitignore (TF-3, #554). Слова выверены исполнителем: «голова очереди ИНАЯ», не
  // «длиннее» — у чужого клона свои host-local вещдоки, невидимые здесь; прибор говорит о
  // СВОЕЙ слепоте, чужого не считает.
  const hl = result?.hostLocalReviewed;
  if (typeof hl === 'number' && hl > 0) {
    lines.push(
      `⚠ снятие host-local: ${hl}/${dropped.reviewed ?? 0} снятых артефактов вне ствола — ` +
        'на клоне без них голова очереди иная',
    );
  }

  if (queue.length === 0) {
    lines.push('✓ очередь пуста — точечно ревьюить нечего.');
    return lines;
  }

  lines.push(`✖ в очереди ${queue.length}; сверху — наибольший риск по строкам КОДА:`);
  for (const c of queue.slice(0, limit)) {
    const pr = c.pr ? `#${c.pr}` : (c.sha ?? '').slice(0, 8);
    lines.push(
      `    ${pr} · код ${c.code} из ${c.total} (${Math.round(c.codeShare * 100)}%) · ${c.nature} · ${c.date ?? '—'} · ${c.subject}`,
    );
  }
  if (queue.length > limit) lines.push(`    … и ещё ${queue.length - limit}`);
  return lines;
}
