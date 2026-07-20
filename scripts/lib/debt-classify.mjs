/**
 * Классификатор долга миграции (Р4, вердикт M4 registry-relocation, 2026-07-19).
 *
 * Чистые функции на снимке-контракте (M2): детерминированы, без сети.
 * Работают на ФИКСТУРНОЙ копии реестра — живой docs/tasks/registry.json
 * блок не читает и не трогает (правило спринта).
 *
 * Несущая идея M4: отсутствие паспорта — долг ЗАКОННОСТИ, а не долг РАБОТЫ
 * (`hasPassport = false` НЕ влечёт `workDone = false` — пилот 20 старейших:
 * 17 сделано / 3 частично / 0 не сделано). Счётчик незакрытых работ читает
 * ТОЛЬКО `debtClass = work` — фиктивный долг не синтезируется по конструкции.
 */

/** Классы долга (M4). `none` — запись полностью законна, долга нет. */
export const DEBT_CLASSES = Object.freeze(['record', 'work', 'legality', 'owner-knowledge']);

/**
 * Паспорт = GitHub-issue (аксиома M1: удостоверение личности задачи).
 * @param {{ githubIssue?: unknown }} card
 */
export function hasPassport(card) {
  return Number.isInteger(card?.githubIssue) && Number(card.githubIssue) > 0;
}

/** @param {{ githubIssueClosedAt?: unknown }} card */
export function issueClosed(card) {
  return typeof card?.githubIssueClosedAt === 'string' && card.githubIssueClosedAt.length > 0;
}

/** @param {{ legalizedBy?: unknown }} card */
export function legalized(card) {
  return typeof card?.legalizedBy === 'string' && card.legalizedBy.length > 0;
}

/**
 * Критерий «правильно заархивировано» (M4):
 * `wellArchived(r) = inCold(r) ∧ hasPassport(r) ∧ archivedAt(r) ≠ null`.
 * Три проверяемых предиката, без сети.
 *
 * @param {{ githubIssue?: unknown, archivedAt?: unknown }} card
 * @param {boolean} inCold запись физически в archive.jsonl (см. cold-reader.coldIds)
 */
export function wellArchived(card, inCold) {
  return (
    inCold === true &&
    hasPassport(card) &&
    typeof card?.archivedAt === 'string' &&
    card.archivedAt.length > 0
  );
}

/**
 * Класс долга записи — вычисляется ДО переноса (M4).
 *
 * Ветки предиката (Математик, M4):
 * - ¬hasPassport ∧ ¬wellArchived            → legality
 * - hasPassport ∧ issueClosed ∧ ¬archivedAt → record  (сделано, карточка открыта)
 * - hasPassport ∧ ¬issueClosed ∧ ¬workDone  → work    (не сделано)
 * - статус неустановим по коду и докам      → owner-knowledge
 * Полностью законная запись → 'none' (долга нет).
 *
 * `workDone` устанавливается по артефакту закрытия (стаб соседнего блока:
 * форма следа — их зона, здесь фикстура {lgtmBy, headRevision}):
 * true — приёмка есть; false — приёмки нет и работа не завершена;
 * null — машинно неустановимо.
 *
 * @param {object} card карточка реестра (фикстурная копия)
 * @param {{ inCold?: boolean, closure?: { lgtmBy?: string, headRevision?: string } | null }} [ctx]
 * @returns {'record' | 'work' | 'legality' | 'owner-knowledge' | 'none'}
 */
export function classifyDebt(card, ctx = {}) {
  const inCold = ctx.inCold === true;
  const closure = ctx.closure ?? null;
  const workDone =
    closure === null
      ? null
      : typeof closure.lgtmBy === 'string' && closure.lgtmBy.length > 0;

  if (!hasPassport(card)) {
    // Нет паспорта → долг законности, НЕ долг работы (пилот M4).
    return wellArchived(card, inCold) ? 'none' : 'legality';
  }
  const archived = typeof card?.archivedAt === 'string' && card.archivedAt.length > 0;
  if (issueClosed(card)) {
    if (!archived) {
      return 'record'; // сделано, карточка открыта — долг записи
    }
    return 'none'; // паспорт есть, закрыто, заархивировано — законно
  }
  // Паспорт есть, issue открыта:
  if (workDone === false) {
    return 'work'; // не сделано — единственный класс, который читает счётчик
  }
  if (workDone === true) {
    return 'record'; // сделано (LGTM есть), issue не закрыта — долг записи
  }
  return 'owner-knowledge'; // статус неустановим по коду и докам — вопрос владельцу
}

/**
 * Классификация набора записей. `parked` — состояние ожидания ВНУТРИ
 * owner-knowledge (M4): не мигрирует, не блокирует, из счётчиков исключено,
 * помечено датой запроса владельцу.
 *
 * @param {object[]} cards
 * @param {{ coldIds?: Set<string>, closures?: Map<string, object>, parked?: Map<string, string> }} [ctx]
 *   parked: id → дата запроса владельцу (ISO)
 * @returns {{ id: string, debtClass: string, wellArchived: boolean, parked: boolean, parkedSince: string | null, legalized: boolean }[]}
 */
export function classifyAll(cards, ctx = {}) {
  const cold = ctx.coldIds ?? new Set();
  const closures = ctx.closures ?? new Map();
  const parked = ctx.parked ?? new Map();
  return cards.map((card) => {
    const id = String(card?.id ?? '');
    const inCold = cold.has(id);
    const entry = {
      id,
      debtClass: classifyDebt(card, { inCold, closure: closures.get(id) ?? null }),
      wellArchived: wellArchived(card, inCold),
      parked: parked.has(id),
      parkedSince: parked.get(id) ?? null,
      legalized: legalized(card),
    };
    if (entry.parked) {
      // parked живёт только внутри owner-knowledge (M4: не пятый класс).
      entry.debtClass = 'owner-knowledge';
    }
    return entry;
  });
}

/**
 * Счётчик незакрытых работ: читает ТОЛЬКО `debtClass = work` (M4).
 * `legality`, `record`, `owner-knowledge` и `parked` его не поднимают.
 *
 * @param {{ debtClass: string, parked?: boolean }[]} entries
 */
export function countOpenWork(entries) {
  return entries.filter((e) => e.debtClass === 'work' && e.parked !== true).length;
}
