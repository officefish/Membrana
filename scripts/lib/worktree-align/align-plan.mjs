/**
 * align-plan — ЧИСТОЕ ЯДРО массового выравнивания рабочих деревьев к origin/main
 * (блок `align-plan-core` спринта `worktrees-align`, #1738; action item прецедента
 * [`2026-07-24-align-all-worktrees-to-main`](../../../docs/precedents/2026-07-24-align-all-worktrees-to-main.md)).
 *
 * ЧТО ЗДЕСЬ ЕСТЬ И ЧЕГО НЕТ. Здесь только предикаты и план: `plan(снимок) → действия`.
 * Ни `git`, ни `fs` этот файл не импортирует — и потому единственный в спринте, чьи зубы
 * гоняются на фикстурах. Причина не в чистоте ради чистоты: живых деревьев для проверки
 * нет — из трёх грязных одно держит незакоммиченную правку `sample-window` трёх красных
 * детекторов, разбор которой отложен владельцем (HANDOFF 06.08). Ядро, которое нельзя
 * проверить, не написав в чужое дерево, не проверялось бы вовсе.
 *
 * ПОЧЕМУ СЛОВАРЬ ДЕЙСТВИЙ ЖИВЁТ ЗДЕСЬ, А НЕ У ИСПОЛНИТЕЛЕЙ (замечание Веснина при прогоне
 * контекста до нарезки). Если `AlignAction` не объявить один раз в ядре, блоки снимка и
 * merge заведут каждый свой словарь — движок объявится в трёх местах и разойдётся на первой
 * же правке. Тот же довод у предикатов состояния: `hasMergeHead` — это ЧТЕНИЕ СОСТОЯНИЯ, и
 * принадлежит оно ядру, а не блоку merge; иначе исполнитель начнёт знать про git больше, чем
 * ему положено.
 *
 * ПОРТ. Ядро исполнителей не вызывает — оно описывает, что им позволено (`AlignPort`).
 * Реализации порта живут в блоках снимка, merge и CLI; ядро видит только форму.
 *
 * КОНФЛИКТ — ДОМЕННОЕ СОСТОЯНИЕ, НЕ ОТЧЁТ. Развилка, поднятая Весниным: где живёт запись
 * «дерево упало в конфликт» — у печатающего CLI или в ядре. Решено в пользу ядра: `plan()`
 * отдаёт готовый `AlignReport`, а CLI его только печатает. Иначе сборка потянула бы обратную
 * зависимость к предикатам ядра, и однонаправленный порядок «форма → материал → сборка»
 * сломался бы на первом же новом виде находки.
 *
 * ЧЕГО ЯДРО НЕ ДЕЛАЕТ СОЗНАТЕЛЬНО: не разрешает конфликты. В прецеденте 24.07 четыре
 * конфликта разрешались поимённо и с рассуждением (union реестров, `theirs` только в
 * конфликтном хунке, слияние по `id` с проверкой на дубли). Плохая автоматика здесь молча
 * теряет чужие записи, поэтому план обязан упереться и позвать человека.
 */

/**
 * Замороженный словарь действий выравнивания. Список ЗАКРЫТ: действие вне списка — ошибка
 * входа, а не «прочее». Открытый список означал бы обход проверки новым словом.
 */
export const ALIGN_ACTIONS = Object.freeze({
  /** Защитный WIP-коммит грязного дерева поимённо, ДО любой мутации веток. */
  WIP_SNAPSHOT: 'wipSnapshot',
  /** `git merge origin/main` в дереве (ff или обычный — решает git, не план). */
  MERGE_FROM_ORIGIN: 'mergeFromOrigin',
  /** Откат начатого merge, чтобы дерево не осталось полусмердженным. */
  ABORT_MERGE: 'abortMerge',
  /** Ничего не менять, только назвать состояние человеку. */
  REPORT: 'report',
});

