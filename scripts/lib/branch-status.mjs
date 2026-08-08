/**
 * branch-status — контракт «эту ветку сейчас безопасно двигать?» (блок B спринта
 * ship-tail-lands-on-branch, слой 3 иссью #1759).
 *
 * Зачем отдельный глагол: девять срабатываний класса за 10 дней случились не от незнания
 * правила, а от невозможности БЫСТРО узнать состояние. Агент видел дерево не на месте,
 * тянулся выровнять его `checkout -B … origin/main` и не знал, кончился ли `--merge-only`.
 * Пока «уже можно?» приходится угадывать — будут угадывать неправильно.
 *
 * Ядро чистое: ни git, ни сети, ни ФС. Снимок приносит порт значением, и потому предикат
 * проверяется зубами без репозитория.
 *
 * ФОРМА ОТВЕТА — объект с МНОЖЕСТВОМ причин (разбор Веснина 08.08): строка
 * `blocked:<одна причина>` есть ложь по опущению — живой PR и незапушенные коммиты
 * бывают разом, агент починит первое и напорется на второе.
 */

/** Закрытый список причин отказа. Чужая причина — ошибка входа, не «прочее». */
export const BLOCK_REASONS = Object.freeze(['open-pr', 'unpushed-commits', 'unmerged-content']);

/** Человеческие имена причин: вывод глагола читает агент, а не парсер. */
export const REASON_LABEL = Object.freeze({
  'open-pr': 'на ветке живой PR — двигать голову нельзя, пока он не закрыт или не влит',
  'unpushed-commits': 'есть коммиты, которых нет в origin — перецеливание их потеряет',
  'unmerged-content': 'содержание ветки не целиком в стволе — сравнение по patch-id, не по предкам',
});

/**
 * Вердикт по снимку ветки.
 *
 * @param {object} snapshot
 * @param {string} snapshot.branch имя ветки
 * @param {Array<{number: number, state: string}>} [snapshot.pullRequests] PR по этой ветке
 * @param {string[]} [snapshot.unpushed] коммиты, которых нет в origin (sha)
 * @param {string[]} [snapshot.unmergedContent] коммиты ветки, чьего СОДЕРЖАНИЯ нет в стволе
 * @returns {{safe: boolean, branch: string, reasons: Array<{kind: string, detail: string}>}}
 */
export function branchStatus(snapshot = {}) {
  const branch = String(snapshot.branch ?? '');
  if (branch === '') {
    throw new Error('branchStatus: имя ветки пусто — судить нечего');
  }
  const reasons = [];

  // Порядок причин — от самой дорогой ошибки к самой дешёвой: сдвинуть ветку под живым
  // PR хуже, чем потерять локальный коммит, а тот хуже, чем недослитое содержание.
  const openPrs = (snapshot.pullRequests ?? []).filter((p) => String(p?.state).toUpperCase() === 'OPEN');
  if (openPrs.length > 0) {
    reasons.push({
      kind: 'open-pr',
      detail: `${REASON_LABEL['open-pr']}: ${openPrs.map((p) => `#${p.number}`).join(', ')}`,
    });
  }

  const unpushed = snapshot.unpushed ?? [];
  if (unpushed.length > 0) {
    reasons.push({
      kind: 'unpushed-commits',
      detail: `${REASON_LABEL['unpushed-commits']}: ${unpushed.length} шт. (${unpushed.slice(0, 3).map((s) => s.slice(0, 8)).join(', ')}${unpushed.length > 3 ? '…' : ''})`,
    });
  }

  const unmerged = snapshot.unmergedContent ?? [];
  if (unmerged.length > 0) {
    reasons.push({
      kind: 'unmerged-content',
      detail: `${REASON_LABEL['unmerged-content']}: ${unmerged.length} шт. (${unmerged.slice(0, 3).map((s) => s.slice(0, 8)).join(', ')}${unmerged.length > 3 ? '…' : ''})`,
    });
  }

  return { safe: reasons.length === 0, branch, reasons };
}

/**
 * Строка вывода. `safe` — утверждение, а не молчание: «ничего не мешает» и «я не проверял»
 * читателю обязаны выглядеть по-разному.
 *
 * @param {ReturnType<typeof branchStatus>} verdict
 * @returns {string[]}
 */
export function formatBranchStatus(verdict) {
  const lines = [];
  if (verdict.safe) {
    lines.push(`branch:status — ${verdict.branch}: safe · двигать голову можно`);
    lines.push('  проверено: живых PR нет · незапушенного нет · содержание ветки в стволе (patch-id)');
    return lines;
  }
  lines.push(`branch:status — ${verdict.branch}: blocked: ${verdict.reasons.map((r) => r.kind).join(', ')}`);
  for (const r of verdict.reasons) lines.push(`  ✖ ${r.detail}`);
  return lines;
}

/**
 * Честный предел глагола — печатается вместе с вердиктом, а не живёт в чужой голове
 * (разбор Веснина 08.08). Обещать больше измеренного — ровно та болезнь, против которой
 * весь этот контур и строился.
 */
export const BRANCH_STATUS_LIMITS = Object.freeze([
  'судит движение ГОЛОВЫ ветки, а не её удаление',
  'смотрит только origin: чужие удалёнки и форки вне области',
  'unmerged-content может быть ложно-положительным, если внутри ветки есть merge-коммиты',
  'о состоянии рабочего дерева (грязный индекс, stash) не судит — это соседний слой',
]);