/** @type {readonly string[]} Канонический порядок действий: снимок ≺ merge ≺ откат. */
export const ALIGN_ACTION_ORDER = Object.freeze([
  ALIGN_ACTIONS.WIP_SNAPSHOT,
  ALIGN_ACTIONS.MERGE_FROM_ORIGIN,
  ALIGN_ACTIONS.ABORT_MERGE,
  ALIGN_ACTIONS.REPORT,
]);

/**
 * Незавершённые операции git, посреди которых дерево трогать нельзя.
 *
 * ПОЧЕМУ НЕ ОДИН `MERGE_HEAD` (находка Дынина при прогоне контекста блока). `isDirty`
 * истинно и во время `rebase`, `cherry-pick`, `revert`, `bisect` — дерево в любой из них
 * выглядит просто грязным. Проверка только на merge пропустила бы его дальше, и план выдал
 * бы `wipSnapshot` → `mergeFromOrigin` ПОСЕРЕДИНЕ чужой операции. Это ровно тот вред, ради
 * предотвращения которого спринт и заведён, поэтому список закрыт и проверяется первым.
 */
export const IN_PROGRESS_HEADS = Object.freeze([
  'MERGE_HEAD',
  'REBASE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'BISECT_LOG',
]);

/** Причины, по которым план отказывается трогать дерево. Каждое «нет» — с именем. */
export const SKIP_REASONS = Object.freeze({
  TRACKED_DELETIONS: 'tracked-deletions',
  IN_PROGRESS_OP: 'in-progress-op',
  ALREADY_MERGING: 'already-merging',
  NOT_BEHIND: 'not-behind',
  UNREGISTERED: 'unregistered',
  STATE_UNKNOWN: 'state-unknown',
  DETACHED: 'detached-head',
});

/**
 * ФОРМА ПОРТА (документ, не реализация). Ядро его не вызывает; блоки снимка, merge и CLI
 * обязаны предъявить объект этой формы. Держится здесь, чтобы три реализации не разошлись.
 *
 * @typedef {object} AlignPort
 * @property {(tree: string, files: string[], message: string) => {commit: string}} wipSnapshot
 *           закоммитить перечисленные файлы в дереве (поимённо, не `add -A`)
 * @property {(tree: string) => {ok: true} | {ok: false, files: string[]}} mergeFromOrigin
 *           слить origin/main; при конфликте вернуть список конфликтных файлов
 * @property {(tree: string) => void} abortMerge
 *           откатить начатый merge
 * @property {(tree: string) => boolean} hasMergeHead
 *           лежит ли в дереве MERGE_HEAD (проверка ПОСЛЕ отката — дерево не в MERGING)
 */

/**
 * Снимок одного дерева на входе плана. Все поля — уже измеренные значения: ядро ничего
 * не измеряет само.
 *
 * @typedef {object} TreeState
 * @property {string} tree путь дерева
 * @property {string|null} branch ветка; null = detached HEAD
 * @property {{kind: string, canonName?: string}|null} card разобранная карточка WORKTREE.md
 * @property {number} behind коммитов origin/main, которых нет в ветке
 * @property {number} ahead своих коммитов, которых нет в origin/main
 * @property {number} dirtyCount строк `git status --porcelain`
 * @property {string[]} [dirtyFiles] пути грязных файлов — попадут в WIP-снимок поимённо
 * @property {boolean} [mergeHead] дерево уже в состоянии MERGING
 * @property {boolean} [stateUnknown] состояние не снялось (сеть/git) — fail-closed
 */

const isDirtyCount = (n) => Number.isFinite(n) && n > 0;

/**
 * Есть ли в дереве незакоммиченные изменения.
 *
 * ОПРЕДЕЛЕНИЕ ЗАКРЕПЛЕНО ЗДЕСЬ, а не отдано исполнителю (замечание Дынина): «грязь» — это
 * строки `git status --porcelain`, то есть отслеживаемые правки И неигнорируемые untracked.
 * Игнорируемое в счёт не идёт и в защитный снимок не попадает — иначе `wipSnapshot` начнёт
 * хватать мусор рабочей копии. Замер делает порт, но что считать грязью — решает ядро.
 */
export function isDirty(state) {
  return isDirtyCount(state?.dirtyCount);
}

/**
 * Отсутствуют ли в дереве отслеживаемые файлы.
 *
 * ВЕЩДОК, РАДИ КОТОРОГО ЗАВЕДЁН ЭТОТ ОТКАЗ (инцидент 06.08, HANDOFF). Пакетный
 * `git worktree remove` снёс 2152 из 7825 отслеживаемых файлов в каноническом дереве
 * `Membrana` — два сносимых дерева лежали ВНУТРИ него. Первый же сухой прогон этого самого
 * скрипта предложил по тому дереву `wipSnapshot` на 2165 путях: формально «сохрани грязь
 * перед выравниванием», практически — увековечить поломку коммитом, после которого
 * `git checkout -- .` уже не вернул бы ничего.
 *
 * ПОЧЕМУ БЕЗ ПОРОГА (решение владельца 06.08). Порог доли потребовал бы числа, которое
 * пришлось бы обосновывать и подкручивать, а цена ошибки несимметрична: пропущенная поломка
 * необратима, лишняя остановка стоит одного взгляда человека. Поэтому «любое удаление —
 * стоп»: честное удаление файла в работе тоже остановит автомат, и это осознанная плата.
 */
export function hasTrackedDeletions(state) {
  return Number.isFinite(state?.deletedCount) && state.deletedCount > 0;
}

/**
 * Идёт ли в дереве незавершённая операция git (любая из `IN_PROGRESS_HEADS`).
 *
 * Шире, чем `hasMergeHead`, и в плане проверяется РАНЬШЕ грязи: дерево в rebase неотличимо
 * от грязного по одному лишь счётчику.
 */
export function hasInProgressOp(state) {
  if (state?.mergeHead === true) return true;
  const heads = state?.inProgressHeads;
  return Array.isArray(heads) && heads.some((h) => IN_PROGRESS_HEADS.includes(h));
}

/**
 * Лежит ли в дереве MERGE_HEAD. Предикат ядра, а НЕ блока merge (замечание Веснина):
 * иначе исполнитель merge начнёт знать про git больше, чем ему положено.
 */
export function hasMergeHead(state) {
  return state?.mergeHead === true;
}

/** Отстаёт ли ветка дерева от origin/main. */
export function isBehind(state) {
  return Number.isFinite(state?.behind) && state.behind > 0;
}

/** Разошлась ли ветка: есть и своё, и чужое — обычный merge, не ff. */
export function isDiverged(state) {
  return isBehind(state) && Number.isFinite(state?.ahead) && state.ahead > 0;
}

/**
 * Чисто ли дерево ПОСЛЕ отката слияния.
 *
 * ПРИШЛО НАХОДКОЙ СОСЕДА: лемму затребовал Ожегов при прогоне контекста блока
 * `merge-abort-guard` — иначе исполнитель merge начал бы разбирать `git status` сам, а
 * следующий за ним (rebase, cherry-pick) завёл бы свой диалект чтения состояния. Дом леммы
 * здесь, рядом с прочими предикатами состояния, а не у исполнителя.
 *
 * ЧИСТОТА — КОНЪЮНКЦИЯ, А НЕ ОДИН ФЛАГ. Меньшего недостаточно: `MERGE_HEAD` может исчезнуть,
 * оставив unmerged-индекс, и дерево будет выглядеть вышедшим из слияния, не выйдя из него.
 * Поэтому проверяются все условия сразу, и `HEAD` сверяется с ИМЕННО ТЕМ коммитом, что назвала
 * квитанция снимка, а не с «каким-нибудь».
 *
 * @param {TreeState & {porcelainEmpty?: boolean, unmergedPaths?: string[], head?: string}} state
 * @param {{parentSha?: string, headRef?: string}} [receipt] квитанция снимка, если он делался
 * @returns {{clean: boolean, residual: string[]}} residual — что именно осталось; пусто ⇔ чисто
 */
export function isWorktreeClean(state, receipt = {}) {
  const residual = [];
  if (hasMergeHead(state)) residual.push('MERGE_HEAD на месте');
  if (hasInProgressOp(state)) residual.push(`незавершённая операция (${(state?.inProgressHeads ?? []).join(', ')})`);
  if (state?.porcelainEmpty !== true) residual.push('рабочая копия не пуста по porcelain');
  const unmerged = state?.unmergedPaths ?? [];
  if (unmerged.length > 0) residual.push(`unmerged-файлов ${unmerged.length}`);
  if (receipt?.parentSha && state?.head && state.head !== receipt.parentSha) {
    residual.push(`HEAD ${state.head} ≠ ожидаемый ${receipt.parentSha}`);
  }
  return { clean: residual.length === 0, residual };
}

/**
 * Пройдёт ли слияние fast-forward'ом.
 *
 * Различение ff и обычного merge — знание ЯДРА, не исполнителя (тот же разбор Ожегова):
 * иначе появятся два фасада-синонима на одну лемму «слияние». Исполнитель зовёт одно
 * действие и возвращает исход; какой merge ожидался — решено здесь.
 */
export function isFastForward(state) {
  return isBehind(state) && !isDiverged(state);
}

/**
 * План по ОДНОМУ дереву.
 *
 * Порядок проверок — от безусловных отказов к действиям: дерево в MERGING чинится руками
 * (иначе автомат добьёт чужой полусмердженный стейт); detached HEAD и неснятое состояние —
 * fail-closed; дерево без карточки не мутируется никогда (класс `unregistered` прецедента
 * — «разбор человеку»); не отстало — трогать нечего.
 *
 * Грязь НЕ повод пропустить дерево: ровно ради неё прецедент просил защитный снимок.
 * Но снимок обязан идти ПЕРЕД merge, иначе слияние затрёт незакоммиченное.
 *
 * @param {TreeState} state
 * @returns {{tree: string, branch: string|null, actions: string[], skip: string|null, reasons: string[]}}
 */
export function planTree(state) {
  const tree = state?.tree ?? '';
  const branch = state?.branch ?? null;
  const reasons = [];
  const skip = (reason, why) => {
    reasons.push(why);
    return { tree, branch, actions: [ALIGN_ACTIONS.REPORT], skip: reason, reasons };
  };

  if (hasMergeHead(state)) {
    return skip(
      SKIP_REASONS.ALREADY_MERGING,
      'дерево уже в состоянии MERGING — автомат не добивает чужой полусмердженный стейт',
    );
  }
  if (hasInProgressOp(state)) {
    const heads = (state.inProgressHeads ?? []).join(', ');
    return skip(
      SKIP_REASONS.IN_PROGRESS_OP,
      `в дереве идёт незавершённая операция git (${heads}) — мутация посреди чужой операции запрещена`,
    );
  }
  if (hasTrackedDeletions(state)) {
    return skip(
      SKIP_REASONS.TRACKED_DELETIONS,
      `в дереве отсутствуют ${state.deletedCount} отслеживаемых файлов — снимок увековечил бы поломку коммитом; ` +
        'вернуть файлы (`git checkout -- .`) и повторить',
    );
  }
  if (state?.stateUnknown) {
    return skip(SKIP_REASONS.STATE_UNKNOWN, 'состояние дерева не снялось — не мутируем (fail-closed)');
  }
  if (!branch) {
    // Находка Дынина: на detached сравнивать не с чем, и «не отстало» было бы ложью —
    // единственный корректный исход тут report, а не пустой план «всё в порядке».
    return skip(SKIP_REASONS.DETACHED, 'detached HEAD — сравнивать не с чем, выравнивание неопределимо');
  }
  if (!state?.card) {
    return skip(SKIP_REASONS.UNREGISTERED, 'нет карточки WORKTREE.md — дерево не зарегистрировано, разбор человеку');
  }
  if (!isBehind(state)) {
    return skip(SKIP_REASONS.NOT_BEHIND, 'дерево не отстаёт от origin/main — трогать нечего');
  }

  const actions = [];
  if (isDirty(state)) {
    actions.push(ALIGN_ACTIONS.WIP_SNAPSHOT);
    reasons.push(`${state.dirtyCount} незакоммиченных изменений — защитный снимок ПЕРЕД merge`);
  }
  actions.push(ALIGN_ACTIONS.MERGE_FROM_ORIGIN);
  reasons.push(
    isDiverged(state)
      ? `ветка разошлась (−${state.behind}/+${state.ahead}) — обычный merge, не ff`
      : `ветка отстаёт на ${state.behind} — merge пройдёт fast-forward`,
  );
  return { tree, branch, actions, skip: null, reasons };
}

/**
 * План по НАБОРУ деревьев. Возвращает `AlignReport` — доменное состояние прогона, которое
 * исполнители дополняют фактами, а CLI только печатает.
 *
 * @param {TreeState[]} states
 * @returns {{trees: object[], planned: object[], skipped: object[], conflicts: object[], snapshots: object[]}}
 */
export function planAlign(states) {
  const trees = (states ?? []).map(planTree);
  return {
    trees,
    planned: trees.filter((t) => t.skip === null),
    skipped: trees.filter((t) => t.skip !== null),
    conflicts: [],
    snapshots: [],
  };
}

/**
 * Записать конфликт в отчёт. Чистая функция: возвращает НОВЫЙ отчёт, вход не мутируется —
 * прогон обязан быть пересказуем по шагам, а не только по итогу.
 *
 * Конфликт — не провал прогона, а находка, требующая человека: ядро конфликты не разрешает
 * (см. шапку файла).
 */
export function recordConflict(report, { tree, files, reason }) {
  return {
    ...report,
    conflicts: [...(report?.conflicts ?? []), { tree, files: files ?? [], reason: reason ?? null }],
  };
}

/**
 * Записать созданный защитный снимок. Отчёт ОБЯЗАН перечислить снимки поимённо: WIP-коммит
 * отматывается `git reset --soft`, но только если о нём известно — прецедент 24.07 хранит
 * это ровно как условие обратимости.
 */
export function recordSnapshot(report, { tree, files, commit }) {
  return {
    ...report,
    snapshots: [...(report?.snapshots ?? []), { tree, files: files ?? [], commit: commit ?? null }],
  };
}

/** Прогон безопасен для автоматического продолжения? Конфликт — стоп, а не предупреждение. */
export function needsHuman(report) {
  return (report?.conflicts?.length ?? 0) > 0;
}

/**
 * Строки отчёта для человека. Порядок фиксирован: что сделано → что пропущено и почему →
 * что требует рук. Молчание о пропущенных запрещено: «ничего не вывел» и «всё выровнено»
 * не должны выглядеть одинаково.
 *
 * @returns {string[]}
 */
export function formatAlignReport(report) {
  const lines = [];
  for (const t of report?.planned ?? []) {
    lines.push(`↻ ${t.tree} [${t.branch}] → ${t.actions.join(' · ')}`);
    for (const r of t.reasons) lines.push(`    · ${r}`);
  }
  for (const t of report?.skipped ?? []) {
    lines.push(`✋ ${t.tree} [${t.branch ?? 'detached'}] — пропуск (${t.skip})`);
    for (const r of t.reasons) lines.push(`    · ${r}`);
  }
  for (const s of report?.snapshots ?? []) {
    lines.push(`▣ снимок ${s.tree} → ${s.commit ?? 'без коммита'} (${s.files.length} файлов)`);
    for (const f of s.files) lines.push(`    · ${f}`);
  }
  for (const c of report?.conflicts ?? []) {
    lines.push(`✖ конфликт ${c.tree} — merge откачен, разбор человеку`);
    for (const f of c.files) lines.push(`    · ${f}`);
    if (c.reason) lines.push(`    · ${c.reason}`);
  }
  if (lines.length === 0) lines.push('деревьев на входе нет — выравнивать нечего');
  return lines;
}
